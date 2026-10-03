/**
 * Git-like commit journal for the tournament data store (main process only).
 *
 * Storage layout (under the Electron `userData` directory):
 *   history/commits.jsonl        append-only commit chain (one JSON per line)
 *   history/snapshots/<sha>.json.gz  periodic full-state base snapshots
 *   history/index.json           head pointer + counters
 *   history/tags.json            named pointers (replaces standalone checkpoints)
 *   tournament-autosave.json     HEAD state (written atomically)
 *
 * Each commit stores the minimal delta from its parent plus the human-readable
 * operation that caused the transition. Restores replay deltas forward from the
 * nearest base snapshot, which bounds replay depth.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import {
  CommitRecord,
  CommitSummary,
  HistoryTag,
  OperationHint,
  OperationInfo,
  OperationKind,
  computeDelta,
  applyDelta,
  describeOperation,
  isEmptyDelta,
  deepClone,
} from '../../shared/history';
import { TournamentState as SavedState } from '../../../types/tournament';

/** Write a full base snapshot every N commits (bounds restore replay depth). */
const SNAPSHOT_EVERY = 100;
const SCHEMA_VERSION = 1;

export interface CommitOptions {
  operationHint?: OperationHint;
  author?: 'user' | 'system';
  timestamp?: string;
}

interface HistoryIndex {
  headId: string | null;
  commitCount: number;
  lastSnapshotId: string | null;
  schemaVersion: number;
}

export class HistoryStore {
  private readonly dataDir: string;
  private readonly historyDir: string;
  private readonly commitsPath: string;
  private readonly snapshotsDir: string;
  private readonly indexPath: string;
  private readonly tagsPath: string;
  private readonly headPath: string;
  private readonly legacyBackupsDir: string;
  private readonly legacyCheckpointsDir: string;

