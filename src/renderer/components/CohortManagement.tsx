import React, { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTournamentStore } from '../store/tournamentStore';
import { Cohort } from '../types/tournament';
import { getEffectiveDivision } from '../utils/excelParser';

function CohortManagement() {
  const participants = useTournamentStore((state) => state.participants);
  const cohorts = useTournamentStore((state) => state.cohorts);
  const config = useTournamentStore((state) => state.config);
  const setCohorts = useTournamentStore((state) => state.setCohorts);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const updateCohort = useTournamentStore((state) => state.updateCohort);

  const [selectedDivision, setSelectedDivision] = useState('Black Belt');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'mixed'>('mixed');
  const [selectedAges, setSelectedAges] = useState<Set<string>>(new Set());
  const [numRings, setNumRings] = useState(1);

  // Get unique ages from participants in selected division
  const availableAges = useMemo(() => {
    if (!selectedDivision) return [];
    
    const agesInDivision = new Set<number>();
    participants.forEach((p) => {
      // Use forms division, fallback to sparring if not participating in forms
      const effectiveDivision = getEffectiveDivision(p, 'forms') || getEffectiveDivision(p, 'sparring');
      if (effectiveDivision === selectedDivision) {
        const age = p.age;
        // Only add valid numeric ages
        if (typeof age === 'number' && !isNaN(age) && age > 0) {
          agesInDivision.add(age);
        }
      }
    });
    
    const ages = Array.from(agesInDivision).sort((a, b) => a - b);
    console.log('Ages in division:', selectedDivision, ages);
    
    // Convert to display format
    const displayAges = ages.map(age => {
      if (age >= 18) {
        return '18 and Up';
      }
      return age.toString();
    });
    
    console.log('Display ages:', displayAges);
    
    // Remove duplicates
    return Array.from(new Set(displayAges));
  }, [participants, selectedDivision]);

  const toggleAge = (age: string) => {
    const newSelected = new Set(selectedAges);
    if (newSelected.has(age)) {
      newSelected.delete(age);
    } else {
      newSelected.add(age);
    }
    setSelectedAges(newSelected);
  };

  // Calculate participant counts for the current criteria
  const participantCounts = useMemo(() => {
    const formsMatching = participants.filter((p) => {
      if (!selectedDivision) return false;
      
      const genderMatch = selectedGender === 'mixed' || p.gender.toLowerCase() === selectedGender;
      const effectiveDivision = getEffectiveDivision(p, 'forms');
      const divisionMatch = effectiveDivision === selectedDivision;
      const unassigned = !p.formsCohortId;

      // Age matching with checkbox logic
      let ageMatch = false;
      if (selectedAges.has('18 and Up') && p.age >= 18) {
        ageMatch = true;
      }
      if (selectedAges.has(p.age.toString())) {
        ageMatch = true;
      }
      
      return ageMatch && genderMatch && divisionMatch && unassigned && p.competingForms;
    });

    const sparringMatching = participants.filter((p) => {
      if (!selectedDivision) return false;
      
      const genderMatch = selectedGender === 'mixed' || p.gender.toLowerCase() === selectedGender;
      const effectiveDivision = getEffectiveDivision(p, 'sparring');
      const divisionMatch = effectiveDivision === selectedDivision;
      const unassigned = !p.sparringCohortId;

      // Age matching with checkbox logic
      let ageMatch = false;
      if (selectedAges.has('18 and Up') && p.age >= 18) {
        ageMatch = true;
      }
      if (selectedAges.has(p.age.toString())) {
        ageMatch = true;
      }
      
      return ageMatch && genderMatch && divisionMatch && unassigned && p.competingSparring;
    });

    const totalFormsInDivision = participants.filter((p) => {
      const effectiveDivision = getEffectiveDivision(p, 'forms');
      return effectiveDivision === selectedDivision && p.competingForms;
    }).length;

    const totalSparringInDivision = participants.filter((p) => {
      const effectiveDivision = getEffectiveDivision(p, 'sparring');
      return effectiveDivision === selectedDivision && p.competingSparring;
    }).length;

    const unassignedFormsInDivision = participants.filter((p) => {
      const effectiveDivision = getEffectiveDivision(p, 'forms');
      return effectiveDivision === selectedDivision && !p.formsCohortId && p.competingForms;
    }).length;

    const unassignedSparringInDivision = participants.filter((p) => {
      const effectiveDivision = getEffectiveDivision(p, 'sparring');
      return effectiveDivision === selectedDivision && !p.sparringCohortId && p.competingSparring;
    }).length;

    return {
      matching: formsMatching.length + sparringMatching.length,
      formsMatching: formsMatching.length,
      sparringMatching: sparringMatching.length,
      totalInDivision: Math.max(totalFormsInDivision, totalSparringInDivision),
      totalFormsInDivision,
      totalSparringInDivision,
      unassignedInDivision: Math.max(unassignedFormsInDivision, unassignedSparringInDivision),
      unassignedFormsInDivision,
      unassignedSparringInDivision,
    };
  }, [participants, selectedDivision, selectedGender, selectedAges]);

  const handleAddCohort = () => {
    if (!selectedDivision) {
      alert('Please select a division');
      return;
    }

    if (selectedAges.size === 0) {
      alert('Please select at least one age');
      return;
    }

    // Find participants for forms cohort
    const formsParticipants = participants.filter((p) => {
      const genderMatch = selectedGender === 'mixed' || p.gender.toLowerCase() === selectedGender;
      const effectiveDivision = getEffectiveDivision(p, 'forms');
      const divisionMatch = effectiveDivision === selectedDivision;
      const unassigned = !p.formsCohortId;

      let ageMatch = false;
      if (selectedAges.has('18 and Up') && p.age >= 18) {
        ageMatch = true;
      }
      if (selectedAges.has(p.age.toString())) {
        ageMatch = true;
      }
      
      return ageMatch && genderMatch && divisionMatch && unassigned && p.competingForms;
    });

    // Find participants for sparring cohort
    const sparringParticipants = participants.filter((p) => {
      const genderMatch = selectedGender === 'mixed' || p.gender.toLowerCase() === selectedGender;
      const effectiveDivision = getEffectiveDivision(p, 'sparring');
      const divisionMatch = effectiveDivision === selectedDivision;
      const unassigned = !p.sparringCohortId;

      let ageMatch = false;
      if (selectedAges.has('18 and Up') && p.age >= 18) {
        ageMatch = true;
      }
      if (selectedAges.has(p.age.toString())) {
        ageMatch = true;
      }
      
      return ageMatch && genderMatch && divisionMatch && unassigned && p.competingSparring;
    });

    if (formsParticipants.length === 0 && sparringParticipants.length === 0) {
      alert('No participants match the selected criteria for either Forms or Sparring');
      return;
    }

    // Build age display
    const ageArray = Array.from(selectedAges);
    const numericAges = ageArray.filter(a => a !== '18 and Up').map(a => parseInt(a)).sort((a, b) => a - b);
    const hasAdults = ageArray.includes('18 and Up');
    
    let ageDisplay = '';
    if (numericAges.length > 0) {
      const minAge = Math.min(...numericAges);
      const maxAge = Math.max(...numericAges);
      if (minAge === maxAge) {
        ageDisplay = minAge.toString();
      } else {
        ageDisplay = `${minAge}-${maxAge}`;
      }
    }
    if (hasAdults) {
      ageDisplay = ageDisplay ? `${ageDisplay},18+` : '18+';
    }
    
    const cohortName = `${selectedGender === 'mixed' ? 'Mixed' : selectedGender === 'male' ? 'Male' : 'Female'} ${ageDisplay}`;

    // Determine minAge and maxAge for Cohort structure
    const allAges = numericAges.concat(hasAdults ? [18] : []);
    const minAgeValue = Math.min(...allAges);
    const maxAgeValue = hasAdults ? 999 : Math.max(...allAges);

    const newCohorts: Cohort[] = [];
    const updatedParticipants = [...participants];

    // Create Forms cohort if there are forms participants
    if (formsParticipants.length > 0) {
      const formsCohortId = uuidv4();
      const formsCohort: Cohort = {
        id: formsCohortId,
        name: cohortName,
        division: selectedDivision,
        gender: selectedGender,
        minAge: minAgeValue,
        maxAge: maxAgeValue,
        participantIds: formsParticipants.map((p) => p.id),
        numRings,
        type: 'forms',
      };
      newCohorts.push(formsCohort);

      // Update participants with forms cohort ID
      formsParticipants.forEach((fp) => {
        const index = updatedParticipants.findIndex((p) => p.id === fp.id);
        if (index !== -1) {
          updatedParticipants[index] = { 
            ...updatedParticipants[index], 
            formsCohortId,
            cohortId: formsCohortId // For backward compatibility
          };
        }
      });
    }

    // Create Sparring cohort if there are sparring participants
    if (sparringParticipants.length > 0) {
      const sparringCohortId = uuidv4();
      const sparringCohort: Cohort = {
        id: sparringCohortId,
        name: cohortName,
        division: selectedDivision,
        gender: selectedGender,
        minAge: minAgeValue,
        maxAge: maxAgeValue,
        participantIds: sparringParticipants.map((p) => p.id),
        numRings,
        type: 'sparring',
      };
      newCohorts.push(sparringCohort);

      // Update participants with sparring cohort ID
      sparringParticipants.forEach((sp) => {
        const index = updatedParticipants.findIndex((p) => p.id === sp.id);
        if (index !== -1) {
          updatedParticipants[index] = { 
            ...updatedParticipants[index], 
            sparringCohortId 
          };
        }
      });
    }

    setCohorts([...cohorts, ...newCohorts]);
    setParticipants(updatedParticipants);

    // Reset form
    setSelectedGender('mixed');
    setSelectedAges(new Set());
    setNumRings(1);
  };

  const handleRemoveCohort = (cohortId: string) => {
    if (!confirm('Remove this cohort? Participants will become unassigned.')) {
      return;
    }
    // Remove the selected cohort and any matching opposite cohort(s)
    const cohortToRemove = cohorts.find((c) => c.id === cohortId);
    if (!cohortToRemove) return;

    // Find all cohorts that match the same name/division/gender/age range (both/forms/sparring variants)
    const cohortsToRemove = cohorts.filter((c) =>
      c.name === cohortToRemove.name &&
      c.division === cohortToRemove.division &&
      c.gender === cohortToRemove.gender &&
      c.minAge === cohortToRemove.minAge &&
      c.maxAge === cohortToRemove.maxAge
    );

    const removeIds = new Set(cohortsToRemove.map(c => c.id));

    // Update cohorts list by removing all matching cohorts
    setCohorts(cohorts.filter((c) => !removeIds.has(c.id)));

    // Clear any cohort IDs on participants that referenced any of these removed cohorts
    const updatedParticipants = participants.map((p) => {
      let updated = { ...p };
      if (p.formsCohortId && removeIds.has(p.formsCohortId)) {
        updated.formsCohortId = undefined;
      }
      if (p.sparringCohortId && removeIds.has(p.sparringCohortId)) {
        updated.sparringCohortId = undefined;
      }
      if (p.cohortId && removeIds.has(p.cohortId)) {
        updated.cohortId = undefined;
      }
      return updated;
    });
    setParticipants(updatedParticipants);
  };

  const handleRingsChange = (cohortId: string, rings: number) => {
    const cohort = cohorts.find((c) => c.id === cohortId);
    if (!cohort) return;

    // Update the current cohort
    updateCohort(cohortId, { numRings: rings });

    // Find the opposite type cohort with matching criteria
    // (Forms and Sparring use the same physical rings sequentially)
    const oppositeType = cohort.type === 'forms' ? 'sparring' : 'forms';
    const oppositeCohort = cohorts.find(
      (c) =>
        c.type === oppositeType &&
        c.division === cohort.division &&
        c.gender === cohort.gender &&
        c.minAge === cohort.minAge &&
        c.maxAge === cohort.maxAge
    );

    // Sync the opposite cohort's ring count
    if (oppositeCohort) {
      updateCohort(oppositeCohort.id, { numRings: rings });
    }
  };

  // Calculate ring totals per division (only count Forms rings since Sparring uses same physical rings)
  const ringTotalsByDivision = useMemo(() => {
    const totals: { [division: string]: number } = {};
    cohorts.forEach((cohort) => {
      // Only count Forms cohorts - Sparring will use the same physical rings after Forms
      if (cohort.type === 'forms') {
        if (!totals[cohort.division]) {
          totals[cohort.division] = 0;
        }
        totals[cohort.division] += cohort.numRings;
      }
    });
    return totals;
  }, [cohorts]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <h2 className="card-title" style={{ flexShrink: 0 }}>Cohort Management</h2>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
        <div className="grid grid-2">
        {/* Create Cohort Form */}
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Create Cohort</h3>

          <div className="form-group">
            <label className="form-label">Division</label>
            <select
              className="form-control"
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setSelectedAges(new Set()); // Reset ages when division changes
              }}
            >
              <option value="">Select Division</option>
              {config.divisions.map((div) => (
                <option key={div.name} value={div.name}>
                  {div.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Gender</label>
            <select
              className="form-control"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value as 'male' | 'female' | 'mixed')}
            >
              <option value="mixed">Mixed</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ages</label>
            {selectedDivision ? (
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid #ddd', 
                padding: '10px',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9'
              }}>
                {availableAges.length > 0 ? (
                  availableAges.map((age) => (
                    <div key={age} style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedAges.has(age)}
                          onChange={() => toggleAge(age)}
                          style={{ marginRight: '8px' }}
                        />
                        <span>{age}</span>
                      </label>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>No participants in this division</p>
                )}
              </div>
            ) : (
              <p style={{ color: '#666', fontSize: '14px' }}>Select a division first</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Rings Needed</label>
            <input
              type="number"
              className="form-control"
              value={numRings}
              onChange={(e) => setNumRings(parseInt(e.target.value) || 1)}
              min={1}
              max={10}
              style={{ width: '100px' }}
            />
          </div>

          {selectedDivision && (
            <div className="info" style={{ marginBottom: '15px' }}>
              <p style={{ margin: '5px 0' }}>
                <strong>Matching participants:</strong> {participantCounts.matching}
                {' '}
                (<span style={{ color: '#007bff' }}>Forms: {participantCounts.formsMatching}</span>
                {' / '}
                <span style={{ color: '#28a745' }}>Sparring: {participantCounts.sparringMatching}</span>)
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Unassigned Forms:</strong> {participantCounts.unassignedFormsInDivision} / {participantCounts.totalFormsInDivision}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Unassigned Sparring:</strong> {participantCounts.unassignedSparringInDivision} / {participantCounts.totalSparringInDivision}
              </p>
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={handleAddCohort}
            disabled={!selectedDivision || selectedAges.size === 0 || participantCounts.matching === 0}
          >
            Add Cohort
          </button>
        </div>

        {/* Cohorts List */}
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>
            Cohorts ({cohorts.length})
          </h3>

          {cohorts.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Division</th>
                    <th>Gender</th>
                    <th>Age</th>
                    <th>Form Count</th>
                    <th>Sparring Count</th>
                    <th>Rings</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((cohort) => {
                    // Find matching cohort of opposite type
                    const oppositeCohort = cohorts.find(c => 
                      c.id !== cohort.id &&
                      c.name === cohort.name &&
                      c.division === cohort.division &&
                      c.type !== cohort.type
                    );
                    
                    // Only show forms cohorts or sparring-only cohorts (avoid duplicates)
                    if (cohort.type === 'sparring' && oppositeCohort) {
                      return null;
                    }

                    const formCount = cohort.type === 'forms' ? cohort.participantIds.length : (oppositeCohort?.participantIds.length || 0);
                    const sparringCount = cohort.type === 'sparring' ? cohort.participantIds.length : (oppositeCohort?.participantIds.length || 0);
                    
                    return (
                      <tr key={cohort.id}>
                        <td>{cohort.division}</td>
                        <td style={{ textTransform: 'capitalize' }}>{cohort.gender}</td>
                        <td>
                          {cohort.maxAge === 999 ? `${cohort.minAge}+` : `${cohort.minAge}-${cohort.maxAge}`}
                        </td>
                        {/* type column removed - cohorts may represent forms/sparring but UI hides type */}
                        <td style={{ color: formCount > 0 ? '#007bff' : '#999' }}>
                          {formCount > 0 ? formCount : '-'}
                        </td>
                        <td style={{ color: sparringCount > 0 ? '#28a745' : '#999' }}>
                          {sparringCount > 0 ? sparringCount : '-'}
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={cohort.numRings}
                            onChange={(e) =>
                              handleRingsChange(cohort.id, parseInt(e.target.value) || 1)
                            }
                            style={{ width: '50px', padding: '4px' }}
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleRemoveCohort(cohort.id)}
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="info">
              <p>No cohorts created yet. Use the form on the left to create cohorts.</p>
            </div>
          )}

          {/* Ring Totals by Division */}
          {Object.keys(ringTotalsByDivision).length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>
                Forms Rings Needed by Division
              </h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                (Sparring will use the same physical rings after Forms are completed)
              </p>
              <div style={{ 
                background: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}>
                {Object.entries(ringTotalsByDivision)
                  .sort(([divA], [divB]) => {
                    const orderA = config.divisions.find(d => d.name === divA)?.order ?? 999;
                    const orderB = config.divisions.find(d => d.name === divB)?.order ?? 999;
                    return orderA - orderB;
                  })
                  .map(([division, total]) => (
                    <div 
                      key={division} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid #dee2e6'
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{division}:</span>
                      <span style={{ 
                        fontWeight: 'bold',
                        color: total > 14 ? '#dc3545' : '#28a745'
                      }}>
                        {total} ring{total !== 1 ? 's' : ''}
                        {total > 14 && ' ⚠️ (max 14)'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default CohortManagement;
