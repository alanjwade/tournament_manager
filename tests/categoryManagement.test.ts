import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import CategoryManagement from '../src/renderer/components/CategoryManagement';
import { useTournamentStore } from '../src/renderer/store/tournamentStore';
import type { TournamentState } from '../types/tournament';

/**
 * Regression test: loading a saved database that has no categories and contains
 * participants with a missing (null) age used to crash the Categories tab
 * (TypeError: Cannot read properties of null (reading 'toString')), leaving the
 * whole screen blank.
 */
describe('CategoryManagement', () => {
  beforeEach(() => {
    useTournamentStore.getState().reset();
  });

  it('renders when participants have a null age and no categories exist', () => {
    const state = {
      participants: [
        {
          id: 'p1',
          firstName: 'John',
          lastName: 'Doe',
          age: null, // legacy/imported data may omit the age
          gender: 'male',
          heightFeet: 4,
          heightInches: 6,
          school: 'Test School',
          formsDivision: 'Black Belt',
          sparringDivision: 'Black Belt',
          competingForms: true,
          competingSparring: true,
          totalHeightInches: 54,
        },
        {
          id: 'p2',
          firstName: 'Jane',
          lastName: 'Doe',
          age: 12,
          gender: 'female',
          heightFeet: 4,
          heightInches: 8,
          school: 'Test School',
          formsDivision: 'Black Belt',
          sparringDivision: 'Black Belt',
          competingForms: true,
          competingSparring: true,
          totalHeightInches: 56,
        },
      ],
      categories: [],
      config: {
        divisions: [{ name: 'Black Belt', order: 1, numRings: 2 }],
        physicalRings: [],
      },
      physicalRingMappings: [],
      categoryPoolMappings: [],
    } as unknown as TournamentState;

    useTournamentStore.getState().loadStateFromData(state);

    const { container } = render(React.createElement(CategoryManagement));

    expect(container.textContent).toContain('Category Management');
    expect(container.textContent).toContain('No categories created yet');
  });
});
