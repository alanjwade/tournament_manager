import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import CategoryManagement from '../src/renderer/components/CategoryManagement';
import { useTournamentStore } from '../src/renderer/store/tournamentStore';
import type { TournamentState } from '../types/tournament';

function loadState(state: Partial<TournamentState>) {
  useTournamentStore.getState().loadStateFromData({
    participants: [],
    categories: [],
    config: { divisions: [{ name: 'Black Belt', order: 1 }], physicalRings: [], schoolAbbreviations: {} },
    physicalRingMappings: [],
    categoryPoolMappings: [],
    ...state,
  } as TournamentState);
}

const formsCategory = {
  id: 'forms-Black Belt-male-8-12', name: 'Male 8-12', division: 'Black Belt',
  type: 'forms' as const, gender: 'male' as const, minAge: 8, maxAge: 12, numPools: 1,
};
const sparringCategory = { ...formsCategory, id: 'sparring-Black Belt-male-8-12', type: 'sparring' as const };

const assignedParticipant = {
  id: 'p1', firstName: 'John', lastName: 'Doe', age: 10, gender: 'Male',
  heightFeet: 4, heightInches: 6, school: 'S', formsDivision: 'Black Belt',
  sparringDivision: 'Black Belt', competingForms: true, competingSparring: true,
  formsCategoryId: formsCategory.id, formsPool: 'P1',
  sparringCategoryId: sparringCategory.id, sparringPool: 'P1',
};

describe('removing a category', () => {
  beforeEach(() => {
    useTournamentStore.getState().reset();
    localStorage.setItem('division-categories', 'Black Belt');
  });

  it('removes both forms+sparring twins and clears ALL participant references (incl. stale pool)', () => {
    loadState({ categories: [formsCategory, sparringCategory], participants: [assignedParticipant] });

    const { getAllByText } = render(React.createElement(CategoryManagement));
    fireEvent.click(getAllByText('Remove')[0]);

    const state = useTournamentStore.getState();
    expect(state.categories).toHaveLength(0);
    expect(state.participants[0].formsCategoryId).toBeUndefined();
    expect(state.participants[0].formsPool).toBeUndefined();
    expect(state.participants[0].sparringCategoryId).toBeUndefined();
    expect(state.participants[0].sparringPool).toBeUndefined();
  });

  it('also prunes category pool mappings and custom ring ordering', () => {
    loadState({
      categories: [formsCategory, sparringCategory],
      participants: [assignedParticipant],
      categoryPoolMappings: [
        { division: 'Black Belt', categoryId: formsCategory.id, pool: 'P1', physicalRingId: 'PR1' },
      ],
      customOrderRings: [`forms-${formsCategory.id}-P1`, 'forms-other-cat-P1'],
    });

    useTournamentStore.getState().removeCategories([formsCategory.id, sparringCategory.id]);

    const state = useTournamentStore.getState();
    expect(state.categoryPoolMappings).toHaveLength(0);
    expect(state.customOrderRings).toEqual(['forms-other-cat-P1']);
  });

  it('removes a sparring-only category without touching other categories', () => {
    loadState({
      categories: [sparringCategory],
      participants: [{ ...assignedParticipant, formsCategoryId: undefined, formsPool: undefined }],
    });

    const { getAllByText } = render(React.createElement(CategoryManagement));
    fireEvent.click(getAllByText('Remove')[0]);

    const state = useTournamentStore.getState();
    expect(state.categories).toHaveLength(0);
    expect(state.participants[0].sparringCategoryId).toBeUndefined();
  });
});

describe('importing data', () => {
  beforeEach(() => useTournamentStore.getState().reset());

  it('replaces the roster and clears old categories and derived state', () => {
    loadState({
      categories: [formsCategory, sparringCategory],
      participants: [assignedParticipant],
      categoryPoolMappings: [{ division: 'Black Belt', categoryId: formsCategory.id, pool: 'P1', physicalRingId: 'PR1' }],
      physicalRingMappings: [{ categoryPoolName: 'Black Belt - Male 8-12 Pool 1', physicalRingName: 'Ring 1' }],
      customOrderRings: [`forms-${formsCategory.id}-P1`],
    });

    const imported = [
      { ...assignedParticipant, id: 'new-1', firstName: 'New', lastName: 'Person' },
    ];

    useTournamentStore.getState().importParticipants(imported);

    const state = useTournamentStore.getState();
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0].id).toBe('new-1');
    expect(state.participants[0].formsCategoryId).toBeUndefined();
    expect(state.participants[0].sparringCategoryId).toBeUndefined();
    expect(state.categories).toEqual([]);
    expect(state.categoryPoolMappings).toEqual([]);
    expect(state.physicalRingMappings).toEqual([]);
    expect(state.customOrderRings).toEqual([]);
  });
});

