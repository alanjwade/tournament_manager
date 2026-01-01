import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { getEffectiveDivision } from '../utils/excelParser';
import { Participant } from '../types/tournament';
import { computeCompetitionRings } from '../utils/computeRings';

interface DataViewerProps {
  globalDivision?: string;
}

function DataViewer({ globalDivision }: DataViewerProps) {
  const participants = useTournamentStore((state) => state.participants);
  const cohorts = useTournamentStore((state) => state.cohorts);
  const cohortRingMappings = useTournamentStore((state) => state.cohortRingMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const config = useTournamentStore((state) => state.config);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  
  // State for highlighted participant from search
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, cohorts, cohortRingMappings),
    [participants, cohorts, cohortRingMappings]
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
    formsDivision: '',
    sparringDivision: '',
    formsCohort: '',
    sparringCohort: '',
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
        formsDivision: '',
        sparringDivision: '',
        formsCohort: '',
        sparringCohort: '',
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

  // Get cohort name by ID
  const getCohortName = (cohortId?: string) => {
    if (!cohortId) return 'Unassigned';
    const cohort = cohorts.find((c) => c.id === cohortId);
    return cohort ? `${cohort.name} (${cohort.division})` : 'Unknown';
  };

  // Get all unique divisions from config
  const divisionOptions = useMemo(() => {
    return config.divisions.map(d => d.name);
  }, [config]);

  // Legal values for forms and sparring divisions
  const formsOptions = ['not participating', 'same as sparring', ...divisionOptions];
  const sparringOptions = ['not participating', 'same as forms', ...divisionOptions];

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
      // Extract cohort name from cohortRingName (e.g., "Mixed 8-10_R1" -> "Mixed 8-10")
      const cohortName = mapping.cohortRingName.split('_')[0];
      
      // Find cohort and its division
      const cohort = cohorts.find(c => c.name === cohortName);
      if (cohort && mapping.physicalRingName) {
        if (!ringToDivisions.has(mapping.physicalRingName)) {
          ringToDivisions.set(mapping.physicalRingName, new Set());
        }
        ringToDivisions.get(mapping.physicalRingName)!.add(cohort.division);
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
  }, [physicalRingMappings, cohorts, config.divisions]);

  // Get all cohort names for dropdowns
  const formsCohortOptions = useMemo(() => {
    const formsCohorts = cohorts.filter(c => c.type === 'forms');
    return formsCohorts.map(c => ({ id: c.id, name: c.name }));
  }, [cohorts]);

  const sparringCohortOptions = useMemo(() => {
    const sparringCohorts = cohorts.filter(c => c.type === 'sparring');
    return sparringCohorts.map(c => ({ id: c.id, name: c.name }));
  }, [cohorts]);

  // Update participant division
  const updateParticipantDivision = (participantId: string, field: 'formsDivision' | 'sparringDivision', value: string) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        const updates: Partial<Participant> = { [field]: value };
        
        // Update competing flags
        if (field === 'formsDivision') {
          updates.competingForms = value !== 'not participating' && value !== 'same as sparring';
        } else if (field === 'sparringDivision') {
          updates.competingSparring = value !== 'not participating' && value !== 'same as forms';
          
          // When setting sparring to "same as forms", copy forms cohort and ring
          if (value === 'same as forms') {
            updates.sparringCohortId = p.formsCohortId;
            updates.sparringCohortRing = p.formsCohortRing;
          }
        }
        
        return { ...p, ...updates };
      }
      return p;
    });
    setParticipants(updatedParticipants);
  };

  // Update participant cohort assignment
  const updateParticipantCohort = (participantId: string, field: 'formsCohortId' | 'sparringCohortId', value: string) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        return { ...p, [field]: value || undefined };
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

  // Update participant cohort ring (formsCohortRing or sparringCohortRing)
  const updateParticipantCohortRing = (participantId: string, field: 'formsCohortRing' | 'sparringCohortRing', value: string) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        return { ...p, [field]: value || undefined };
      }
      return p;
    });
    setParticipants(updatedParticipants);
  };

  // Update participant physical ring - this will update division, cohort, and cohort ring based on ring map
  const updateParticipantPhysicalRing = (participantId: string, type: 'forms' | 'sparring', physicalRingName: string) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    // Find the cohort ring mapping for this physical ring
    const mapping = physicalRingMappings.find(m => m.physicalRingName === physicalRingName);
    if (!mapping) {
      // If no mapping found, just clear the assignments
      const updatedParticipants = participants.map(p => {
        if (p.id === participantId) {
          if (type === 'forms') {
            return { ...p, formsCohortId: undefined, formsCohortRing: undefined };
          } else {
            return { ...p, sparringCohortId: undefined, sparringCohortRing: undefined };
          }
        }
        return p;
      });
      setParticipants(updatedParticipants);
      return;
    }

    // Find the competition ring for this mapping
    const competitionRing = competitionRings.find(r => 
      r.name === mapping.cohortRingName && r.type === type
    );

    if (!competitionRing) return;

    // Find the cohort
    const cohort = cohorts.find(c => c.id === competitionRing.cohortId);
    if (!cohort) return;

    // Extract cohort ring from the ring name (e.g., "R1" from "Mixed 8-10_R1")
    const cohortRing = mapping.cohortRingName.match(/_R(\d+)$/)?.[0]?.substring(1) || undefined;

    // Update the participant
    const updatedParticipants = participants.map(p => {
      if (p.id === participantId) {
        if (type === 'forms') {
          return { 
            ...p, 
            formsCohortId: cohort.id,
            formsCohortRing: cohortRing,
            formsDivision: cohort.division
          };
        } else {
          return { 
            ...p, 
            sparringCohortId: cohort.id,
            sparringCohortRing: cohortRing,
            sparringDivision: cohort.division
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
      const formsCohort = cohorts.find(c => c.id === p.formsCohortId);
      const sparringCohort = cohorts.find(c => c.id === p.sparringCohortId);
      const formsCohortName = formsCohort?.name || '';
      const sparringCohortName = sparringCohort?.name || '';
      const formsOrder = p.formsRankOrder ? (p.formsRankOrder * 10).toString() : '';
      const sparringOrder = p.sparringRankOrder ? (p.sparringRankOrder * 10).toString() : '';
      
      // Get ring names and physical ring names
      const formsRing = competitionRings.find(r => r.id === p.formsRingId);
      const sparringRing = competitionRings.find(r => r.id === p.sparringRingId);
      const formsRingName = formsRing?.name || '';
      const sparringRingName = sparringRing?.name || '';
      
      // Get physical ring names from mappings
      const formsPhysicalMapping = physicalRingMappings.find(m => 
        formsCohort && p.formsCohortRing && m.cohortRingName === `${formsCohort.name}_${p.formsCohortRing}`
      );
      const sparringPhysicalMapping = physicalRingMappings.find(m => 
        sparringCohort && p.sparringCohortRing && m.cohortRingName === `${sparringCohort.name}_${p.sparringCohortRing}`
      );
      const formsPhysicalRingName = formsPhysicalMapping?.physicalRingName || '';
      const sparringPhysicalRingName = sparringPhysicalMapping?.physicalRingName || '';
      
      return (
        p.firstName.toLowerCase().includes(filters.firstName.toLowerCase()) &&
        p.lastName.toLowerCase().includes(filters.lastName.toLowerCase()) &&
        p.age.toString().includes(filters.age) &&
        p.gender.toLowerCase().includes(filters.gender.toLowerCase()) &&
        p.heightFeet.toString().includes(filters.heightFeet) &&
        p.heightInches.toString().includes(filters.heightInches) &&
        p.school.toLowerCase().includes(filters.school.toLowerCase()) &&
        (p.branch || '').toLowerCase().includes(filters.branch.toLowerCase()) &&
        p.formsDivision.toLowerCase().includes(filters.formsDivision.toLowerCase()) &&
        p.sparringDivision.toLowerCase().includes(filters.sparringDivision.toLowerCase()) &&
        formsCohortName.toLowerCase().includes(filters.formsCohort.toLowerCase()) &&
        sparringCohortName.toLowerCase().includes(filters.sparringCohort.toLowerCase()) &&
        formsRingName.toLowerCase().includes(filters.formsRing.toLowerCase()) &&
        sparringRingName.toLowerCase().includes(filters.sparringRing.toLowerCase()) &&
        formsPhysicalRingName.toLowerCase().includes(filters.formsPhysicalRing.toLowerCase()) &&
        sparringPhysicalRingName.toLowerCase().includes(filters.sparringPhysicalRing.toLowerCase()) &&
        (p.sparringAltRing || '').toLowerCase().includes(filters.sparringAltRing.toLowerCase()) &&
        formsOrder.includes(filters.formsOrder) &&
        sparringOrder.includes(filters.sparringOrder)
      );
    });
  }, [participants, filters, cohorts, competitionRings, physicalRingMappings]);

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
      formsDivision: '',
      sparringDivision: '',
      formsCohort: '',
      sparringCohort: '',
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
      overflow: 'hidden' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexShrink: 0 }}>
        <h2>All Participants Data ({filteredParticipants.length} of {participants.length})</h2>
        <button onClick={clearFilters} style={{ padding: '8px 16px' }}>
          Clear All Filters
        </button>
      </div>

      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minHeight: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f0f0f0', zIndex: 1 }}>
            <tr>
              <th style={{ padding: '10px', border: '1px solid #ddd', minWidth: '120px' }}>
                First Name
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.firstName}
                  onChange={(e) => updateFilter('firstName', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd', minWidth: '120px' }}>
                Last Name
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.lastName}
                  onChange={(e) => updateFilter('lastName', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd', minWidth: '80px' }}>
                Age
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.age}
                  onChange={(e) => updateFilter('age', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd', minWidth: '100px' }}>
                Gender
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.gender}
                  onChange={(e) => updateFilter('gender', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd', minWidth: '80px' }}>
                Feet
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.heightFeet}
                  onChange={(e) => updateFilter('heightFeet', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd', minWidth: '80px' }}>
                Inches
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.heightInches}
                  onChange={(e) => updateFilter('heightInches', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd', minWidth: '150px' }}>
                School
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.school}
                  onChange={(e) => updateFilter('school', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd', minWidth: '120px' }}>
                Branch
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.branch}
                  onChange={(e) => updateFilter('branch', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="forms-column" style={{ padding: '10px', border: '1px solid #ddd', minWidth: '150px' }}>
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
              <th className="forms-column" style={{ padding: '10px', border: '1px solid #ddd', minWidth: '150px' }}>
                Forms Cohort
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.formsCohort}
                  onChange={(e) => updateFilter('formsCohort', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="forms-column" style={{ padding: '10px', border: '1px solid #ddd', minWidth: '150px' }}>
                Forms Ring
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.formsRing}
                  onChange={(e) => updateFilter('formsRing', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="forms-physical-column" style={{ padding: '10px', border: '1px solid #ddd', minWidth: '120px' }}>
                Forms Physical Ring
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.formsPhysicalRing}
                  onChange={(e) => updateFilter('formsPhysicalRing', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd', minWidth: '100px' }}>
                Forms Order
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.formsOrder}
                  onChange={(e) => updateFilter('formsOrder', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="sparring-column" style={{ padding: '10px', border: '1px solid #ddd', minWidth: '150px' }}>
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
              <th className="sparring-column" style={{ padding: '10px', border: '1px solid #ddd', minWidth: '150px' }}>
                Sparring Cohort
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.sparringCohort}
                  onChange={(e) => updateFilter('sparringCohort', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="sparring-column" style={{ padding: '10px', border: '1px solid #ddd', minWidth: '150px' }}>
                Sparring Ring
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.sparringRing}
                  onChange={(e) => updateFilter('sparringRing', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="sparring-physical-column" style={{ padding: '10px', border: '1px solid #ddd', minWidth: '120px' }}>
                Sparring Physical Ring
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.sparringPhysicalRing}
                  onChange={(e) => updateFilter('sparringPhysicalRing', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th className="sparring-alt-column" style={{ padding: '10px', border: '1px solid #ddd', minWidth: '80px' }}>
                Sparring Alt Ring
                <input
                  type="text"
                  placeholder="Filter..."
                  value={filters.sparringAltRing || ''}
                  onChange={(e) => updateFilter('sparringAltRing', e.target.value)}
                  style={{ width: '100%', marginTop: '5px', padding: '4px' }}
                />
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd', minWidth: '100px' }}>
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
              const formsRing = competitionRings.find(r => r.id === p.formsRingId);
              const sparringRing = competitionRings.find(r => r.id === p.sparringRingId);
              const formsCohort = cohorts.find(c => c.id === p.formsCohortId);
              const sparringCohort = cohorts.find(c => c.id === p.sparringCohortId);
              
              // Get physical ring names from mappings
              const formsPhysicalMapping = physicalRingMappings.find(m => 
                formsCohort && p.formsCohortRing && m.cohortRingName === `${formsCohort.name}_${p.formsCohortRing}`
              );
              const sparringPhysicalMapping = physicalRingMappings.find(m => 
                sparringCohort && p.sparringCohortRing && m.cohortRingName === `${sparringCohort.name}_${p.sparringCohortRing}`
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
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{p.firstName}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{p.lastName}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                  {p.age >= 18 ? '18+' : p.age}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textTransform: 'capitalize' }}>
                  {p.gender}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{p.heightFeet}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{p.heightInches}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{p.school}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{p.branch || ''}</td>
                <td className="forms-column" style={{ padding: '8px', border: '1px solid #ddd' }}>
                  <select
                    value={p.formsDivision}
                    onChange={(e) => updateParticipantDivision(p.id, 'formsDivision', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      fontSize: '13px',
                      background: p.formsDivision === 'not participating' ? '#fff3cd' : 
                                  p.formsDivision === 'same as sparring' ? '#d1ecf1' : 'white'
                    }}
                  >
                    {formsOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td className="forms-column" style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {p.competingForms ? (
                    <select
                      value={p.formsCohortId || ''}
                      onChange={(e) => updateParticipantCohort(p.id, 'formsCohortId', e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '12px',
                        background: p.formsCohortId ? 'white' : '#fff3cd'
                      }}
                    >
                      <option value="">Not assigned</option>
                      {formsCohortOptions.map(option => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  ) : <span style={{ color: '#999', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td className="forms-column" style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {p.competingForms ? (
                    <input
                      type="text"
                      value={p.formsCohortRing || ''}
                      onChange={(e) => updateParticipantCohortRing(p.id, 'formsCohortRing', e.target.value)}
                      placeholder="e.g. R1"
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '12px',
                        background: p.formsCohortRing ? 'white' : '#fff3cd'
                      }}
                    />
                  ) : <span style={{ color: '#999', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td className="forms-physical-column" style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {p.competingForms ? (
                    <select
                      value={formsPhysicalMapping?.physicalRingName || ''}
                      onChange={(e) => updateParticipantPhysicalRing(p.id, 'forms', e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '12px',
                        background: formsPhysicalMapping?.physicalRingName ? 'white' : '#fff3cd'
                      }}
                    >
                      <option value="">Not assigned</option>
                      {physicalRingOptionsWithDivision.map(option => (
                        <option key={`${option.division}-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : <span style={{ color: '#999', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {p.competingForms ? (
                    <input
                      type="number"
                      value={p.formsRankOrder ? p.formsRankOrder * 10 : ''}
                      onChange={(e) => updateParticipantOrder(p.id, 'formsRankOrder', e.target.value)}
                      placeholder="Order"
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '12px',
                        textAlign: 'center'
                      }}
                    />
                  ) : <span style={{ color: '#999', fontSize: '12px' }}>-</span>}
                </td>
                <td className="sparring-column" style={{ padding: '8px', border: '1px solid #ddd' }}>
                  <select
                    value={p.sparringDivision}
                    onChange={(e) => updateParticipantDivision(p.id, 'sparringDivision', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      fontSize: '13px',
                      background: p.sparringDivision === 'not participating' ? '#fff3cd' : 
                                  p.sparringDivision === 'same as forms' ? '#d1ecf1' : 'white'
                    }}
                  >
                    {sparringOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </td>
                <td className="sparring-column" style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {p.competingSparring ? (
                    <select
                      value={p.sparringCohortId || ''}
                      onChange={(e) => updateParticipantCohort(p.id, 'sparringCohortId', e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '12px',
                        background: p.sparringCohortId ? 'white' : '#fff3cd'
                      }}
                    >
                      <option value="">Not assigned</option>
                      {sparringCohortOptions.map(option => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  ) : <span style={{ color: '#999', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td className="sparring-column" style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {p.competingSparring ? (
                    <input
                      type="text"
                      value={p.sparringCohortRing || ''}
                      onChange={(e) => updateParticipantCohortRing(p.id, 'sparringCohortRing', e.target.value)}
                      placeholder="e.g. R1"
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '12px',
                        background: p.sparringCohortRing ? 'white' : '#fff3cd'
                      }}
                    />
                  ) : <span style={{ color: '#999', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td className="sparring-physical-column" style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {p.competingSparring ? (
                    <select
                      value={sparringPhysicalMapping?.physicalRingName || ''}
                      onChange={(e) => updateParticipantPhysicalRing(p.id, 'sparring', e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '12px',
                        background: sparringPhysicalMapping?.physicalRingName ? 'white' : '#fff3cd'
                      }}
                    >
                      <option value="">Not assigned</option>
                      {physicalRingOptionsWithDivision.map(option => (
                        <option key={`${option.division}-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : <span style={{ color: '#999', fontSize: '12px' }}>Not competing</span>}
                </td>
                <td className="sparring-alt-column" style={{ padding: '8px', border: '1px solid #ddd' }}>
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
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '12px',
                        textAlign: 'center'
                      }}
                    />
                  ) : <span style={{ color: '#999', fontSize: '12px' }}>-</span>}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {p.competingSparring ? (
                    <input
                      type="number"
                      value={p.sparringRankOrder ? p.sparringRankOrder * 10 : ''}
                      onChange={(e) => updateParticipantOrder(p.id, 'sparringRankOrder', e.target.value)}
                      placeholder="Order"
                      style={{ 
                        width: '100%', 
                        padding: '4px',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '12px',
                        textAlign: 'center'
                      }}
                    />
                  ) : <span style={{ color: '#999', fontSize: '12px' }}>-</span>}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredParticipants.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            {participants.length === 0 ? 'No participants loaded' : 'No participants match the current filters'}
          </div>
        )}
      </div>
    </div>
  );
}

export default DataViewer;
