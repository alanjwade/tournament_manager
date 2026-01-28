import React, { useMemo, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings, getEffectiveFormsInfo, getEffectiveSparringInfo } from '../utils/computeRings';
import { checkSparringAltRingStatus, orderFormsRing, orderSparringRing } from '../utils/ringOrdering';
import { formatPoolNameForDisplay, formatPoolOnly, isRingAffected, isRingAffectedSimple } from '../utils/ringNameFormatter';
import { getSchoolAbbreviation } from '../utils/schoolAbbreviations';
import { generateFormsScoringSheets } from '../utils/pdfGenerators/formsScoringSheet';
import { generateSparringBrackets } from '../utils/pdfGenerators/sparringBracket';
import { Participant, CompetitionRing } from '../types/tournament';
import { RING_BALANCE } from '../utils/constants';
import ParticipantSelectionModal from './ParticipantSelectionModal';
import CheckpointSidebar from './CheckpointSidebar';
import GrandChampionSection from './GrandChampionSection';

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
  if (participantCount >= RING_BALANCE.MIN_GOOD && participantCount <= RING_BALANCE.MAX_GOOD) {
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
  const [copySparringFromForms, setCopySparringFromForms] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<Participant>>({});
  const [printing, setPrinting] = useState<string | null>(null);
  const [participantSelectionModal, setParticipantSelectionModal] = useState<{
    ringId: string;
  } | null>(null);
  
  const participants = useTournamentStore((state) => state.participants);
  const config = useTournamentStore((state) => state.config);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const updateParticipant = useTournamentStore((state) => state.updateParticipant);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const checkpoints = useTournamentStore((state) => state.checkpoints);
  const diffCheckpoint = useTournamentStore((state) => state.diffCheckpoint);
  const customRings = useTournamentStore((state) => state.customRings);
  const addCustomRing = useTournamentStore((state) => state.addCustomRing);
  const deleteCustomRing = useTournamentStore((state) => state.deleteCustomRing);
  const updateCustomRing = useTournamentStore((state) => state.updateCustomRing);
  const addParticipantToCustomRing = useTournamentStore((state) => state.addParticipantToCustomRing);
  const removeParticipantFromCustomRing = useTournamentStore((state) => state.removeParticipantFromCustomRing);
  const moveParticipantInCustomRing = useTournamentStore((state) => state.moveParticipantInCustomRing);
  const createCheckpoint = useTournamentStore((state) => state.createCheckpoint);
  const loadCheckpoint = useTournamentStore((state) => state.loadCheckpoint);

  // Reset copySparringFromForms and pendingChanges when quickEdit changes
  useEffect(() => {
    if (quickEdit) {
      // Default to checked (true) - copy forms to sparring by default
      setCopySparringFromForms(true);
      // Reset pending changes
      setPendingChanges({});
    } else {
      setCopySparringFromForms(false);
      setPendingChanges({});
    }
  }, [quickEdit]);

  // Move participant up or down in rank order
  const moveParticipant = (participantId: string, direction: 'up' | 'down', ringType: 'forms' | 'sparring') => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    // Get effective category/pool
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

  // Auto-order a specific pool
  const handleAutoOrderPool = (categoryId: string, pool: string, ringType: 'forms' | 'sparring') => {
    let updatedParticipants = participants;
    
    if (ringType === 'forms') {
      updatedParticipants = orderFormsRing(updatedParticipants, categoryId, pool);
    } else {
      updatedParticipants = orderSparringRing(updatedParticipants, categoryId, pool);
    }
    
    setParticipants(updatedParticipants);
  };

  // Print all changed rings combined into one PDF
  const handlePrintAllChanged = async () => {
    if (changedRingsCounts.total === 0) {
      alert('No rings have changed since the last checkpoint.');
      return;
    }

    // Get all competition rings that have changed, filtered by selected division
    // For forms, we just need to know if the ring changed
    const changedFormsRings = competitionRings
      .filter(ring => 
        ring.type === 'forms' && 
        isRingAffected(ring.name || ring.division, 'forms', changedRings).isAffected &&
        (selectedDivision === 'all' || ring.division === selectedDivision)
      );
    
    // For sparring, we need to track which specific alt rings changed
    interface SparringRingWithAltFilter {
      ring: CompetitionRing;
      altRings?: Set<string>;
    }
    const changedSparringRingsWithFilter: SparringRingWithAltFilter[] = [];
    
    competitionRings.forEach(ring => {
      if (ring.type !== 'sparring') return;
      if (selectedDivision !== 'all' && ring.division !== selectedDivision) return;
      
      const baseRingName = ring.name || ring.division;
      const result = isRingAffected(baseRingName, 'sparring', changedRings);
      if (result.isAffected) {
        changedSparringRingsWithFilter.push({
          ring,
          altRings: result.altRings,
        });
      }
    });

    if (changedFormsRings.length === 0 && changedSparringRingsWithFilter.length === 0) {
      alert('No forms or sparring rings found for changed rings.');
      return;
    }

    setPrinting('all-changed');
    try {
      // Create master PDF and add all content directly
      const masterPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
      });

      // Group by division for forms
      const formsByDivision = new Map<string, CompetitionRing[]>();
      changedFormsRings.forEach(ring => {
        const existing = formsByDivision.get(ring.division) || [];
        formsByDivision.set(ring.division, [...existing, ring]);
      });

      // Generate all forms PDFs, adding directly to master
      for (const [division, rings] of formsByDivision) {
        if (rings.length > 0) {
          generateFormsScoringSheets(
            participants,
            rings,
            config.physicalRings,
            division,
            config.watermarkImage,
            physicalRingMappings,
            masterPdf  // Pass master PDF to add to
          );
        }
      }

      // Group by division for sparring, keeping track of alt ring filters per ring
      const sparringByDivision = new Map<string, SparringRingWithAltFilter[]>();
      changedSparringRingsWithFilter.forEach(item => {
        const existing = sparringByDivision.get(item.ring.division) || [];
        sparringByDivision.set(item.ring.division, [...existing, item]);
      });

      // Generate all sparring PDFs, adding directly to master
      // We need to process each ring individually to apply the correct alt ring filter
      for (const [division, ringItems] of sparringByDivision) {
        for (const item of ringItems) {
          generateSparringBrackets(
            participants,
            [item.ring],
            config.physicalRings,
            division,
            config.watermarkImage,
            physicalRingMappings,
            masterPdf,  // Pass master PDF to add to
            undefined,  // titleOverride
            false,      // isCustomRing
            { altRingFilter: item.altRings }  // Pass the alt ring filter
          );
        }
      }

      // Remove the trailing blank page that generators add for page management
      // Each generator adds a blank page at the end to prevent the next generator from overlaying
      // We need to remove the final blank page before printing
      if (masterPdf.getNumberOfPages() > 1) {
        masterPdf.deletePage(masterPdf.getNumberOfPages());
      }

      // Open the combined PDF in a single print dialog
      const pdfBlob = masterPdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        await new Promise<void>(resolve => {
          printWindow.addEventListener('load', () => {
            printWindow.print();
            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
              resolve();
            }, 500);
          });
        });
      } else {
        URL.revokeObjectURL(pdfUrl);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPrinting(null);
    }
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

    const pairs = Array.from(pairMap.values());

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

  // Get latest checkpoint
  const latestCheckpoint = useMemo(() => {
    if (checkpoints.length === 0) return null;
    return [...checkpoints].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  }, [checkpoints]);

  // Count changed rings for display
  const changedRingsCounts = useMemo(() => {
    const changedFormsRings = competitionRings.filter(
      ring => ring.type === 'forms' && 
              isRingAffected(ring.name || ring.division, 'forms', changedRings).isAffected &&
              (selectedDivision === 'all' || ring.division === selectedDivision)
    );
    const changedSparringRings = competitionRings.filter(
      ring => {
        if (ring.type !== 'sparring') return false;
        if (selectedDivision !== 'all' && ring.division !== selectedDivision) return false;
        
        const baseRingName = ring.name || ring.division;
        return isRingAffected(baseRingName, 'sparring', changedRings).isAffected;
      }
    );
    return {
      forms: changedFormsRings.length,
      sparring: changedSparringRings.length,
      total: changedFormsRings.length + changedSparringRings.length
    };
  }, [competitionRings, changedRings, selectedDivision]);

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
      ? participant.formsDivision
      : participant.sparringDivision;
    
    if (!currentDivision) return [];
    
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
        m.categoryPoolName?.startsWith(`${category.name}_`)
      );
      categoryMappings.forEach(mapping => {
        if (mapping.physicalRingName) {
          physicalRingSet.add(mapping.physicalRingName);
        }
      });
    });
    
    return Array.from(physicalRingSet).sort((a, b) => {
      // Sort by ring number (PR1, PR1a, PR2, etc.)
      const aMatch = a.match(/(?:PR|Ring\s*)(\d+)([a-z]?)/);
      const bMatch = b.match(/(?:PR|Ring\s*)(\d+)([a-z]?)/);
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
    
    // Get current values (either from pending changes or participant)
    const currentFormsDivision = pendingChanges.formsDivision !== undefined ? pendingChanges.formsDivision : participant.formsDivision;
    const currentFormsCategoryId = pendingChanges.formsCategoryId !== undefined ? pendingChanges.formsCategoryId : participant.formsCategoryId;
    const currentFormsPool = pendingChanges.formsPool !== undefined ? pendingChanges.formsPool : participant.formsPool;
    const currentFormsRankOrder = pendingChanges.formsRankOrder !== undefined ? pendingChanges.formsRankOrder : participant.formsRankOrder;
    
    const currentSparringDivision = pendingChanges.sparringDivision !== undefined ? pendingChanges.sparringDivision : participant.sparringDivision;
    const currentSparringCategoryId = pendingChanges.sparringCategoryId !== undefined ? pendingChanges.sparringCategoryId : participant.sparringCategoryId;
    const currentSparringPool = pendingChanges.sparringPool !== undefined ? pendingChanges.sparringPool : participant.sparringPool;
    const currentSparringRankOrder = pendingChanges.sparringRankOrder !== undefined ? pendingChanges.sparringRankOrder : participant.sparringRankOrder;
    const currentSparringAltRing = pendingChanges.sparringAltRing !== undefined ? pendingChanges.sparringAltRing : participant.sparringAltRing;
    
    // Get category info based on current values
    const formsCategory = currentFormsCategoryId ? categories.find(c => c.id === currentFormsCategoryId) : null;
    const formsCohortRingName = formsCategory && currentFormsPool 
      ? `${formsCategory.name}_${currentFormsPool}` 
      : null;
    const formsPhysicalMapping = formsCohortRingName 
      ? physicalRingMappings.find(m => m.categoryPoolName === formsCohortRingName)
      : undefined;
    
    const sparringCategory = currentSparringCategoryId ? categories.find(c => c.id === currentSparringCategoryId) : null;
    const sparringCohortRingName = sparringCategory && currentSparringPool 
      ? `${sparringCategory.name}_${currentSparringPool}` 
      : null;
    const sparringPhysicalMapping = sparringCohortRingName 
      ? physicalRingMappings.find(m => m.categoryPoolName === sparringCohortRingName)
      : undefined;
    
    // Update pending changes
    const updatePending = (updates: Partial<Participant>) => {
      setPendingChanges(prev => ({ ...prev, ...updates }));
    };

    const handleSubmit = () => {
      if (Object.keys(pendingChanges).length === 0) {
        // No changes, just close
        setQuickEdit(null);
        return;
      }

      console.log('[QuickEdit] handleSubmit called with pendingChanges:', pendingChanges);
      
      const updates = { ...pendingChanges };
      
      // Remove internal marker flags that don't affect participant data
      delete (updates as any)._sparringDecoupled;
      
      // If all that's left is empty after removing markers, just close
      if (Object.keys(updates).length === 0) {
        setQuickEdit(null);
        return;
      }
      
      // Handle forms division changes
      if (updates.formsDivision !== undefined) {
        const value = updates.formsDivision;
        const isWithdrawing = value === null || value === '';
        updates.competingForms = !isWithdrawing;
        
        // Clear category and pool when withdrawing
        if (isWithdrawing) {
          // Save current assignment for reinstatement
          updates.lastFormsCategoryId = participant.formsCategoryId;
          updates.lastFormsPool = participant.formsPool;
          updates.formsCategoryId = undefined;
          updates.formsPool = undefined;
          updates.formsRankOrder = undefined;
          updates.formsDivision = null;
        }
      }
      
      // Handle sparring division changes
      if (updates.sparringDivision !== undefined) {
        const value = updates.sparringDivision;
        const isWithdrawing = value === null || value === '';
        updates.competingSparring = !isWithdrawing;
        
        // Clear category and pool when withdrawing
        if (isWithdrawing) {
          // Save current assignment for reinstatement
          updates.lastSparringCategoryId = participant.sparringCategoryId;
          updates.lastSparringPool = participant.sparringPool;
          updates.sparringCategoryId = undefined;
          updates.sparringPool = undefined;
          updates.sparringRankOrder = undefined;
          updates.sparringAltRing = '';
          updates.sparringDivision = null;
        }
      }
      
      // Ensure competing flags are set when assigning pools/categories
      // If we're setting a forms pool or category, make sure competingForms is true
      if ((updates.formsPool || updates.formsCategoryId) && updates.competingForms === undefined) {
        const hasFormsAssignment = updates.formsPool || updates.formsCategoryId || participant.formsPool || participant.formsCategoryId;
        if (hasFormsAssignment) {
          console.log('[QuickEdit] Auto-setting competingForms = true because forms assignment exists');
          updates.competingForms = true;
        }
      }
      
      // If we're setting a sparring pool or category, make sure competingSparring is true
      if ((updates.sparringPool || updates.sparringCategoryId) && updates.competingSparring === undefined) {
        const hasSparringAssignment = updates.sparringPool || updates.sparringCategoryId || participant.sparringPool || participant.sparringCategoryId;
        if (hasSparringAssignment) {
          console.log('[QuickEdit] Auto-setting competingSparring = true because sparring assignment exists');
          updates.competingSparring = true;
        }
      }
      
      console.log('[QuickEdit] Final updates object:', updates);
      console.log('[QuickEdit] competingForms:', updates.competingForms, 'competingSparring:', updates.competingSparring);
      
      // Check if pool is changing for forms or sparring
      const formsPoolChanging = updates.formsPool !== undefined && updates.formsPool !== participant.formsPool;
      const sparringPoolChanging = updates.sparringPool !== undefined && updates.sparringPool !== participant.sparringPool;
      
      console.log('[QuickEdit] formsPoolChanging:', formsPoolChanging, 'sparringPoolChanging:', sparringPoolChanging);
      
      // Get old pool info before update
      const oldFormsCategoryId = participant.formsCategoryId;
      const oldFormsPool = participant.formsPool;
      const oldSparringCategoryId = participant.sparringCategoryId;
      const oldSparringPool = participant.sparringPool;
      
      // If forms pool is changing, set rank order to 1 to put at top
      if (formsPoolChanging && updates.formsPool) {
        updates.formsRankOrder = 1;
      }
      
      // If sparring pool is changing, set rank order to 1 to put at top
      if (sparringPoolChanging && updates.sparringPool) {
        updates.sparringRankOrder = 1;
      }
      
      // Build a map of all participant updates to batch them
      const participantUpdates = new Map<string, Partial<Participant>>();
      participantUpdates.set(participant.id, updates);
      
      // Close the gap in old pool(s) by renumbering
      if (formsPoolChanging && oldFormsCategoryId && oldFormsPool) {
        const oldPoolParticipants = participants
          .filter(p => p.id !== participant.id && p.formsCategoryId === oldFormsCategoryId && p.formsPool === oldFormsPool)
          .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));
        
        oldPoolParticipants.forEach((p, index) => {
          const existing = participantUpdates.get(p.id) || {};
          participantUpdates.set(p.id, { ...existing, formsRankOrder: index + 1 });
        });
      }
      
      if (sparringPoolChanging && oldSparringCategoryId && oldSparringPool) {
        const oldPoolParticipants = participants
          .filter(p => p.id !== participant.id && p.sparringCategoryId === oldSparringCategoryId && p.sparringPool === oldSparringPool)
          .sort((a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0));
        
        oldPoolParticipants.forEach((p, index) => {
          const existing = participantUpdates.get(p.id) || {};
          participantUpdates.set(p.id, { ...existing, sparringRankOrder: index + 1 });
        });
      }
      
      // Renumber the new pool(s) to include the new participant at position 1
      const newFormsCategoryId = updates.formsCategoryId ?? participant.formsCategoryId;
      const newFormsPool = updates.formsPool ?? participant.formsPool;
      const newSparringCategoryId = updates.sparringCategoryId ?? participant.sparringCategoryId;
      const newSparringPool = updates.sparringPool ?? participant.sparringPool;
      
      if (formsPoolChanging && newFormsCategoryId && newFormsPool) {
        const newPoolParticipants = participants
          .filter(p => p.id !== participant.id && p.formsCategoryId === newFormsCategoryId && p.formsPool === newFormsPool)
          .sort((a, b) => (a.formsRankOrder || 0) - (b.formsRankOrder || 0));
        
        newPoolParticipants.forEach((p, index) => {
          const existing = participantUpdates.get(p.id) || {};
          participantUpdates.set(p.id, { ...existing, formsRankOrder: index + 2 });
        });
        
        const existing = participantUpdates.get(participant.id) || {};
        participantUpdates.set(participant.id, { ...existing, formsRankOrder: 1 });
      }
      
      if (sparringPoolChanging && newSparringCategoryId && newSparringPool) {
        const newPoolParticipants = participants
          .filter(p => p.id !== participant.id && p.sparringCategoryId === newSparringCategoryId && p.sparringPool === newSparringPool)
          .sort((a, b) => (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0));
        
        newPoolParticipants.forEach((p, index) => {
          const existing = participantUpdates.get(p.id) || {};
          participantUpdates.set(p.id, { ...existing, sparringRankOrder: index + 2 });
        });
        
        const existing = participantUpdates.get(participant.id) || {};
        participantUpdates.set(participant.id, { ...existing, sparringRankOrder: 1 });
      }
      
      // Apply all updates in a single batch
      console.log('[QuickEdit] participantUpdates for moved participant:', participantUpdates.get(participant.id));
      console.log('[QuickEdit] Total updates being applied:', participantUpdates.size);
      console.log('[QuickEdit] All participant IDs being updated:', Array.from(participantUpdates.keys()));
      
      // Log updates for debugging
      const debugInfo: string[] = [];
      participantUpdates.forEach((update, id) => {
        const p = participants.find(x => x.id === id);
        console.log(`[QuickEdit] Updating ${p?.firstName} ${p?.lastName} (${id}):`, update);
        debugInfo.push(`${p?.firstName} ${p?.lastName}: ${JSON.stringify(update)}`);
      });
      
      // Show alert for critical operations (only when moving pools)
      if (formsPoolChanging || sparringPoolChanging) {
        console.log('[QuickEdit] POOL CHANGE - Debug info:', debugInfo.join('\n'));
      }
      
      const updatedParticipantsList = participants.map(p => {
        const update = participantUpdates.get(p.id);
        return update ? { ...p, ...update } : p;
      });
      
      // Log the updated participant to verify the data
      const updatedMovedParticipant = updatedParticipantsList.find(p => p.id === participant.id);
      console.log('[QuickEdit] Updated participant data:', {
        id: updatedMovedParticipant?.id,
        name: `${updatedMovedParticipant?.firstName} ${updatedMovedParticipant?.lastName}`,
        competingSparring: updatedMovedParticipant?.competingSparring,
        sparringCategoryId: updatedMovedParticipant?.sparringCategoryId,
        sparringPool: updatedMovedParticipant?.sparringPool,
        sparringRankOrder: updatedMovedParticipant?.sparringRankOrder
      });
      
      // Close modal first to release any stale state
      setQuickEdit(null);
      
      // Then update participants - this ensures the modal isn't open when the update happens
      // Use setTimeout to ensure the modal close happens first
      setTimeout(() => {
        setParticipants(updatedParticipantsList);
      }, 0);
    };

    const handleCancel = () => {
      setQuickEdit(null);
    };

    // Build physical ring options filtered by division
    const buildPhysicalRingOptions = (division: string | null | undefined) => {
      if (!division) return [];
      
      // Find all categories for this division
      const categoriesForDivision = categories.filter(c => c.division === division);
      
      if (categoriesForDivision.length === 0) return [];
      
      // Get all mappings for these categories
      const mappingsForDivision = physicalRingMappings.filter(m => {
        const categoryName = m.categoryPoolName?.split('_')[0];
        return categoriesForDivision.some(c => c.name === categoryName);
      });

      return mappingsForDivision
        .filter(m => m.physicalRingName)
        .map(m => ({
          physicalRingName: m.physicalRingName,
          cohortRingName: m.categoryPoolName || '',
          label: `${m.physicalRingName} (${formatPoolNameForDisplay(m.categoryPoolName || '')})`
        }))
        .sort((a, b) => {
          // Sort by ring number (Ring 1, Ring 1a, Ring 2, etc.)
          const aMatch = a.physicalRingName.match(/(?:PR|Ring\s*)(\d+)([a-z]?)/);
          const bMatch = b.physicalRingName.match(/(?:PR|Ring\s*)(\d+)([a-z]?)/);
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
        const existingMapping = physicalRingMappings.find(m => m.categoryPoolName === formsCohortRingName);
        if (existingMapping) {
          const updatedMappings = physicalRingMappings.map(m => 
            m.categoryPoolName === formsCohortRingName 
              ? { ...m, physicalRingName: newPhysicalRing }
              : m
          );
          useTournamentStore.getState().setPhysicalRingMappings(updatedMappings);
        } else {
          useTournamentStore.getState().setPhysicalRingMappings([
            ...physicalRingMappings,
            { categoryPoolName: formsCohortRingName, physicalRingName: newPhysicalRing }
          ]);
        }
        setQuickEdit({ ...quickEdit });
      } else if (type === 'sparring' && sparringCohortRingName && newPhysicalRing) {
        const existingMapping = physicalRingMappings.find(m => m.categoryPoolName === sparringCohortRingName);
        if (existingMapping) {
          const updatedMappings = physicalRingMappings.map(m => 
            m.categoryPoolName === sparringCohortRingName 
              ? { ...m, physicalRingName: newPhysicalRing }
              : m
          );
          useTournamentStore.getState().setPhysicalRingMappings(updatedMappings);
        } else {
          useTournamentStore.getState().setPhysicalRingMappings([
            ...physicalRingMappings,
            { categoryPoolName: sparringCohortRingName, physicalRingName: newPhysicalRing }
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
        onClick={handleCancel}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '8px',
            padding: '20px',
            minWidth: '900px',
            maxWidth: '1000px',
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

          {/* Two-column layout: Forms on left, Sparring on right */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Forms Section */}
            <div style={{ 
              paddingRight: '20px', 
              borderRight: '1px solid var(--border-color)'
            }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#007bff', fontSize: '14px' }}>
              Forms
            </h4>
            
            {/* Current Ring Assignment Info */}
            {formsCategory && currentFormsPool && (
              <div style={{ 
                marginBottom: '15px', 
                padding: '10px', 
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                fontSize: '12px',
              }}>
                <div><strong>Category:</strong> {formsCategory.name}</div>
                <div><strong>Category Ring:</strong> {formatPoolOnly(currentFormsPool)}</div>
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
                value={currentFormsDivision ?? ''}
                onChange={(e) => {
                  const value = e.target.value || null;
                  updatePending({ formsDivision: value });
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                }}
              >
                <option value="">Not Participating</option>
                {config.divisions.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Category/Pool Selector */}
            {currentFormsDivision && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                  Category & Pool:
                </label>
                <select
                  value={currentFormsCategoryId && currentFormsPool ? `${currentFormsCategoryId}|||${currentFormsPool}` : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('[QuickEdit] Forms Category/Pool dropdown changed to:', value);
                    console.log('[QuickEdit] copySparringFromForms state:', copySparringFromForms);
                    if (value) {
                      const [categoryId, pool] = value.split('|||');
                      console.log('[QuickEdit] Parsed categoryId:', categoryId, 'pool:', pool);
                      const updates: Partial<Participant> = { formsCategoryId: categoryId, formsPool: pool };
                      
                      // If copySparringFromForms is checked, also update sparring
                      if (copySparringFromForms) {
                        console.log('[QuickEdit] copySparringFromForms is true, also updating sparring');
                        // Convert forms category ID to sparring category ID
                        // Format: "forms-{division}-{gender}-{minAge}-{maxAge}" -> "sparring-{division}-{gender}-{minAge}-{maxAge}"
                        const sparringCategoryId = categoryId.replace(/^forms-/, 'sparring-');
                        console.log('[QuickEdit] Converted categoryId from', categoryId, 'to', sparringCategoryId);
                        updates.sparringCategoryId = sparringCategoryId;
                        updates.sparringPool = pool;
                      }
                      
                      updatePending(updates);
                    } else {
                      updatePending({ formsCategoryId: undefined, formsPool: undefined });
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
                    .filter(c => c.type === 'forms' && c.division === currentFormsDivision)
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
                value={currentFormsRankOrder || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  updatePending({ formsRankOrder: value });
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
            <div style={{ paddingLeft: '0px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#dc3545', fontSize: '14px' }}>
                Sparring
              </h4>
            
            {/* Current Ring Assignment Info */}
            {sparringCategory && currentSparringPool && (
              <div style={{ 
                marginBottom: '15px', 
                padding: '10px', 
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px',
                fontSize: '12px',
              }}>
                <div><strong>Category:</strong> {sparringCategory.name}</div>
                <div><strong>Category Ring:</strong> {formatPoolOnly(currentSparringPool)}</div>
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
                value={currentSparringDivision ?? ''}
                onChange={(e) => {
                  const value = e.target.value || null;
                  updatePending({ sparringDivision: value });
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                }}
              >
                <option value="">Not Participating</option>
                {config.divisions.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Copy from Forms checkbox */}
            {currentFormsDivision && currentFormsCategoryId && currentFormsPool && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={copySparringFromForms}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      console.log('[QuickEdit] ========== COPY FROM FORMS CHECKBOX ==========');
                      console.log('[QuickEdit] Checkbox changed to:', isChecked);
                      console.log('[QuickEdit] Participant:', participant.firstName, participant.lastName);
                      console.log('[QuickEdit] Current Forms:', { 
                        division: currentFormsDivision,
                        categoryId: currentFormsCategoryId, 
                        pool: currentFormsPool 
                      });
                      console.log('[QuickEdit] Current Sparring:', { 
                        division: currentSparringDivision,
                        categoryId: currentSparringCategoryId, 
                        pool: currentSparringPool 
                      });
                      console.log('[QuickEdit] ================================================');
                      
                      setCopySparringFromForms(isChecked);
                      if (isChecked) {
                        // Copy forms assignment to sparring
                        console.log('[QuickEdit] Updating pending changes to copy forms to sparring');
                        updatePending({
                          sparringDivision: currentFormsDivision,
                          sparringCategoryId: currentFormsCategoryId,
                          sparringPool: currentFormsPool,
                        });
                      } else {
                        // Unchecking - decouple sparring from forms by clearing the values
                        console.log('[QuickEdit] Checkbox unchecked - decoupling sparring from forms');
                        updatePending({
                          sparringDivision: null,
                          sparringCategoryId: undefined,
                          sparringPool: undefined,
                        });
                      }
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  Copy from Forms (same category & pool)
                </label>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', marginLeft: '22px' }}>
                  When checked, sparring will use the same assignment as forms
                </div>
              </div>
            )}

            {/* Category/Pool Selector - only show if not copying from forms */}
            {currentSparringDivision && !copySparringFromForms && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                  Category & Pool:
                </label>
                <select
                  value={currentSparringCategoryId && currentSparringPool ? `${currentSparringCategoryId}|||${currentSparringPool}` : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const [categoryId, pool] = value.split('|||');
                      updatePending({ sparringCategoryId: categoryId, sparringPool: pool });
                    } else {
                      updatePending({ sparringCategoryId: undefined, sparringPool: undefined });
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
                    .filter(c => c.type === 'sparring' && c.division === currentSparringDivision)
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
                value={currentSparringRankOrder || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  updatePending({ sparringRankOrder: value });
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
                value={currentSparringAltRing || ''}
                onChange={(e) => {
                  const value = e.target.value as '' | 'a' | 'b';
                  updatePending({ sparringAltRing: value });
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
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Submit
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

    if (type === 'sparring') {
      console.log(`[RingOverview] RENDERING ${type} ring "${ring.name}" - ring.participantIds.length = ${ring.participantIds.length}`);
    }

    const ringParticipants = participants
      .filter((p) => ring.participantIds.includes(p.id))
      .sort((a, b) => {
        if (type === 'forms') {
          return (a.formsRankOrder || 0) - (b.formsRankOrder || 0);
        } else {
          return (a.sparringRankOrder || 0) - (b.sparringRankOrder || 0);
        }
      });
    
    if (type === 'sparring') {
      console.log(`[RingOverview] AFTER FILTER ${type} ring "${ring.name}" - filtered to ${ringParticipants.length} participants`);
      if (ring.participantIds.length !== ringParticipants.length) {
        console.error(`[RingOverview] MISMATCH! Ring has ${ring.participantIds.length} IDs but only ${ringParticipants.length} matched`);
        console.log(`[RingOverview] Ring participant IDs:`, ring.participantIds);
        console.log(`[RingOverview] Matched participants:`, ringParticipants.map(p => p.id));
      }
    }

    // Check for alt ring status in sparring rings
    let altStatus = null;
    if (type === 'sparring' && category) {
      // Extract pool from ring name (e.g., "P1" from "Mixed 8-10_P1")
      const pool = ring.name?.match(/_P(\d+)$/)?.[0]?.substring(1); // Get "_P1" then remove "_" to get "P1"
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h6 style={{ 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  marginBottom: '0px',
                  color: '#0056b3'
                }}>
                  Alt Ring A ({participantsA.length} participants)
                </h6>
                <button
                  onClick={() => handleAutoOrderPool(ring.categoryId, ring.name?.split('_').pop() || '', 'sparring')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Auto Order
                </button>
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
                              {p.sparringRankOrder || '-'}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h6 style={{ 
                  fontSize: '12px', 
                  fontWeight: 'bold', 
                  marginBottom: '0px',
                  color: '#0056b3'
                }}>
                  Alt Ring B ({participantsB.length} participants)
                </h6>
                <button
                  onClick={() => handleAutoOrderPool(ring.categoryId, ring.name?.split('_').pop() || '', 'sparring')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Auto Order
                </button>
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
                              {p.sparringRankOrder || '-'}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            <div>
              <strong>Category:</strong> {category?.gender}, Ages {category?.minAge}-{category?.maxAge}
            </div>
            <div>
              <strong>Participants:</strong> {ringParticipants.length}
            </div>
          </div>
          <button
            onClick={() => handleAutoOrderPool(ring.categoryId, ring.name?.split('_').pop() || '', type)}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              backgroundColor: type === 'forms' ? '#007bff' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Auto Order
          </button>
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
    <div style={{ display: 'flex', gap: '15px', height: '100vh' }}>
      {/* Main Content */}
      <div className="card" style={{ width: 'fit-content', minWidth: 0, maxHeight: '100vh', overflowY: 'auto' }}>
      {/* Quick Edit Modal */}
      {renderQuickEditModal()}
      
      {/* Participant Selection Modal */}
      {participantSelectionModal && (
        <ParticipantSelectionModal
          onSelect={(participant) => {
            addParticipantToCustomRing(participantSelectionModal.ringId, participant.id);
          }}
          onClose={() => setParticipantSelectionModal(null)}
          excludeIds={
            customRings
              .find(r => r.id === participantSelectionModal.ringId)
              ?.participantIds || []
          }
          title="Add Participant to Ring"
        />
      )}
      
      <h2 className="card-title">Ring Overview</h2>
      
      {/* Grand Champion Rings Section */}
      <GrandChampionSection
        customRings={customRings}
        participants={participants}
        config={config}
        printing={printing}
        setPrinting={setPrinting}
        onAddCustomRing={addCustomRing}
        onDeleteCustomRing={deleteCustomRing}
        onUpdateCustomRing={updateCustomRing}
        onAddParticipantToRing={addParticipantToCustomRing}
        onRemoveParticipantFromRing={removeParticipantFromCustomRing}
        onMoveParticipantInRing={moveParticipantInCustomRing}
        onOpenParticipantSelectionModal={(ringId) => setParticipantSelectionModal({ ringId })}
      />
      
      {/* Division Filter */}
      <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ marginRight: '0px', fontWeight: 'bold' }}>
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

        {/* Print all changed button */}
        {latestCheckpoint && (
          <button
            onClick={handlePrintAllChanged}
            disabled={printing !== null || changedRingsCounts.total === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: changedRingsCounts.total > 0 ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: changedRingsCounts.total > 0 ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              fontSize: '14px',
              whiteSpace: 'nowrap',
            }}
          >
            🖨️ Print All {selectedDivision !== 'all' ? `${selectedDivision} ` : ''}Changed ({changedRingsCounts.forms} forms, {changedRingsCounts.sparring} sparring)
          </button>
        )}
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
          const formsChanged = pair.formsRing && isRingAffectedSimple(pair.formsRing.name || pair.cohortRingName, 'forms', changedRings);
          const sparringChanged = pair.sparringRing && isRingAffectedSimple(pair.sparringRing.name || pair.cohortRingName, 'sparring', changedRings);
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
    
    {/* Checkpoint Sidebar */}
    <CheckpointSidebar
      checkpoints={checkpoints}
      onCreateCheckpoint={createCheckpoint}
      onLoadCheckpoint={loadCheckpoint}
    />
  </div>
  );
}

export default RingOverview;
