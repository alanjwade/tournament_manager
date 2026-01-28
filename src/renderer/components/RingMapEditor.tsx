import React, { useState, useMemo, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings } from '../utils/computeRings';
import { getEffectiveDivision } from '../utils/excelParser';
import { formatPoolNameForDisplay } from '../utils/ringNameFormatter';
import { PhysicalRing } from '../types/tournament';

interface RingAssignmentRow {
  categoryPoolName: string;
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

interface RingMapEditorProps {
  globalDivision?: string;
}

function RingMapEditor({ globalDivision }: RingMapEditorProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const setPhysicalRingMappings = useTournamentStore((state) => state.setPhysicalRingMappings);
  const updatePhysicalRingMapping = useTournamentStore((state) => state.updatePhysicalRingMapping);
  const setPhysicalRings = useTournamentStore((state) => state.setPhysicalRings);
  const config = useTournamentStore((state) => state.config);
  
  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
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
  
  const [selectedDivision, setSelectedDivision] = useState<string>(globalDivision && globalDivision !== 'all' ? globalDivision : 'Black Belt');
  const [numPhysicalRings, setNumPhysicalRings] = useState<number>(14);
  const [assignments, setAssignments] = useState<RingAssignmentRow[]>([]);
  const [isDirty, setIsDirty] = useState(false); // Track if user has made changes

  // Sync with global division when it changes
  useEffect(() => {
    if (globalDivision && globalDivision !== 'all') {
      setSelectedDivision(globalDivision);
    }
  }, [globalDivision]);

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
        // Extract base ring number from Ring 1a, Ring 1b, Ring 2a, etc. (or PR1a, PR1b for legacy)
        const match = m.physicalRingName.match(/(?:PR|Ring\s*)(\d+)/i);
        if (match) {
          uniqueRings.add(match[1]);
        }
      });
      if (uniqueRings.size > 0) {
        setNumPhysicalRings(uniqueRings.size);
      }
    }
  }, []);

  // Get sorted pools for the selected division
  const sortedPools = useMemo(() => {
    const ringMap = new Map<string, {
      ringName: string;
      division: string;
      minAge: number;
      participantIds: Set<string>;
    }>();

    competitionRings
      .filter(r => r.division === selectedDivision)
      .forEach((ring) => {
        const category = categories.find((c) => c.id === ring.categoryId);
        const ringName = ring.name || `${ring.division} Ring`;
        
        // Use just the ring name as key (don't separate forms/sparring)
        if (!ringMap.has(ringName)) {
          ringMap.set(ringName, {
            ringName,
            division: ring.division,
            minAge: category?.minAge || 0,
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
        participantIds: ring.participantIds,
      }))
      .sort((a, b) => {
        // Sort by age
        if (a.minAge !== b.minAge) {
          return a.minAge - b.minAge;
        }
        // Then alphabetically by name
        return a.ringName.localeCompare(b.ringName);
      });
  }, [competitionRings, categories, selectedDivision]);

  // Load assignments when division changes - get from store
  useEffect(() => {
    console.log('[RingMapEditor] Loading assignments for division:', selectedDivision);
    console.log('[RingMapEditor] sortedPools:', sortedPools.map(r => r.ringName));
    console.log('[RingMapEditor] physicalRingMappings:', physicalRingMappings);
    
    const newAssignments: RingAssignmentRow[] = sortedPools.map(ring => {
      const mapping = physicalRingMappings.find(m => m.categoryPoolName === ring.ringName);
      console.log(`[RingMapEditor] Looking for "${ring.ringName}", found:`, mapping);
      return {
        categoryPoolName: ring.ringName,
        division: ring.division,
        minAge: ring.minAge,
        participantCount: ring.participantIds.size,
        physicalRingName: mapping?.physicalRingName || '', // Empty string if not in store
      };
    });
    
    console.log('[RingMapEditor] New assignments:', newAssignments);
    setAssignments(newAssignments);
    setIsDirty(false); // Reset dirty flag when loading new division
  }, [selectedDivision, sortedPools, physicalRingMappings]);

  // Auto-assign physical rings sequentially (updates local state only)
  const handleAutoAssign = () => {
    const physicalRingNames: string[] = [];

    // Generate physical ring names based on numPhysicalRings
    for (let i = 1; i <= numPhysicalRings; i++) {
      physicalRingNames.push(`Ring ${i}`);
    }

    // Assign all pools sequentially
    const needsSuffixes = sortedPools.length > numPhysicalRings;
    const newAssignments: RingAssignmentRow[] = sortedPools.map((ring, index) => {
      let physicalRingName: string;
      
      if (needsSuffixes) {
        // Use pairs with suffixes: Ring 1a, Ring 1b, Ring 2a, Ring 2b, etc.
        const pairIndex = Math.floor(index / 2);
        const withinPair = index % 2;
        const ringIndex = pairIndex % numPhysicalRings;
        const basePhysicalRing = physicalRingNames[ringIndex];
        const suffixes = 'abcdefghijklmnopqrstuvwxyz';
        physicalRingName = `${basePhysicalRing}${suffixes[withinPair]}`;
      } else {
        // Enough rings - assign sequentially: Ring 1, Ring 2, Ring 3, etc.
        physicalRingName = physicalRingNames[index];
      }
      
      return {
        categoryPoolName: ring.ringName,
        division: ring.division,
        minAge: ring.minAge,
        participantCount: ring.participantCount,
        physicalRingName,
      };
    });

    setAssignments(newAssignments);
    setIsDirty(true); // Mark as dirty
  };

  // Handle manual edit of physical ring assignment (updates local state only)
  const handlePhysicalRingChange = (categoryPoolName: string, newPhysicalRing: string) => {
    const updatedAssignments = assignments.map(a =>
      a.categoryPoolName === categoryPoolName
        ? { ...a, physicalRingName: newPhysicalRing }
        : a
    );
    setAssignments(updatedAssignments);
    setIsDirty(true); // Mark as dirty
  };

  // Confirm and save assignments to the store
  const handleConfirm = () => {
    // Only save assignments that have a physical ring assigned
    const newMappings = assignments
      .filter(a => a.physicalRingName.trim() !== '')
      .map(a => ({
        categoryPoolName: a.categoryPoolName,
        physicalRingName: a.physicalRingName,
      }));
    
    // Keep mappings from other divisions, replace only current division's mappings
    // Use the ring names from current assignments to identify what to replace
    const currentDivisionRingNames = new Set(assignments.map(a => a.categoryPoolName));
    const otherDivisionMappings = physicalRingMappings.filter(
      m => !currentDivisionRingNames.has(m.categoryPoolName)
    );
    
    const allMappings = [...otherDivisionMappings, ...newMappings];
    console.log('[RingMapEditor] handleConfirm - Division:', selectedDivision);
    console.log('[RingMapEditor] handleConfirm - Current division ring names (count: ' + currentDivisionRingNames.size + '):', Array.from(currentDivisionRingNames));
    console.log('[RingMapEditor] handleConfirm - Existing mappings in store (count: ' + physicalRingMappings.length + '):', physicalRingMappings);
    console.log('[RingMapEditor] handleConfirm - Other division mappings (count: ' + otherDivisionMappings.length + '):', otherDivisionMappings);
    console.log('[RingMapEditor] handleConfirm - New mappings for current division (count: ' + newMappings.length + '):', newMappings);
    console.log('[RingMapEditor] handleConfirm - Final all mappings (count: ' + allMappings.length + '):', allMappings);
    setPhysicalRingMappings(allMappings);
    setIsDirty(false); // Clear dirty flag
  };

  return (
    <div style={{ width: 'fit-content', minWidth: 0 }}>
      <h2>Ring Map Editor</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Assign pools to physical rings. Select a division, and you'll see any previously saved assignments. 
        Use "Auto Assign" to automatically fill the form, edit manually as needed, then click "Confirm" to save.
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
          className="btn btn-secondary"
          disabled={sortedPools.length === 0}
          title="Automatically assign pools to physical rings"
        >
          🔄 Auto Assign
        </button>
      </div>

      {/* Assignments Table */}
      {assignments.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
          {sortedPools.length === 0 ? (
            <>No pools found for {selectedDivision}. Assign rings in the "Category Ring Assignment" tab first.</>
          ) : (
            <>View and edit assignments below, or click "Auto Assign" to automatically assign pools to physical rings</>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Category Ring Name
                </th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Division
                </th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Min Age
                </th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Participants
                </th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Physical Ring
                </th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment, index) => (
                <tr
                  key={`${assignment.categoryPoolName}`}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                  }}
                >
                  <td style={{ padding: '10px', color: 'var(--text-primary)' }}>
                    {formatPoolNameForDisplay(assignment.categoryPoolName)}
                  </td>
                  <td style={{ padding: '10px', color: 'var(--text-primary)' }}>
                    {assignment.division}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-primary)' }}>
                    {assignment.minAge}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-primary)' }}>
                    {assignment.participantCount}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="text"
                      value={assignment.physicalRingName}
                      onChange={(e) =>
                        handlePhysicalRingChange(assignment.categoryPoolName, e.target.value)
                      }
                      placeholder="e.g., Ring 1, Ring 1a"
                      style={{
                        width: '120px',
                        padding: '5px',
                        fontSize: '13px',
                        border: '1px solid var(--input-border)',
                        borderRadius: '3px',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-primary)',
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
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: '5px', color: 'var(--info-text)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <strong>Summary:</strong>
              <div style={{ marginTop: '5px' }}>
                Total pools for {selectedDivision}: {assignments.length}
              </div>
              <div>
                Physical rings used: {new Set(assignments.map(a => a.physicalRingName).filter(Boolean)).size}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px' }}>
                {isDirty ? '✏️ You have unsaved changes.' : '✓ No unsaved changes.'}
              </div>
            </div>
            <button
              onClick={handleConfirm}
              className="btn btn-success"
              disabled={!isDirty}
              title={isDirty ? 'Save the assignments to the store' : 'No changes to save'}
              style={{ marginTop: 0 }}
            >
              ✓ Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RingMapEditor;
