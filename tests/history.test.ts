/**
 * Tests for the shared, pure history helpers (delta compute/apply + operation
 * description). These do not touch fs; the HistoryStore is tested separately.
 */
import { describe, it, expect } from 'vitest';
import {
  computeDelta,
  applyDelta,
  describeOperation,
  isEmptyDelta,
} from '../src/shared/history';
import type { TournamentState as SavedState, Category } from '../types/tournament';
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

const category: Category = {
  id: 'c1',
  name: 'Mixed 7-9',
  division: 'Beginner',
  type: 'forms',
  gender: 'mixed',
  minAge: 7,
  maxAge: 9,
  numPools: 2,
};

const mason = () =>
  createTestParticipant({
    id: 'p1',
    firstName: 'Mason',
    lastName: 'Crosby',
    formsCategoryId: 'c1',
    formsPool: 'P1',
    competingForms: true,
  });

describe('computeDelta / applyDelta', () => {
  it('returns an empty delta for identical states', () => {
    const state = buildState({ participants: [mason()], categories: [category] });
    const delta = computeDelta(
      state,
      buildState({ participants: [mason()], categories: [category] })
    );
    expect(isEmptyDelta(delta)).toBe(true);
  });

  it('round-trips added, removed and updated participants', () => {
    const prev = buildState({ participants: [mason()], categories: [category] });
    const added = createTestParticipant({ id: 'p2', firstName: 'New', lastName: 'Person' });
    const updated = { ...mason(), age: 11 };
    const next = buildState({ participants: [updated, added], categories: [category] });

    const delta = computeDelta(prev, next);

    expect(delta.participants?.added?.map((p) => p.id)).toEqual(['p2']);
    expect(delta.participants?.updated?.map((u) => u.id)).toEqual(['p1']);
    expect(applyDelta(prev, delta)).toEqual(next);
  });

  it('records and replays removed (undefined) fields', () => {
    const prev = buildState({ participants: [mason()], categories: [category] });
    const next = buildState({
      participants: [{ ...mason(), formsPool: undefined }],
      categories: [category],
    });

    const delta = computeDelta(prev, next);
    expect(delta.participants?.updated?.[0].removed).toContain('formsPool');

    const restored = applyDelta(prev, delta);
    expect(restored.participants[0].formsPool).toBeUndefined();
  });

  it('captures and replays an order-only change', () => {
    const p1 = createTestParticipant({ id: 'a' });
    const p2 = createTestParticipant({ id: 'b' });
    const p3 = createTestParticipant({ id: 'c' });
    const prev = buildState({ participants: [p1, p2, p3] });
    const next = buildState({ participants: [p3, p1, p2] });

    const delta = computeDelta(prev, next);
    expect(delta.participants?.order).toEqual(['c', 'a', 'b']);
    expect(applyDelta(prev, delta).participants.map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('round-trips config changes including removed keys', () => {
    const prev = buildState({
      config: { divisions: [], physicalRings: [], watermarkImage: 'data:image/png;base64,abc' },
    });
    const next = buildState({
      config: { divisions: [], physicalRings: [], schoolAbbreviations: { X: 'Y' } },
    });

    const delta = computeDelta(prev, next);
    expect(delta.config?.removed).toContain('watermarkImage');
    expect(applyDelta(prev, delta)).toEqual(next);
  });

  it('round-trips mapping and custom ring slices', () => {
    const prev = buildState();
    const next = buildState({
      physicalRingMappings: [{ categoryPoolName: 'x', physicalRingName: 'Ring 1' }],
      categoryPoolMappings: [
        { division: 'Beginner', categoryId: 'c1', pool: 'P1', physicalRingId: 'Ring 1' },
      ],
      customRings: [{ id: 'cr1', name: 'GC', type: 'forms', participantIds: ['p1'], createdAt: 'now' }],
      customOrderRings: ['forms-c1-P1'],
    });

    const delta = computeDelta(prev, next);
    expect(applyDelta(prev, delta)).toEqual(next);
  });
});

describe('describeOperation', () => {
  it('describes a pool move', () => {
    const prev = buildState({ participants: [mason()], categories: [category] });
    const next = buildState({ participants: [{ ...mason(), formsPool: 'P2' }], categories: [category] });
    const delta = computeDelta(prev, next);

    expect(describeOperation(delta, prev, next).description).toBe(
      'Moved Mason Crosby to Beginner - Mixed 7-9 Pool 2'
    );
  });

  it('describes a move where forms and sparring stay locked together', () => {
    const sparringCategory: Category = { ...category, id: 'c1s', type: 'sparring' };
    const both = () =>
      createTestParticipant({
        id: 'p1',
        firstName: 'Mason',
        lastName: 'Crosby',
        formsCategoryId: 'c1',
        formsPool: 'P1',
        sparringCategoryId: 'c1s',
        sparringPool: 'P1',
        competingForms: true,
        competingSparring: true,
      });
    const prev = buildState({ participants: [both()], categories: [category, sparringCategory] });
    const next = buildState({
      participants: [{ ...both(), formsPool: 'P2', sparringPool: 'P2' }],
      categories: [category, sparringCategory],
    });
    const delta = computeDelta(prev, next);

    expect(describeOperation(delta, prev, next).description).toBe(
      'Moved Mason Crosby to Beginner - Mixed 7-9 Pool 2'
    );
  });

  it('names each competition when forms and sparring diverge', () => {
    const sparringCategory: Category = { ...category, id: 'c1s', type: 'sparring' };
    const both = () =>
      createTestParticipant({
        id: 'p1',
        firstName: 'Mason',
        lastName: 'Crosby',
        formsCategoryId: 'c1',
        formsPool: 'P1',
        sparringCategoryId: 'c1s',
        sparringPool: 'P1',
        competingForms: true,
        competingSparring: true,
      });
    const prev = buildState({ participants: [both()], categories: [category, sparringCategory] });
    const next = buildState({
      participants: [{ ...both(), formsPool: 'P2' }],
      categories: [category, sparringCategory],
    });
    const delta = computeDelta(prev, next);

    expect(describeOperation(delta, prev, next).description).toBe(
      'Moved Mason Crosby forms to Beginner - Mixed 7-9 Pool 2'
    );
  });

  it('ignores ordering-only churn when counting other changes', () => {
    const other = () =>
      createTestParticipant({
        id: 'p2',
        firstName: 'Other',
        lastName: 'Person',
        formsCategoryId: 'c1',
        formsPool: 'P1',
        formsRankOrder: 1,
        competingForms: true,
      });
    const prev = buildState({
      participants: [{ ...mason(), formsRankOrder: 1 }, other()],
      categories: [category],
    });
    // Moving Mason re-ranks Other within their shared pool, but that automatic
    // reorder must not surface as "+1 other change".
    const next = buildState({
      participants: [{ ...mason(), formsPool: 'P2', formsRankOrder: 1 }, { ...other(), formsRankOrder: 2 }],
      categories: [category],
    });
    const delta = computeDelta(prev, next);

    expect(describeOperation(delta, prev, next).description).toBe(
      'Moved Mason Crosby to Beginner - Mixed 7-9 Pool 2'
    );
  });

  it('describes a withdrawal', () => {
    const prev = buildState({ participants: [mason()], categories: [category] });
    const next = buildState({ participants: [{ ...mason(), withdrawn: true }], categories: [category] });
    const delta = computeDelta(prev, next);

    expect(describeOperation(delta, prev, next)).toMatchObject({
      kind: 'participant.withdraw',
      description: 'Withdrew Mason Crosby',
    });
  });

  it('describes a single add', () => {
    const prev = buildState({ categories: [category] });
    const next = buildState({ participants: [mason()], categories: [category] });
    const delta = computeDelta(prev, next);

    expect(describeOperation(delta, prev, next).description).toBe(
      'Added Mason Crosby to Beginner - Mixed 7-9 Pool 1 (forms)'
    );
  });

  it('describes a bulk import', () => {
    const prev = buildState();
    const next = buildState({
      participants: [
        createTestParticipant({ id: 'a' }),
        createTestParticipant({ id: 'b' }),
        createTestParticipant({ id: 'c' }),
      ],
    });
    const delta = computeDelta(prev, next);

    expect(describeOperation(delta, prev, next)).toMatchObject({
      kind: 'import',
      description: 'Imported 3 participants',
    });
  });

  it('describes a reorder', () => {
    const prev = buildState({ participants: [{ ...mason(), formsRankOrder: 1 }], categories: [category] });
    const next = buildState({ participants: [{ ...mason(), formsRankOrder: 2 }], categories: [category] });
    const delta = computeDelta(prev, next);

    expect(describeOperation(delta, prev, next).description).toBe(
      'Reordered Mason Crosby in Beginner - Mixed 7-9 Pool 1'
    );
  });

  it('appends a count of other changes', () => {
    const prev = buildState({ participants: [mason()], categories: [category] });
    const next = buildState({
      participants: [
        { ...mason(), formsPool: 'P2' },
        createTestParticipant({ id: 'extra', firstName: 'Extra', lastName: 'Person' }),
      ],
      categories: [category],
    });
    const delta = computeDelta(prev, next);

    expect(describeOperation(delta, prev, next).description).toBe(
      'Moved Mason Crosby to Beginner - Mixed 7-9 Pool 2 (+1 other change)'
    );
  });

  it('lets a hint override the derived description', () => {
    const prev = buildState({ participants: [mason()], categories: [category] });
    const next = buildState({ participants: [{ ...mason(), formsPool: 'P2' }], categories: [category] });
    const delta = computeDelta(prev, next);

    const result = describeOperation(delta, prev, next, {
      kind: 'participant.move',
      description: 'Custom move message',
    });
    expect(result.description).toBe('Custom move message');
  });
});

