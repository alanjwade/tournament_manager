import React, { useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import jsPDF from 'jspdf';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings, getEffectiveFormsInfo, getEffectiveSparringInfo } from '../utils/computeRings';
import { checkSparringAltRingStatus } from '../utils/ringOrdering';
import { formatPoolNameForDisplay, formatPoolOnly, isRingAffected, isRingAffectedSimple, buildCategoryPoolName, extractPoolId } from '../utils/ringNameFormatter';
import { getSchoolAbbreviation } from '../utils/schoolAbbreviations';
import { generateFormsScoringSheets } from '../utils/pdfGenerators/formsScoringSheet';
import { generateSparringBrackets } from '../utils/pdfGenerators/sparringBracket';
import { Participant, CompetitionRing, CustomRing } from '../types/tournament';
import { RING_BALANCE, DEFAULT_DIVISION_ORDER } from '../utils/constants';
import ParticipantSelectionModal from './ParticipantSelectionModal';

interface RingPair {
  categoryPoolName: string;
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

interface RingOverviewProps {}

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

function RingOverview({}: RingOverviewProps) {
  const [selectedDivision, setSelectedDivision] = useState<string>(
    localStorage.getItem('tournament-division') || 'Black Belt'
  );
  const [divisionFilter, setDivisionFilter] = useState<string>(
    localStorage.getItem('tournament-division') || 'Black Belt'
  ); // Persists dropdown selection
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null);
  const [copySparringFromForms, setCopySparringFromForms] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<Participant>>({});
  const [printing, setPrinting] = useState<string | null>(null);
  const [participantSelectionModal, setParticipantSelectionModal] = useState<{
    ringId: string;
  } | null>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [editingRingName, setEditingRingName] = useState<string | null>(null);
  const [editingRingNameValue, setEditingRingNameValue] = useState('');
  const [showCreateRingModal, setShowCreateRingModal] = useState(false);
  const [newRingName, setNewRingName] = useState('Black Belt Grand Champion');
  const [newRingType, setNewRingType] = useState<'forms' | 'sparring'>('forms');
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [renamingCheckpointId, setRenamingCheckpointId] = useState<string | null>(null);
  const [renamingCheckpointValue, setRenamingCheckpointValue] = useState('');
  const [expandedRings, setExpandedRings] = useState<Set<string>>(new Set());
  const [ringSort, setRingSort] = useState<'ring' | 'group' | 'category'>('ring');
  
  const participants = useTournamentStore((state) => state.participants);
  const config = useTournamentStore((state) => state.config);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const updateParticipant = useTournamentStore((state) => state.updateParticipant);
  const batchUpdateParticipants = useTournamentStore((state) => state.batchUpdateParticipants);
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
  const renameCheckpoint = useTournamentStore((state) => state.renameCheckpoint);
  const deleteCheckpoint = useTournamentStore((state) => state.deleteCheckpoint);
  const openQuickEditParticipantId = useTournamentStore((state) => state.openQuickEditParticipantId);
  const setOpenQuickEditParticipantId = useTournamentStore((state) => state.setOpenQuickEditParticipantId);
  const customOrderRings = useTournamentStore((state) => state.customOrderRings);
  const toggleCustomOrderRing = useTournamentStore((state) => state.toggleCustomOrderRing);

  // Open quick-edit modal when triggered from global search
  useEffect(() => {
    if (!openQuickEditParticipantId) return;
    const participant = participants.find(p => p.id === openQuickEditParticipantId);
    if (participant) {
      const ringType = participant.competingForms ? 'forms' : 'sparring';
      const ringName = ringType === 'forms'
        ? (participant.formsDivision ?? '')
        : (participant.sparringDivision ?? '');
      setQuickEdit({ participant, ringType, ringName });
    }
    setOpenQuickEditParticipantId(null);
  }, [openQuickEditParticipantId]);

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

