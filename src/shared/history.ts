/**
 * Shared, pure helpers for the git-like history system.
 *
 * This module contains NO Node/DOM APIs so it can be imported by both the
 * Electron main process (CommonJS) and the renderer bundle (ESM via Vite).
 *
 * Responsibilities:
 *  - Persisted history data types (commits, deltas, tags)
 *  - `computeDelta` / `applyDelta`: compact, record-level diffs between two
 *    `TournamentState` snapshots and the inverse operation
 *  - `describeOperation`: turn a delta into a human-readable operation
 *
 * The store remains the single source of truth; every commit is a state
 * transition (parent snapshot + delta) plus the operation that caused it.
 */
import type {
  Participant,
  Category,
  TournamentConfig,
  PhysicalRingMapping,
  CategoryPoolMapping,
  CustomRing,
  TournamentState as SavedState,
} from '../../types/tournament';

export type OperationKind =
  | 'participant.add'
  | 'participant.remove'
  | 'participant.move'
  | 'participant.update'
  | 'participant.withdraw'
  | 'participant.restore'
  | 'participant.reorder'
  | 'import'
  | 'category'
  | 'config'
  | 'ringmap'
  | 'customRing'
  | 'snapshot'
  | 'checkpoint'
  | 'checkout';

/** A single record's field-level change. `removed` lists keys that became undefined. */
export interface FieldChange<T> {
  id: string;
  changes: Partial<T>;
  removed?: (keyof T)[];
}

/** Delta for a keyed list (participants, categories). */
export interface SliceDelta<T> {
  added?: T[];
  removed?: string[];
  updated?: FieldChange<T>[];
  /** Full id order, present only when it differs from the natural reconstruction. */
  order?: string[];
}

/** Field-level change for a single object (config). */
export interface ObjectChange<T> {
  changes: Partial<T>;
  removed?: (keyof T)[];
}

export interface StateDelta {
  participants?: SliceDelta<Participant>;
  categories?: SliceDelta<Category>;
  config?: ObjectChange<TournamentConfig>;
  physicalRingMappings?: PhysicalRingMapping[];
  categoryPoolMappings?: CategoryPoolMapping[];
  customRings?: CustomRing[];
  customOrderRings?: string[];
}

export interface OperationInfo {
  kind: OperationKind;
  description: string;
}

export interface CommitRecord {
  id: string;
  parentId: string | null;
  timestamp: string;
  author: 'user' | 'system';
  operation: OperationInfo;
  delta: StateDelta;
  /** Set when this commit is backed by a full snapshot blob (base commits). */
  snapshotRef?: string;
  stats: { participants: number };
}

/** Lightweight projection of a commit for the history UI. */
export interface CommitSummary {
  id: string;
  parentId: string | null;
  timestamp: string;
  author: 'user' | 'system';
  operation: OperationInfo;
  stats: { participants: number };
  isSnapshot: boolean;
}

/** A named pointer to a commit (replaces the old standalone checkpoint files). */
export interface HistoryTag {
  id: string;
  name: string;
  commitId: string;
  timestamp: string;
}

