import React, { useState, useMemo } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings } from '../utils/computeRings';

interface PhysicalRingAssignment {
  physicalRingName: string;
  cohortRingName: string;
  cohortRingId: string;
  division: string;
  minAge: number;
  participantCount: number;
}

function PhysicalRingAssignment() {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const setPhysicalRingMappings = useTournamentStore((state) => state.setPhysicalRingMappings);
  
  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
  );
  
  const [numPhysicalRings, setNumPhysicalRings] = useState<number>(14);
  const [assignments, setAssignments] = useState<PhysicalRingAssignment[]>([]);

  // Get all individual pools (e.g., Mixed 8-10_R1, Mixed 8-10_R2, etc.)
  // Sort by age (youngest first)
  // Deduplicate by ring name since Forms and Sparring share the same pool name
  const sortedCohortRings = useMemo(() => {
    // Use a Map to deduplicate by ring name
    const ringMap = new Map<string, {
      ringId: string;
      ringName: string;
      division: string;
      minAge: number;
      participantCount: number;
    }>();

    competitionRings.forEach((ring) => {
      const category = categories.find((c) => c.id === ring.categoryId);
      const ringName = ring.name || `${ring.division} Ring`;
      
      if (!ringMap.has(ringName)) {
        ringMap.set(ringName, {
          ringId: ring.id,
          ringName,
          division: ring.division,
          minAge: category?.minAge || 0,
          participantCount: ring.participantIds.length,
        });
      }
    });

    return Array.from(ringMap.values()).sort((a, b) => {
      // Sort by minimum age (youngest first)
      if (a.minAge !== b.minAge) {
        return a.minAge - b.minAge;
      }
      // Then by division
      if (a.division !== b.division) {
        return a.division.localeCompare(b.division);
      }
      // Then by ring name
      return a.ringName.localeCompare(b.ringName);
    });
  }, [competitionRings, categories]);

  const handleAssignPhysicalRings = () => {
    if (numPhysicalRings < 1 || numPhysicalRings > 14) {
      alert('Please enter a number between 1 and 14 for physical rings');
      return;
    }

    if (sortedCohortRings.length === 0) {
      alert('No pools to assign. Please assign rings in Ring Assignment first.');
      return;
    }

    const newAssignments: PhysicalRingAssignment[] = [];
    const totalRings = sortedCohortRings.length;

    // If we have fewer pools than physical rings, use PR1, PR2, etc.
    if (totalRings <= numPhysicalRings) {
      sortedCohortRings.forEach((pool, index) => {
        newAssignments.push({
          physicalRingName: `PR${index + 1}`,
          cohortRingName: pool.ringName,
          cohortRingId: pool.ringId,
          division: pool.division,
          minAge: pool.minAge,
          participantCount: pool.participantCount,
        });
      });
    } else {
      // We need to wrap: fill up each physical ring before moving to next
      // Calculate sessions per ring
      const sessionsPerRing = Math.ceil(totalRings / numPhysicalRings);
      
      sortedCohortRings.forEach((pool, index) => {
        // Which physical ring number (1-based)
        const physicalRingNumber = Math.floor(index / sessionsPerRing) + 1;
        // Which session on this physical ring (0-based)
        const sessionIndex = index % sessionsPerRing;
        const suffix = String.fromCharCode(97 + sessionIndex); // 'a', 'b', 'c', etc.
        
        newAssignments.push({
          physicalRingName: `PR${physicalRingNumber}${suffix}`,
          cohortRingName: pool.ringName,
          cohortRingId: pool.ringId,
          division: pool.division,
          minAge: pool.minAge,
          participantCount: pool.participantCount,
        });
      });
    }

    setAssignments(newAssignments);
    
    // Save mappings to store
    const mappings = newAssignments.map(a => ({
      cohortRingName: a.cohortRingName,
      physicalRingName: a.physicalRingName,
    }));
    setPhysicalRingMappings(mappings);
  };

  // Group assignments by physical ring number for display
  const groupedAssignments = useMemo(() => {
    const groups = new Map<number, PhysicalRingAssignment[]>();
    
    assignments.forEach((assignment) => {
      // Extract the number from physical ring name (e.g., "PR1a" -> 1)
      const match = assignment.physicalRingName.match(/PR(\d+)/);
      if (match) {
        const ringNum = parseInt(match[1]);
        if (!groups.has(ringNum)) {
          groups.set(ringNum, []);
        }
        groups.get(ringNum)!.push(assignment);
      }
    });

    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [assignments]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <h2 className="card-title" style={{ flexShrink: 0 }}>Physical Ring Assignment</h2>

      <div style={{ flexShrink: 0, marginBottom: '20px' }}>
        <div className="info" style={{ marginBottom: '15px' }}>
          <p>
            This assigns individual pools (e.g., Mixed 8-10_R1, Mixed 8-10_R2) to physical rings.
            Younger categories are assigned to lower-numbered rings so judges can stay with similar age groups.
          </p>
          <p style={{ marginTop: '8px' }}>
            <strong>Total pools:</strong> {sortedCohortRings.length}
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleAssignPhysicalRings}
          disabled={sortedCohortRings.length === 0}
        >
          Assign to Physical Rings
        </button>
      </div>

      {assignments.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>
            Physical Ring Assignments ({assignments.length} pools)
          </h3>

          {groupedAssignments.map(([physicalRingNum, ringAssignments]) => (
            <div
              key={physicalRingNum}
              style={{
                border: '2px solid #007bff',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px',
                backgroundColor: '#f8f9fa',
              }}
            >
              <h4 style={{ marginBottom: '15px', color: '#007bff', fontSize: '18px' }}>
                Physical Ring {physicalRingNum}
                {ringAssignments.length > 1 && (
                  <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
                    ({ringAssignments.length} sessions)
                  </span>
                )}
              </h4>

              <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e9ecef', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Session</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Category Ring</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Division</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Min Age</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Participants</th>
                  </tr>
                </thead>
                <tbody>
                  {ringAssignments.map((assignment, idx) => (
                    <tr key={`${assignment.cohortRingId}-${idx}`} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', fontSize: '16px' }}>
                        {assignment.physicalRingName}
                      </td>
                      <td style={{ padding: '10px' }}>{assignment.cohortRingName}</td>
                      <td style={{ padding: '10px' }}>{assignment.division}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{assignment.minAge}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{assignment.participantCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {assignments.length === 0 && sortedCohortRings.length === 0 && (
        <div className="info">
          <p>No pools available. Please assign rings in the Ring Assignment tab first.</p>
        </div>
      )}
    </div>
  );
}

export default PhysicalRingAssignment;
