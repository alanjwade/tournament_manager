import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTournamentStore } from '../src/renderer/store/tournamentStore';
import type { Participant, Category } from '../types/tournament';

describe('RingMapEditor - Division Switching Bug', () => {
  beforeEach(() => {
    // Reset store before each test
    const { reset } = useTournamentStore.getState();
    reset();
  });

  it('should preserve mappings when switching between divisions', () => {
    const { result } = renderHook(() => useTournamentStore());

    // Create participants for Beginner division
    const beginnerParticipants: Participant[] = [
      {
        id: 'p1',
        firstName: 'John',
        lastName: 'Doe',
        age: 8,
        gender: 'Male',
        heightFeet: 4,
        heightInches: 2,
        totalHeightInches: 50,
        school: 'Test School',
        branch: 'test-branch',
        division: 'Beginner',
        competesInForms: true,
        competesInSparring: false,
        formsDivision: 'Beginner',
        formsCategoryId: 'beginner-forms-1',
        formsPool: 'P1',
      },
      {
        id: 'p2',
        firstName: 'Jane',
        lastName: 'Smith',
        age: 9,
        gender: 'Female',
        heightFeet: 4,
        heightInches: 3,
        totalHeightInches: 51,
        school: 'Test School',
        branch: 'test-branch',
        division: 'Beginner',
        competesInForms: true,
        competesInSparring: false,
        formsDivision: 'Beginner',
        formsCategoryId: 'beginner-forms-1',
        formsPool: 'P2',
      },
    ];

    // Create participants for Level 1 division
    const level1Participants: Participant[] = [
      {
        id: 'p3',
        firstName: 'Bob',
        lastName: 'Johnson',
        age: 10,
        gender: 'Male',
        heightFeet: 4,
        heightInches: 5,
        totalHeightInches: 53,
        school: 'Test School',
        branch: 'test-branch',
        division: 'Level 1',
        competesInForms: true,
        competesInSparring: false,
        formsDivision: 'Level 1',
        formsCategoryId: 'level1-forms-1',
        formsPool: 'P1',
      },
      {
        id: 'p4',
        firstName: 'Alice',
        lastName: 'Williams',
        age: 11,
        gender: 'Female',
        heightFeet: 4,
        heightInches: 6,
        totalHeightInches: 54,
        school: 'Test School',
        branch: 'test-branch',
        division: 'Level 1',
        competesInForms: true,
        competesInSparring: false,
        formsDivision: 'Level 1',
        formsCategoryId: 'level1-forms-1',
        formsPool: 'P2',
      },
    ];

    // Add categories
    const categories: Category[] = [
      {
        id: 'beginner-forms-1',
        name: 'Beginner Forms',
        division: 'Beginner',
        type: 'forms',
        gender: 'Mixed',
        minAge: 8,
        maxAge: 10,
        numPools: 2,
      },
      {
        id: 'level1-forms-1',
        name: 'Level 1 Forms',
        division: 'Level 1',
        type: 'forms',
        gender: 'Mixed',
        minAge: 10,
        maxAge: 12,
        numPools: 2,
      },
    ];

    act(() => {
      result.current.setParticipants([...beginnerParticipants, ...level1Participants]);
      result.current.setCategories(categories);
    });

    // Simulate assigning Beginner division pools to physical rings
    // New format: "Division - CategoryName Pool N"
    const beginnerMappings = [
      { categoryPoolName: 'Beginner - Beginner Forms Pool 1', physicalRingName: 'Ring 1' },
      { categoryPoolName: 'Beginner - Beginner Forms Pool 2', physicalRingName: 'Ring 2' },
    ];

    act(() => {
      result.current.setPhysicalRingMappings(beginnerMappings);
    });

    // Verify Beginner mappings are saved
    expect(result.current.physicalRingMappings).toHaveLength(2);
    expect(result.current.physicalRingMappings).toEqual(expect.arrayContaining(beginnerMappings));

    // Now assign Level 1 division pools to physical rings
    const level1Mappings = [
      { categoryPoolName: 'Level 1 - Level 1 Forms Pool 1', physicalRingName: 'Ring 1' },
      { categoryPoolName: 'Level 1 - Level 1 Forms Pool 2', physicalRingName: 'Ring 2' },
    ];

    act(() => {
      // Simulate the RingMapEditor's handleConfirm logic
      const currentDivisionRingNames = new Set(['Level 1 - Level 1 Forms Pool 1', 'Level 1 - Level 1 Forms Pool 2']);
      const otherDivisionMappings = result.current.physicalRingMappings.filter(
        m => !currentDivisionRingNames.has(m.categoryPoolName)
      );
      const allMappings = [...otherDivisionMappings, ...level1Mappings];
      result.current.setPhysicalRingMappings(allMappings);
    });

    // Verify both divisions' mappings are preserved
    expect(result.current.physicalRingMappings).toHaveLength(4);
    expect(result.current.physicalRingMappings).toEqual(
      expect.arrayContaining([...beginnerMappings, ...level1Mappings])
    );

    // Verify Beginner mappings are still there
    const beginnerP1Mapping = result.current.physicalRingMappings.find(
      m => m.categoryPoolName === 'Beginner - Beginner Forms Pool 1'
    );
    expect(beginnerP1Mapping).toBeDefined();
    expect(beginnerP1Mapping?.physicalRingName).toBe('Ring 1');

    const beginnerP2Mapping = result.current.physicalRingMappings.find(
      m => m.categoryPoolName === 'Beginner - Beginner Forms Pool 2'
    );
    expect(beginnerP2Mapping).toBeDefined();
    expect(beginnerP2Mapping?.physicalRingName).toBe('Ring 2');
  });
});