  // Track content width for responsive layout
  useEffect(() => {
    if (!contentRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  // Sort checkpoints by timestamp, newest first
  const sortedCheckpoints = useMemo(() => {
    return [...checkpoints].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [checkpoints]);

  const handleCreateCheckpoint = async () => {
    const name = newCheckpointName.trim() || `Checkpoint ${checkpoints.length + 1}`;
    await createCheckpoint(name);
    setNewCheckpointName('');
  };

  const handlePrintGCRing = async (ring: CustomRing, ringParticipants: Participant[]) => {
    setPrinting(ring.id);
    try {
      // Create participants with rank order set based on position in ring
      const participantsWithOrder = ringParticipants.map((p, index) => ({
        ...p,
        formsRankOrder: index + 1,
        sparringRankOrder: index + 1
      }));
      
      // Create a mock competition ring for PDF generation
      const mockRing: CompetitionRing = {
        id: ring.id,
        physicalRingId: 'GC',
        categoryId: 'custom',
        division: ring.name,
        type: ring.type,
        participantIds: ring.participantIds,
        name: ring.name,
      };
      
      // Use appropriate PDF generator based on type
      const pdf = ring.type === 'forms'
        ? generateFormsScoringSheets(
            participantsWithOrder,
            [mockRing],
            config.physicalRings,
            ring.name,
            config.watermarkImage,
            [],
            undefined,
            undefined,
            true, // isCustomRing
            config.schoolAbbreviations
          )
        : generateSparringBrackets(
            participantsWithOrder,
            [mockRing],
            config.physicalRings,
            ring.name,
            config.watermarkImage,
            [],
            undefined,
            undefined,
            true // isCustomRing
          );
      
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        await new Promise<void>(resolve => {
          printWindow.addEventListener('load', () => {
            printWindow.addEventListener('afterprint', () => printWindow.close());
            printWindow.print();
            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
              resolve();
            }, 500);
          });
        });
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPrinting(null);
    }
  };

  const handlePrintSingleRing = async (ring: CompetitionRing, type: 'forms' | 'sparring', division: string) => {
    setPrinting(`${ring.id}-${type}`);
    try {
      const pdf = type === 'forms'
        ? generateFormsScoringSheets(
            participants,
            [ring],
            config.physicalRings,
            division,
            config.watermarkImage,
            physicalRingMappings,
            undefined,
            undefined,
            undefined,
            config.schoolAbbreviations
          )
        : generateSparringBrackets(
            participants,
            [ring],
            config.physicalRings,
            division,
            config.watermarkImage,
            physicalRingMappings
          );
      
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        await new Promise<void>(resolve => {
          printWindow.addEventListener('load', () => {
            printWindow.addEventListener('afterprint', () => printWindow.close());
            printWindow.print();
            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
              resolve();
            }, 500);
          });
        });
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPrinting(null);
    }
  };

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
    batchUpdateParticipants(
      newOrder.map((p, index) => ({
        id: p.id,
        updates: ringType === 'forms'
          ? { formsRankOrder: index + 1 }
          : { sparringRankOrder: index + 1 },
      }))
    );
  };

  // Print all changed rings combined into one PDF
  const handlePrintAllChanged = async () => {
    if (changedRingsCounts.total === 0) {
      alert('No rings have changed since the last checkpoint.');
      return;
    }

    // Don't filter when viewing Grand Champion or Checkpoints
    const divisionFilterForPrint = (selectedDivision === 'grand-champion' || selectedDivision === 'checkpoints') ? 'all' : selectedDivision;

    // Get all competition rings that have changed, filtered by selected division
    // For forms, we just need to know if the ring changed
    const changedFormsRings = competitionRings
      .filter(ring => 
        ring.type === 'forms' && 
        isRingAffected(ring.name || ring.division, 'forms', changedRings).isAffected &&
        (divisionFilterForPrint === 'all' || ring.division === divisionFilterForPrint)
      );
    
    // For sparring, we need to track which specific alt rings changed
    interface SparringRingWithAltFilter {
      ring: CompetitionRing;
      altRings?: Set<string>;
    }
    const changedSparringRingsWithFilter: SparringRingWithAltFilter[] = [];
    
    competitionRings.forEach(ring => {
      if (ring.type !== 'sparring') return;
      if (divisionFilterForPrint !== 'all' && ring.division !== divisionFilterForPrint) return;
      
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

  // Toggle ring expansion
  const toggleRingExpanded = (poolName: string) => {
    const newExpanded = new Set(expandedRings);
    if (newExpanded.has(poolName)) {
      newExpanded.delete(poolName);
    } else {
      newExpanded.add(poolName);
    }
    setExpandedRings(newExpanded);
  };

  // Collapse all rings
  const handleCollapseAll = () => {
    setExpandedRings(new Set());
  };

  // Expand all rings
  const handleExpandAll = () => {
    const allPoolNames = new Set(filteredRingPairs.map(p => p.categoryPoolName));
    setExpandedRings(allPoolNames);
  };

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
          categoryPoolName: ringName,
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

    // Sort by division order, then by pool number, then by physical ring name
    return pairs.sort((a, b) => {
      // First sort by division order
      const aDivOrder = config.divisions.find(d => d.name === a.division)?.order ?? DEFAULT_DIVISION_ORDER;
      const bDivOrder = config.divisions.find(d => d.name === b.division)?.order ?? DEFAULT_DIVISION_ORDER;
      if (aDivOrder !== bDivOrder) return aDivOrder - bDivOrder;

      // Extract pool numbers from category pool name (e.g., "Division - CategoryName Pool 1" -> 1)
      const aPoolMatch = a.categoryPoolName.match(/Pool\s+(\d+)/i);
      const bPoolMatch = b.categoryPoolName.match(/Pool\s+(\d+)/i);
      const aPool = aPoolMatch ? parseInt(aPoolMatch[1]) : 999;
      const bPool = bPoolMatch ? parseInt(bPoolMatch[1]) : 999;
      
      // Sort by pool number second
      if (aPool !== bPool) {
        return aPool - bPool;
      }

      // Then sort by physical ring name
      if (a.physicalRingName && b.physicalRingName) {
        // Custom sort for physical ring names (Ring 1, Ring 1a, Ring 1b, Ring 2, etc.)
        const aMatch = a.physicalRingName.match(/(?:PR|Ring\s*)(\d+)([a-z])?/i);
        const bMatch = b.physicalRingName.match(/(?:PR|Ring\s*)(\d+)([a-z])?/i);
        
        if (aMatch && bMatch) {
          const aNum = parseInt(aMatch[1]);
          const bNum = parseInt(bMatch[1]);
          if (aNum !== bNum) return aNum - bNum;
          const aLetter = aMatch[2] || '';
          const bLetter = bMatch[2] || '';
          return aLetter.localeCompare(bLetter);
        }
        return a.physicalRingName.localeCompare(b.physicalRingName);
      }
      
      if (a.physicalRingName) return -1;
      if (b.physicalRingName) return 1;
      return a.categoryPoolName.localeCompare(b.categoryPoolName);
    });
  }, [competitionRings, physicalRingMappings, config.divisions]);

  // Get unique divisions for the filter dropdown
  const divisions = useMemo(() => {
    const divSet = new Set<string>();
    ringPairs.forEach(pair => {
      if (pair.division) {
        divSet.add(pair.division);
      }
    });
    // Sort by division order from config
    return Array.from(divSet).sort((a, b) => {
      const aOrder = config.divisions.find(d => d.name === a)?.order ?? DEFAULT_DIVISION_ORDER;
      const bOrder = config.divisions.find(d => d.name === b)?.order ?? DEFAULT_DIVISION_ORDER;
      return aOrder - bOrder;
    });
  }, [ringPairs, config.divisions]);

  // Get latest checkpoint
  const latestCheckpoint = useMemo(() => {
    if (checkpoints.length === 0) return null;
    return [...checkpoints].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  }, [checkpoints]);

  // Count changed rings for display
  const changedRingsCounts = useMemo(() => {
    // Don't filter when viewing Grand Champion or Checkpoints
    const divisionFilter = (selectedDivision === 'grand-champion' || selectedDivision === 'checkpoints') ? 'all' : selectedDivision;
    
    const changedFormsRings = competitionRings.filter(
      ring => ring.type === 'forms' && 
              isRingAffected(ring.name || ring.division, 'forms', changedRings).isAffected &&
              (divisionFilter === 'all' || ring.division === divisionFilter)
    );
    const changedSparringRings = competitionRings.filter(
      ring => {
        if (ring.type !== 'sparring') return false;
        if (divisionFilter !== 'all' && ring.division !== divisionFilter) return false;
        
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

  // Sort filtered ring pairs by the selected sort mode
  const sortedRingPairs = useMemo(() => {
    const parseRingName = (name?: string): { num: number; letter: string } => {
      const m = name?.match(/(?:PR|Ring\s*)(\d+)([a-z])?/i);
      return m ? { num: parseInt(m[1]), letter: (m[2] || '').toLowerCase() } : { num: 999, letter: '' };
    };

    if (ringSort === 'ring') {
      return [...filteredRingPairs].sort((a, b) => {
        const aR = parseRingName(a.physicalRingName);
        const bR = parseRingName(b.physicalRingName);
        if (aR.num !== bR.num) return aR.num - bR.num;
        return aR.letter.localeCompare(bR.letter);
      });
    }

    if (ringSort === 'group') {
      // Group by letter suffix first (1a,2a,3a... then 1b,2b,3b... then unlabelled)
      return [...filteredRingPairs].sort((a, b) => {
        const aR = parseRingName(a.physicalRingName);
        const bR = parseRingName(b.physicalRingName);
        // No-letter rings go last
        if (!aR.letter && bR.letter) return 1;
        if (aR.letter && !bR.letter) return -1;
        if (aR.letter !== bR.letter) return aR.letter.localeCompare(bR.letter);
        return aR.num - bR.num;
      });
    }

    if (ringSort === 'category') {
      // Sort by minimum actual age of participants in the ring
      const getMinAge = (pair: RingPair): number => {
        const ids = [
          ...(pair.formsRing?.participantIds || []),
          ...(pair.sparringRing?.participantIds || []),
        ];
        const ages = ids
          .map(id => participants.find(p => p.id === id)?.age)
          .filter((age): age is number => typeof age === 'number');
        return ages.length > 0 ? Math.min(...ages) : 999;
      };
      return [...filteredRingPairs].sort((a, b) => {
        const ageDiff = getMinAge(a) - getMinAge(b);
        if (ageDiff !== 0) return ageDiff;
        return a.categoryPoolName.localeCompare(b.categoryPoolName);
      });
    }

    return filteredRingPairs;
  }, [filteredRingPairs, ringSort, participants]);

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
    const divisionCategories = categories.filter(c => 
      c.division === currentDivision && 
      c.type === ringType
    );
    
    // Get all unique physical rings used in this division
    const physicalRingSet = new Set<string>();
    divisionCategories.forEach(category => {
      // Find mappings for this category (new format: "Division - CategoryName Pool N")
      const categoryMappings = physicalRingMappings.filter(m => 
        m.categoryPoolName?.startsWith(`${category.division} - ${category.name} Pool`)
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
    const currentCompetingForms = pendingChanges.competingForms !== undefined ? pendingChanges.competingForms : participant.competingForms;
    const currentCompetingSparring = pendingChanges.competingSparring !== undefined ? pendingChanges.competingSparring : participant.competingSparring;
    
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
    const formsPoolName = formsCategory && currentFormsPool 
      ? buildCategoryPoolName(formsCategory.division, formsCategory.name, currentFormsPool)
      : null;
    const formsPhysicalMapping = formsPoolName 
      ? physicalRingMappings.find(m => m.categoryPoolName === formsPoolName)
      : undefined;
    
    const sparringCategory = currentSparringCategoryId ? categories.find(c => c.id === currentSparringCategoryId) : null;
    const sparringPoolName = sparringCategory && currentSparringPool 
      ? buildCategoryPoolName(sparringCategory.division, sparringCategory.name, currentSparringPool)
      : null;
    const sparringPhysicalMapping = sparringPoolName 
      ? physicalRingMappings.find(m => m.categoryPoolName === sparringPoolName)
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
      
      // Get all mappings for these categories (new format: "Division - CategoryName Pool N")
      const mappingsForDivision = physicalRingMappings.filter(m => {
        // Check if mapping belongs to this division
        return categoriesForDivision.some(c => 
          m.categoryPoolName?.startsWith(`${c.division} - ${c.name} Pool`)
        );
      });

      return mappingsForDivision
        .filter(m => m.physicalRingName)
        .map(m => ({
          physicalRingName: m.physicalRingName,
          categoryPoolName: m.categoryPoolName || '',
          label: `${m.physicalRingName} (${m.categoryPoolName || ''})`
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
      if (type === 'forms' && formsPoolName && newPhysicalRing) {
        const existingMapping = physicalRingMappings.find(m => m.categoryPoolName === formsPoolName);
        if (existingMapping) {
          const updatedMappings = physicalRingMappings.map(m => 
            m.categoryPoolName === formsPoolName 
              ? { ...m, physicalRingName: newPhysicalRing }
              : m
          );
          useTournamentStore.getState().setPhysicalRingMappings(updatedMappings);
        } else {
          useTournamentStore.getState().setPhysicalRingMappings([
            ...physicalRingMappings,
            { categoryPoolName: formsPoolName, physicalRingName: newPhysicalRing }
          ]);
        }
        setQuickEdit({ ...quickEdit });
      } else if (type === 'sparring' && sparringPoolName && newPhysicalRing) {
        const existingMapping = physicalRingMappings.find(m => m.categoryPoolName === sparringPoolName);
        if (existingMapping) {
          const updatedMappings = physicalRingMappings.map(m => 
            m.categoryPoolName === sparringPoolName 
              ? { ...m, physicalRingName: newPhysicalRing }
              : m
          );
          useTournamentStore.getState().setPhysicalRingMappings(updatedMappings);
        } else {
          useTournamentStore.getState().setPhysicalRingMappings([
            ...physicalRingMappings,
            { categoryPoolName: sparringPoolName, physicalRingName: newPhysicalRing }
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
            padding: '24px',
            minWidth: '900px',
            maxWidth: '1000px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>
            Quick Edit: {participant.firstName} {participant.lastName}
          </h3>
          
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            <div><strong>Age:</strong> {participant.age} | <strong>Gender:</strong> {participant.gender}</div>
            {participant.heightFeet && (
              <div><strong>Height:</strong> {participant.heightFeet}'{participant.heightInches}"</div>
            )}
          </div>

          {/* Copy from Forms checkbox - at the top */}
          {currentFormsDivision && currentFormsCategoryId && currentFormsPool && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '12px', 
              backgroundColor: copySparringFromForms ? 'var(--info-bg)' : 'var(--bg-secondary)',
              borderRadius: '6px',
              border: copySparringFromForms ? '1px solid var(--info-border)' : '1px solid var(--border-color)',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
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
                {copySparringFromForms ? '✓ Sparring uses same Division, Category & Pool as Forms' : 'Use same assignment for both Forms and Sparring'}
              </label>
              {copySparringFromForms && (
                <div style={{ fontSize: '11px', color: 'var(--info-text)', marginTop: '6px', marginLeft: '22px' }}>
                  Both Forms and Sparring are assigned to the same category and pool
                </div>
              )}
            </div>
          )}

          {/* Two-column layout: Forms on left, Sparring on right */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Forms Section */}
            <div style={{ 
              paddingRight: '20px', 
              borderRight: '1px solid var(--border-color)'
            }}>
            <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#007bff', fontSize: '15px', fontWeight: '600' }}>
              Forms
            </h4>
            
            {/* Competing Checkbox */}
            <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: currentCompetingForms ? 'var(--success-bg)' : 'var(--bg-secondary)', borderRadius: '4px', border: `1px solid ${currentCompetingForms ? 'var(--success-border)' : 'var(--border-color)'}` }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  checked={currentCompetingForms ?? false}
                  onChange={(e) => {
                    updatePending({ competingForms: e.target.checked });
                  }}
                  style={{ marginRight: '8px' }}
                />
                Competing in Forms
              </label>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '22px' }}>
                {currentCompetingForms ? 'Fields unlocked for editing' : 'Uncheck to withdraw - fields locked but data preserved'}
              </div>
            </div>
            
            {/* Division Selector */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Division
              </label>
              <select
                value={currentFormsDivision ?? ''}
                onChange={(e) => {
                  const value = e.target.value || null;
                  updatePending({ formsDivision: value });
                }}
                disabled={!currentCompetingForms}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: currentCompetingForms ? 'var(--input-bg)' : 'var(--bg-tertiary)',
                  opacity: currentCompetingForms ? 1 : 0.6,
                  cursor: currentCompetingForms ? 'default' : 'not-allowed',
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
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Category & Pool
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
                  disabled={!currentCompetingForms}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    border: '1px solid var(--input-border)',
                    borderRadius: '4px',
                    backgroundColor: currentCompetingForms ? 'var(--input-bg)' : 'var(--bg-tertiary)',
                    opacity: currentCompetingForms ? 1 : 0.6,
                    cursor: currentCompetingForms ? 'default' : 'not-allowed',
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
              </div>
            )}

            {/* Physical Ring Assignment */}
            {formsPhysicalMapping && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Physical Ring
                </label>
                <div style={{ 
                  padding: '8px 10px', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  {formsPhysicalMapping.physicalRingName}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Change in Ring Map tab
                </div>
              </div>
            )}

            {/* Rank Order */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Rank Order
              </label>
              <input
                type="number"
                value={currentFormsRankOrder || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  updatePending({ formsRankOrder: value });
                }}
                disabled={!currentCompetingForms}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: currentCompetingForms ? 'var(--input-bg)' : 'var(--bg-tertiary)',
                  opacity: currentCompetingForms ? 1 : 0.6,
                  cursor: currentCompetingForms ? 'default' : 'not-allowed',
                }}
                placeholder="e.g., 1, 2, 3..."
              />
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Use decimals like 1.5 to insert between competitors
              </div>
            </div>
            </div>

            {/* Sparring Section */}
            <div style={{ paddingLeft: '0px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#dc3545', fontSize: '15px', fontWeight: '600' }}>
                Sparring
              </h4>
            
            {/* Competing Checkbox */}
            <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: currentCompetingSparring ? 'var(--success-bg)' : 'var(--bg-secondary)', borderRadius: '4px', border: `1px solid ${currentCompetingSparring ? 'var(--success-border)' : 'var(--border-color)'}` }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  checked={currentCompetingSparring ?? false}
                  onChange={(e) => {
                    const updates: Partial<Participant> = { competingSparring: e.target.checked };
                    
                    // If enabling sparring and copySparringFromForms is checked, populate sparring fields
                    if (e.target.checked && copySparringFromForms && currentCompetingForms && currentFormsDivision && currentFormsCategoryId && currentFormsPool) {
                      console.log('[QuickEdit] Auto-populating sparring fields from forms because copySparringFromForms is enabled');
                      // Convert forms category ID to sparring category ID
                      // Format: "forms-{division}-{gender}-{minAge}-{maxAge}" -> "sparring-{division}-{gender}-{minAge}-{maxAge}"
                      const sparringCategoryId = currentFormsCategoryId.replace(/^forms-/, 'sparring-');
                      console.log('[QuickEdit] Converted categoryId from', currentFormsCategoryId, 'to', sparringCategoryId);
                      updates.sparringDivision = currentFormsDivision;
                      updates.sparringCategoryId = sparringCategoryId;
                      updates.sparringPool = currentFormsPool;
                    }
                    
                    updatePending(updates);
                  }}
                  style={{ marginRight: '8px' }}
                />
                Competing in Sparring
              </label>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '22px' }}>
                {currentCompetingSparring ? 'Fields unlocked for editing' : 'Uncheck to withdraw - fields locked but data preserved'}
              </div>
            </div>
            
            {/* Division Selector */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Division {copySparringFromForms && <span style={{ color: 'var(--info-text)', fontSize: '11px', fontWeight: 'normal' }}>• Same as Forms</span>}
              </label>
              <select
                value={currentSparringDivision ?? ''}
                onChange={(e) => {
                  const value = e.target.value || null;
                  updatePending({ sparringDivision: value });
                }}
                disabled={copySparringFromForms || !currentCompetingSparring}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: (copySparringFromForms || !currentCompetingSparring) ? 'var(--bg-tertiary)' : 'var(--input-bg)',
                  opacity: (copySparringFromForms || !currentCompetingSparring) ? 0.6 : 1,
                  cursor: (copySparringFromForms || !currentCompetingSparring) ? 'not-allowed' : 'default',
                }}
              >
                <option value="">Not Participating</option>
                {config.divisions.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Category/Pool Selector */}
            {currentSparringDivision && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Category & Pool {copySparringFromForms && <span style={{ color: 'var(--info-text)', fontSize: '11px', fontWeight: 'normal' }}>• Same as Forms</span>}
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
                  disabled={copySparringFromForms || !currentCompetingSparring}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    border: '1px solid var(--input-border)',
                    borderRadius: '4px',
                    backgroundColor: (copySparringFromForms || !currentCompetingSparring) ? 'var(--bg-tertiary)' : 'var(--input-bg)',
                    opacity: (copySparringFromForms || !currentCompetingSparring) ? 0.6 : 1,
                    cursor: (copySparringFromForms || !currentCompetingSparring) ? 'not-allowed' : 'default',
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
                {!copySparringFromForms && (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {formsCategory && sparringCategory && formsCategory.division !== sparringCategory.division && (
                      <span style={{ color: 'var(--accent-primary)' }}>ℹ Different from Forms</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Physical Ring Assignment */}
            {sparringPhysicalMapping && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Physical Ring
                </label>
                <div style={{ 
                  padding: '8px 10px', 
                  backgroundColor: copySparringFromForms ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)', 
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  opacity: copySparringFromForms ? 0.7 : 1,
                }}>
                  {sparringPhysicalMapping.physicalRingName}
                  {copySparringFromForms && formsPhysicalMapping && sparringPhysicalMapping.physicalRingName !== formsPhysicalMapping.physicalRingName && (
                    <span style={{ fontSize: '11px', marginLeft: '6px', color: 'var(--accent-primary)' }}>ℹ Different from Forms</span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Change in Ring Map tab
                </div>
              </div>
            )}

            {/* Rank Order */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Rank Order
              </label>
              <input
                type="number"
                value={currentSparringRankOrder || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  updatePending({ sparringRankOrder: value });
                }}
                disabled={!currentCompetingSparring}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: currentCompetingSparring ? 'var(--input-bg)' : 'var(--bg-tertiary)',
                  opacity: currentCompetingSparring ? 1 : 0.6,
                  cursor: currentCompetingSparring ? 'default' : 'not-allowed',
                }}
                placeholder="e.g., 1, 2, 3..."
              />
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Use decimals like 1.5 to insert between competitors
              </div>
            </div>

            {/* Alt Ring */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Alt Ring
              </label>
              <select
                value={currentSparringAltRing || ''}
                onChange={(e) => {
                  const value = e.target.value as '' | 'a' | 'b';
                  updatePending({ sparringAltRing: value });
                }}
                disabled={!currentCompetingSparring}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: currentCompetingSparring ? 'var(--input-bg)' : 'var(--bg-tertiary)',
                  opacity: currentCompetingSparring ? 1 : 0.6,
                  cursor: currentCompetingSparring ? 'default' : 'not-allowed',
                }}
              >
                <option value="">No alt ring (default)</option>
                <option value="a">Alt Ring A</option>
                <option value="b">Alt Ring B</option>
              </select>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Splits pool into two separate brackets
              </div>
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

    const isCustomOrder = customOrderRings.includes(ring.id);
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
      // Extract pool ID from ring name using helper function
      const pool = extractPoolId(ring.name);
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handlePrintSingleRing(ring, 'sparring', category?.division || 'Unknown')}
                    disabled={printing !== null}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: printing !== null ? 'not-allowed' : 'pointer',
                      opacity: printing !== null ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🖨️ Print
                  </button>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isCustomOrder}
                      onChange={() => toggleCustomOrderRing(ring.id)}
                    />
                    Custom Order
                  </label>
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
                    <th style={{ padding: '4px', textAlign: 'left', color: 'var(--text-primary)' }}>Name</th>
                    <th style={{ padding: '4px', width: '80px', color: 'var(--text-primary)' }}>School</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Age</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Gender</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Height</th>
                    <th style={{ padding: '4px', textAlign: 'center', color: 'var(--text-primary)', width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsA.map((p, index) => {
                    const isFirst = index === 0;
                    const isLast = index === participantsA.length - 1;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '4px' }}>
                          {renderParticipantName(p, 'sparring', ringDisplayName + ' (Alt A)')}
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{getParticipantSchool(p)}</td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{p.age}</td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{p.gender}</td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          {p.heightFeet}'{p.heightInches}"
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => moveParticipant(p.id, 'up', 'sparring')}
                              disabled={isFirst || !isCustomOrder}
                              title={isCustomOrder ? 'Move up' : 'Enable Custom Order to reorder'}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: (isFirst || !isCustomOrder) ? '#6c757d' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: (isFirst || !isCustomOrder) ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveParticipant(p.id, 'down', 'sparring')}
                              disabled={isLast || !isCustomOrder}
                              title={isCustomOrder ? 'Move down' : 'Enable Custom Order to reorder'}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: (isLast || !isCustomOrder) ? '#6c757d' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: (isLast || !isCustomOrder) ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              ▼
                            </button>
                          </div>
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handlePrintSingleRing(ring, 'sparring', category?.division || 'Unknown')}
                    disabled={printing !== null}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: printing !== null ? 'not-allowed' : 'pointer',
                      opacity: printing !== null ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🖨️ Print
                  </button>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isCustomOrder}
                      onChange={() => toggleCustomOrderRing(ring.id)}
                    />
                    Custom Order
                  </label>
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
                    <th style={{ padding: '4px', textAlign: 'left', color: 'var(--text-primary)' }}>Name</th>
                    <th style={{ padding: '4px', width: '80px', color: 'var(--text-primary)' }}>School</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Age</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Gender</th>
                    <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Height</th>
                    <th style={{ padding: '4px', textAlign: 'center', color: 'var(--text-primary)', width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsB.map((p, index) => {
                    const isFirst = index === 0;
                    const isLast = index === participantsB.length - 1;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '4px' }}>
                          {renderParticipantName(p, 'sparring', ringDisplayName + ' (Alt B)')}
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{getParticipantSchool(p)}</td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{p.age}</td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>{p.gender}</td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          {p.heightFeet}'{p.heightInches}"
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => moveParticipant(p.id, 'up', 'sparring')}
                              disabled={isFirst || !isCustomOrder}
                              title={isCustomOrder ? 'Move up' : 'Enable Custom Order to reorder'}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: (isFirst || !isCustomOrder) ? '#6c757d' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: (isFirst || !isCustomOrder) ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveParticipant(p.id, 'down', 'sparring')}
                              disabled={isLast || !isCustomOrder}
                              title={isCustomOrder ? 'Move down' : 'Enable Custom Order to reorder'}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: (isLast || !isCustomOrder) ? '#6c757d' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: (isLast || !isCustomOrder) ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              ▼
                            </button>
                          </div>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handlePrintSingleRing(ring, type, category?.division || 'Unknown')}
              disabled={printing !== null}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: printing !== null ? 'not-allowed' : 'pointer',
                opacity: printing !== null ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              🖨️ Print
            </button>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                color: 'var(--text-secondary)',
              }}
            >
              <input
                type="checkbox"
                checked={isCustomOrder}
                onChange={() => toggleCustomOrderRing(ring.id)}
              />
              Custom Order
            </label>
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
              <th style={{ padding: '4px', textAlign: 'left', color: 'var(--text-primary)' }}>Name</th>
              <th style={{ padding: '4px', width: '80px', color: 'var(--text-primary)' }}>School</th>
              <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Age</th>
              <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Gender</th>
              {type === 'sparring' && <th style={{ padding: '4px', color: 'var(--text-primary)' }}>Height</th>}
              <th style={{ padding: '4px', textAlign: 'center', color: 'var(--text-primary)', width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ringParticipants.map((p, index) => {
              const isFirst = index === 0;
              const isLast = index === ringParticipants.length - 1;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
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
                  <td style={{ padding: '4px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        onClick={() => moveParticipant(p.id, 'up', type)}
                        disabled={isFirst || !isCustomOrder}
                        title={isCustomOrder ? 'Move up' : 'Enable Custom Order to reorder'}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: (isFirst || !isCustomOrder) ? '#6c757d' : (type === 'forms' ? '#007bff' : '#dc3545'),
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (isFirst || !isCustomOrder) ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveParticipant(p.id, 'down', type)}
                        disabled={isLast || !isCustomOrder}
                        title={isCustomOrder ? 'Move down' : 'Enable Custom Order to reorder'}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: (isLast || !isCustomOrder) ? '#6c757d' : (type === 'forms' ? '#007bff' : '#dc3545'),
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (isLast || !isCustomOrder) ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </td>
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

  // Determine if we should stack Forms/Sparring based on available width
  const shouldStack = contentWidth > 0 && contentWidth < 1000;

  return (
    <div style={{ display: 'flex', gap: '15px', height: '100vh', overflow: 'hidden', position: 'relative', flexDirection: 'column' }}>
      {/* Main Content - Independent Scrollbar */}
      <div 
        ref={contentRef}
        className="card" 
        style={{ 
          flex: 1,
          width: '100%',
          minWidth: 'min-content', 
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
      {/* Quick Edit Modal — portaled to document.body so it shows over any active tab */}
      {quickEdit ? ReactDOM.createPortal(renderQuickEditModal()!, document.body) : null}
      
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
      
      {/* Create Ring Modal */}
      {showCreateRingModal && (
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
          onClick={() => setShowCreateRingModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '20px',
              minWidth: '400px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-primary)' }}>
              Create New Grand Champion Ring
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontSize: '13px',
                color: 'var(--text-secondary)',
                fontWeight: '600'
              }}>
                Ring Name
              </label>
              <input
                type="text"
                value={newRingName}
                onChange={(e) => setNewRingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newRingName.trim()) {
                    addCustomRing(newRingName, newRingType);
                    setShowCreateRingModal(false);
                  } else if (e.key === 'Escape') {
                    setShowCreateRingModal(false);
                  }
                }}
                placeholder="e.g., Black Belt Grand Champion"
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--input-border)',
                  fontSize: '14px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontSize: '13px',
                color: 'var(--text-secondary)',
                fontWeight: '600'
              }}>
                Type
              </label>
              <select
                value={newRingType}
                onChange={(e) => setNewRingType(e.target.value as 'forms' | 'sparring')}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--input-border)',
                  fontSize: '14px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="forms">Forms</option>
                <option value="sparring">Sparring</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateRingModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newRingName.trim()) {
                    addCustomRing(newRingName, newRingType);
                    setShowCreateRingModal(false);
                  }
                }}
                disabled={!newRingName.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: newRingName.trim() ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: newRingName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Create Ring
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Division Filter and Quick Toggle Buttons */}
      <div style={{ 
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--bg-primary)',
        paddingTop: '10px',
        paddingBottom: '10px',
        marginBottom: '15px', 
        display: 'flex', 
        gap: '15px', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        borderBottom: '2px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ marginRight: '0px', fontWeight: 'bold' }}>
            Filter by Division:
          </label>
          <select
            value={divisionFilter}
            onChange={(e) => {
              setDivisionFilter(e.target.value);
              setSelectedDivision(e.target.value);
              localStorage.setItem('tournament-division', e.target.value);
            }}
            style={{
              padding: '5px 10px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid var(--input-border)',
            }}
          >
            {divisions.map((division) => {
              const count = ringPairs.filter(p => p.division === division).length;
              return (
                <option key={division} value={division}>
                  {division} ({count} rings)
                </option>
              );
            })}
          </select>
          
          {/* Quick Overview button */}
          <button
            onClick={() => {
              // Return to division overview (using persisted divisionFilter)
              setSelectedDivision(divisionFilter);
            }}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              backgroundColor: (selectedDivision !== 'grand-champion' && selectedDivision !== 'checkpoints') ? '#28a745' : 'var(--bg-secondary)',
              color: (selectedDivision !== 'grand-champion' && selectedDivision !== 'checkpoints') ? 'white' : 'var(--text-primary)',
              border: `2px solid ${(selectedDivision !== 'grand-champion' && selectedDivision !== 'checkpoints') ? '#28a745' : 'var(--border-color)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            title="Show all divisions overview"
          >
            Overview
          </button>

          {/* Quick Checkpoints button */}
          <button
            onClick={() => setSelectedDivision(selectedDivision === 'checkpoints' ? divisionFilter : 'checkpoints')}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              backgroundColor: selectedDivision === 'checkpoints' ? '#007bff' : 'var(--bg-secondary)',
              color: selectedDivision === 'checkpoints' ? 'white' : 'var(--text-primary)',
              border: `2px solid ${selectedDivision === 'checkpoints' ? '#007bff' : 'var(--border-color)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            title="Toggle Checkpoints view"
          >
            📋 Checkpoint
          </button>

          {/* Quick Grand Champion button */}
          <button
            onClick={() => setSelectedDivision(selectedDivision === 'grand-champion' ? divisionFilter : 'grand-champion')}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              backgroundColor: selectedDivision === 'grand-champion' ? '#ffc107' : 'var(--bg-secondary)',
              color: selectedDivision === 'grand-champion' ? '#000' : 'var(--text-primary)',
              border: `2px solid ${selectedDivision === 'grand-champion' ? '#ffc107' : 'var(--border-color)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            title="Toggle Grand Champion view"
          >
            ⭐ GC
          </button>

          {/* Collapse/Expand all buttons - only show in regular division view */}
          {selectedDivision !== 'grand-champion' && selectedDivision !== 'checkpoints' && (
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
              <button
                onClick={handleCollapseAll}
                disabled={expandedRings.size === 0}
                style={{
                  padding: '6px 12px',
                  backgroundColor: expandedRings.size > 0 ? '#6c757d' : '#e0e0e0',
                  color: expandedRings.size > 0 ? 'white' : '#999',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: expandedRings.size > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                }}
              >
                Collapse All
              </button>
              <button
                onClick={handleExpandAll}
                disabled={expandedRings.size === filteredRingPairs.length}
                style={{
                  padding: '6px 12px',
                  backgroundColor: expandedRings.size < filteredRingPairs.length ? '#6c757d' : '#e0e0e0',
                  color: expandedRings.size < filteredRingPairs.length ? 'white' : '#999',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: expandedRings.size < filteredRingPairs.length ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                }}
              >
                Expand All
              </button>

              {/* Sort By toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Sort by:</span>
                {(['ring', 'group', 'category'] as const).map((mode) => {
                  const labels: Record<string, string> = { ring: 'Ring', group: 'Group First', category: 'Category' };
                  const active = ringSort === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setRingSort(mode)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        backgroundColor: active ? '#007bff' : 'var(--bg-secondary)',
                        color: active ? 'white' : 'var(--text-primary)',
                        border: `1px solid ${active ? '#007bff' : 'var(--border-color)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: active ? '600' : '400',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {labels[mode]}
                    </button>
                  );
                })}
              </div>

              {/* Print All Changed button - only show when there are changes */}
              {checkpoints.length > 0 && changedRingsCounts.total > 0 && (
                <button
                  onClick={handlePrintAllChanged}
                  disabled={printing === 'all-changed'}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: printing === 'all-changed' ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    opacity: printing === 'all-changed' ? 0.6 : 1,
                  }}
                  title={`Print all ${changedRingsCounts.total} changed ring(s)`}
                >
                  {printing === 'all-changed' ? '⏳ Printing...' : `🖨️ Print Changed (${changedRingsCounts.total})`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>



      {/* Grand Champion View */}
      {selectedDivision === 'grand-champion' ? (
        <div>
          {/* Header with Add Ring button */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#ffc107', fontSize: '24px' }}>⭐</span>
              Grand Champion Rings
            </h3>
            <button
              onClick={() => {
                setNewRingName('');
                setNewRingType('forms');
                setShowCreateRingModal(true);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '16px' }}>+</span>
              Add Ring
            </button>
          </div>

          {/* Rings List */}
          {customRings.length === 0 ? (
            <div className="info" style={{ textAlign: 'center', padding: '40px' }}>
              <p>No Grand Champion rings created yet.</p>
              <p>Click "Add Ring" above to create your first Grand Champion ring.</p>
            </div>
          ) : (
            customRings.map((ring) => {
              const ringParticipants = ring.participantIds
                .map(id => participants.find(p => p.id === id))
                .filter((p): p is Participant => p !== undefined);
              
              const isEditing = editingRingName === ring.id;
              
              return (
                <div
                  key={ring.id}
                  style={{
                    border: '3px solid #ffc107',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px',
                    backgroundColor: 'var(--bg-primary)',
                  }}
                >
                  {/* Ring Header */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '15px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}>
                    <div style={{ 
                      flex: '1 1 auto',
                      minWidth: '200px',
                    }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={editingRingNameValue}
                            onChange={(e) => setEditingRingNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editingRingNameValue.trim()) {
                                updateCustomRing(ring.id, { name: editingRingNameValue });
                                setEditingRingName(null);
                              } else if (e.key === 'Escape') {
                                setEditingRingName(null);
                              }
                            }}
                            autoFocus
                            style={{
                              fontSize: '18px',
                              fontWeight: 'bold',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--input-border)',
                              backgroundColor: 'var(--input-bg)',
                              color: 'var(--text-primary)',
                              flex: 1,
                            }}
                          />
                          <button
                            onClick={() => {
                              if (editingRingNameValue.trim()) {
                                updateCustomRing(ring.id, { name: editingRingNameValue });
                                setEditingRingName(null);
                              }
                            }}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingRingName(null)}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <h4 style={{
                          margin: 0,
                          color: 'var(--text-primary)',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}>
                          <span style={{ color: '#ffc107' }}>⭐</span>
                          <span>{ring.name}</span>
                          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>({ring.type})</span>
                          <span style={{
                            backgroundColor: '#ffc107',
                            color: '#000',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}>
                            {ringParticipants.length} participants
                          </span>
                        </h4>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => {
                              setEditingRingName(ring.id);
                              setEditingRingNameValue(ring.name);
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handlePrintGCRing(ring, ringParticipants)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            🖨️ Print
                          </button>
                          <button
                            onClick={() => setParticipantSelectionModal({ ringId: ring.id })}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            + Add Participant
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${ring.name}"? This cannot be undone.`)) {
                                deleteCustomRing(ring.id);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Participants Table */}
                  {ringParticipants.length === 0 ? (
                    <div style={{ 
                      padding: '20px', 
                      textAlign: 'center', 
                      color: 'var(--text-muted)', 
                      fontStyle: 'italic',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '4px',
                    }}>
                      No participants in this ring yet. Click "Add Participant" to add competitors.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid var(--border-color)', width: '60px' }}>Rank</th>
                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>Name</th>
                            <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid var(--border-color)' }}>School</th>
                            <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid var(--border-color)' }}>Age</th>
                            <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid var(--border-color)' }}>Gender</th>
                            {ring.type === 'sparring' && (
                              <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid var(--border-color)' }}>Height</th>
                            )}
                            <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid var(--border-color)', width: '120px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ringParticipants.map((p, index) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                                {index + 1}
                              </td>
                              <td style={{ padding: '8px' }}>
                                {p.firstName} {p.lastName}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>{getParticipantSchool(p)}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>{p.age}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>{p.gender}</td>
                              {ring.type === 'sparring' && (
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  {p.heightFeet}'{p.heightInches}"
                                </td>
                              )}
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => moveParticipantInCustomRing(ring.id, p.id, 'up')}
                                    disabled={index === 0}
                                    title="Move up"
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: index === 0 ? '#6c757d' : '#007bff',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    ▲
                                  </button>
                                  <button
                                    onClick={() => moveParticipantInCustomRing(ring.id, p.id, 'down')}
                                    disabled={index === ringParticipants.length - 1}
                                    title="Move down"
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: index === ringParticipants.length - 1 ? '#6c757d' : '#007bff',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: index === ringParticipants.length - 1 ? 'not-allowed' : 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    ▼
                                  </button>
                                  <button
                                    onClick={() => removeParticipantFromCustomRing(ring.id, p.id)}
                                    title="Remove from ring"
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : selectedDivision === 'checkpoints' ? (
        <div>
          {/* Header */}
          <h3 style={{ 
            marginBottom: '20px', 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: '24px' }}>📋</span>
            Checkpoints
          </h3>

          {/* Create Checkpoint Section */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '25px',
            border: '2px solid var(--border-color)',
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-primary)' }}>
              Create New Checkpoint
            </h4>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 300px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  fontWeight: '600'
                }}>
                  Checkpoint Name (optional)
                </label>
                <input
                  type="text"
                  value={newCheckpointName}
                  onChange={(e) => setNewCheckpointName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateCheckpoint();
                    }
                  }}
                  placeholder="Leave blank for auto-generated name"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--input-border)',
                    fontSize: '14px',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                onClick={handleCreateCheckpoint}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}
              >
                💾 Create Checkpoint
              </button>
            </div>
            
            <p style={{ 
              marginTop: '10px', 
              marginBottom: 0, 
              fontSize: '12px', 
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}>
              A checkpoint saves the current state of all ring assignments, allowing you to track changes made after this point.
            </p>
          </div>

          {/* Print All Changed Section */}
          {checkpoints.length > 0 && changedRings.size > 0 && (
            <div style={{
              backgroundColor: '#fff3cd',
              color: '#856404',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '25px',
              border: '2px solid #ffc107',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              <div>
                <strong style={{ fontSize: '15px' }}>⚠️ {changedRings.size} ring(s) changed since checkpoint</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>
                  Print updated PDFs for rings that have been modified.
                </p>
              </div>
              <button
                onClick={() => {
                  if (changedRings.size > 0) {
                    handlePrintAllChanged();
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                🖨️ Print All Changed Rings
              </button>
            </div>
          )}

          {/* Checkpoints List */}
          {sortedCheckpoints.length === 0 ? (
            <div className="info" style={{ textAlign: 'center', padding: '40px' }}>
              <p>No checkpoints created yet.</p>
              <p>Create a checkpoint above to save the current state of ring assignments.</p>
            </div>
          ) : (
            <div>
              <h4 style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>
                Saved Checkpoints ({sortedCheckpoints.length})
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sortedCheckpoints.map((checkpoint) => {
                  const isActive = latestCheckpoint?.id === checkpoint.id;
                  const isRenaming = renamingCheckpointId === checkpoint.id;
                  
                  return (
                    <div
                      key={checkpoint.id}
                      style={{
                        backgroundColor: isActive ? '#d4edda' : 'var(--bg-secondary)',
                        border: isActive ? '2px solid #28a745' : '2px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '15px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: '1 1 300px' }}>
                        {isRenaming ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={renamingCheckpointValue}
                              onChange={(e) => setRenamingCheckpointValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && renamingCheckpointValue.trim()) {
                                  renameCheckpoint(checkpoint.id, renamingCheckpointValue);
                                  setRenamingCheckpointId(null);
                                } else if (e.key === 'Escape') {
                                  setRenamingCheckpointId(null);
                                }
                              }}
                              autoFocus
                              style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                border: '1px solid var(--input-border)',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                flex: 1,
                              }}
                            />
                            <button
                              onClick={() => {
                                if (renamingCheckpointValue.trim()) {
                                  renameCheckpoint(checkpoint.id, renamingCheckpointValue);
                                  setRenamingCheckpointId(null);
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setRenamingCheckpointId(null)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ 
                              fontWeight: 'bold', 
                              fontSize: '16px', 
                              marginBottom: '4px',
                              color: isActive ? '#155724' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}>
                              {isActive && <span style={{ color: '#28a745' }}>✓</span>}
                              {checkpoint.name}
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: isActive ? '#155724' : 'var(--text-secondary)',
                            }}>
                              {new Date(checkpoint.timestamp).toLocaleString()}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {!isRenaming && (
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          {!isActive && (
                            <button
                              onClick={() => loadCheckpoint(checkpoint.id)}
                              style={{
                                padding: '6px 14px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                              }}
                            >
                              📂 Load
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setRenamingCheckpointId(checkpoint.id);
                              setRenamingCheckpointValue(checkpoint.name);
                            }}
                            style={{
                              padding: '6px 14px',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            ✏️ Rename
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete checkpoint "${checkpoint.name}"? This cannot be undone.`)) {
                                deleteCheckpoint(checkpoint.id);
                                if (renamingCheckpointId === checkpoint.id) {
                                  setRenamingCheckpointId(null);
                                }
                              }
                            }}
                            style={{
                              padding: '6px 14px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '13px',
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Regular Ring Pairs View */
        <div>
        {sortedRingPairs.map((pair) => {
          // Check if this ring pair has changed since checkpoint
          const formsChanged = pair.formsRing && isRingAffectedSimple(pair.formsRing.name || pair.categoryPoolName, 'forms', changedRings);
          const sparringChanged = pair.sparringRing && isRingAffectedSimple(pair.sparringRing.name || pair.categoryPoolName, 'sparring', changedRings);
          const hasChanged = formsChanged || sparringChanged;

          // Get participant counts for balance indicators
          const formsCount = pair.formsRing?.participantIds?.length || 0;
          const sparringCount = pair.sparringRing?.participantIds?.length || 0;
          const formsBalance = getRingBalanceStyle(formsCount);
          const sparringBalance = getRingBalanceStyle(sparringCount);
          const isExpanded = expandedRings.has(pair.categoryPoolName);

          return (
          <div
            key={pair.categoryPoolName}
            style={{
              border: hasChanged ? '3px solid #dc3545' : '2px solid var(--border-color)',
              borderRadius: '8px',
              marginBottom: '20px',
              backgroundColor: hasChanged ? 'var(--bg-secondary)' : 'var(--bg-primary)',
              boxShadow: hasChanged ? '0 0 8px rgba(220, 53, 69, 0.3)' : undefined,
              overflow: 'hidden',
            }}
          >
            {/* Header - clickable to expand/collapse */}
            <h4
              onClick={() => toggleRingExpanded(pair.categoryPoolName)}
              style={{
                marginBottom: 0,
                marginTop: 0,
                padding: '15px',
                color: 'var(--text-primary)',
                fontSize: '18px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                cursor: 'pointer',
                backgroundColor: isExpanded ? 'var(--bg-hover)' : 'transparent',
                transition: 'background-color 0.15s',
              }}
            >
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ color: '#007bff' }}>
                  {pair.division}
                </span>
                <span>
                  {formatPoolNameForDisplay(pair.categoryPoolName)}
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
              </div>
              <div style={{
                fontSize: '18px',
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                flexShrink: 0,
              }}>
                ▼
              </div>
            </h4>

            {/* Content - only show when expanded */}
            {isExpanded && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: shouldStack ? '1fr' : '1fr 1fr', 
                gap: '20px', 
                alignItems: 'start',
                transition: 'grid-template-columns 0.2s ease',
                padding: '0 15px 15px 15px',
                borderTop: '1px solid var(--border-color)',
              }}>
                {/* Forms Column */}
                <div>
                  {renderRingTable(pair.formsRing, 'forms', pair.physicalRingName || pair.categoryPoolName)}
                </div>

                {/* Sparring Column */}
                <div>
                  {renderRingTable(pair.sparringRing, 'sparring', pair.physicalRingName || pair.categoryPoolName)}
                </div>
              </div>
            )}
          </div>
        );
        })}
        </div>
      )}
      </div>

    </div>
  );
}

export default RingOverview;
