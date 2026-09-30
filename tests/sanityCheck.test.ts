import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import SanityCheck from '../src/renderer/components/SanityCheck';
import { useTournamentStore } from '../src/renderer/store/tournamentStore';
import type { TournamentState } from '../types/tournament';
import { createTestParticipant, resetTestIds } from './fixtures';

function loadState(state: Partial<TournamentState>) {
  useTournamentStore.getState().loadStateFromData({
    participants: [],
    categories: [],
    config: { divisions: [{ name: 'Beginner', order: 1, numRings: 2 }], physicalRings: [] },
    physicalRingMappings: [],
    categoryPoolMappings: [],
    ...state,
  } as unknown as TournamentState);
}

describe('SanityCheck', () => {
  beforeEach(() => {
    resetTestIds();
    useTournamentStore.getState().reset();
  });

  it('shows an empty state before any data is loaded', () => {
    const { container } = render(React.createElement(SanityCheck));
    expect(container.textContent).toContain('No participants loaded');
  });

  it('renders division totals and the unmapped breakdown', () => {
    loadState({
      participants: [
        createTestParticipant({
          id: 'p1',
          firstName: 'A',
          lastName: 'One',
          formsDivision: 'Beginner',
          sparringDivision: 'Beginner',
          competingForms: true,
          competingSparring: true,
        }),
        createTestParticipant({
          id: 'p2',
          firstName: 'B',
          lastName: 'Two',
          formsDivision: null,
          sparringDivision: null,
          competingForms: true,
          competingSparring: false,
        }),
      ],
    });

    const { container } = render(React.createElement(SanityCheck));
    const text = container.textContent || '';

    expect(text).toContain('Sanity Check');
    expect(text).toContain('Beginner');
    expect(text).toContain('All divisions (sum)');
    expect(text).toContain('Not counted in a division');
    expect(text).toContain('Competing but no division');
    expect(text).toContain('Show who they are (1)');
    expect(text).toContain('B Two — Competing but no division');
  });
});
