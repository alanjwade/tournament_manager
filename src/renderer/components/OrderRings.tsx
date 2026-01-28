import React, { useMemo, useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { orderFormsRing, orderSparringRing, checkSparringAltRingStatus } from '../utils/ringOrdering';
import { computeCompetitionRings } from '../utils/computeRings';
import { extractPoolId } from '../utils/ringNameFormatter';

interface RingPair {
  cohortRingName: string;
  formsRing?: any;
  sparringRing?: any;
  physicalRingName?: string;
  division: string;
}

interface OrderRingsProps {
  globalDivision?: string;
}

function OrderRings({ globalDivision }: OrderRingsProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const config = useTournamentStore((state) => state.config);

  const [selectedDivision, setSelectedDivision] = useState<string>(globalDivision || 'all');

  // Sync with global division when it changes
  useEffect(() => {
    if (globalDivision) {
      setSelectedDivision(globalDivision);
    }
  }, [globalDivision]);

  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
  );

  const formsRings = competitionRings.filter((r) => r.type === 'forms');
  const sparringRings = competitionRings.filter((r) => r.type === 'sparring');

  // Group Forms and Sparring rings by their ring name AND division AND physical ring
  // Forms and Sparring rings are paired if they have the same name AND same physical ring
  const ringPairs = useMemo(() => {
    const pairMap = new Map<string, RingPair>();
    
    competitionRings.forEach(ring => {
      const ringName = ring.name || `${ring.division} Ring`;
      // Use division + ring name + physical ring as key to ensure correct pairing
      const key = `${ring.division}|||${ringName}|||${ring.physicalRingId}`;
      
      if (!pairMap.has(key)) {
        const mapping = physicalRingMappings.find(m => m.categoryPoolName === ringName);
        pairMap.set(key, { 
          cohortRingName: ringName,
          physicalRingName: mapping?.physicalRingName,
          division: ring.division,
        });
      }
      
      const pair = pairMap.get(key)!;
      
      if (ring.type === 'forms') {
        pair.formsRing = ring;
      } else if (ring.type === 'sparring') {
        pair.sparringRing = ring;
      }
    });

    let pairs = Array.from(pairMap.values());

    // Filter by selected division
    if (selectedDivision !== 'all') {
      pairs = pairs.filter(p => p.division === selectedDivision);
    }

    // Sort by physical ring name if available, otherwise by pool name
    return pairs.sort((a, b) => {
      if (a.physicalRingName && b.physicalRingName) {
        // Custom sort for physical ring names (Ring 1, Ring 1a, Ring 1b, Ring 2, etc.)
        const aMatch = a.physicalRingName.match(/(?:PR|Ring\s*)(\d+)([a-z])?/i);
        const bMatch = b.physicalRingName.match(/(?:PR|Ring\s*)(\d+)([a-z])?/i);
        
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
  }, [competitionRings, physicalRingMappings, selectedDivision]);

  const handleOrderAllRings = () => {
    if (!confirm('This will order all Forms and Sparring rings. Continue?')) {
      return;
    }

    let updatedParticipants = participants;
    
    // Order all forms rings
    formsRings.forEach(ring => {
      // Extract pool from ring ID
      // Format: "forms-{UUID}-{pool}"
      const prefix = `forms-${ring.categoryId}-`;
      const pool = ring.id.startsWith(prefix) ? ring.id.substring(prefix.length) : undefined;
      
      if (pool) {
        // New approach: use categoryId and pool
        updatedParticipants = orderFormsRing(updatedParticipants, ring.categoryId, pool);
      } else {
        // Legacy approach: use ring.id
        updatedParticipants = orderFormsRing(updatedParticipants, ring.id);
      }
    });
    
    // Order all sparring rings
    sparringRings.forEach(ring => {
      // Extract pool from ring ID
      // Format: "sparring-{UUID}-{pool}"
      const prefix = `sparring-${ring.categoryId}-`;
      const pool = ring.id.startsWith(prefix) ? ring.id.substring(prefix.length) : undefined;
      
      if (pool) {
        // New approach: use categoryId and pool
        updatedParticipants = orderSparringRing(updatedParticipants, ring.categoryId, pool);
      } else {
        // Legacy approach: use ring.id
        updatedParticipants = orderSparringRing(updatedParticipants, ring.id);
      }
    });

    setParticipants(updatedParticipants);
    alert('All rings have been ordered');
  };

  const handleOrderFormsRing = (ringId: string, categoryId: string) => {
    console.log('handleOrderFormsRing called:', { ringId, categoryId });
    
    // Extract pool from ring ID
    // Format: "forms-{UUID}-{pool}"
    // Since UUID contains dashes, we need to remove "forms-{UUID}-" prefix
    const prefix = `forms-${categoryId}-`;
    const pool = ringId.startsWith(prefix) ? ringId.substring(prefix.length) : undefined;
    
    const updatedParticipants = pool 
      ? orderFormsRing(participants, categoryId, pool)
      : orderFormsRing(participants, ringId);
      
    setParticipants(updatedParticipants);
  };

  const handleOrderSparringRing = (ringId: string, categoryId: string) => {
    // Extract pool from ring ID
    // Format: "sparring-{UUID}-{pool}"
    // Since UUID contains dashes, we need to remove "sparring-{UUID}-" prefix
    const prefix = `sparring-${categoryId}-`;
    const pool = ringId.startsWith(prefix) ? ringId.substring(prefix.length) : undefined;
    
    const updatedParticipants = pool
      ? orderSparringRing(participants, categoryId, pool)
      : orderSparringRing(participants, ringId);
    setParticipants(updatedParticipants);
  };

  const renderRingTable = (ring: any, type: 'forms' | 'sparring') => {
    if (!ring) {
      return (
        <div style={{ color: '#999', fontStyle: 'italic', padding: '10px' }}>
          No {type} ring
        </div>
      );
    }

    const category = categories.find((c) => c.id === ring.categoryId);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h5
            style={{
              margin: 0,
              color: type === 'forms' ? 'var(--accent-primary)' : 'var(--accent-danger)',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            {type === 'forms' ? 'Forms' : 'Sparring'}
          </h5>
          <button
            className="btn btn-primary"
            onClick={() => type === 'forms' 
              ? handleOrderFormsRing(ring.id, ring.categoryId) 
              : handleOrderSparringRing(ring.id, ring.categoryId)
            }
            style={{ padding: '3px 8px', fontSize: '11px' }}
          >
            Order Ring
          </button>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          <div>
            <strong>Category:</strong> {category?.gender}, Ages {category?.minAge}-{category?.maxAge}
          </div>
          <div>
            <strong>Division:</strong> {ring.division}
          </div>
          <div>
            <strong>Participants:</strong> {ringParticipants.length}
          </div>
          {type === 'sparring' && (() => {
            const altStatus = checkSparringAltRingStatus(participants, ring.categoryId, extractPoolId(ring.name) || '');
            if (altStatus.status === 'mixed') {
              return (
                <div style={{ color: '#d9534f', fontWeight: 'bold', marginTop: '4px' }}>
                  ⚠️ Mixed alt ring assignments: {altStatus.countA} in 'a', {altStatus.countB} in 'b', {altStatus.countEmpty} unassigned
                </div>
              );
            } else if (altStatus.status === 'all') {
              return (
                <div style={{ color: 'var(--accent-success)', marginTop: '4px' }}>
                  Split into alt rings: {altStatus.countA} in 'a', {altStatus.countB} in 'b'
                </div>
              );
            }
            return null;
          })()}
        </div>

        <table
          style={{
            width: '100%',
            fontSize: '11px',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
              <th style={{ padding: '4px' }}>Position</th>
              <th style={{ padding: '4px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '4px' }}>Age</th>
              <th style={{ padding: '4px' }}>Gender</th>
              {type === 'sparring' && <th style={{ padding: '4px' }}>Height</th>}
              {type === 'sparring' && <th style={{ padding: '4px' }}>Alt</th>}
            </tr>
          </thead>
          <tbody>
            {ringParticipants.map((p, idx) => {
              const position = type === 'forms' ? p.formsRankOrder : p.sparringRankOrder;
              
              // Debug logging
              if (idx === 0) {
                console.log(`OrderRings ${type} - First participant:`, {
                  name: `${p.firstName} ${p.lastName}`,
                  formsRankOrder: p.formsRankOrder,
                  sparringRankOrder: p.sparringRankOrder,
                  position,
                  displayValue: position || '-'
                });
              }
              
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                    {position || '-'}
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
                  {type === 'sparring' && (
                    <td style={{ padding: '4px', textAlign: 'center' }}>
                      {p.sparringAltRing || '-'}
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
        <h2 className="card-title">Order Rings</h2>
        <div className="info">
          <p>No rings assigned yet. Please assign rings in the Category Ring Assignment tab first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <h2 className="card-title" style={{ flexShrink: 0 }}>Order Rings</h2>

      <div style={{ flexShrink: 0, marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label style={{ marginRight: '10px' }}>Division:</label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="all">All Divisions</option>
            {config.divisions.map(d => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleOrderAllRings}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Order All Rings
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', paddingRight: '10px' }}>
        {ringPairs.map((pair) => (
          <div
            key={pair.cohortRingName}
            style={{
              border: '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              backgroundColor: 'var(--bg-secondary)',
              minWidth: 'fit-content',
            }}
          >
            <h4
              style={{
                marginBottom: '15px',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {pair.cohortRingName}
              {pair.physicalRingName && (
                <span style={{ marginLeft: '10px', color: 'var(--accent-primary)', fontSize: '14px' }}>
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

export default OrderRings;
