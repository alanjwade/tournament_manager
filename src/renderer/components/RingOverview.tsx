import React, { useMemo, useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings, getEffectiveFormsInfo, getEffectiveSparringInfo } from '../utils/computeRings';
import { checkSparringAltRingStatus } from '../utils/ringOrdering';
import { formatPoolNameForDisplay, formatPoolOnly } from '../utils/ringNameFormatter';
import { getSchoolAbbreviation } from '../utils/schoolAbbreviations';
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

    // Get effective category/pool (resolves "same as forms" / "same as sparring")
    const effective = ringType === 'forms' 
      ? getEffectiveFormsInfo(participant)
      : getEffectiveSparringInfo(participant);
    const categoryId = effective.categoryId;
    const pool = effective.pool;
    
    if (!categoryId || !pool) return;

    const ringParticipants = participants
      .filter(p => {
        const pEffective = ringType === 'forms' 
          ? getEffectiveFormsInfo(p)
          : getEffectiveSparringInfo(p);
        return pEffective.categoryId === categoryId && pEffective.pool === pool;
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
  }, [checkpoints, diffCheckpoint, participants, categories]);

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

  // Render clickable participant name (without school abbreviation - that's now in its own column)
  const renderParticipantName = (p: Participant, ringType: 'forms' | 'sparring', ringName: string) => {
    return (
      <span
        onClick={() => handleParticipantClick(p, ringType, ringName)}
        style={{
          cursor: 'pointer',
          color: 'var(--link-color, #4da6ff)',
          textDecoration: 'underline',
          fontSize: '14px',
          fontWeight: '500',
        }}
        title="Click to edit"
      >
        {p.firstName} {p.lastName}
      </span>
    );
  };
  
  // Get school abbreviation for a participant
  const getParticipantSchool = (p: Participant) => {
    const schoolKey = p.branch || p.school;
    return getSchoolAbbreviation(schoolKey, config.schoolAbbreviations);
  };

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
      // Check if pool is changing for forms or sparring
      const formsPoolChanging = updates.formsPool !== undefined && updates.formsPool !== participant.formsPool;
      const sparringPoolChanging = updates.sparringPool !== undefined && updates.sparringPool !== participant.sparringPool;
      
      // Get old pool info before update
      const oldFormsCategoryId = participant.formsCategoryId;
      const oldFormsPool = participant.formsPool;
      const oldSparringCategoryId = participant.sparringCategoryId;
      const oldSparringPool = participant.sparringPool;
      
      // If forms pool is changing, set rank order to 0 to put at top
      if (formsPoolChanging && updates.formsPool) {
        updates.formsRankOrder = 0;
      }
      
      // If sparring pool is changing, set rank order to 0 to put at top
      if (sparringPoolChanging && updates.sparringPool) {
        updates.sparringRankOrder = 0;
      }
      
      // Update the participant
      updateParticipant(participant.id, updates);
      
      // Close the gap in old pool(s) by renumbering
      if (formsPoolChanging && oldFormsCategoryId && oldFormsPool) {
        // Get all participants in the old pool and renumber
        const oldPoolParticipants = participants
          .filter(p => p.id !== participant.id && p.formsCategoryId === oldFormsCategoryId && p.formsPool === oldFormsPool)
          .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));
        
        oldPoolParticipants.forEach((p, index) => {
          updateParticipant(p.id, { formsRankOrder: index + 1 });
        });
      }
      
      if (sparringPoolChanging && oldSparringCategoryId && oldSparringPool) {
        // Get all participants in the old pool and renumber
        const oldPoolParticipants = participants
          .filter(p => p.id !== participant.id && p.sparringCategoryId === oldSparringCategoryId && p.sparringPool === oldSparringPool)
          .sort((a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0));
        
        oldPoolParticipants.forEach((p, index) => {
          updateParticipant(p.id, { sparringRankOrder: index + 1 });
        });
      }
      
      // Renumber the new pool(s) to include the new participant at position 1
      const newFormsCategoryId = updates.formsCategoryId ?? participant.formsCategoryId;
      const newFormsPool = updates.formsPool ?? participant.formsPool;
      const newSparringCategoryId = updates.sparringCategoryId ?? participant.sparringCategoryId;
      const newSparringPool = updates.sparringPool ?? participant.sparringPool;
      
      if (formsPoolChanging && newFormsCategoryId && newFormsPool) {
        // Get all OTHER participants in the new pool and shift them down
        const newPoolParticipants = participants
          .filter(p => p.id !== participant.id && p.formsCategoryId === newFormsCategoryId && p.formsPool === newFormsPool)
          .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));
        
        newPoolParticipants.forEach((p, index) => {
          updateParticipant(p.id, { formsRankOrder: index + 2 }); // Start at 2 since new person is at 1
        });
        
        // Set the moved participant to position 1
        updateParticipant(participant.id, { formsRankOrder: 1 });
      }
      
      if (sparringPoolChanging && newSparringCategoryId && newSparringPool) {
        // Get all OTHER participants in the new pool and shift them down
        const newPoolParticipants = participants
          .filter(p => p.id !== participant.id && p.sparringCategoryId === newSparringCategoryId && p.sparringPool === newSparringPool)
          .sort((a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0));
        
        newPoolParticipants.forEach((p, index) => {
          updateParticipant(p.id, { sparringRankOrder: index + 2 }); // Start at 2 since new person is at 1
        });
        
        // Set the moved participant to position 1
        updateParticipant(participant.id, { sparringRankOrder: 1 });
      }
      
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
          label: `${m.physicalRingName} (${formatPoolNameForDisplay(m.cohortRingName)})`
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
            backgroundColor: 'var(--bg-primary)',
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
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-primary)' }}>
            Quick Edit: {participant.firstName} {participant.lastName}
          </h3>
          
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            <div><strong>Age:</strong> {participant.age} | <strong>Gender:</strong> {participant.gender}</div>
            {participant.heightFeet && (
              <div><strong>Height:</strong> {participant.heightFeet}'{participant.heightInches}"</div>
            )}
          </div>

          {/* Forms Section */}
          <div style={{ 
            marginBottom: '25px', 
            paddingBottom: '20px', 
            borderBottom: '1px solid var(--border-color)'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#007bff', fontSize: '14px' }}>
              Forms
            </h4>
            
            {/* Current Ring Assignment Info */}
            {formsCategory && formsPool && (
              <div style={{ 
                marginBottom: '15px', 
                padding: '10px', 
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                fontSize: '12px',
              }}>
                <div><strong>Category:</strong> {formsCategory.name}</div>
                <div><strong>Category Ring:</strong> {formatPoolOnly(formsPool)}</div>
                {formsPhysicalMapping && (
                  <div><strong>Physical Ring:</strong> {formsPhysicalMapping.physicalRingName}</div>
                )}
              </div>
            )}

            {/* Category/Pool Selector */}
            {formsDivision && formsDivision !== 'not participating' && formsDivision !== 'same as sparring' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                  Category & Pool:
                </label>
                <select
                  value={formsCategoryId && formsPool ? `${formsCategoryId}|||${formsPool}` : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const [categoryId, pool] = value.split('|||');
                      handleSave({ formsCategoryId: categoryId, formsPool: pool });
                    } else {
                      handleSave({ formsCategoryId: undefined, formsPool: undefined });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    border: '1px solid var(--input-border)',
                    borderRadius: '4px',
                  }}
                >
                  <option value="">Select category & pool...</option>
                  {categories
                    .filter(c => c.type === 'forms' && c.division === formsDivision)
                    .flatMap(c => 
                      Array.from({ length: c.numPools }, (_, i) => ({
                        categoryId: c.id,
                        categoryName: c.name,
                        pool: `P${i + 1}`,
                        label: `${c.name} - Pool ${i + 1}`
                      }))
                    )
                    .map(item => (
                      <option key={`${item.categoryId}|||${item.pool}`} value={`${item.categoryId}|||${item.pool}`}>
                        {item.label}
                      </option>
                    ))
                  }
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Changing category/pool will update physical ring assignment
                </div>
              </div>
            )}

            {/* Show physical ring assignment (read-only) */}
            {formsPhysicalMapping && (
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Physical Ring Assignment:</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {formsPhysicalMapping.physicalRingName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                  Use Ring Map tab to change physical ring assignments
                </div>
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
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                }}
                placeholder="e.g., 1, 2, 3..."
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
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
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                fontSize: '12px',
              }}>
                <div><strong>Category:</strong> {sparringCategory.name}</div>
                <div><strong>Category Ring:</strong> {formatPoolOnly(sparringPool)}</div>
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
                  border: '1px solid var(--input-border)',
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

            {/* Category/Pool Selector */}
            {sparringDivision && sparringDivision !== 'not participating' && sparringDivision !== 'same as forms' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                  Category & Pool:
                </label>
                <select
                  value={sparringCategoryId && sparringPool ? `${sparringCategoryId}|||${sparringPool}` : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const [categoryId, pool] = value.split('|||');
                      handleSave({ sparringCategoryId: categoryId, sparringPool: pool });
                    } else {
                      handleSave({ sparringCategoryId: undefined, sparringPool: undefined });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    border: '1px solid var(--input-border)',
                    borderRadius: '4px',
                  }}
                >
                  <option value="">Select category & pool...</option>
                  {categories
                    .filter(c => c.type === 'sparring' && c.division === sparringDivision)
                    .flatMap(c => 
                      Array.from({ length: c.numPools }, (_, i) => ({
                        categoryId: c.id,
                        categoryName: c.name,
                        pool: `P${i + 1}`,
                        label: `${c.name} - Pool ${i + 1}`
                      }))
                    )
                    .map(item => (
                      <option key={`${item.categoryId}|||${item.pool}`} value={`${item.categoryId}|||${item.pool}`}>
                        {item.label}
                      </option>
                    ))
                  }
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Changing category/pool will update physical ring assignment
                </div>
              </div>
            )}

            {/* Show physical ring assignment (read-only) */}
            {sparringPhysicalMapping && (
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Physical Ring Assignment:</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {sparringPhysicalMapping.physicalRingName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                  Use Ring Map tab to change physical ring assignments
                </div>
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
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                }}
                placeholder="e.g., 1, 2, 3..."
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
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
                  border: '1px solid var(--input-border)',
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
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px' }}>
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
                  <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                    <th style={{ padding: '4px', width: '80px', color: 'var(--text-primary)' }}>Position</th>
                    <th style={{ padding: '4px', textAlign: 'left', color: 'var(--text-primary)' }}>Name</th>
                    <th style={{ padding: '4px', width: '80px', color: 'var(--text-primary)' }}>School</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Age</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Gender</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Height</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsA.map((p, index) => {
                    const isFirst = index === 0;
                    const isLast = index === participantsA.length - 1;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => moveParticipant(p.id, 'up', 'sparring')}
                              disabled={isFirst}
                              style={{
                                padding: '2px 6px',
                                fontSize: '10px',
                                border: '1px solid var(--input-border)',
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
                                border: '1px solid var(--input-border)',
                                borderRadius: '3px',
                                backgroundColor: isLast ? 'var(--bg-secondary)' : 'var(--input-bg)', color: 'var(--text-primary)',
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
                        <td style={{ padding: '4px', textAlign: 'center' }}>{getParticipantSchool(p)}</td>
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
                  <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                    <th style={{ padding: '4px', width: '80px', color: 'var(--text-primary)' }}>Position</th>
                    <th style={{ padding: '4px', textAlign: 'left', color: 'var(--text-primary)' }}>Name</th>
                    <th style={{ padding: '4px', width: '80px', color: 'var(--text-primary)' }}>School</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Age</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Gender</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Height</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsB.map((p, index) => {
                    const isFirst = index === 0;
                    const isLast = index === participantsB.length - 1;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => moveParticipant(p.id, 'up', 'sparring')}
                              disabled={isFirst}
                              style={{
                                padding: '2px 6px',
                                fontSize: '10px',
                                border: '1px solid var(--input-border)',
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
                                border: '1px solid var(--input-border)',
                                borderRadius: '3px',
                                backgroundColor: isLast ? 'var(--bg-secondary)' : 'var(--input-bg)', color: 'var(--text-primary)',
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
                        <td style={{ padding: '4px', textAlign: 'center' }}>{getParticipantSchool(p)}</td>
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
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
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
            <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
              <th style={{ padding: '4px', width: '80px', color: 'var(--text-primary)' }}>Position</th>
              <th style={{ padding: '4px', textAlign: 'left', color: 'var(--text-primary)' }}>Name</th>
              <th style={{ padding: '4px', width: '80px', color: 'var(--text-primary)' }}>School</th>
              <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Age</th>
              <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Gender</th>
              {type === 'sparring' && <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Height</th>}
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
                          border: '1px solid var(--input-border)',
                          borderRadius: '3px',
                          backgroundColor: isFirst ? 'var(--bg-secondary)' : 'var(--input-bg)',
                          color: 'var(--text-primary)',
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
                          border: '1px solid var(--input-border)',
                          borderRadius: '3px',
                          backgroundColor: isLast ? 'var(--bg-secondary)' : 'var(--input-bg)', color: 'var(--text-primary)',
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
                  <td style={{ padding: '4px', textAlign: 'center' }}>{getParticipantSchool(p)}</td>
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
    <div className="card" style={{ maxHeight: '100vh', overflowY: 'auto' }}>
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
            border: '1px solid var(--input-border)',
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
          backgroundColor: 'var(--bg-secondary)',
          border: '2px solid #dc3545',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--text-primary)'
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
              border: hasChanged ? '3px solid #dc3545' : '2px solid var(--border-color)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px',
              backgroundColor: hasChanged ? 'var(--bg-secondary)' : 'var(--bg-primary)',
              boxShadow: hasChanged ? '0 0 8px rgba(220, 53, 69, 0.3)' : undefined,
            }}
          >
            <h4
              style={{
                marginBottom: '15px',
                color: 'var(--text-primary)',
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
                {formatPoolNameForDisplay(pair.cohortRingName)}
              </span>
              {pair.physicalRingName && (
                <span style={{ color: '#28a745', fontSize: '16px', fontWeight: '600' }}>
                  ({pair.physicalRingName})
                </span>
              )}
              {hasChanged && (
                <span style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
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
