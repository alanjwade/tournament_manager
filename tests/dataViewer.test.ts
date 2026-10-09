import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import DataViewer from '../src/renderer/components/DataViewer';
import { useTournamentStore } from '../src/renderer/store/tournamentStore';
import { computeCompetitionRings } from '../src/renderer/utils/computeRings';
import type { TournamentState } from '../types/tournament';
import { createTestCategory, createTestParticipant, resetTestIds } from './fixtures';

function loadState(state: Partial<TournamentState>) {
  useTournamentStore.getState().loadStateFromData({
    participants: [],
    categories: [],
    config: { divisions: [{ name: 'Level 1', order: 1 }], physicalRings: [] },
    physicalRingMappings: [],
    categoryPoolMappings: [],
    ...state,
  } as unknown as TournamentState);
}

describe('DataViewer (Editor)', () => {
  beforeEach(() => {
    resetTestIds();
    useTournamentStore.getState().reset();
  });

  it('creates and assigns the Sparring twin category when enabling competing sparring', () => {
    const forms = createTestCategory({
      id: 'forms-Level 1-male-8-12',
      name: 'Male 8-12',
      type: 'forms',
      division: 'Level 1',
      gender: 'male',
      minAge: 8,
      maxAge: 12,
      numPools: 2,
    });
    loadState({
      categories: [forms],
      participants: [
        createTestParticipant({
          id: 'p1',
          age: 10,
          gender: 'male',
          formsDivision: 'Level 1',
          sparringDivision: null,
          formsCategoryId: forms.id,
          formsPool: 'P1',
          competingForms: true,
          competingSparring: false,
        }),
      ],
    });

    const { container } = render(React.createElement(DataViewer));

    const sparringCheckbox = container.querySelector(
      'td.sparring-column input[type="checkbox"]'
    ) as HTMLInputElement;
    expect(sparringCheckbox).toBeTruthy();
    fireEvent.click(sparringCheckbox);

    const updated = useTournamentStore.getState().participants.find(p => p.id === 'p1')!;
    expect(updated.competingSparring).toBe(true);
    expect(updated.sparringDivision).toBe('Level 1');
    expect(updated.sparringCategoryId).toBe('sparring-Level 1-male-8-12');
    expect(updated.sparringPool).toBe('P1');

    expect(
      useTournamentStore.getState().categories.some(c => c.id === 'sparring-Level 1-male-8-12')
    ).toBe(true);
  });

  it('fills the Sparring Ring column from the Forms physical-ring mapping', () => {
    const forms = createTestCategory({
      id: 'forms-Level 1-male-8-12',
      name: 'Male 8-12',
      type: 'forms',
      division: 'Level 1',
      gender: 'male',
      minAge: 8,
      maxAge: 12,
      numPools: 2,
    });
    // A sparring category whose name differs, so the sparring ring is not covered
    // by the shared forms category-pool key.
    const sparring = createTestCategory({
      id: 'sparring-Level 1-male-8-10',
      name: 'Male 8-10',
      type: 'sparring',
      division: 'Level 1',
      gender: 'male',
      minAge: 8,
      maxAge: 10,
      numPools: 2,
    });

    loadState({
      categories: [forms, sparring],
      participants: [
        createTestParticipant({
          id: 'p1',
          age: 9,
          gender: 'male',
          formsDivision: 'Level 1',
          sparringDivision: 'Level 1',
          formsCategoryId: forms.id,
          formsPool: 'P1',
          sparringCategoryId: sparring.id,
          sparringPool: 'P2',
          competingForms: true,
          competingSparring: false,
        }),
      ],
      physicalRingMappings: [
        { categoryPoolName: 'Level 1 - Male 8-12 Pool 1', physicalRingName: 'Ring 2' },
      ],
    });

    const { container } = render(React.createElement(DataViewer));

    expect(container.querySelector('td.sparring-physical-column')?.textContent).toContain('Not competing');

    const sparringCheckbox = container.querySelector(
      'td.sparring-column input[type="checkbox"]'
    ) as HTMLInputElement;
    fireEvent.click(sparringCheckbox);

    expect(container.querySelector('td.sparring-physical-column')?.textContent).toContain('Ring 2');
    expect(useTournamentStore.getState().physicalRingMappings).toContainEqual({
      categoryPoolName: 'Level 1 - Male 8-10 Pool 2',
      physicalRingName: 'Ring 2',
    });
  });

  it('assigns a pool (so the participant shows up in a ring) when a forms category is chosen inline', () => {
    const forms = createTestCategory({
      id: 'forms-Level 1-male-8-12',
      name: 'Male 8-12',
      type: 'forms',
      division: 'Level 1',
      gender: 'male',
      minAge: 8,
      maxAge: 12,
      numPools: 2,
    });
    loadState({
      categories: [forms],
      participants: [
        createTestParticipant({
          id: 'p1',
          age: 10,
          gender: 'male',
          formsDivision: 'Level 1',
          competingForms: true,
          competingSparring: false,
        }),
      ],
    });

    const { container } = render(React.createElement(DataViewer));

    // The forms category <select> is the one offering the category id.
    const categorySelect = Array.from(container.querySelectorAll('select')).find(select =>
      Array.from(select.options).some(option => option.value === forms.id)
    ) as HTMLSelectElement | undefined;
    expect(categorySelect).toBeTruthy();

    fireEvent.change(categorySelect!, { target: { value: forms.id } });

    const state = useTournamentStore.getState();
    const updated = state.participants.find(p => p.id === 'p1')!;
    expect(updated.formsCategoryId).toBe(forms.id);
    // Regression: previously the pool stayed empty, so the participant was
    // invisible in every ring/PDF even though a category had been chosen.
    expect(updated.formsPool).toBeDefined();

    const rings = computeCompetitionRings(state.participants, state.categories, state.categoryPoolMappings);
    expect(rings.some(r => r.participantIds.includes('p1'))).toBe(true);
  });

  it('deletes a participant when the Delete button is confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    loadState({
      participants: [
        createTestParticipant({ id: 'p1', firstName: 'First', lastName: 'Last' }),
        createTestParticipant({ id: 'p2', firstName: 'Second', lastName: 'Person' }),
      ],
    });

    const { container } = render(React.createElement(DataViewer));

    const deleteButtons = Array.from(container.querySelectorAll('button')).filter(
      b => b.textContent === 'Delete'
    );
    expect(deleteButtons).toHaveLength(2);

    fireEvent.click(deleteButtons[0]);

    const remaining = useTournamentStore.getState().participants;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('p2');
  });

  it('does not delete when the confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    loadState({
      participants: [createTestParticipant({ id: 'p1' })],
    });

    const { container } = render(React.createElement(DataViewer));
    const deleteButton = Array.from(container.querySelectorAll('button')).find(
      b => b.textContent === 'Delete'
    )!;
    fireEvent.click(deleteButton);

    expect(useTournamentStore.getState().participants).toHaveLength(1);
  });
});
