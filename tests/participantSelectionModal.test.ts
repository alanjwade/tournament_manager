import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import ParticipantSelectionModal from '../src/renderer/components/ParticipantSelectionModal';
import { useTournamentStore } from '../src/renderer/store/tournamentStore';
import type { TournamentState } from '../types/tournament';
import { createTestParticipant, resetTestIds } from './fixtures';

function loadParticipants(participants: TournamentState['participants']) {
  useTournamentStore.getState().loadStateFromData({
    participants,
    categories: [],
    config: { divisions: [{ name: 'Level 1', order: 1 }], physicalRings: [] },
    physicalRingMappings: [],
    categoryPoolMappings: [],
  } as unknown as TournamentState);
}

describe('ParticipantSelectionModal', () => {
  beforeEach(() => {
    resetTestIds();
    useTournamentStore.getState().reset();
  });

  it('filters with a single combined first/last name search', () => {
    loadParticipants([
      createTestParticipant({ id: 'p1', firstName: 'John', lastName: 'Smith' }),
      createTestParticipant({ id: 'p2', firstName: 'Jane', lastName: 'Smith' }),
      createTestParticipant({ id: 'p3', firstName: 'John', lastName: 'Doe' }),
    ]);

    render(
      React.createElement(ParticipantSelectionModal, {
        onSelect: vi.fn(),
        onClose: vi.fn(),
      })
    );

    const search = screen.getByPlaceholderText('Search by first or last name...');

    // Tokens may be given in any order and span both name parts.
    fireEvent.change(search, { target: { value: 'smith jo' } });

    expect(screen.getByText('John Smith')).toBeTruthy();
    expect(screen.queryByText('Jane Smith')).toBeNull();
    expect(screen.queryByText('John Doe')).toBeNull();

    fireEvent.change(search, { target: { value: 'doe john' } });

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.queryByText('John Smith')).toBeNull();
  });
});
