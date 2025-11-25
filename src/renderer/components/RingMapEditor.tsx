import React, { useState, useMemo, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings } from '../utils/computeRings';
import { getEffectiveDivision } from '../utils/excelParser';
import { PhysicalRing } from '../types/tournament';

interface RingAssignmentRow {
  cohortRingName: string;
  division: string;
  minAge: number;
  participantCount: number;
  physicalRingName: string;
}

// Color map for physical rings (matching Configuration component)
const RING_COLOR_MAP: { [key: number]: string } = {
  1: '#ff0000',  // Red
  2: '#ffa500',  // Orange
  3: '#ffff00',  // Yellow
  4: '#34a853',  // Green
  5: '#0000ff',  // Blue
  6: '#fd2670',  // Pink
  7: '#8441be',  // Purple
  8: '#999999',  // Gray
  9: '#000000',  // Black
  10: '#b68a46', // Brown
  11: '#f78db3', // Light Pink
  12: '#6fa8dc', // Light Blue
  13: '#b6d7a8', // Light Green
  14: '#b4a7d6', // Light Purple
};

function RingMapEditor() {
  const participants = useTournamentStore((state) => state.participants);
  const cohorts = useTournamentStore((state) => state.cohorts);
  const cohortRingMappings = useTournamentStore((state) => state.cohortRingMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const setPhysicalRingMappings = useTournamentStore((state) => state.setPhysicalRingMappings);
  const updatePhysicalRingMapping = useTournamentStore((state) => state.updatePhysicalRingMapping);
  const setPhysicalRings = useTournamentStore((state) => state.setPhysicalRings);
  const config = useTournamentStore((state) => state.config);
  
  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, cohorts, cohortRingMappings),
    [participants, cohorts, cohortRingMappings]
  );

  // Get all divisions from forms participants
  const divisions = useMemo(() => {
    const divSet = new Set<string>();
    participants.forEach((p) => {
      if (p.competingForms) {
        const div = getEffectiveDivision(p, 'forms');
        if (div) divSet.add(div);
      }
    });
    return Array.from(divSet).sort((a, b) => {
      const aOrder = config.divisions.find(d => d.name === a)?.order || 999;
      const bOrder = config.divisions.find(d => d.name === b)?.order || 999;
      return aOrder - bOrder;
    });
  }, [participants, config.divisions]);
  
  const [selectedDivision, setSelectedDivision] = useState<string>('Black Belt');
  const [numPhysicalRings, setNumPhysicalRings] = useState<number>(14);
  const [assignments, setAssignments] = useState<RingAssignmentRow[]>([]);

  // Set default division on mount or when divisions change
  useEffect(() => {
    if (divisions.length > 0 && !divisions.includes(selectedDivision)) {
      setSelectedDivision(divisions[0] === 'Black Belt' ? 'Black Belt' : divisions[0]);
    }
  }, [divisions]);

  // Initialize numPhysicalRings from existing mappings on mount
  useEffect(() => {
    if (physicalRingMappings.length > 0) {
      // Extract unique physical ring names and determine count
      const uniqueRings = new Set<string>();
      physicalRingMappings.forEach(m => {
        // Extract base ring number from PR1a, PR1b, PR2a, etc.
        const match = m.physicalRingName.match(/^PR(\d+)/);
        if (match) {
          uniqueRings.add(match[1]);
        }
      });
      if (uniqueRings.size > 0) {
        setNumPhysicalRings(uniqueRings.size);
      }
    }
  }, []);

  // Get sorted cohort rings for the selected division
  const sortedCohortRings = useMemo(() => {
    const ringMap = new Map<string, {
      ringName: string;
      division: string;
      minAge: number;
      participantIds: Set<string>; // Use Set to avoid double-counting
    }>();

    competitionRings
      .filter(r => r.division === selectedDivision)
      .forEach((ring) => {
        const cohort = cohorts.find((c) => c.id === ring.cohortId);
        const ringName = ring.name || `${ring.division} Ring`;
        
        if (!ringMap.has(ringName)) {
          ringMap.set(ringName, {
            ringName,
            division: ring.division,
            minAge: cohort?.minAge || 0,
            participantIds: new Set(ring.participantIds),
          });
        } else {
          // Add unique participant IDs if this ring name already exists
          const existing = ringMap.get(ringName)!;
          ring.participantIds.forEach(id => existing.participantIds.add(id));
        }
      });

    return Array.from(ringMap.values())
      .map(ring => ({
        ringName: ring.ringName,
        division: ring.division,
        minAge: ring.minAge,
        participantCount: ring.participantIds.size, // Count unique participants
      }))
      .sort((a, b) => {
        // Sort by age first
        if (a.minAge !== b.minAge) {
          return a.minAge - b.minAge;
        }
        // Then alphabetically by name
        return a.ringName.localeCompare(b.ringName);
      });
  }, [competitionRings, cohorts, selectedDivision]);

  // Auto-assign physical rings sequentially
  const handleAutoAssign = () => {
    const newAssignments: RingAssignmentRow[] = [];
    const physicalRingNames: string[] = [];

    // Generate physical ring names based on numPhysicalRings
    for (let i = 1; i <= numPhysicalRings; i++) {
      physicalRingNames.push(`PR${i}`);
    }

    // Assign physical rings
    // Cohorts are already sorted by age (youngest to oldest)
    const needsSuffixes = sortedCohortRings.length > numPhysicalRings;
    
    sortedCohortRings.forEach((ring, index) => {
      let physicalRingName: string;
      
      if (needsSuffixes) {
        // Pattern: PR1a, PR1b, PR2a, PR2b, PR3a, PR3b, etc.
        // - Pair index: which pair (0 = PR1a/PR1b, 1 = PR2a/PR2b, etc.)
        // - Within pair: 0 = 'a', 1 = 'b'
        const pairIndex = Math.floor(index / 2);
        const withinPair = index % 2;
        
        // Determine which physical ring (cycles through all rings)
        const ringIndex = pairIndex % numPhysicalRings;
        const basePhysicalRing = physicalRingNames[ringIndex];
        
        // Add letter suffix based on position within pair
        const suffixes = 'abcdefghijklmnopqrstuvwxyz';
        physicalRingName = `${basePhysicalRing}${suffixes[withinPair]}`;
      } else {
        // Enough physical rings - assign sequentially without suffixes
        // Pattern: PR1, PR2, PR3, PR4, etc.
        physicalRingName = physicalRingNames[index];
      }
      
      newAssignments.push({
        cohortRingName: ring.ringName,
        division: ring.division,
        minAge: ring.minAge,
        participantCount: ring.participantCount,
        physicalRingName,
      });
    });

    setAssignments(newAssignments);

    // Save to state - merge with existing mappings from other divisions
    const newMappings = newAssignments.map(a => ({
      cohortRingName: a.cohortRingName,
      physicalRingName: a.physicalRingName,
    }));
    
    // Keep mappings from other divisions, replace only current division's mappings
    const currentDivisionRingNames = new Set(sortedCohortRings.map(r => r.ringName));
    const otherDivisionMappings = physicalRingMappings.filter(
      m => !currentDivisionRingNames.has(m.cohortRingName)
    );
    
    const allMappings = [...otherDivisionMappings, ...newMappings];
    console.log('[RingMapEditor] handleAutoAssign - Setting mappings:', allMappings);
    setPhysicalRingMappings(allMappings);
  };

  // Initialize assignments from existing mappings when division changes or mappings update
  useEffect(() => {
    console.log('[RingMapEditor] useEffect triggered');
    console.log('[RingMapEditor] selectedDivision:', selectedDivision);
    console.log('[RingMapEditor] sortedCohortRings:', sortedCohortRings.map(r => r.ringName));
    console.log('[RingMapEditor] physicalRingMappings:', physicalRingMappings);
    
    const newAssignments: RingAssignmentRow[] = sortedCohortRings.map(ring => {
      const mapping = physicalRingMappings.find(m => m.cohortRingName === ring.ringName);
      console.log(`[RingMapEditor] Looking up ${ring.ringName}, found mapping:`, mapping);
      return {
        cohortRingName: ring.ringName,
        division: ring.division,
        minAge: ring.minAge,
        participantCount: ring.participantCount,
        physicalRingName: mapping?.physicalRingName || '',
      };
    });
    
    console.log('[RingMapEditor] newAssignments:', newAssignments);
    console.log('[RingMapEditor] current assignments:', assignments);
    
    // Only update if assignments actually changed to prevent infinite loops
    const assignmentsChanged = JSON.stringify(newAssignments) !== JSON.stringify(assignments);
    console.log('[RingMapEditor] assignmentsChanged:', assignmentsChanged);
    if (assignmentsChanged) {
      setAssignments(newAssignments);
    }
  }, [sortedCohortRings, selectedDivision, physicalRingMappings]);

  // Handle manual edit of physical ring assignment
  const handlePhysicalRingChange = (cohortRingName: string, newPhysicalRing: string) => {
    console.log('[RingMapEditor] handlePhysicalRingChange called');
    console.log('[RingMapEditor] cohortRingName:', cohortRingName);
    console.log('[RingMapEditor] newPhysicalRing:', newPhysicalRing);
    
    // Update local state
    const updatedAssignments = assignments.map(a =>
      a.cohortRingName === cohortRingName
        ? { ...a, physicalRingName: newPhysicalRing }
        : a
    );
    console.log('[RingMapEditor] updatedAssignments:', updatedAssignments);
    setAssignments(updatedAssignments);

    // Save to store immediately
    console.log('[RingMapEditor] Calling updatePhysicalRingMapping');
    updatePhysicalRingMapping(cohortRingName, newPhysicalRing);
    console.log('[RingMapEditor] After updatePhysicalRingMapping, store physicalRingMappings:', useTournamentStore.getState().physicalRingMappings);
  };

  return (
    <div>
      <h2>Ring Map Editor</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Assign cohort rings to physical rings. Select a division, specify the number of physical rings,
        then click "Assign Physical Rings" to auto-assign. You can also manually edit assignments.
      </p>

      {/* Division Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>
          Division:
        </label>
        <select
          value={selectedDivision}
          onChange={(e) => setSelectedDivision(e.target.value)}
          style={{ padding: '5px 10px', fontSize: '14px' }}
        >
          {divisions.map((div) => (
            <option key={div} value={div}>
              {div}
            </option>
          ))}
        </select>
      </div>

      {/* Number of Physical Rings */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label style={{ fontWeight: 'bold' }}>
          Number of Physical Rings Available:
        </label>
        <input
          type="number"
          min={1}
          max={50}
          value={numPhysicalRings}
          onChange={(e) => setNumPhysicalRings(parseInt(e.target.value) || 1)}
          style={{ width: '80px', padding: '5px', fontSize: '14px' }}
        />
        <button
          onClick={handleAutoAssign}
          className="btn btn-primary"
          disabled={sortedCohortRings.length === 0}
        >
          Assign Physical Rings
        </button>
      </div>

      {/* Assignments Table */}
      {assignments.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
          {sortedCohortRings.length === 0 ? (
            <>No cohort rings found for {selectedDivision}. Assign rings in the "Cohort Ring Assignment" tab first.</>
          ) : (
            <>Click "Assign Physical Rings" to generate assignments</>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>
                  Cohort Ring Name
                </th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>
                  Division
                </th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>
                  Min Age
                </th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>
                  Participants
                </th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600' }}>
                  Physical Ring
                </th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment, index) => (
                <tr
                  key={assignment.cohortRingName}
                  style={{
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa',
                  }}
                >
                  <td style={{ padding: '10px' }}>
                    {assignment.cohortRingName}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {assignment.division}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {assignment.minAge}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {assignment.participantCount}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="text"
                      value={assignment.physicalRingName}
                      onChange={(e) =>
                        handlePhysicalRingChange(assignment.cohortRingName, e.target.value)
                      }
                      placeholder="e.g., PR1, PR1a"
                      style={{
                        width: '120px',
                        padding: '5px',
                        fontSize: '13px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {assignments.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '5px' }}>
          <strong>Summary:</strong>
          <div style={{ marginTop: '5px' }}>
            Total cohort rings for {selectedDivision}: {assignments.length}
          </div>
          <div>
            Physical rings used: {new Set(assignments.map(a => a.physicalRingName).filter(Boolean)).size}
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            Changes are saved automatically as you edit.
          </div>
        </div>
      )}
    </div>
  );
}

export default RingMapEditor;