/** Optional intent supplied by the renderer for exact messages. */
export interface OperationHint {
  kind: OperationKind;
  description: string;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Structural equality sufficient for JSON-serializable tournament state. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compare two records field-by-field. Keys whose new value is `undefined` are
 * recorded in `removed` rather than in `changes`, because JSON serialization
 * would otherwise silently drop them and the patch would fail to clear the old
 * value on replay.
 */
function diffFields<T extends object>(
  prev: T,
  next: T
): { changes: Partial<T>; removed: (keyof T)[] } | null {
  const changes: Record<string, unknown> = {};
  const removed: (keyof T)[] = [];
  const keys = new Set<string>([...Object.keys(prev), ...Object.keys(next)]);
  let count = 0;
  for (const key of keys) {
    const a = (prev as Record<string, unknown>)[key];
    const b = (next as Record<string, unknown>)[key];
    if (sameValue(a, b)) continue;
    count++;
    if (b === undefined) {
      removed.push(key as keyof T);
    } else {
      changes[key] = b;
    }
  }
  return count > 0 ? { changes: changes as Partial<T>, removed } : null;
}

function idsOf<T extends { id: string }>(records: T[]): string[] {
  return records.map((r) => r.id);
}

function orderKey(ids: string[]): string {
  return ids.join('\u0000');
}

function computeSliceDelta<T extends { id: string }>(prev: T[], next: T[]): SliceDelta<T> | null {
  const prevMap = new Map(prev.map((r) => [r.id, r]));
  const nextMap = new Map(next.map((r) => [r.id, r]));

  const added: T[] = [];
  const removed: string[] = [];
  const updated: FieldChange<T>[] = [];

  for (const record of next) {
    if (!prevMap.has(record.id)) added.push(deepClone(record));
  }
  for (const record of prev) {
    if (!nextMap.has(record.id)) removed.push(record.id);
  }
  for (const record of next) {
    const old = prevMap.get(record.id);
    if (!old) continue;
    const diff = diffFields(old, record);
    if (diff) updated.push({ id: record.id, changes: diff.changes, removed: diff.removed });
  }

  // Reconstruct the order the delta would naturally produce (base order with
  // removals dropped, additions appended) and only store an explicit order when
  // it does not match the real order.
  const nextIds = new Set(idsOf(next));
  const naturalOrder = idsOf(prev.filter((r) => nextIds.has(r.id)));
  for (const record of added) naturalOrder.push(record.id);
  const orderChanged = orderKey(naturalOrder) !== orderKey(idsOf(next));

  if (added.length === 0 && removed.length === 0 && updated.length === 0 && !orderChanged) {
    return null;
  }

  const result: SliceDelta<T> = {};
  if (added.length > 0) result.added = added;
  if (removed.length > 0) result.removed = removed;
  if (updated.length > 0) result.updated = updated;
  if (orderChanged) result.order = idsOf(next);

  return result;
}

function diffObject<T extends object>(prev: T, next: T): ObjectChange<T> | null {
  const diff = diffFields(prev, next);
  if (!diff) return null;
  return { changes: diff.changes, removed: diff.removed };
}


/**
 * Build the minimal delta that transitions `prev` into `next`.
 * Returns an empty object when the two states are identical.
 */
export function computeDelta(prev: SavedState | null, next: SavedState): StateDelta {
  const delta: StateDelta = {};

  const participantDelta = computeSliceDelta<Participant>(
    prev?.participants ?? [],
    next.participants ?? []
  );
  if (participantDelta) delta.participants = participantDelta;

  const categoryDelta = computeSliceDelta<Category>(
    prev?.categories ?? [],
    next.categories ?? []
  );
  if (categoryDelta) delta.categories = categoryDelta;

  const configChange = diffObject<TournamentConfig>(
    prev?.config ?? ({} as TournamentConfig),
    next.config ?? ({} as TournamentConfig)
  );
  if (configChange) delta.config = configChange;

  if (!sameValue(prev?.physicalRingMappings ?? [], next.physicalRingMappings ?? [])) {
    delta.physicalRingMappings = deepClone(next.physicalRingMappings ?? []);
  }
  if (!sameValue(prev?.categoryPoolMappings ?? [], next.categoryPoolMappings ?? [])) {
    delta.categoryPoolMappings = deepClone(next.categoryPoolMappings ?? []);
  }
  if (!sameValue(prev?.customRings ?? [], next.customRings ?? [])) {
    delta.customRings = deepClone(next.customRings ?? []);
  }
  if (!sameValue(prev?.customOrderRings ?? [], next.customOrderRings ?? [])) {
    delta.customOrderRings = [...(next.customOrderRings ?? [])];
  }

  return delta;
}

function applySlice<T extends { id: string }>(base: T[], delta: SliceDelta<T>): T[] {
  const byId = new Map<string, T>();
  for (const record of base) byId.set(record.id, deepClone(record));

  for (const change of delta.updated ?? []) {
    const record = byId.get(change.id);
    if (!record) continue;
    Object.assign(record, change.changes);
    for (const key of change.removed ?? []) {
      delete (record as Record<string, unknown>)[key as string];
    }
  }
  for (const id of delta.removed ?? []) byId.delete(id);
  for (const record of delta.added ?? []) byId.set(record.id, deepClone(record));

  let ids: string[];
  if (delta.order) {
    ids = delta.order;
  } else {
    const ordered = idsOf(base).filter((id) => byId.has(id));
    for (const record of delta.added ?? []) ordered.push(record.id);
    ids = ordered;
  }

  const result: T[] = [];
  for (const id of ids) {
    const record = byId.get(id);
    if (record) result.push(record);
  }
  return result;
}

/** Inverse of `computeDelta`: apply a delta to a base state. */
export function applyDelta(base: SavedState, delta: StateDelta): SavedState {
  const next = deepClone(base) as SavedState;

  if (delta.participants) next.participants = applySlice(next.participants ?? [], delta.participants);
  if (delta.categories) next.categories = applySlice(next.categories ?? [], delta.categories);

  if (delta.config) {
    const config = { ...(next.config ?? {}) } as Record<string, unknown>;
    Object.assign(config, delta.config.changes);
    for (const key of delta.config.removed ?? []) {
      delete config[key as string];
    }
    next.config = config as unknown as TournamentConfig;
  }

  if (delta.physicalRingMappings) next.physicalRingMappings = deepClone(delta.physicalRingMappings);
  if (delta.categoryPoolMappings) next.categoryPoolMappings = deepClone(delta.categoryPoolMappings);
  if (delta.customRings) next.customRings = deepClone(delta.customRings);
  if (delta.customOrderRings) next.customOrderRings = [...delta.customOrderRings];

  return next;
}

export function isEmptyDelta(delta: StateDelta): boolean {
  return Object.keys(delta).length === 0;
}


// ---------------------------------------------------------------------------
// Operation description
// ---------------------------------------------------------------------------

interface ParticipantEvent {
  id: string;
  name: string;
  kind: 'move' | 'withdraw' | 'restore' | 'reorder' | 'update';
  type: 'forms' | 'sparring';
  fromLabel?: string;
  toLabel?: string;
}

/** Human-readable category pool label, e.g. "Beginner - Mixed 7-9 Pool 1". */
function poolLabel(
  categories: Category[],
  categoryId: string | undefined,
  pool: string | undefined,
  altRing?: string
): string | undefined {
  if (!categoryId) return undefined;
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return undefined;
  const poolDisplay = pool ? pool.replace(/^P(\d+)$/, 'Pool $1') : undefined;
  let label = poolDisplay
    ? `${category.division} - ${category.name} ${poolDisplay}`
    : `${category.division} - ${category.name}`;
  if (altRing) label += ` (Ring ${altRing.toUpperCase()})`;
  return label;
}

function addedPoolSuffix(record: Participant, categories: Category[]): string {
  if (record.competingForms && record.formsCategoryId) {
    const label = poolLabel(categories, record.formsCategoryId, record.formsPool);
    if (label) return ` to ${label} (forms)`;
  }
  if (record.competingSparring && record.sparringCategoryId) {
    const label = poolLabel(
      categories,
      record.sparringCategoryId,
      record.sparringPool,
      record.sparringAltRing || undefined
    );
    if (label) return ` to ${label} (sparring)`;
  }
  return '';
}

function describeMove(event: ParticipantEvent): string {
  const typeLabel = event.type;
  if (event.fromLabel && event.toLabel) {
    return `Moved ${event.name} from ${event.fromLabel} to ${event.toLabel} (${typeLabel})`;
  }
  if (event.toLabel) return `Moved ${event.name} to ${event.toLabel} (${typeLabel})`;
  if (event.fromLabel) return `Removed ${event.name} from ${event.fromLabel} (${typeLabel})`;
  return `Changed ${event.name}'s ${typeLabel} pool`;
}

function collectParticipantEvents(
  delta: StateDelta,
  prev: SavedState | null,
  next: SavedState
): ParticipantEvent[] {
  const prevParticipants = new Map((prev?.participants ?? []).map((p) => [p.id, p]));
  const nextParticipants = new Map((next.participants ?? []).map((p) => [p.id, p]));
  const prevCategories = prev?.categories ?? [];
  const nextCategories = next.categories ?? [];

  const events: ParticipantEvent[] = [];

  for (const change of delta.participants?.updated ?? []) {
    const previous = prevParticipants.get(change.id);
    const current = nextParticipants.get(change.id);
    const record = current ?? previous;
    if (!record) continue;

    const keys = new Set<string>([
      ...Object.keys(change.changes),
      ...(change.removed ?? []).map((key) => String(key)),
    ]);
    const name = `${record.firstName} ${record.lastName}`;

    if (change.changes.withdrawn === true) {
      events.push({ id: change.id, name, kind: 'withdraw', type: 'forms' });
      continue;
    }
    if (change.changes.withdrawn === false) {
      events.push({ id: change.id, name, kind: 'restore', type: 'forms' });
      continue;
    }

    const formsMoved = keys.has('formsCategoryId') || keys.has('formsPool');
    const sparringMoved =
      keys.has('sparringCategoryId') || keys.has('sparringPool') || keys.has('sparringAltRing');

    if (formsMoved || sparringMoved) {
      const type: 'forms' | 'sparring' = formsMoved ? 'forms' : 'sparring';
      const fromLabel =
        type === 'forms'
          ? poolLabel(prevCategories, previous?.formsCategoryId, previous?.formsPool)
          : poolLabel(
              prevCategories,
              previous?.sparringCategoryId,
              previous?.sparringPool,
              previous?.sparringAltRing || undefined
            );
      const toLabel =
        type === 'forms'
          ? poolLabel(nextCategories, current?.formsCategoryId, current?.formsPool)
          : poolLabel(
              nextCategories,
              current?.sparringCategoryId,
              current?.sparringPool,
              current?.sparringAltRing || undefined
            );
      events.push({ id: change.id, name, kind: 'move', type, fromLabel, toLabel });
      continue;
    }

    if (keys.has('formsRankOrder') || keys.has('sparringRankOrder')) {
      const type: 'forms' | 'sparring' = keys.has('formsRankOrder') ? 'forms' : 'sparring';
      const toLabel =
        type === 'forms'
          ? poolLabel(nextCategories, current?.formsCategoryId, current?.formsPool)
          : poolLabel(
              nextCategories,
              current?.sparringCategoryId,
              current?.sparringPool,
              current?.sparringAltRing || undefined
            );
      events.push({ id: change.id, name, kind: 'reorder', type, toLabel });
      continue;
    }

    events.push({ id: change.id, name, kind: 'update', type: 'forms' });
  }

  return events;
}


interface Candidate {
  priority: number;
  kind: OperationKind;
  description: string;
  units: number;
}

/**
 * Turn a delta into the operation that produced it. When the renderer supplies
 * a hint (for an explicit user action) that wins outright; otherwise the
 * description is derived from the delta and the before/after states.
 */
export function describeOperation(
  delta: StateDelta,
  prev: SavedState | null,
  next: SavedState,
  hint?: OperationHint
): OperationInfo {
  if (hint) return { kind: hint.kind, description: hint.description };

  const participants = delta.participants;
  const addedCount = participants?.added?.length ?? 0;
  const removedCount = participants?.removed?.length ?? 0;
  const updatedCount = participants?.updated?.length ?? 0;

  const componentCount =
    (delta.categories ? 1 : 0) +
    (delta.config ? 1 : 0) +
    (delta.physicalRingMappings ? 1 : 0) +
    (delta.categoryPoolMappings ? 1 : 0) +
    (delta.customRings ? 1 : 0) +
    (delta.customOrderRings ? 1 : 0);
  const totalUnits = addedCount + removedCount + updatedCount + componentCount;

  const events = collectParticipantEvents(delta, prev, next);
  const candidates: Candidate[] = [];

  if (addedCount > 1) {
    candidates.push({
      priority: 60,
      kind: 'import',
      description: `Imported ${addedCount} participants`,
      units: addedCount,
    });
  }
  if (addedCount === 1) {
    const record = participants!.added![0];
    candidates.push({
      priority: 40,
      kind: 'participant.add',
      description: `Added ${record.firstName} ${record.lastName}${addedPoolSuffix(record, next.categories ?? [])}`,
      units: 1,
    });
  }
  if (removedCount > 1) {
    candidates.push({
      priority: 39,
      kind: 'participant.remove',
      description: `Removed ${removedCount} participants`,
      units: removedCount,
    });
  }
  if (removedCount === 1) {
    const record = (prev?.participants ?? []).find((p) => p.id === participants!.removed![0]);
    candidates.push({
      priority: 38,
      kind: 'participant.remove',
      description: record ? `Removed ${record.firstName} ${record.lastName}` : 'Removed 1 participant',
      units: 1,
    });
  }

  const withdraw = events.find((event) => event.kind === 'withdraw');
  if (withdraw) {
    candidates.push({
      priority: 50,
      kind: 'participant.withdraw',
      description: `Withdrew ${withdraw.name}`,
      units: 1,
    });
  }
  const move = events.find((event) => event.kind === 'move');
  if (move) {
    candidates.push({
      priority: 45,
      kind: 'participant.move',
      description: describeMove(move),
      units: 1,
    });
  }
  const restore = events.find((event) => event.kind === 'restore');
  if (restore) {
    candidates.push({
      priority: 44,
      kind: 'participant.restore',
      description: `Restored ${restore.name}`,
      units: 1,
    });
  }
  const reorder = events.find((event) => event.kind === 'reorder');
  if (reorder) {
    candidates.push({
      priority: 30,
      kind: 'participant.reorder',
      description: reorder.toLabel
        ? `Reordered ${reorder.name} in ${reorder.toLabel}`
        : `Reordered ${reorder.name}`,
      units: 1,
    });
  }
  const update = events.find((event) => event.kind === 'update');
  if (update) {
    candidates.push({
      priority: 20,
      kind: 'participant.update',
      description: `Updated ${update.name}`,
      units: 1,
    });
  }

  if (delta.categories) candidates.push({ priority: 15, kind: 'category', description: 'Updated categories', units: 1 });
  if (delta.customRings) candidates.push({ priority: 14, kind: 'customRing', description: 'Updated grand champion rings', units: 1 });
  if (delta.categoryPoolMappings) candidates.push({ priority: 13, kind: 'ringmap', description: 'Updated pool-to-ring mapping', units: 1 });
  if (delta.config) candidates.push({ priority: 12, kind: 'config', description: 'Updated tournament configuration', units: 1 });
  if (delta.physicalRingMappings) candidates.push({ priority: 12, kind: 'ringmap', description: 'Updated ring naming', units: 1 });
  if (delta.customOrderRings) candidates.push({ priority: 10, kind: 'config', description: 'Updated custom ring ordering', units: 1 });

  if (candidates.length === 0) {
    return { kind: 'config', description: 'Updated tournament data' };
  }

  candidates.sort((a, b) => b.priority - a.priority);
  const chosen = candidates[0];
  // On the initial commit (no prior state) the other "changes" are just the
  // first-time import of categories/config, so keep the message clean.
  const others = prev ? totalUnits - chosen.units : 0;
  const description = others > 0 ? `${chosen.description} (+${others} other change${others === 1 ? '' : 's'})` : chosen.description;
  return { kind: chosen.kind, description };
}

