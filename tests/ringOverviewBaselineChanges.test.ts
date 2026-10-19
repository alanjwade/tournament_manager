import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import React from 'react';
import RingOverview from '../src/renderer/components/RingOverview';
import { useTournamentStore } from '../src/renderer/store/tournamentStore';
import type { TournamentState } from '../types/tournament';
import { createTestCategory, createTestParticipant, resetTestIds } from './fixtures';

// RingOverview subscribes to history and observes its content width.
const mockElectronAPI = {
  historyShow: vi.fn().mockResolvedValue({ success: false }),
  historyLog: vi.fn().mockResolvedValue({ success: true, data: [], headId: null }),
  historyTags: vi.fn().mockResolvedValue({ success: true, data: [] }),
  historyAddTag: vi.fn().mockResolvedValue({ success: true }),
  saveAutosave: vi.fn().mockResolvedValue({ success: true }),
};

(global.window as any).electronAPI = mockElectronAPI;

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = MockResizeObserver;

describe('RingOverview baseline change details', () => {
  beforeEach(() => {
    resetTestIds();
    useTournamentStore.getState().reset();
    localStorage.setItem('tournament-division', 'Black Belt');
  });

  it('shows the old and new name when a participant is renamed', async () => {
    const participant = createTestParticipant({
      id: 'p1',
      firstName: 'Old',
      lastName: 'Name',
      formsDivision: 'Black Belt',
      formsCategoryId: 'cat1',
      formsPool: 'P1',
      formsRankOrder: 1,
      competingForms: true,
      competingSparring: false,
    });
    const category = createTestCategory({
      id: 'cat1',
      name: 'Beginner',
      type: 'forms',
      division: 'Black Belt',
      numPools: 1,
    });
    const config = {
      divisions: [{ name: 'Black Belt', order: 1 }],
      physicalRings: [],
    };

    const baseline = {
      participants: [participant],
      categories: [category],
      config,
      physicalRingMappings: [],
      categoryPoolMappings: [],
    } as unknown as TournamentState;

    useTournamentStore.getState().loadStateFromData(baseline);
    useTournamentStore.setState({
      baselineState: baseline,
      baselineCommitId: 'baseline',
      historyHeadId: 'baseline',
    });

    useTournamentStore.getState().updateParticipant('p1', {
      firstName: 'New',
      lastName: 'Person',
    });

    await act(async () => {
      render(React.createElement(RingOverview));
    });

    const changesButton = screen.getByRole('button', { name: /Changes since baseline/i });
    fireEvent.click(changesButton);

    expect(screen.getByText('Old Name changed to New Person')).toBeTruthy();
  });
});
