import React, { useMemo } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings } from '../utils/computeRings';

interface RingPair {
  cohortRingName: string;
  formsRing?: any;
  sparringRing?: any;
  physicalRingName?: string;
}

function RingOverview() {
  const participants = useTournamentStore((state) => state.participants);
  const config = useTournamentStore((state) => state.config);
  const cohorts = useTournamentStore((state) => state.cohorts);
  const cohortRingMappings = useTournamentStore((state) => state.cohortRingMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);

  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, cohorts, cohortRingMappings),
    [participants, cohorts, cohortRingMappings]
  );

  const formsRings = competitionRings.filter((r) => r.type === 'forms');
  const sparringRings = competitionRings.filter((r) => r.type === 'sparring');

  // Count unassigned participants
  const assignedParticipantIds = new Set<string>();
  competitionRings.forEach(ring => {
    ring.participantIds.forEach((id: string) => assignedParticipantIds.add(id));
  });
  const unassignedCount = participants.filter(p => !assignedParticipantIds.has(p.id)).length;

  // Group Forms and Sparring rings by their ring name AND division AND physical ring
  // Forms and Sparring rings are paired if they have the same name AND same physical ring
  const ringPairs = useMemo(() => {
    const pairMap = new Map<string, RingPair>();
    
    competitionRings.forEach(ring => {
      const ringName = ring.name || `${ring.division} Ring`;
      // Use division + ring name + physical ring as key to ensure correct pairing
      const key = `${ring.division}|||${ringName}|||${ring.physicalRingId}`;
      
      if (!pairMap.has(key)) {
        const mapping = physicalRingMappings.find(m => m.cohortRingName === ringName);
        pairMap.set(key, { 
          cohortRingName: ringName,
          physicalRingName: mapping?.physicalRingName,
        });
      }
      
      const pair = pairMap.get(key)!;
      
      if (ring.type === 'forms') {
        pair.formsRing = ring;
      } else if (ring.type === 'sparring') {
        pair.sparringRing = ring;
      }
    });

    const pairs = Array.from(pairMap.values());

    // Sort by physical ring name if available, otherwise by cohort ring name
    return pairs.sort((a, b) => {
      if (a.physicalRingName && b.physicalRingName) {
        // Custom sort for physical ring names (PR1, PR1a, PR1b, PR2, etc.)
        const aMatch = a.physicalRingName.match(/PR(\d+)([a-z])?/i);
        const bMatch = b.physicalRingName.match(/PR(\d+)([a-z])?/i);
        
        if (aMatch && bMatch) {
          const aNum = parseInt(aMatch[1]);
          const bNum = parseInt(bMatch[1]);
          
          if (aNum !== bNum) {
            return aNum - bNum;
          }
          
          // Same number, compare letter suffix
          const aLetter = aMatch[2] || '';
          const bLetter = bMatch[2] || '';
          return aLetter.localeCompare(bLetter);
        }
        
        return a.physicalRingName.localeCompare(b.physicalRingName);
      }
      
      if (a.physicalRingName) return -1;
      if (b.physicalRingName) return 1;
      
      return a.cohortRingName.localeCompare(b.cohortRingName);
    });
  }, [competitionRings, physicalRingMappings]);

  const renderRingTable = (ring: any, type: 'forms' | 'sparring') => {
    if (!ring) {
      return (
        <div style={{ color: '#999', fontStyle: 'italic', padding: '10px' }}>
          No {type} ring
        </div>
      );
    }

    const cohort = cohorts.find((c) => c.id === ring.cohortId);

    const ringParticipants = participants
      .filter((p) => ring.participantIds.includes(p.id))
      .sort((a, b) => {
        if (type === 'forms') {
          return (a.formsRankOrder || 0) - (b.formsRankOrder || 0);
        } else {
          return (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0);
        }
      });

    return (
      <div>
        <h5
          style={{
            marginBottom: '8px',
            color: type === 'forms' ? '#007bff' : '#dc3545',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          {type === 'forms' ? 'Forms' : 'Sparring'}
        </h5>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
          <div>
            <strong>Cohort:</strong> {cohort?.gender}, Ages {cohort?.minAge}-{cohort?.maxAge}
          </div>
          <div>
            <strong>Division:</strong> {ring.division}
          </div>
          <div>
            <strong>Participants:</strong> {ringParticipants.length}
          </div>
        </div>

        <table
          style={{
            width: '100%',
            fontSize: '11px',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '4px' }}>Position</th>
              <th style={{ padding: '4px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '4px' }}>Age</th>
              <th style={{ padding: '4px' }}>Gender</th>
              {type === 'sparring' && <th style={{ padding: '4px' }}>Height</th>}
            </tr>
          </thead>
          <tbody>
            {ringParticipants.map((p) => {
              const position = type === 'forms' ? p.formsRankOrder : p.sparringRankOrder;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                    {position ? position * 10 : '-'}
                  </td>
                  <td style={{ padding: '4px' }}>
                    {p.firstName} {p.lastName}
                  </td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>{p.age}</td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>
                    {p.gender}
                  </td>
                  {type === 'sparring' && (
                    <td style={{ padding: '4px', textAlign: 'center' }}>
                      {p.heightFeet}'{p.heightInches}"
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (competitionRings.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">Ring Overview</h2>
        <div className="info">
          <p>No rings assigned yet. Please assign rings in the Cohort Ring Assignment tab.</p>
          <p><strong>Unassigned participants:</strong> {participants.length}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <h2 className="card-title" style={{ flexShrink: 0 }}>Ring Overview</h2>
      
      {unassignedCount > 0 && (
        <div className="warning" style={{ marginBottom: '15px', flexShrink: 0 }}>
          <strong>⚠️ {unassignedCount} participants</strong> not assigned to any ring
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
        {ringPairs.map((pair) => (
          <div
            key={pair.cohortRingName}
            style={{
              border: '2px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              backgroundColor: 'white',
            }}
          >
            <h4
              style={{
                marginBottom: '15px',
                color: '#333',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {pair.cohortRingName}
              {pair.physicalRingName && (
                <span style={{ marginLeft: '10px', color: '#007bff', fontSize: '14px' }}>
                  ({pair.physicalRingName})
                </span>
              )}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
              {/* Forms Column */}
              <div>
                {renderRingTable(pair.formsRing, 'forms')}
              </div>

              {/* Sparring Column */}
              <div>
                {renderRingTable(pair.sparringRing, 'sparring')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RingOverview;
