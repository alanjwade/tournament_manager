import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { getEffectiveDivision } from '../utils/excelParser';
import { formatPoolOnly } from '../utils/ringNameFormatter';
import { Participant } from '../types/tournament';
import { computeCompetitionRings } from '../utils/computeRings';
import AddParticipantModal from './AddParticipantModal';

interface DataViewerProps {
  globalDivision?: string;
}

function DataViewer({ globalDivision }: DataViewerProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const config = useTournamentStore((state) => state.config);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  
  // State for highlighted participant from search
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);
  
  // State for Add Participant modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
  );

  // Filter states for each column
  const [filters, setFilters] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    heightFeet: '',
    heightInches: '',
    school: '',
    branch: '',
    competingForms: '',
    formsDivision: '',
    sparringDivision: '',
    competingSparring: '',
    formsCategory: '',
    sparringCategory: '',
    formsRing: '',
    sparringRing: '',
    formsPhysicalRing: '',
    sparringPhysicalRing: '',
    sparringAltRing: '',
    formsOrder: '',
    sparringOrder: '',
  });

  // Sync with global division when it changes
  useEffect(() => {
    if (globalDivision && globalDivision !== 'all') {
      setFilters(prev => ({
        ...prev,
        formsDivision: globalDivision,
        sparringDivision: globalDivision,
      }));
    }
  }, [globalDivision]);

  // Check for highlighted participant from global search
  useEffect(() => {
    const storedId = sessionStorage.getItem('highlightParticipant');
    if (storedId) {
      sessionStorage.removeItem('highlightParticipant');
      setHighlightedId(storedId);
      
      // Clear all filters to ensure participant is visible
      setFilters({
        firstName: '',
        lastName: '',
        age: '',
        gender: '',
        heightFeet: '',
        heightInches: '',
        school: '',
        branch: '',
        competingForms: '',
        formsDivision: '',
        sparringDivision: '',
        competingSparring: '',
        formsCategory: '',
        sparringCategory: '',
        formsRing: '',
        sparringRing: '',
        formsPhysicalRing: '',
        sparringPhysicalRing: '',
        sparringAltRing: '',
        formsOrder: '',
        sparringOrder: '',
      });
      
      // Clear highlight after 5 seconds
      setTimeout(() => setHighlightedId(null), 5000);
    }
  }, []);

  // Scroll to highlighted row when it becomes visible
  useEffect(() => {
    if (highlightedId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedId]);

  // Get category name by ID
  const getCohortName = (categoryId?: string) => {
    if (!categoryId) return 'Unassigned';
    const category = categories.find((c) => c.id === categoryId);
    return category ? `${category.name} (${category.division})` : 'Unknown';
  };

  // Get all unique divisions from config
  const divisionOptions = useMemo(() => {
    return config.divisions.map(d => d.name);
  }, [config]);

  // Legal values for forms and sparring divisions - now just division names or not participating (shown as null)
  const formsOptions = ['Not Participating', ...divisionOptions];
  const sparringOptions = ['Not Participating', ...divisionOptions];

  // Get all unique physical ring names from mappings (simple list)
  const physicalRingOptions = useMemo(() => {
    const ringNames = new Set<string>();
    physicalRingMappings.forEach(m => {
      if (m.physicalRingName) {
        ringNames.add(m.physicalRingName);
      }
    });
    const sorted = Array.from(ringNames).sort((a, b) => {
      // Sort by ring number, then suffix (PR1, PR1a, PR1b, PR2, PR2a, etc.)
      const aMatch = a.match(/^PR(\d+)([a-z]*)$/);
      const bMatch = b.match(/^PR(\d+)([a-z]*)$/);
      if (aMatch && bMatch) {
        const aNum = parseInt(aMatch[1]);
        const bNum = parseInt(bMatch[1]);
        if (aNum !== bNum) return aNum - bNum;
        return (aMatch[2] || '').localeCompare(bMatch[2] || '');
      }
      return a.localeCompare(b);
    });
    return sorted;
  }, [physicalRingMappings]);

  // Get physical ring options with division designators for dropdowns
  const physicalRingOptionsWithDivision = useMemo(() => {
    // Map physical ring to divisions that use it
    const ringToDivisions = new Map<string, Set<string>>();
    
    physicalRingMappings.forEach(mapping => {
      const categoryPoolName = mapping.categoryPoolName;
      if (!categoryPoolName) return;
      
      // Extract category name from categoryPoolName (e.g., "Mixed 8-10_P1" -> "Mixed 8-10")
      const categoryName = categoryPoolName.split('_')[0];
      
      // Find category and its division
      const category = categories.find(c => c.name === categoryName);
      if (category && mapping.physicalRingName) {
        if (!ringToDivisions.has(mapping.physicalRingName)) {
          ringToDivisions.set(mapping.physicalRingName, new Set());
        }
        ringToDivisions.get(mapping.physicalRingName)!.add(category.division);
      }
    });
    
    // Build list of ring options with division abbreviations
    const options: Array<{ value: string; label: string; division: string; divisionOrder: number }> = [];
    
    ringToDivisions.forEach((divisions, physicalRing) => {
      divisions.forEach(division => {
        const divisionConfig = config.divisions.find(d => d.name === division);
        // Use abbreviation from config, or fallback to uppercase first 4 chars
        const abbr = (divisionConfig && divisionConfig.abbreviation) 
          ? divisionConfig.abbreviation 
          : division.substring(0, 4).toUpperCase();
        const order = divisionConfig?.order || 999;
        
        options.push({
          value: physicalRing,
          label: `${abbr} ${physicalRing}`,
          division,
          divisionOrder: order
        });
      });
    });
    
    // Sort by division order, then by physical ring
    return options.sort((a, b) => {
      if (a.divisionOrder !== b.divisionOrder) {
        return a.divisionOrder - b.divisionOrder;
      }
      
      // Sort by ring number and suffix
      const aMatch = a.value.match(/^PR(\d+)([a-z]*)$/);
      const bMatch = b.value.match(/^PR(\d+)([a-z]*)$/);
      if (aMatch && bMatch) {
        const aNum = parseInt(aMatch[1]);
        const bNum = parseInt(bMatch[1]);
        if (aNum !== bNum) return aNum - bNum;
        return (aMatch[2] || '').localeCompare(bMatch[2] || '');
      }
      return a.value.localeCompare(b.value);
    });
  }, [physicalRingMappings, categories, config.divisions]);

  // Get all category names for dropdowns
  const formsCohortOptions = useMemo(() => {
    const formsCohorts = categories.filter(c => c.type === 'forms');
    return formsCohorts.map(c => ({ id: c.id, name: c.name }));
  }, [categories]);

  const sparringCohortOptions = useMemo(() => {
    const sparringCohorts = categories.filter(c => c.type === 'sparring');
    return sparringCohorts.map(c => ({ id: c.id, name: c.name }));
  }, [categories]);

  // Build pool options for a given category
  const getPoolOptionsForCategory = (categoryId: string | undefined) => {
    if (!categoryId) return [];
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];
    
    const pools: Array<{ value: string; label: string }> = [];
    for (let i = 1; i <= category.numPools; i++) {
      pools.push({ value: `P${i}`, label: `Pool ${i}` });
    }
    return pools;
  };

  // Get unique schools from participants
  const uniqueSchools = useMemo(() => {
    const schools = new Set(participants.map(p => p.school).filter(Boolean));
    return Array.from(schools).sort();
  }, [participants]);

  // Get unique branches from participants
  const uniqueBranches = useMemo(() => {
    const branches = new Set(participants.map(p => p.branch).filter(Boolean));
    return Array.from(branches).sort();
  }, [participants]);

  // Get unique genders from participants
  const uniqueGenders = useMemo(() => {
    const genders = new Set(participants.map(p => p.gender).filter(Boolean));
    return Array.from(genders).sort();
  }, [participants]);

  // Update participant division - simplified, no more "same as" logic
  const updateParticipantDivision = (participantId: string, field: 'formsDivision' | 'sparringDivision', value: string) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        // Convert "Not Participating" to null
        const divisionValue = value === 'Not Participating' ? null : value;
        const updates: Partial<Participant> = { [field]: divisionValue };
        
        // Update competing flags
        if (field === 'formsDivision') {
          updates.competingForms = divisionValue !== null;
          
          // Save current assignment before clearing (for reinstatement)
          if (divisionValue === null) {
            updates.lastFormsCategoryId = p.formsCategoryId;
            updates.lastFormsPool = p.formsPool;
            updates.formsCategoryId = undefined;
            updates.formsPool = undefined;
            updates.formsRankOrder = undefined;
          }
        } else if (field === 'sparringDivision') {
          updates.competingSparring = divisionValue !== null;
          
          // Save current assignment before clearing (for reinstatement)
          if (divisionValue === null) {
            updates.lastSparringCategoryId = p.sparringCategoryId;
            updates.lastSparringPool = p.sparringPool;
            updates.sparringCategoryId = undefined;
            updates.sparringPool = undefined;
            updates.sparringRankOrder = undefined;
            updates.sparringAltRing = '';
          }
        }
        
        return { ...p, ...updates };
      }
      return p;
    });
    setParticipants(updatedParticipants);
  };

  // Update participant category assignment
  const updateParticipantCohort = (participantId: string, field: 'formsCategoryId' | 'sparringCategoryId', value: string) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        const updates: Partial<Participant> = {
          [field]: value || undefined
        };
        
        return { ...p, ...updates };
      }
      return p;
    });
    setParticipants(updatedParticipants);
  };

  // Update participant order
  const updateParticipantOrder = (participantId: string, field: 'formsRankOrder' | 'sparringRankOrder', value: string) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        const numValue = value ? parseInt(value) / 10 : undefined;
        return { ...p, [field]: numValue };
      }
      return p;
    });
    setParticipants(updatedParticipants);
  };

  // Update participant basic info (name, age, height, etc.)
  const updateParticipantField = (participantId: string, field: keyof Participant, value: any) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        return { ...p, [field]: value };
      }
      return p;
    });
    setParticipants(updatedParticipants);
  };

  // Update participant pool
  const updateParticipantPool = (participantId: string, field: 'formsPool' | 'sparringPool', value: string) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        return { ...p, [field]: value || undefined };
      }
      return p;
    });
    setParticipants(updatedParticipants);
  };

  // Update participant physical ring - this will update division, category, and pool based on ring map
  // NOTE: This function reassigns the participant to a DIFFERENT category/pool based on the
  // physical ring mapping. It does NOT just change which physical ring they're assigned to.
  // The participant will be moved to whatever category/pool is mapped to the selected physical ring.
  const updateParticipantPhysicalRing = (participantId: string, type: 'forms' | 'sparring', physicalRingName: string) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    // If clearing the selection
    if (!physicalRingName) {
      const updatedParticipants = participants.map(p => {
        if (p.id === participantId) {
          if (type === 'forms') {
            return { ...p, formsCategoryId: undefined, formsPool: undefined };
          } else {
            return { ...p, sparringCategoryId: undefined, sparringPool: undefined };
          }
        }
        return p;
      });
      setParticipants(updatedParticipants);
      return;
    }

    // Find the pool mapping for this physical ring
    const mapping = physicalRingMappings.find(m => m.physicalRingName === physicalRingName);
    const categoryPoolName = mapping?.categoryPoolName;
    if (!mapping || !categoryPoolName) {
      console.warn('No mapping found for physical ring:', physicalRingName);
      return;
    }

    // Parse category name and pool from categoryPoolName (e.g., "Mixed 8-10_P1")
    const poolMatch = categoryPoolName.match(/_P(\d+)$/);
    if (!poolMatch) {
      console.warn('Could not parse pool from categoryPoolName:', categoryPoolName);
      return;
    }
    
    const pool = `P${poolMatch[1]}`; // e.g., "P1"
    const categoryName = categoryPoolName.replace(/_P\d+$/, ''); // e.g., "Mixed 8-10"

    // Find the category by name and type
    const category = categories.find(c => 
      c.name === categoryName && c.type === type
    );
    
    if (!category) {
      console.warn('Could not find category:', categoryName, 'type:', type);
      return;
    }

    // Update the participant
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        if (type === 'forms') {
          return { 
            ...p, 
            formsCategoryId: category.id,
            formsPool: pool,
            formsDivision: category.division
          };
        } else {
          return { 
            ...p, 
            sparringCategoryId: category.id,
            sparringPool: pool,
            sparringDivision: category.division
          };
        }
      }
      return p;
    });
    setParticipants(updatedParticipants);
  };

  // Filter participants based on all filter criteria
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const formsCategory = categories.find(c => c.id === p.formsCategoryId);
      const sparringCategory = categories.find(c => c.id === p.sparringCategoryId);
      const formsCohortName = formsCategory?.name || '';
      const sparringCohortName = sparringCategory?.name || '';
      const formsOrder = p.formsRankOrder ? p.formsRankOrder.toString() : '';
      const sparringOrder = p.sparringRankOrder ? p.sparringRankOrder.toString() : '';
      
      // Get pool values for filtering
      const formsPoolValue = p.formsPool || '';
      const sparringPoolValue = p.sparringPool || '';
      
      // Get physical ring names from mappings
      const formsPhysicalMapping = physicalRingMappings.find(m => 
        formsCategory && p.formsPool && m.categoryPoolName === `${formsCategory.name}_${p.formsPool}`
      );
      const sparringPhysicalMapping = physicalRingMappings.find(m => 
        sparringCategory && p.sparringPool && m.categoryPoolName === `${sparringCategory.name}_${p.sparringPool}`
      );
      const formsPhysicalRingName = formsPhysicalMapping?.physicalRingName || '';
      const sparringPhysicalRingName = sparringPhysicalMapping?.physicalRingName || '';
      
      // For division filters, check if EITHER forms OR sparring division matches
      const formsDivisionMatch = filters.formsDivision 
        ? (p.formsDivision || '').toLowerCase().includes(filters.formsDivision.toLowerCase())
        : true;
      const sparringDivisionMatch = filters.sparringDivision
        ? (p.sparringDivision || '').toLowerCase().includes(filters.sparringDivision.toLowerCase())
        : true;
      
      // If both division filters are set to the same value (from global filter),
      // use OR logic: match if EITHER division matches
      const divisionMatch = filters.formsDivision && filters.sparringDivision && filters.formsDivision === filters.sparringDivision
        ? (formsDivisionMatch || sparringDivisionMatch)
        : (formsDivisionMatch && sparringDivisionMatch);
      
      return (
        p.firstName.toLowerCase().includes(filters.firstName.toLowerCase()) &&
        p.lastName.toLowerCase().includes(filters.lastName.toLowerCase()) &&
        p.age.toString().includes(filters.age) &&
        p.gender.toLowerCase().includes(filters.gender.toLowerCase()) &&
        p.heightFeet.toString().includes(filters.heightFeet) &&
        p.heightInches.toString().includes(filters.heightInches) &&
        p.school.toLowerCase().includes(filters.school.toLowerCase()) &&
        (p.branch || '').toLowerCase().includes(filters.branch.toLowerCase()) &&
        divisionMatch &&
        formsCohortName.toLowerCase().includes(filters.formsCategory.toLowerCase()) &&
        sparringCohortName.toLowerCase().includes(filters.sparringCategory.toLowerCase()) &&
        formsPoolValue.toLowerCase().includes(filters.formsRing.toLowerCase()) &&
        sparringPoolValue.toLowerCase().includes(filters.sparringRing.toLowerCase()) &&
        formsPhysicalRingName.toLowerCase().includes(filters.formsPhysicalRing.toLowerCase()) &&
        sparringPhysicalRingName.toLowerCase().includes(filters.sparringPhysicalRing.toLowerCase()) &&
        (p.sparringAltRing || '').toLowerCase().includes(filters.sparringAltRing.toLowerCase()) &&
        formsOrder.includes(filters.formsOrder) &&
        sparringOrder.includes(filters.sparringOrder)
      );
    });
  }, [participants, filters, categories, competitionRings, physicalRingMappings]);

  // Update a specific filter
  const updateFilter = (column: keyof typeof filters, value: string) => {
    setFilters({ ...filters, [column]: value });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      firstName: '',
      lastName: '',
      age: '',
      gender: '',
      heightFeet: '',
      heightInches: '',
      school: '',
      branch: '',
      competingForms: '',
      formsDivision: '',
      sparringDivision: '',
      competingSparring: '',
      formsCategory: '',
      sparringCategory: '',
      formsRing: '',
      sparringRing: '',
      formsPhysicalRing: '',
      sparringPhysicalRing: '',
      sparringAltRing: '',
      formsOrder: '',
      sparringOrder: '',
    });
  };

  return (
    <div style={{ 
      padding: '20px', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      width: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexShrink: 0 }}>
        <h2>All Participants Data ({filteredParticipants.length} of {participants.length})</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="btn btn-primary"
            style={{ padding: '8px 16px' }}
          >
            ➕ Add Participant
          </button>
          <button onClick={clearFilters} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
            Clear All Filters
          </button>
        </div>
      </div>

      <AddParticipantModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minHeight: 0 }}>
        <table style={{ width: 'auto', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 1 }}>
            <tr>
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '120px', color: 'var(--text-primary)' }}>
                First Name
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.firstName}
                  onChange={(e) => updateFilter('firstName', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '120px' }}>
                Last Name
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.lastName}
                  onChange={(e) => updateFilter('lastName', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '80px' }}>
                Age
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.age}
                  onChange={(e) => updateFilter('age', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '100px' }}>
                Gender
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.gender}
                  onChange={(e) => updateFilter('gender', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '80px' }}>
                Feet
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.heightFeet}
                  onChange={(e) => updateFilter('heightFeet', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '80px' }}>
                Inches
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.heightInches}
                  onChange={(e) => updateFilter('heightInches', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '150px' }}>
                School
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.school}
                  onChange={(e) => updateFilter('school', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '120px' }}>
                Branch
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.branch}
                  onChange={(e) => updateFilter('branch', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="forms-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '100px' }}>
                Competing Forms
                <select
                  value={filters.competingForms}
                  onChange={(e) => updateFilter('competingForms', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </th>
              <th className="forms-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '150px' }}>
                Forms Division
                <select
                  value={filters.formsDivision}
                  onChange={(e) => updateFilter('formsDivision', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                >
                  <option value="">All</option>
                  {formsOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th className="forms-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '150px' }}>
                Forms Category
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.formsCategory}
                  onChange={(e) => updateFilter('formsCategory', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="forms-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '150px', color: 'var(--text-primary)' }}>
                Forms Pool
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.formsRing}
                  onChange={(e) => updateFilter('formsRing', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
                />
              </th>
              <th className="forms-physical-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '120px' }}>
                Forms Physical Ring
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.formsPhysicalRing}
                  onChange={(e) => updateFilter('formsPhysicalRing', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '100px' }}>
                Forms Order
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.formsOrder}
                  onChange={(e) => updateFilter('formsOrder', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="sparring-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '100px' }}>
                Competing Sparring
                <select
                  value={filters.competingSparring}
                  onChange={(e) => updateFilter('competingSparring', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </th>
              <th className="sparring-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '150px' }}>
                Sparring Division
                <select
                  value={filters.sparringDivision}
                  onChange={(e) => updateFilter('sparringDivision', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                >
                  <option value="">All</option>
                  {sparringOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </th>
              <th className="sparring-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '150px' }}>
                Sparring Category
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.sparringCategory}
                  onChange={(e) => updateFilter('sparringCategory', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="sparring-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '150px', color: 'var(--text-primary)' }}>
                Sparring Pool
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.sparringRing}
                  onChange={(e) => updateFilter('sparringRing', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }}
                />
              </th>
              <th className="sparring-physical-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '120px' }}>
                Sparring Physical Ring
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.sparringPhysicalRing}
                  onChange={(e) => updateFilter('sparringPhysicalRing', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="sparring-alt-column" style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '80px' }}>
                Sparring Alt Ring
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.sparringAltRing || ''}
                  onChange={(e) => updateFilter('sparringAltRing', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '100px' }}>
                Sparring Order
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.sparringOrder}
                  onChange={(e) => updateFilter('sparringOrder', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((p) => {
              const formsCategory = categories.find(c => c.id === p.formsCategoryId);
              const sparringCategory = categories.find(c => c.id === p.sparringCategoryId);
              
              // Get physical ring names from mappings
              const formsPhysicalMapping = physicalRingMappings.find(m => 
                formsCategory && p.formsPool && m.categoryPoolName === `${formsCategory.name}_${p.formsPool}`
              );
              const sparringPhysicalMapping = physicalRingMappings.find(m => 
                sparringCategory && p.sparringPool && m.categoryPoolName === `${sparringCategory.name}_${p.sparringPool}`
              );

              const isHighlighted = p.id === highlightedId;
              
              return (
              <tr 
                key={p.id}
                ref={isHighlighted ? highlightedRowRef : undefined}
                style={{
                  backgroundColor: isHighlighted ? '#fff3cd' : undefined,
                  boxShadow: isHighlighted ? 'inset 0 0 0 2px #ffc107' : undefined,
                  animation: isHighlighted ? 'highlight-pulse 1s ease-in-out 3' : undefined,
                }}
              >
                <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  <input
                    type="text"
                    value={p.firstName}
                    onChange={(e) => updateParticipantField(p.id, 'firstName', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '3px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--input-bg)'
                    }}
                  />
                </td>
                <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  <input
                    type="text"
                    value={p.lastName}
                    onChange={(e) => updateParticipantField(p.id, 'lastName', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '3px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--input-bg)'
                    }}
                  />
                </td>
                <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <input
                    type="number"
                    value={p.age}
                    onChange={(e) => updateParticipantField(p.id, 'age', parseInt(e.target.value) || 0)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '3px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--input-bg)',
                      textAlign: 'center'
                    }}
                  />
                </td>
                <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  <select
                    value={p.gender || ''}
                    onChange={(e) => updateParticipantField(p.id, 'gender', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '3px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--input-bg)'
                    }}
                  >
                    <option value="">-</option>
                    {uniqueGenders.map(gender => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <input
                    type="number"
                    value={p.heightFeet}
                    onChange={(e) => updateParticipantField(p.id, 'heightFeet', parseInt(e.target.value) || 0)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '3px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--input-bg)',
                      textAlign: 'center'
                    }}
                  />
                </td>
                <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <input
                    type="number"
                    value={p.heightInches}
                    onChange={(e) => updateParticipantField(p.id, 'heightInches', parseInt(e.target.value) || 0)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '3px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--input-bg)',
                      textAlign: 'center'
                    }}
                  />
                </td>
                <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  <select
                    value={p.school || ''}
                    onChange={(e) => updateParticipantField(p.id, 'school', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '3px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--input-bg)'
                    }}
                  >
                    <option value="">-</option>
                    {uniqueSchools.map(school => (
                      <option key={school} value={school}>{school}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  <select
                    value={p.branch || ''}
                    onChange={(e) => updateParticipantField(p.id, 'branch', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '3px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--input-bg)'
                    }}
                  >
                    <option value="">-</option>
                    {uniqueBranches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </td>
                <td className="forms-column" style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={p.competingForms}
                    onChange={(e) => updateParticipantField(p.id, 'competingForms', e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td className="forms-column" style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  <select
                    value={p.formsDivision ?? 'Not Participating'}
                    onChange={(e) => updateParticipantDivision(p.id, 'formsDivision', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '3px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--input-bg)'
                    }}
                  >
                    {formsOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td className="forms-column" style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  {p.competingForms ? (
                    <select
                      value={p.formsCategoryId || ''}
                      onChange={(e) => updateParticipantCohort(p.id, 'formsCategoryId', e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid var(--input-border)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        backgroundColor: 'var(--input-bg)'
                      }}
                    >
                      <option value="">Not assigned</option>
                      {formsCohortOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td className="forms-column" style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  {p.competingForms ? (
                    <select
                      value={p.formsPool || ''}
                      onChange={(e) => updateParticipantPool(p.id, 'formsPool', e.target.value)}
                      disabled={!p.formsCategoryId}
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid var(--input-border)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        backgroundColor: 'var(--input-bg)'
                      }}
                    >
                      <option value="">Not assigned</option>
                      {getPoolOptionsForCategory(p.formsCategoryId).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td className="forms-physical-column" style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  {p.competingForms ? (
                    <span style={{ 
                      fontSize: '12px',
                      color: formsPhysicalMapping?.physicalRingName ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}>
                      {formsPhysicalMapping?.physicalRingName || 'Not mapped'}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  {p.competingForms ? (
                    <input
                      type="number"
                      value={p.formsRankOrder ? p.formsRankOrder : ''}
                      onChange={(e) => updateParticipantOrder(p.id, 'formsRankOrder', e.target.value)}
                      placeholder="Order"
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid var(--input-border)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        textAlign: 'center'
                      }}
                    />
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>}
                </td>
                <td className="sparring-column" style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={p.competingSparring}
                    onChange={(e) => updateParticipantField(p.id, 'competingSparring', e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td className="sparring-column" style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  <select
                    value={p.sparringDivision ?? 'Not Participating'}
                    onChange={(e) => updateParticipantDivision(p.id, 'sparringDivision', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '3px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--input-bg)'
                    }}
                  >
                    {sparringOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td className="sparring-column" style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  {p.competingSparring ? (
                    <select
                      value={p.sparringCategoryId || ''}
                      onChange={(e) => updateParticipantCohort(p.id, 'sparringCategoryId', e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid var(--input-border)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        backgroundColor: 'var(--input-bg)'
                      }}
                    >
                      <option value="">Not assigned</option>
                      {sparringCohortOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td className="sparring-column" style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  {p.competingSparring ? (
                    <select
                      value={p.sparringPool || ''}
                      onChange={(e) => updateParticipantPool(p.id, 'sparringPool', e.target.value)}
                      disabled={!p.sparringCategoryId}
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid var(--input-border)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        backgroundColor: 'var(--input-bg)'
                      }}
                    >
                      <option value="">Not assigned</option>
                      {getPoolOptionsForCategory(p.sparringCategoryId).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td className="sparring-physical-column" style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  {p.competingSparring ? (
                    <span style={{ 
                      fontSize: '12px',
                      color: sparringPhysicalMapping?.physicalRingName ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}>
                      {sparringPhysicalMapping?.physicalRingName || 'Not mapped'}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td className="sparring-alt-column" style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  {p.competingSparring ? (
                    <input
                      type="text"
                      value={p.sparringAltRing || ''}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase();
                        const validValue: '' | 'a' | 'b' = 
                          value === 'a' ? 'a' : 
                          value === 'b' ? 'b' : '';
                        const updatedParticipants = participants.map(participant => 
                          participant.id === p.id 
                            ? { ...participant, sparringAltRing: validValue }
                            : participant
                        );
                        setParticipants(updatedParticipants);
                      }}
                      placeholder="a/b"
                      maxLength={1}
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid var(--input-border)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        textAlign: 'center'
                      }}
                    />
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>}
                </td>
                <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                  {p.competingSparring ? (
                    <input
                      type="number"
                      value={p.sparringRankOrder ? p.sparringRankOrder : ''}
                      onChange={(e) => updateParticipantOrder(p.id, 'sparringRankOrder', e.target.value)}
                      placeholder="Order"
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid var(--input-border)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        textAlign: 'center'
                      }}
                    />
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredParticipants.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            {participants.length === 0 ? 'No participants loaded' : 'No participants match the current filters'}
          </div>
        )}
      </div>
    </div>
  );
}

export default DataViewer;
