import React, { useMemo, useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings } from '../utils/computeRings';
import { checkSparringAltRingStatus } from '../utils/ringOrdering';
import { Participant } from '../types/tournament';

interface RingPair {
  cohortRingName: string;
  formsRing?: any;
  sparringRing?: any;
  physicalRingName?: string;
  division: string;
}

interface QuickEditState {
  participant: Participant;
  ringType: 'forms' | 'sparring';
  ringName: string;
}

interface RingOverviewProps {
  globalDivision?: string;
}

// Ring balance indicator helper
const getRingBalanceStyle = (participantCount: number): { color: string; bg: string; label: string } => {
  if (participantCount >= 8 && participantCount <= 12) {
    return { color: '#155724', bg: '#d4edda', label: 'balanced' };
  } else if ((participantCount >= 5 && participantCount <= 7) || (participantCount >= 13 && participantCount <= 15)) {
    return { color: '#856404', bg: '#fff3cd', label: 'acceptable' };
  } else {
    return { color: '#721c24', bg: '#f8d7da', label: 'unbalanced' };
  }
};

function RingOverview({ globalDivision }: RingOverviewProps) {
  const [selectedDivision, setSelectedDivision] = useState<string>(globalDivision || 'all');
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null);
  const participants = useTournamentStore((state) => state.participants);
  const config = useTournamentStore((state) => state.config);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const updateParticipant = useTournamentStore((state) => state.updateParticipant);
  const checkpoints = useTournamentStore((state) => state.checkpoints);
  const diffCheckpoint = useTournamentStore((state) => state.diffCheckpoint);

  // Move participant up or down in rank order
  const moveParticipant = (participantId: string, direction: 'up' | 'down', ringType: 'forms' | 'sparring') => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    // Get all participants in the same ring
    const categoryId = ringType === 'forms' ? participant.formsCategoryId : participant.sparringCategoryId;
    const pool = ringType === 'forms' ? participant.formsPool : participant.sparringPool;
    
    if (!categoryId || !pool) return;

    const ringParticipants = participants
      .filter(p => {
        const pCategoryId = ringType === 'forms' ? p.formsCategoryId : p.sparringCategoryId;
        const pPool = ringType === 'forms' ? p.formsPool : p.sparringPool;
        return pCategoryId === categoryId && pPool === pool;
      })
      .sort((a, b) => {
        const aRank = ringType === 'forms' ? (a.formsRankOrder || 0) : (a.sparringRankOrder || 0);
        const bRank = ringType === 'forms' ? (b.formsRankOrder || 0) : (b.sparringRankOrder || 0);
        return aRank - bRank;
      });

    const currentIndex = ringParticipants.findIndex(p => p.id === participantId);
    if (currentIndex === -1) return;

    // Can't move up if first, can't move down if last
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === ringParticipants.length - 1) return;

    // Create new order by swapping positions in the array
    const newOrder = [...ringParticipants];
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newOrder[currentIndex], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[currentIndex]];

    // Reassign all rank orders sequentially (1, 2, 3, ...)
    newOrder.forEach((p, index) => {
      const newRank = index + 1;
      if (ringType === 'forms') {
        updateParticipant(p.id, { formsRankOrder: newRank });
      } else {
        updateParticipant(p.id, { sparringRankOrder: newRank });
      }
    });
  };

  // Sync with global division when it changes
  useEffect(() => {
    if (globalDivision) {
      setSelectedDivision(globalDivision);
    }
  }, [globalDivision]);

  // Compute rings changed since latest checkpoint
  const changedRings = useMemo(() => {
    if (checkpoints.length === 0) return new Set<string>();
    const latestCheckpoint = [...checkpoints].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    const diff = diffCheckpoint(latestCheckpoint.id);
    if (!diff) return new Set<string>();
    return diff.ringsAffected;
  }, [checkpoints, diffCheckpoint]);

  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
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

    const pairs = Array.from(pairMap.values());

    // Sort by physical ring name if available, otherwise by pool name
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

  // Get unique divisions for the filter dropdown
  const divisions = useMemo(() => {
    const divSet = new Set<string>();
    ringPairs.forEach(pair => {
      if (pair.division) {
        divSet.add(pair.division);
      }
    });
    return Array.from(divSet).sort();
  }, [ringPairs]);

  // Filter ring pairs by selected division
  const filteredRingPairs = useMemo(() => {
    if (selectedDivision === 'all') {
      return ringPairs;
    }
    return ringPairs.filter(pair => pair.division === selectedDivision);
  }, [ringPairs, selectedDivision]);

  // Handle clicking on a participant name
  const handleParticipantClick = (participant: Participant, ringType: 'forms' | 'sparring', ringName: string) => {
    setQuickEdit({ participant, ringType, ringName });
  };

  // Get available physical rings for the current quick edit (if any)
  const availablePhysicalRings = useMemo(() => {
    if (!quickEdit) return [];
    
    const { participant, ringType } = quickEdit;
    const currentDivision = ringType === 'forms' 
      ? (participant.formsDivision || participant.division) 
      : (participant.sparringDivision || participant.division);
    
    if (!currentDivision || currentDivision === 'not participating') return [];
    
    // Get all pools for this division and type
    const divisionCohorts = categories.filter(c => 
      c.division === currentDivision && 
      c.type === ringType
    );
    
    // Get all unique physical rings used in this division
    const physicalRingSet = new Set<string>();
    divisionCohorts.forEach(category => {
      // Find mappings for this category
      const categoryMappings = physicalRingMappings.filter(m => 
        m.cohortRingName.startsWith(`${category.name}_`)
      );
      categoryMappings.forEach(mapping => {
        if (mapping.physicalRingName) {
          physicalRingSet.add(mapping.physicalRingName);
        }
      });
    });
    
    return Array.from(physicalRingSet).sort((a, b) => {
      // Sort by ring number (PR1, PR1a, PR2, etc.)
      const aMatch = a.match(/PR(\d+)([a-z]?)/);
      const bMatch = b.match(/PR(\d+)([a-z]?)/);
      if (aMatch && bMatch) {
        const aNum = parseInt(aMatch[1]);
        const bNum = parseInt(bMatch[1]);
        if (aNum !== bNum) return aNum - bNum;
        return (aMatch[2] || '').localeCompare(bMatch[2] || '');
      }
      return a.localeCompare(b);
    });
  }, [quickEdit, categories, physicalRingMappings]);

  // Render clickable participant name
  const renderParticipantName = (p: Participant, ringType: 'forms' | 'sparring', ringName: string) => (
    <span
      onClick={() => handleParticipantClick(p, ringType, ringName)}
      style={{
        cursor: 'pointer',
        color: '#0056b3',
        textDecoration: 'underline',
      }}
      title="Click to edit"
    >
      {p.firstName} {p.lastName}
    </span>
  );

  // Quick Edit Modal Component
  const renderQuickEditModal = () => {
    if (!quickEdit) return null;

    const { participant } = quickEdit;
    const formsRankOrder = participant.formsRankOrder;
    const sparringRankOrder = participant.sparringRankOrder;
    const formsAltRing = participant.sparringAltRing || '';
    
    // Get forms division info
    const formsDivision = participant.formsDivision || participant.division;
    const formsCategoryId = participant.formsCategoryId;
    const formsCategory = formsCategoryId ? categories.find(c => c.id === formsCategoryId) : null;
    const formsPool = participant.formsPool;
    const formsCohortRingName = formsCategory && formsPool 
      ? `${formsCategory.name}_${formsPool}` 
      : null;
    const formsPhysicalMapping = formsCohortRingName 
      ? physicalRingMappings.find(m => m.cohortRingName === formsCohortRingName)
      : null;
    
    // Get sparring division info
    const sparringDivision = participant.sparringDivision || participant.division;
    const sparringCategoryId = participant.sparringCategoryId;
    const sparringCategory = sparringCategoryId ? categories.find(c => c.id === sparringCategoryId) : null;
    const sparringPool = participant.sparringPool;
    const sparringCohortRingName = sparringCategory && sparringPool 
      ? `${sparringCategory.name}_${sparringPool}` 
      : null;
    const sparringPhysicalMapping = sparringCohortRingName 
      ? physicalRingMappings.find(m => m.cohortRingName === sparringCohortRingName)
      : null;

    const handleSave = (updates: Partial<Participant>) => {
      updateParticipant(participant.id, updates);
      // Refresh the participant data in the modal
      const updatedParticipant = { ...participant, ...updates };
      setQuickEdit({ ...quickEdit, participant: updatedParticipant });
    };

    const handleClose = () => {
      setQuickEdit(null);
    };

    // Build physical ring options filtered by division
    const buildPhysicalRingOptions = (division: string | null | undefined) => {
      if (!division || division === 'not participating') return [];
      
      // If sparring division is "same as forms", use the forms division instead
      const effectiveDivision = division === 'same as forms' 
        ? formsDivision 
        : division;
      
      if (!effectiveDivision || effectiveDivision === 'not participating') return [];
      
      // Find all categories for this division
      const categoriesForDivision = categories.filter(c => c.division === effectiveDivision);
      
      if (categoriesForDivision.length === 0) return [];
      
      // Get all mappings for these categories
      const mappingsForDivision = physicalRingMappings.filter(m => {
        const categoryName = m.cohortRingName?.split('_')[0];
        return categoriesForDivision.some(c => c.name === categoryName);
      });

      return mappingsForDivision
        .filter(m => m.physicalRingName)
        .map(m => ({
          physicalRingName: m.physicalRingName,
          cohortRingName: m.cohortRingName,
          label: `${m.physicalRingName} (${m.cohortRingName})`
        }))
        .sort((a, b) => {
          // Sort by ring number (PR1, PR1a, PR2, etc.)
          const aMatch = a.physicalRingName.match(/PR(\d+)([a-z]?)/);
          const bMatch = b.physicalRingName.match(/PR(\d+)([a-z]?)/);
          if (aMatch && bMatch) {
            const aNum = parseInt(aMatch[1]);
            const bNum = parseInt(bMatch[1]);
            if (aNum !== bNum) return aNum - bNum;
            return (aMatch[2] || '').localeCompare(bMatch[2] || '');
          }
          return a.physicalRingName.localeCompare(b.physicalRingName);
        });
    };

    const handlePhysicalRingChange = (type: 'forms' | 'sparring', newPhysicalRing: string) => {
      if (type === 'forms' && formsCohortRingName && newPhysicalRing) {
        const existingMapping = physicalRingMappings.find(m => m.cohortRingName === formsCohortRingName);
        if (existingMapping) {
          const updatedMappings = physicalRingMappings.map(m => 
            m.cohortRingName === formsCohortRingName 
              ? { ...m, physicalRingName: newPhysicalRing }
              : m
          );
          useTournamentStore.getState().setPhysicalRingMappings(updatedMappings);
        } else {
          useTournamentStore.getState().setPhysicalRingMappings([
            ...physicalRingMappings,
            { cohortRingName: formsCohortRingName, physicalRingName: newPhysicalRing }
          ]);
        }
        setQuickEdit({ ...quickEdit });
      } else if (type === 'sparring' && sparringCohortRingName && newPhysicalRing) {
        const existingMapping = physicalRingMappings.find(m => m.cohortRingName === sparringCohortRingName);
        if (existingMapping) {
          const updatedMappings = physicalRingMappings.map(m => 
            m.cohortRingName === sparringCohortRingName 
              ? { ...m, physicalRingName: newPhysicalRing }
              : m
          );
          useTournamentStore.getState().setPhysicalRingMappings(updatedMappings);
        } else {
          useTournamentStore.getState().setPhysicalRingMappings([
            ...physicalRingMappings,
            { cohortRingName: sparringCohortRingName, physicalRingName: newPhysicalRing }
          ]);
        }
        setQuickEdit({ ...quickEdit });
      }
    };

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={handleClose}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            minWidth: '500px',
            maxWidth: '600px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>
            Quick Edit: {participant.firstName} {participant.lastName}
          </h3>
          
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
            <div><strong>Age:</strong> {participant.age} | <strong>Gender:</strong> {participant.gender}</div>
            {participant.heightFeet && (
              <div><strong>Height:</strong> {participant.heightFeet}'{participant.heightInches}"</div>
            )}
          </div>

          {/* Forms Section */}
          <div style={{ 
            marginBottom: '25px', 
            paddingBottom: '20px', 
            borderBottom: '1px solid #e0e0e0'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#007bff', fontSize: '14px' }}>
              Forms
            </h4>
            
            {/* Current Ring Assignment Info */}
            {formsCategory && formsPool && (
              <div style={{ 
                marginBottom: '15px', 
                padding: '10px', 
                backgroundColor: '#f0f7ff',
                borderRadius: '4px',
                fontSize: '12px',
              }}>
                <div><strong>Category:</strong> {formsCategory.name}</div>
                <div><strong>Category Ring:</strong> {formsPool}</div>
                {formsPhysicalMapping && (
                  <div><strong>Physical Ring:</strong> {formsPhysicalMapping.physicalRingName}</div>
                )}
              </div>
            )}

            {/* Division Selector */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                Division:
              </label>
              <select
                value={formsDivision || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSave({ formsDivision: value });
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              >
                <option value="">Select division...</option>
                <option value="not participating">Not participating</option>
                <option value="same as sparring">Same as sparring</option>
                {config.divisions.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Physical Ring Selector for Forms */}
            {buildPhysicalRingOptions(formsDivision).length > 0 && formsDivision && formsDivision !== 'not participating' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                  Physical Ring:
                </label>
                <select
                  value={formsPhysicalMapping?.physicalRingName || ''}
                  onChange={(e) => handlePhysicalRingChange('forms', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                  disabled={!formsCohortRingName}
                >
                  <option value="">No physical ring assigned</option>
                  {buildPhysicalRingOptions(formsDivision).map(option => (
                    <option key={option.physicalRingName} value={option.physicalRingName}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Rank Order */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                Rank Order:
              </label>
              <input
                type="number"
                value={formsRankOrder || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  handleSave({ formsRankOrder: value });
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
                placeholder="e.g., 1, 2, 3..."
              />
              <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
                Use decimals like 1.5 to insert between 1 and 2.
              </div>
            </div>
          </div>

          {/* Sparring Section */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#dc3545', fontSize: '14px' }}>
              Sparring
            </h4>
            
            {/* Current Ring Assignment Info */}
            {sparringCategory && sparringPool && (
              <div style={{ 
                marginBottom: '15px', 
                padding: '10px', 
                backgroundColor: '#fff5f5',
                borderRadius: '4px',
                fontSize: '12px',
              }}>
                <div><strong>Category:</strong> {sparringCategory.name}</div>
                <div><strong>Category Ring:</strong> {sparringPool}</div>
                {sparringPhysicalMapping && (
                  <div><strong>Physical Ring:</strong> {sparringPhysicalMapping.physicalRingName}</div>
                )}
              </div>
            )}

            {/* Division Selector */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                Division:
              </label>
              <select
                value={sparringDivision || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSave({ sparringDivision: value });
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              >
                <option value="">Select division...</option>
                <option value="not participating">Not participating</option>
                <option value="same as forms">Same as forms</option>
                {config.divisions.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Physical Ring Selector for Sparring */}
            {buildPhysicalRingOptions(sparringDivision).length > 0 && sparringDivision && sparringDivision !== 'not participating' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                  Physical Ring:
                </label>
                <select
                  value={sparringPhysicalMapping?.physicalRingName || ''}
                  onChange={(e) => handlePhysicalRingChange('sparring', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    opacity: sparringDivision === 'same as forms' ? 0.5 : 1,
                    cursor: sparringDivision === 'same as forms' ? 'not-allowed' : 'pointer',
                  }}
                  disabled={!sparringCohortRingName || sparringDivision === 'same as forms'}
                >
                  <option value="">No physical ring assigned</option>
                  {buildPhysicalRingOptions(sparringDivision).map(option => (
                    <option key={option.physicalRingName} value={option.physicalRingName}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Rank Order */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                Rank Order:
              </label>
              <input
                type="number"
                value={sparringRankOrder || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  handleSave({ sparringRankOrder: value });
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
                placeholder="e.g., 1, 2, 3..."
              />
              <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
                Use decimals like 1.5 to insert between 1 and 2.
              </div>
            </div>

            {/* Alt Ring */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                Alt Ring (splits ring into a/b):
              </label>
              <select
                value={formsAltRing}
                onChange={(e) => {
                  const value = e.target.value as '' | 'a' | 'b';
                  handleSave({ sparringAltRing: value });
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              >
                <option value="">No alt ring (default)</option>
                <option value="a">Alt Ring A</option>
                <option value="b">Alt Ring B</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRingTable = (ring: any, type: 'forms' | 'sparring', ringDisplayName: string) => {
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

    // Check for alt ring status in sparring rings
    let altStatus = null;
    if (type === 'sparring' && category) {
      // Extract pool from ring name (e.g., "R1" from "Mixed 8-10_R1")
      const pool = ring.name?.match(/_R(\d+)$/)?.[0]?.substring(1); // Get "_R1" then remove "_" to get "R1"
      console.log('[RingOverview] Checking alt ring status for', ring.name, 'pool:', pool);
      if (pool) {
        altStatus = checkSparringAltRingStatus(participants, category.id, pool);
        console.log('[RingOverview] altStatus:', altStatus);
      }
    }

    // If sparring ring has mixed alt ring assignments, show warning
    if (altStatus?.status === 'mixed') {
      return (
        <div>
          <h5
            style={{
              marginBottom: '8px',
              color: '#dc3545',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            Sparring
          </h5>
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffc107',
            borderRadius: '4px',
            marginBottom: '10px',
            fontSize: '12px'
          }}>
            ⚠️ <strong>Mixed Alt Ring Assignments:</strong> {altStatus.countA} in 'a', {altStatus.countB} in 'b', {altStatus.countEmpty} unassigned. 
            All participants must have the same alt ring setting or all be unassigned.
          </div>
        </div>
      );
    }

    // If sparring ring is split into 'a' and 'b', render two separate sections
    if (altStatus?.status === 'all') {
      const participantsA = ringParticipants.filter(p => p.sparringAltRing === 'a');
      const participantsB = ringParticipants.filter(p => p.sparringAltRing === 'b');
      console.log('[RingOverview] Split ring - participantsA:', participantsA.length, 'participantsB:', participantsB.length);

      return (
        <div>
          <h5
            style={{
              marginBottom: '8px',
              color: '#dc3545',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            Sparring
          </h5>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
            <div>
              <strong>Category:</strong> {category?.gender}, Ages {category?.minAge}-{category?.maxAge}
            </div>
            <div style={{ color: '#5cb85c', fontWeight: 'bold' }}>
              Split into Alt Rings: {participantsA.length} in 'a', {participantsB.length} in 'b'
            </div>
          </div>

          {/* Alt Ring A */}
          {participantsA.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h6 style={{ 
                fontSize: '12px', 
                fontWeight: 'bold', 
                marginBottom: '5px',
                color: '#0056b3'
              }}>
                Alt Ring A ({participantsA.length} participants)
              </h6>
              <table
                style={{
                  width: '100%',
                  fontSize: '11px',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '4px', width: '80px' }}>Position</th>
                    <th style={{ padding: '4px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '4px' }}>Age</th>
                    <th style={{ padding: '4px' }}>Gender</th>
                    <th style={{ padding: '4px' }}>Height</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsA.map((p, index) => {
                    const isFirst = index === 0;
                    const isLast = index === participantsA.length - 1;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => moveParticipant(p.id, 'up', 'sparring')}
                              disabled={isFirst}
                              style={{
                                padding: '2px 6px',
                                fontSize: '10px',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                backgroundColor: isFirst ? '#f0f0f0' : 'white',
                                cursor: isFirst ? 'not-allowed' : 'pointer',
                                opacity: isFirst ? 0.5 : 1,
                              }}
                              title="Move up"
                            >
                              ▲
                            </button>
                            <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                              {p.sparringRankOrder ? p.sparringRankOrder * 10 : '-'}
                            </span>
                            <button
                              onClick={() => moveParticipant(p.id, 'down', 'sparring')}
                              disabled={isLast}
                              style={{
                                padding: '2px 6px',
                                fontSize: '10px',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                backgroundColor: isLast ? '#f0f0f0' : 'white',
                                cursor: isLast ? 'not-allowed' : 'pointer',
                                opacity: isLast ? 0.5 : 1,
                              }}
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '4px' }}>
                          {renderParticipantName(p, 'sparring', ringDisplayName + ' (Alt A)')}
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{p.age}</td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{p.gender}</td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          {p.heightFeet}'{p.heightInches}"
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Alt Ring B */}
          {participantsB.length > 0 && (
            <div>
              <h6 style={{ 
                fontSize: '12px', 
                fontWeight: 'bold', 
                marginBottom: '5px',
                color: '#0056b3'
              }}>
                Alt Ring B ({participantsB.length} participants)
              </h6>
              <table
                style={{
                  width: '100%',
                  fontSize: '11px',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '4px', width: '80px' }}>Position</th>
                    <th style={{ padding: '4px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '4px' }}>Age</th>
                    <th style={{ padding: '4px' }}>Gender</th>
                    <th style={{ padding: '4px' }}>Height</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsB.map((p, index) => {
                    const isFirst = index === 0;
                    const isLast = index === participantsB.length - 1;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => moveParticipant(p.id, 'up', 'sparring')}
                              disabled={isFirst}
                              style={{
                                padding: '2px 6px',
                                fontSize: '10px',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                backgroundColor: isFirst ? '#f0f0f0' : 'white',
                                cursor: isFirst ? 'not-allowed' : 'pointer',
                                opacity: isFirst ? 0.5 : 1,
                              }}
                              title="Move up"
                            >
                              ▲
                            </button>
                            <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                              {p.sparringRankOrder ? p.sparringRankOrder * 10 : '-'}
                            </span>
                            <button
                              onClick={() => moveParticipant(p.id, 'down', 'sparring')}
                              disabled={isLast}
                              style={{
                                padding: '2px 6px',
                                fontSize: '10px',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                backgroundColor: isLast ? '#f0f0f0' : 'white',
                                cursor: isLast ? 'not-allowed' : 'pointer',
                                opacity: isLast ? 0.5 : 1,
                              }}
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '4px' }}>
                          {renderParticipantName(p, 'sparring', ringDisplayName + ' (Alt B)')}
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{p.age}</td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{p.gender}</td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          {p.heightFeet}'{p.heightInches}"
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    // Normal rendering (no split or forms ring)
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
            <strong>Category:</strong> {category?.gender}, Ages {category?.minAge}-{category?.maxAge}
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
              <th style={{ padding: '4px', width: '80px' }}>Position</th>
              <th style={{ padding: '4px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '4px' }}>Age</th>
              <th style={{ padding: '4px' }}>Gender</th>
              {type === 'sparring' && <th style={{ padding: '4px' }}>Height</th>}
            </tr>
          </thead>
          <tbody>
            {ringParticipants.map((p, index) => {
              const position = type === 'forms' ? p.formsRankOrder : p.sparringRankOrder;
              const isFirst = index === 0;
              const isLast = index === ringParticipants.length - 1;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '4px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                      <button
                        onClick={() => moveParticipant(p.id, 'up', type)}
                        disabled={isFirst}
                        style={{
                          padding: '2px 6px',
                          fontSize: '10px',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          backgroundColor: isFirst ? '#f0f0f0' : 'white',
                          cursor: isFirst ? 'not-allowed' : 'pointer',
                          opacity: isFirst ? 0.5 : 1,
                        }}
                        title="Move up"
                      >
                        ▲
                      </button>
                      <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                        {position || '-'}
                      </span>
                      <button
                        onClick={() => moveParticipant(p.id, 'down', type)}
                        disabled={isLast}
                        style={{
                          padding: '2px 6px',
                          fontSize: '10px',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          backgroundColor: isLast ? '#f0f0f0' : 'white',
                          cursor: isLast ? 'not-allowed' : 'pointer',
                          opacity: isLast ? 0.5 : 1,
                        }}
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '4px' }}>
                    {renderParticipantName(p, type, ringDisplayName)}
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
          <p>No rings assigned yet. Please assign rings in the Category Ring Assignment tab.</p>
          <p><strong>Unassigned participants:</strong> {participants.length}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '1400px', margin: '0 auto', maxHeight: '100vh', overflowY: 'auto' }}>
      {/* Quick Edit Modal */}
      {renderQuickEditModal()}
      
      <h2 className="card-title">Ring Overview</h2>
      
      {/* Division Filter */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>
          Filter by Division:
        </label>
        <select
          value={selectedDivision}
          onChange={(e) => setSelectedDivision(e.target.value)}
          style={{
            padding: '5px 10px',
            fontSize: '14px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        >
          <option value="all">All Divisions ({ringPairs.length} rings)</option>
          {divisions.map((division) => {
            const count = ringPairs.filter(p => p.division === division).length;
            return (
              <option key={division} value={division}>
                {division} ({count} rings)
              </option>
            );
          })}
        </select>
      </div>
      
      {unassignedCount > 0 && (
        <div className="warning" style={{ marginBottom: '15px' }}>
          <strong>⚠️ {unassignedCount} participants</strong> not assigned to any ring
        </div>
      )}

      {/* Changed rings summary */}
      {changedRings.size > 0 && (
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px 15px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span>
            <strong>{changedRings.size} ring{changedRings.size > 1 ? 's' : ''} changed</strong> since last checkpoint
          </span>
        </div>
      )}

      <div>
        {filteredRingPairs.map((pair) => {
          // Check if this ring pair has changed since checkpoint
          const formsChanged = pair.formsRing && changedRings.has(pair.formsRing.name || pair.cohortRingName);
          const sparringChanged = pair.sparringRing && changedRings.has(pair.sparringRing.name || pair.cohortRingName);
          const hasChanged = formsChanged || sparringChanged;

          // Get participant counts for balance indicators
          const formsCount = pair.formsRing?.participantIds?.length || 0;
          const sparringCount = pair.sparringRing?.participantIds?.length || 0;
          const formsBalance = getRingBalanceStyle(formsCount);
          const sparringBalance = getRingBalanceStyle(sparringCount);

          return (
          <div
            key={pair.cohortRingName}
            style={{
              border: hasChanged ? '3px solid #ffc107' : '2px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              backgroundColor: hasChanged ? '#fffef5' : 'white',
              boxShadow: hasChanged ? '0 0 8px rgba(255, 193, 7, 0.4)' : undefined,
            }}
          >
            <h4
              style={{
                marginBottom: '15px',
                color: '#333',
                fontSize: '18px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <span style={{ color: '#007bff' }}>
                {pair.division}
              </span>
              <span>
                {pair.cohortRingName}
              </span>
              {pair.physicalRingName && (
                <span style={{ color: '#28a745', fontSize: '16px', fontWeight: '600' }}>
                  ({pair.physicalRingName})
                </span>
              )}
              {hasChanged && (
                <span style={{
                  backgroundColor: '#ffc107',
                  color: '#000',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}>
                  CHANGED
                </span>
              )}
              {/* Balance indicators */}
              {formsCount > 0 && (
                <span style={{
                  backgroundColor: formsBalance.bg,
                  color: formsBalance.color,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }} title={`Forms: ${formsCount} participants (${formsBalance.label})`}>
                  F:{formsCount}
                </span>
              )}
              {sparringCount > 0 && (
                <span style={{
                  backgroundColor: sparringBalance.bg,
                  color: sparringBalance.color,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }} title={`Sparring: ${sparringCount} participants (${sparringBalance.label})`}>
                  S:{sparringCount}
                </span>
              )}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
              {/* Forms Column */}
              <div>
                {renderRingTable(pair.formsRing, 'forms', pair.physicalRingName || pair.cohortRingName)}
              </div>

              {/* Sparring Column */}
              <div>
                {renderRingTable(pair.sparringRing, 'sparring', pair.physicalRingName || pair.cohortRingName)}
              </div>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}

export default RingOverview;
