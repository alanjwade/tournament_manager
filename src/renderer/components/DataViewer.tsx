import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { getEffectiveDivision } from '../utils/excelParser';
import { formatPoolOnly, buildCategoryPoolName } from '../utils/ringNameFormatter';
import { Participant } from '../types/tournament';
import { computeCompetitionRings } from '../utils/computeRings';
import AddParticipantModal from './AddParticipantModal';

interface DataViewerProps {}

function DataViewer({}: DataViewerProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const config = useTournamentStore((state) => state.config);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const highlightedParticipantId = useTournamentStore((state) => state.highlightedParticipantId);
  const setHighlightedParticipantId = useTournamentStore((state) => state.setHighlightedParticipantId);
  
  // State for highlighted participant from search
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);
  
  // State for Add Participant modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // State for column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    age: true,
    gender: true,
    height: true,
    school: true,
    branch: true,
    formsDivision: true,
    formsCategory: true,
    formsRing: true,
    formsPhysicalRing: true,
    formsOrder: true,
    sparringDivision: true,
    sparringCategory: true,
    sparringRing: true,
    sparringPhysicalRing: true,
    sparringAltRing: true,
    sparringOrder: true
  });
  
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
  );

  // Multi-select age filter
  const [selectedAges, setSelectedAges] = useState<number[]>([]);
  const [ageDropdownOpen, setAgeDropdownOpen] = useState(false);

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

  // Check for highlighted participant from global search - use store instead of sessionStorage
  useEffect(() => {
    if (highlightedParticipantId) {
      setHighlightedId(highlightedParticipantId);
      setHighlightedParticipantId(null); // Clear immediately
      
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
      
      setSelectedAges([]);
      
      // Clear highlight after 5 seconds
      setTimeout(() => setHighlightedId(null), 5000);
    }
  }, [highlightedParticipantId, setHighlightedParticipantId]);

  // Close age dropdown when clicking outside
  useEffect(() => {
    if (!ageDropdownOpen) return;
    const handler = () => setAgeDropdownOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [ageDropdownOpen]);

  // Scroll to highlighted row when it becomes visible
  useEffect(() => {
    if (highlightedId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedId]);

  // Get category name by ID
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Unassigned';
    const category = categories.find((c) => c.id === categoryId);
    return category ? `${category.name} (${category.division})` : 'Unknown';
  };
  
  // Export to CSV (Excel-compatible)
  const exportToExcel = () => {
    const headers = [];
    if (visibleColumns.name) headers.push('First Name', 'Last Name');
    if (visibleColumns.age) headers.push('Age');
    if (visibleColumns.gender) headers.push('Gender');
    if (visibleColumns.height) headers.push('Height (ft)', 'Height (in)');
    if (visibleColumns.school) headers.push('School');
    if (visibleColumns.branch) headers.push('Branch');
    if (visibleColumns.formsDivision) headers.push('Forms Division');
    if (visibleColumns.formsCategory) headers.push('Forms Category');
    if (visibleColumns.formsRing) headers.push('Forms Ring');
    if (visibleColumns.formsPhysicalRing) headers.push('Forms Ring');
    if (visibleColumns.formsOrder) headers.push('Forms Order');
    if (visibleColumns.sparringDivision) headers.push('Sparring Division');
    if (visibleColumns.sparringCategory) headers.push('Sparring Category');
    if (visibleColumns.sparringRing) headers.push('Sparring Ring');
    if (visibleColumns.sparringPhysicalRing) headers.push('Sparring Ring');
    if (visibleColumns.sparringAltRing) headers.push('Sparring Alt');
    if (visibleColumns.sparringOrder) headers.push('Sparring Order');

    const rows = filteredParticipants.map(p => {
      const row = [];
      if (visibleColumns.name) row.push(p.firstName, p.lastName);
      if (visibleColumns.age) row.push(p.age);
      if (visibleColumns.gender) row.push(p.gender);
      if (visibleColumns.height) row.push(p.heightFeet || '', p.heightInches || '');
      if (visibleColumns.school) row.push(p.school || '');
      if (visibleColumns.branch) row.push(p.branch || '');
      if (visibleColumns.formsDivision) row.push(p.formsDivision || 'Not Participating');
      if (visibleColumns.formsCategory) row.push(getCategoryName(p.formsCategoryId));
      if (visibleColumns.formsRing) row.push(p.formsPool ? formatPoolOnly(p.formsPool) : '');
      if (visibleColumns.formsPhysicalRing) {
        const formsCategory = categories.find(c => c.id === p.formsCategoryId);
        const formsPhysRing = formsCategory && p.formsPool
          ? physicalRingMappings.find(m => m.categoryPoolName === buildCategoryPoolName(formsCategory.division, formsCategory.name, p.formsPool!))
          : undefined;
        row.push(formsPhysRing?.physicalRingName || '');
      }
      if (visibleColumns.formsOrder) row.push(p.formsRankOrder || '');
      if (visibleColumns.sparringDivision) row.push(p.sparringDivision || 'Not Participating');
      if (visibleColumns.sparringCategory) row.push(getCategoryName(p.sparringCategoryId));
      if (visibleColumns.sparringRing) row.push(p.sparringPool ? formatPoolOnly(p.sparringPool) : '');
      if (visibleColumns.sparringPhysicalRing) {
        const sparringCategory = categories.find(c => c.id === p.sparringCategoryId);
        const sparringPhysRing = sparringCategory && p.sparringPool
          ? physicalRingMappings.find(m => m.categoryPoolName === buildCategoryPoolName(sparringCategory.division, sparringCategory.name, p.sparringPool!))
          : undefined;
        row.push(sparringPhysRing?.physicalRingName || '');
      }
      if (visibleColumns.sparringAltRing) row.push(p.sparringAltRing || '');
      if (visibleColumns.sparringOrder) row.push(p.sparringRankOrder || '');
      return row;
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `participants-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get all unique divisions from config
  const divisionOptions = useMemo(() => {
    return config.divisions.map(d => d.name);
  }, [config]);

  // Legal values for forms and sparring divisions - now just division names or not participating (shown as null)
  const formsOptions = ['Not Participating', ...divisionOptions];
  const sparringOptions = ['Not Participating', ...divisionOptions];

  // Get all unique ages from participants, sorted numerically
  const uniqueAges = useMemo(() => {
    const ages = new Set<number>();
    participants.forEach(p => { if (p.age != null) ages.add(p.age); });
    return Array.from(ages).sort((a, b) => a - b);
  }, [participants]);

  // Get all unique physical ring names from mappings (simple list)
  const physicalRingOptions = useMemo(() => {
    const ringNames = new Set<string>();
    physicalRingMappings.forEach(m => {
      if (m.physicalRingName) {
        ringNames.add(m.physicalRingName);
      }
    });
    const sorted = Array.from(ringNames).sort((a, b) => {
      // Sort by ring number, then suffix (Ring 1, Ring 1a, Ring 1b, Ring 2, Ring 2a, etc.)
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
      
      // Extract division from categoryPoolName (new format: "Division - CategoryName Pool N")
      const divisionMatch = categoryPoolName.match(/^(.+?) - /);
      const division = divisionMatch ? divisionMatch[1] : null;
      
      if (division && mapping.physicalRingName) {
        if (!ringToDivisions.has(mapping.physicalRingName)) {
          ringToDivisions.set(mapping.physicalRingName, new Set());
        }
        ringToDivisions.get(mapping.physicalRingName)!.add(division);
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
  const formsCategoryOptions = useMemo(() => {
    const formsCategories = categories.filter(c => c.type === 'forms');
    return formsCategories.map(c => ({ id: c.id, name: c.name }));
  }, [categories]);

  const sparringCategoryOptions = useMemo(() => {
    const sparringCategories = categories.filter(c => c.type === 'sparring');
    return sparringCategories.map(c => ({ id: c.id, name: c.name }));
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
          
          // Clear category/pool when division changes (null or different division)
          if (divisionValue !== p.formsDivision) {
            updates.lastFormsCategoryId = p.formsCategoryId;
            updates.lastFormsPool = p.formsPool;
            updates.formsCategoryId = undefined;
            updates.formsPool = undefined;
            updates.formsRankOrder = undefined;
          }
        } else if (field === 'sparringDivision') {
          updates.competingSparring = divisionValue !== null;
          
          // Clear category/pool when division changes (null or different division)
          if (divisionValue !== p.sparringDivision) {
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

  // Update participant category assignment - clears dependent fields when category changes
  const updateParticipantCategory = (participantId: string, field: 'formsCategoryId' | 'sparringCategoryId', value: string) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        const updates: Partial<Participant> = {
          [field]: value || undefined
        };
        
        // When changing category, clear pool and rank order since old pool may not exist in new category
        if (field === 'formsCategoryId') {
          updates.formsPool = undefined;
          updates.formsRankOrder = undefined;
        } else if (field === 'sparringCategoryId') {
          updates.sparringPool = undefined;
          updates.sparringRankOrder = undefined;
        }
        
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

    // Parse from new format: "Division - CategoryName Pool N"
    const poolMatch = categoryPoolName.match(/Pool (\d+)$/);
    if (!poolMatch) {
      console.warn('Could not parse pool from categoryPoolName:', categoryPoolName);
      return;
    }
    
    const pool = `P${poolMatch[1]}`; // e.g., "P1"
    
    // Extract division and category name from new format
    const formatMatch = categoryPoolName.match(/^(.+?) - (.+?) Pool \d+$/);
    if (!formatMatch) {
      console.warn('Could not parse categoryPoolName format:', categoryPoolName);
      return;
    }
    
    const division = formatMatch[1];
    const categoryName = formatMatch[2];

    // Find the category by name, type, and division
    const category = categories.find(c => 
      c.name === categoryName && c.type === type && c.division === division
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
      const formsCategoryName = formsCategory?.name || '';
      const sparringCategoryName = sparringCategory?.name || '';
      const formsOrder = p.formsRankOrder ? p.formsRankOrder.toString() : '';
      const sparringOrder = p.sparringRankOrder ? p.sparringRankOrder.toString() : '';
      
      // Get pool values for filtering
      const formsPoolValue = p.formsPool || '';
      const sparringPoolValue = p.sparringPool || '';
      
      // Get physical ring names from mappings (using new format)
      const formsPhysicalMapping = physicalRingMappings.find(m => 
        formsCategory && p.formsPool && m.categoryPoolName === buildCategoryPoolName(formsCategory.division, formsCategory.name, p.formsPool)
      );
      const sparringPhysicalMapping = physicalRingMappings.find(m => 
        sparringCategory && p.sparringPool && m.categoryPoolName === buildCategoryPoolName(sparringCategory.division, sparringCategory.name, p.sparringPool)
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
        (selectedAges.length === 0 || selectedAges.includes(p.age)) &&
        p.gender.toLowerCase().includes(filters.gender.toLowerCase()) &&
        p.heightFeet.toString().includes(filters.heightFeet) &&
        p.heightInches.toString().includes(filters.heightInches) &&
        p.school.toLowerCase().includes(filters.school.toLowerCase()) &&
        (p.branch || '').toLowerCase().includes(filters.branch.toLowerCase()) &&
        divisionMatch &&
        formsCategoryName.toLowerCase().includes(filters.formsCategory.toLowerCase()) &&
        sparringCategoryName.toLowerCase().includes(filters.sparringCategory.toLowerCase()) &&
        formsPoolValue.toLowerCase().includes(filters.formsRing.toLowerCase()) &&
        sparringPoolValue.toLowerCase().includes(filters.sparringRing.toLowerCase()) &&
        formsPhysicalRingName.toLowerCase().includes(filters.formsPhysicalRing.toLowerCase()) &&
        sparringPhysicalRingName.toLowerCase().includes(filters.sparringPhysicalRing.toLowerCase()) &&
        (p.sparringAltRing || '').toLowerCase().includes(filters.sparringAltRing.toLowerCase()) &&
        formsOrder.includes(filters.formsOrder) &&
        sparringOrder.includes(filters.sparringOrder)
      );
    });
  }, [participants, filters, selectedAges, categories, competitionRings, physicalRingMappings]);

  // Update a specific filter
  const updateFilter = (column: keyof typeof filters, value: string) => {
    setFilters({ ...filters, [column]: value });
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedAges([]);
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
          <button 
            onClick={exportToExcel} 
            className="btn btn-success"
            style={{ padding: '8px 16px' }}
            title="Export filtered participants to CSV"
          >
            📥 Export to Excel
          </button>
          <button 
            onClick={() => setShowColumnSelector(!showColumnSelector)} 
            className="btn btn-secondary"
            style={{ padding: '8px 16px' }}
          >
            👁️ Columns
          </button>
          <button onClick={clearFilters} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Column Selector */}
      {showColumnSelector && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px',
          flexShrink: 0
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>Column Visibility</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', fontSize: '13px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.name} onChange={(e) => setVisibleColumns({...visibleColumns, name: e.target.checked})} />
              Name
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.age} onChange={(e) => setVisibleColumns({...visibleColumns, age: e.target.checked})} />
              Age
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.gender} onChange={(e) => setVisibleColumns({...visibleColumns, gender: e.target.checked})} />
              Gender
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.height} onChange={(e) => setVisibleColumns({...visibleColumns, height: e.target.checked})} />
              Height
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.school} onChange={(e) => setVisibleColumns({...visibleColumns, school: e.target.checked})} />
              School
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.branch} onChange={(e) => setVisibleColumns({...visibleColumns, branch: e.target.checked})} />
              Branch
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.formsDivision} onChange={(e) => setVisibleColumns({...visibleColumns, formsDivision: e.target.checked})} />
              Forms Division
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.formsCategory} onChange={(e) => setVisibleColumns({...visibleColumns, formsCategory: e.target.checked})} />
              Forms Category
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.formsRing} onChange={(e) => setVisibleColumns({...visibleColumns, formsRing: e.target.checked})} />
              Forms Pool
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.formsPhysicalRing} onChange={(e) => setVisibleColumns({...visibleColumns, formsPhysicalRing: e.target.checked})} />
              Forms Ring
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.formsOrder} onChange={(e) => setVisibleColumns({...visibleColumns, formsOrder: e.target.checked})} />
              Forms Order
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.sparringDivision} onChange={(e) => setVisibleColumns({...visibleColumns, sparringDivision: e.target.checked})} />
              Sparring Division
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.sparringCategory} onChange={(e) => setVisibleColumns({...visibleColumns, sparringCategory: e.target.checked})} />
              Sparring Category
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.sparringRing} onChange={(e) => setVisibleColumns({...visibleColumns, sparringRing: e.target.checked})} />
              Sparring Pool
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.sparringPhysicalRing} onChange={(e) => setVisibleColumns({...visibleColumns, sparringPhysicalRing: e.target.checked})} />
              Sparring Ring
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.sparringAltRing} onChange={(e) => setVisibleColumns({...visibleColumns, sparringAltRing: e.target.checked})} />
              Sparring Alt Ring
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={visibleColumns.sparringOrder} onChange={(e) => setVisibleColumns({...visibleColumns, sparringOrder: e.target.checked})} />
              Sparring Order
            </label>
          </div>
        </div>
      )}

      <AddParticipantModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minHeight: 0 }}>
        {/* Dynamic column visibility styles */}
        <style>{`
          ${!visibleColumns.name ? 'table th:nth-child(1), table td:nth-child(1), table th:nth-child(2), table td:nth-child(2) { display: none !important; }' : ''}
          ${!visibleColumns.age ? 'table th:nth-child(3), table td:nth-child(3) { display: none !important; }' : ''}
          ${!visibleColumns.gender ? 'table th:nth-child(4), table td:nth-child(4) { display: none !important; }' : ''}
          ${!visibleColumns.height ? 'table th:nth-child(5), table td:nth-child(5), table th:nth-child(6), table td:nth-child(6) { display: none !important; }' : ''}
          ${!visibleColumns.school ? 'table th:nth-child(7), table td:nth-child(7) { display: none !important; }' : ''}
          ${!visibleColumns.branch ? 'table th:nth-child(8), table td:nth-child(8) { display: none !important; }' : ''}
          ${!visibleColumns.formsDivision ? 'table th:nth-child(9), table td:nth-child(9), table th:nth-child(10), table td:nth-child(10) { display: none !important; }' : ''}
          ${!visibleColumns.formsCategory ? 'table th:nth-child(11), table td:nth-child(11) { display: none !important; }' : ''}
          ${!visibleColumns.formsRing ? 'table th:nth-child(12), table td:nth-child(12) { display: none !important; }' : ''}
          ${!visibleColumns.formsPhysicalRing ? 'table th:nth-child(13), table td:nth-child(13) { display: none !important; }' : ''}
          ${!visibleColumns.formsOrder ? 'table th:nth-child(14), table td:nth-child(14) { display: none !important; }' : ''}
          ${!visibleColumns.sparringDivision ? 'table th:nth-child(15), table td:nth-child(15), table th:nth-child(16), table td:nth-child(16) { display: none !important; }' : ''}
          ${!visibleColumns.sparringCategory ? 'table th:nth-child(17), table td:nth-child(17) { display: none !important; }' : ''}
          ${!visibleColumns.sparringRing ? 'table th:nth-child(18), table td:nth-child(18) { display: none !important; }' : ''}
          ${!visibleColumns.sparringPhysicalRing ? 'table th:nth-child(19), table td:nth-child(19) { display: none !important; }' : ''}
          ${!visibleColumns.sparringAltRing ? 'table th:nth-child(20), table td:nth-child(20) { display: none !important; }' : ''}
          ${!visibleColumns.sparringOrder ? 'table th:nth-child(21), table td:nth-child(21) { display: none !important; }' : ''}
        `}</style>
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
              <th style={{ padding: '10px', border: '1px solid var(--border-color)', minWidth: '80px', position: 'relative' }}>
                Age
                <div style={{ position: 'relative', marginTop: '5px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setAgeDropdownOpen(v => !v)}
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      textAlign: 'left',
                      background: 'var(--input-bg, #fff)',
                      border: '1px solid var(--input-border, #ccc)',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {selectedAges.length === 0 ? 'All' : selectedAges.join(', ')}
                  </button>
                  {ageDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      zIndex: 100,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      padding: '6px',
                      minWidth: '80px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                        <input
                          type="checkbox"
                          checked={selectedAges.length === 0}
                          onChange={() => setSelectedAges([])}
                        />
                        All
                      </label>
                      {uniqueAges.map(age => (
                        <label key={age} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 4px', cursor: 'pointer', fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={selectedAges.includes(age)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAges(prev => [...prev, age]);
                              } else {
                                setSelectedAges(prev => prev.filter(a => a !== age));
                              }
                            }}
                          />
                          {age}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters(prev => ({ ...prev, formsDivision: val, sparringDivision: val }));
                  }}
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
                Forms Ring
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
                Sparring Ring
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
              
              // Get physical ring names from mappings (using new format)
              const formsPhysicalMapping = physicalRingMappings.find(m => 
                formsCategory && p.formsPool && m.categoryPoolName === buildCategoryPoolName(formsCategory.division, formsCategory.name, p.formsPool)
              );
              const sparringPhysicalMapping = physicalRingMappings.find(m => 
                sparringCategory && p.sparringPool && m.categoryPoolName === buildCategoryPoolName(sparringCategory.division, sparringCategory.name, p.sparringPool)
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
                      onChange={(e) => updateParticipantCategory(p.id, 'formsCategoryId', e.target.value)}
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
                      {categories
                        .filter(c => c.type === 'forms' && c.division === p.formsDivision)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                      }
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
                    onChange={(e) => {
                      const enabling = e.target.checked;
                      if (enabling && !p.competingSparring) {
                        // Find corresponding sparring category by matching name AND division to forms category
                        const formsCategory = categories.find(c => c.id === p.formsCategoryId);
                        const matchingSparringCategory = formsCategory
                          ? categories.find(c =>
                              c.type === 'sparring' &&
                              c.name === formsCategory.name &&
                              c.division === formsCategory.division
                            )
                          : undefined;
                        const updatedParticipants = participants.map(participant =>
                          participant.id === p.id
                            ? {
                                ...participant,
                                competingSparring: true,
                                sparringDivision: participant.formsDivision,
                                sparringCategoryId: matchingSparringCategory?.id,
                                sparringPool: matchingSparringCategory ? participant.formsPool : undefined,
                              }
                            : participant
                        );
                        setParticipants(updatedParticipants);
                      } else {
                        updateParticipantField(p.id, 'competingSparring', enabling);
                      }
                    }}
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
                      onChange={(e) => updateParticipantCategory(p.id, 'sparringCategoryId', e.target.value)}
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
                      {categories
                        .filter(c => c.type === 'sparring' && c.division === p.sparringDivision)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                      }
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