  private commits: CommitRecord[] = [];
  private commitById = new Map<string, CommitRecord>();
  private index: HistoryIndex = {
    headId: null,
    commitCount: 0,
    lastSnapshotId: null,
    schemaVersion: SCHEMA_VERSION,
  };
  private tags: HistoryTag[] = [];
  private headState: SavedState | null = null;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.historyDir = path.join(dataDir, 'history');
    this.commitsPath = path.join(this.historyDir, 'commits.jsonl');
    this.snapshotsDir = path.join(this.historyDir, 'snapshots');
    this.indexPath = path.join(this.historyDir, 'index.json');
    this.tagsPath = path.join(this.historyDir, 'tags.json');
    this.headPath = path.join(dataDir, 'tournament-autosave.json');
    this.legacyBackupsDir = path.join(dataDir, 'backups');
    this.legacyCheckpointsDir = path.join(dataDir, 'checkpoints');
  }

  /** Create directories and load persisted state. Safe to call once at startup. */
  init(): void {
    fs.mkdirSync(this.snapshotsDir, { recursive: true });
    this.loadCommits();
    this.loadIndex();
    this.loadTags();
    this.headState = this.readHeadFile();
  }

  /**
   * Write a file atomically: write a temp sibling then rename over the target.
   * rename() is atomic on the same volume, so a crash mid-write cannot leave a
   * truncated/corrupt file behind.
   */
  private writeFileAtomic(filePath: string, data: string): void {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, data, 'utf8');
    try {
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore cleanup failure
      }
      throw error;
    }
  }

  private hash(input: string | Buffer): string {
    return crypto.createHash('sha1').update(input).digest('hex');
  }

  private readHeadFile(): SavedState | null {
    if (!fs.existsSync(this.headPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.headPath, 'utf8')) as SavedState;
    } catch (error) {
      console.error('[history] Failed to read head state:', error);
      return null;
    }
  }

  private loadCommits(): void {
    this.commits = [];
    this.commitById = new Map();
    if (!fs.existsSync(this.commitsPath)) return;

    const lines = fs.readFileSync(this.commitsPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const record = JSON.parse(trimmed) as CommitRecord;
        if (!record?.id) continue;
        this.commits.push(record);
        this.commitById.set(record.id, record);
      } catch {
        // Tolerate a partially-written trailing line after a crash.
      }
    }
  }

  private loadIndex(): void {
    if (fs.existsSync(this.indexPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.indexPath, 'utf8')) as HistoryIndex;
        this.index = { ...this.index, ...parsed };
        return;
      } catch (error) {
        console.error('[history] Failed to read index, rebuilding from commits:', error);
      }
    }
    this.index = this.rebuildIndex();
  }

  private rebuildIndex(): HistoryIndex {
    const last = this.commits[this.commits.length - 1];
    let lastSnapshotId: string | null = null;
    for (const commit of this.commits) {
      if (commit.snapshotRef) lastSnapshotId = commit.snapshotRef;
    }
    return {
      headId: last?.id ?? null,
      commitCount: this.commits.length,
      lastSnapshotId,
      schemaVersion: SCHEMA_VERSION,
    };
  }

  private loadTags(): void {
    this.tags = [];
    if (!fs.existsSync(this.tagsPath)) return;
    try {
      this.tags = JSON.parse(fs.readFileSync(this.tagsPath, 'utf8')) as HistoryTag[];
    } catch (error) {
      console.error('[history] Failed to read tags:', error);
    }
  }

  private saveIndex(): void {
    this.writeFileAtomic(this.indexPath, JSON.stringify(this.index, null, 2));
  }

  private saveTags(): void {
    this.writeFileAtomic(this.tagsPath, JSON.stringify(this.tags, null, 2));
  }

  private appendCommitLine(record: CommitRecord): void {
    fs.appendFileSync(this.commitsPath, `${JSON.stringify(record)}\n`, 'utf8');
  }

  // --- snapshots -----------------------------------------------------------

  private writeSnapshot(state: SavedState): string {
    const json = JSON.stringify(state);
    const ref = this.hash(json);
    const gz = zlib.gzipSync(Buffer.from(json, 'utf8'));
    const filePath = path.join(this.snapshotsDir, `${ref}.json.gz`);
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, gz);
    try {
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore
      }
      throw error;
    }
    return ref;
  }

  private readSnapshot(ref: string): SavedState {
    const filePath = path.join(this.snapshotsDir, `${ref}.json.gz`);
    const gz = fs.readFileSync(filePath);
    return JSON.parse(zlib.gunzipSync(gz).toString('utf8')) as SavedState;
  }

  private writeHead(state: SavedState): void {
    this.writeFileAtomic(this.headPath, JSON.stringify(state));
  }

  // --- commit --------------------------------------------------------------

  /**
   * Record a state transition. Returns the new commit, or null when the state
   * is identical to HEAD (nothing to commit).
   */
  commit(state: SavedState, options: CommitOptions = {}): CommitRecord | null {
    const delta = computeDelta(this.headState, state);
    if (isEmptyDelta(delta)) return null;

    const operation = describeOperation(delta, this.headState, state, options.operationHint);
    const timestamp = options.timestamp ?? new Date().toISOString();
    const author = options.author ?? 'user';
    const parentId = this.index.headId;
    const id = this.hash(JSON.stringify({ parentId, timestamp, operation, delta }));

    const record: CommitRecord = {
      id,
      parentId,
      timestamp,
      author,
      operation,
      delta,
      stats: { participants: state.participants?.length ?? 0 },
    };

    const shouldSnapshot =
      this.index.lastSnapshotId === null || this.commits.length % SNAPSHOT_EVERY === 0;
    if (shouldSnapshot) {
      record.snapshotRef = this.writeSnapshot(state);
    }

    this.appendCommitLine(record);
    this.commits.push(record);
    this.commitById.set(id, record);

    this.index = {
      headId: id,
      commitCount: this.commits.length,
      lastSnapshotId: record.snapshotRef ?? this.index.lastSnapshotId,
      schemaVersion: SCHEMA_VERSION,
    };
    this.saveIndex();

    this.writeHead(state);
    this.headState = deepClone(state);
    return record;
  }

  // --- read / restore ------------------------------------------------------

  getHeadId(): string | null {
    return this.index.headId;
  }

  getHeadState(): SavedState | null {
    return this.headState ? deepClone(this.headState) : null;
  }

  getCommitCount(): number {
    return this.commits.length;
  }

  getCommit(id: string): CommitRecord | undefined {
    return this.commitById.get(id);
  }

  /** Reconstruct the state at a commit by replaying deltas from a base snapshot. */
  resolveState(commitId: string): SavedState {
    if (commitId === this.index.headId && this.headState) {
      return deepClone(this.headState);
    }

    const chain: CommitRecord[] = [];
    let current = this.commitById.get(commitId);
    if (!current) throw new Error(`Unknown commit: ${commitId}`);

    while (current) {
      chain.push(current);
      if (current.snapshotRef) break;
      current = current.parentId ? this.commitById.get(current.parentId) : undefined;
    }

    const base = chain[chain.length - 1];
    if (!base.snapshotRef) {
      throw new Error(`No base snapshot found for commit: ${commitId}`);
    }

    let state = this.readSnapshot(base.snapshotRef);
    for (let i = chain.length - 2; i >= 0; i--) {
      state = applyDelta(state, chain[i].delta);
    }
    return state;
  }

  listCommits(): CommitSummary[] {
    return this.commits.map((commit) => ({
      id: commit.id,
      parentId: commit.parentId,
      timestamp: commit.timestamp,
      author: commit.author,
      operation: commit.operation,
      stats: commit.stats,
      isSnapshot: Boolean(commit.snapshotRef),
    }));
  }

  // --- tags (named checkpoints) -------------------------------------------

  listTags(): HistoryTag[] {
    return [...this.tags];
  }

  addTag(name: string, commitId: string): HistoryTag {
    const tag: HistoryTag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name,
      commitId,
      timestamp: new Date().toISOString(),
    };
    this.tags.push(tag);
    this.saveTags();
    return tag;
  }

  removeTag(tagId: string): void {
    this.tags = this.tags.filter((tag) => tag.id !== tagId);
    this.saveTags();
  }

  /**
   * Restore the data to a previous commit by appending a new forward-only
   * "restore" commit (non-destructive; keeps a linear, undoable history).
   */
  checkout(commitId: string): SavedState | null {
    const target = this.commitById.get(commitId);
    if (!target) return null;

    const state = this.resolveState(commitId);
    const operation: OperationInfo = {
      kind: 'checkout',
      description: `Restored to "${target.operation.description}" (${target.timestamp})`,
    };
    this.commit(state, { operationHint: operation, author: 'user' });
    return state;
  }

  // --- legacy migration & maintenance -------------------------------------

  private listJsonFiles(dir: string): { file: string; mtimeMs: number }[] {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.toLowerCase().endsWith('.json'))
      .map((name) => {
        const file = path.join(dir, name);
        return { file, mtimeMs: fs.statSync(file).mtimeMs };
      })
      .sort((a, b) => a.mtimeMs - b.mtimeMs);
  }

  private tryReadJson(file: string): any {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }

  private looksLikeState(value: any): value is SavedState {
    return Boolean(value && Array.isArray(value.participants));
  }

  /**
   * On first run (empty history) import the legacy scheduled backups,
   * checkpoints and the current autosave as the initial commit chain.
   * Checkpoints become tags. Original files are left intact.
   * Returns the number of commits imported.
   */
  seedFromLegacy(): number {
    if (this.commits.length > 0) return 0;

    interface Source {
      timestamp: string;
      description: string;
      kind: OperationKind;
      state: SavedState;
      tag?: string;
    }
    const sources: Source[] = [];

    for (const { file, mtimeMs } of this.listJsonFiles(this.legacyBackupsDir)) {
      const raw = this.tryReadJson(file);
      if (this.looksLikeState(raw)) {
        const when = new Date(mtimeMs);
        sources.push({
          timestamp: when.toISOString(),
          description: `Backup snapshot ${when.toLocaleString()}`,
          kind: 'snapshot',
          state: raw,
        });
      }
    }

    for (const { file } of this.listJsonFiles(this.legacyCheckpointsDir)) {
      const raw = this.tryReadJson(file);
      if (this.looksLikeState(raw?.state)) {
        const name = typeof raw?.name === 'string' ? raw.name : 'Checkpoint';
        sources.push({
          timestamp: typeof raw?.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
          description: `Checkpoint: ${name}`,
          kind: 'checkpoint',
          state: raw.state,
          tag: name,
        });
      }
    }

    sources.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let imported = 0;
    for (const source of sources) {
      const record = this.commit(source.state, {
        operationHint: { kind: source.kind, description: source.description },
        author: 'system',
        timestamp: source.timestamp,
      });
      if (record) {
        imported += 1;
        if (source.tag) this.addTag(source.tag, record.id);
      }
    }

    const head = this.readHeadFile();
    if (head) {
      const record = this.commit(head, { author: 'system' });
      if (record) imported += 1;
    }
    return imported;
  }

  /** Delete snapshot blobs that no commit references (defensive tidy-up). */
  pruneOrphanSnapshots(): number {
    if (!fs.existsSync(this.snapshotsDir)) return 0;
    const referenced = new Set<string>();
    for (const commit of this.commits) {
      if (commit.snapshotRef) referenced.add(`${commit.snapshotRef}.json.gz`);
    }
    let removed = 0;
    for (const name of fs.readdirSync(this.snapshotsDir)) {
      if (!name.endsWith('.json.gz')) continue;
      if (!referenced.has(name)) {
        try {
          fs.unlinkSync(path.join(this.snapshotsDir, name));
          removed += 1;
        } catch {
          // ignore
        }
      }
    }
    return removed;
  }
}


