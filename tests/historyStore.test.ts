/**
 * Tests for the main-process HistoryStore: commit chain, snapshots, restore,
 * checkpoint tags and persistence across restarts. Uses a temp directory.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { HistoryStore } from '../src/main/history/store';
import type { TournamentState as SavedState } from '../types/tournament';
import { createTestParticipant } from './fixtures';

function buildState(overrides: Partial<SavedState> = {}): SavedState {
  return {
    participants: [],
    categories: [],
    config: { divisions: [], physicalRings: [], schoolAbbreviations: {} },
    physicalRingMappings: [],
    categoryPoolMappings: [],
    customRings: [],
    customOrderRings: [],
    ...overrides,
  };
}

const alice = (age = 10) =>
  createTestParticipant({ id: 'p1', firstName: 'Alice', lastName: 'Smith', age });

describe('HistoryStore', () => {
  let dataDir: string;
  let store: HistoryStore;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-history-'));
    store = new HistoryStore(dataDir);
    store.init();
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('creates the first commit as a base snapshot', () => {
    const record = store.commit(buildState({ participants: [alice()] }));
    expect(record).not.toBeNull();
    expect(record!.snapshotRef).toBeTruthy();
    expect(record!.parentId).toBeNull();
    expect(store.getHeadId()).toBe(record!.id);
    expect(store.getCommitCount()).toBe(1);
  });

  it('does not commit when nothing changed', () => {
    const state = buildState({ participants: [alice()] });
    store.commit(state);
    expect(store.commit(state)).toBeNull();
    expect(store.getCommitCount()).toBe(1);
  });

  it('resolves any commit in the chain', () => {
    const first = store.commit(buildState({ participants: [alice(10)] }))!;
    const second = store.commit(buildState({ participants: [alice(11)] }))!;
    const third = store.commit(buildState({ participants: [alice(12)] }))!;

    expect(store.resolveState(first.id).participants[0].age).toBe(10);
    expect(store.resolveState(second.id).participants[0].age).toBe(11);
    expect(store.resolveState(third.id).participants[0].age).toBe(12);
    expect(store.getHeadState()!.participants[0].age).toBe(12);
  });

  it('writes head state to tournament-autosave.json', () => {
    store.commit(buildState({ participants: [alice(9)] }));
    const headPath = path.join(dataDir, 'tournament-autosave.json');
    expect(fs.existsSync(headPath)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(headPath, 'utf8')) as SavedState;
    expect(parsed.participants[0].age).toBe(9);
  });

  it('restores an earlier state via a forward-only checkout commit', () => {
    const first = store.commit(buildState({ participants: [alice(10)] }))!;
    store.commit(buildState({ participants: [alice(12)] }));

    const restored = store.checkout(first.id);
    expect(restored!.participants[0].age).toBe(10);
    expect(store.getHeadState()!.participants[0].age).toBe(10);

    const summaries = store.listCommits();
    expect(summaries[summaries.length - 1].operation.kind).toBe('checkout');
  });

  it('manages checkpoint tags', () => {
    const first = store.commit(buildState({ participants: [alice()] }))!;
    const tag = store.addTag('Round 1', first.id);
    expect(store.listTags()).toHaveLength(1);
    expect(store.listTags()[0].name).toBe('Round 1');

    store.removeTag(tag.id);
    expect(store.listTags()).toHaveLength(0);
  });

  it('persists the chain across a restart', () => {
    const first = store.commit(buildState({ participants: [alice(10)] }))!;
    store.commit(buildState({ participants: [alice(11)] }));

    const reloaded = new HistoryStore(dataDir);
    reloaded.init();

    expect(reloaded.getCommitCount()).toBe(2);
    expect(reloaded.getHeadState()!.participants[0].age).toBe(11);
    expect(reloaded.resolveState(first.id).participants[0].age).toBe(10);
  });

  it('records the operation description on each commit', () => {
    store.commit(buildState({ participants: [alice()] }));
    const summaries = store.listCommits();
    expect(summaries[0].operation.description).toContain('Alice Smith');
  });
});

describe('HistoryStore legacy migration', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-history-migrate-'));
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('imports legacy backups and checkpoints as the initial chain', () => {
    fs.mkdirSync(path.join(dataDir, 'backups'), { recursive: true });
    fs.mkdirSync(path.join(dataDir, 'checkpoints'), { recursive: true });

    fs.writeFileSync(
      path.join(dataDir, 'backups', 'backup-1.json'),
      JSON.stringify(buildState({ participants: [alice(10)] }))
    );
    fs.writeFileSync(
      path.join(dataDir, 'checkpoints', 'cp1.json'),
      JSON.stringify({
        id: 'cp1',
        name: 'Round 1',
        timestamp: new Date(Date.now() + 1000).toISOString(),
        state: buildState({ participants: [alice(13)] }),
      })
    );

    const store = new HistoryStore(dataDir);
    store.init();
    const imported = store.seedFromLegacy();

    expect(imported).toBeGreaterThanOrEqual(2);
    expect(store.listTags().map((t) => t.name)).toContain('Round 1');
    expect(store.getHeadState()!.participants[0].age).toBe(13);
  });
});

