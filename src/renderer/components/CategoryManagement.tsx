import React, { useState, useMemo, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Category } from '../types/tournament';
import { getEffectiveDivision } from '../utils/excelParser';
import { autoAssignAndOrderCategory } from '../utils/autoAssignAndOrder';
import { AGE_THRESHOLDS, DEFAULT_DIVISION_ORDER } from '../utils/constants';

// Generate deterministic category ID based on properties
function generateCategoryId(type: 'forms' | 'sparring', division: string, gender: string, minAge: number, maxAge: number): string {
  return `${type}-${division}-${gender}-${minAge}-${maxAge}`;
}

interface CategoryManagementProps {
  globalDivision?: string;
}

function CategoryManagement({ globalDivision }: CategoryManagementProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const config = useTournamentStore((state) => state.config);
  const setCategories = useTournamentStore((state) => state.setCategories);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const updateCategory = useTournamentStore((state) => state.updateCategory);

  const [selectedDivision, setSelectedDivision] = useState(globalDivision && globalDivision !== 'all' ? globalDivision : 'Black Belt');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'mixed'>('mixed');
  const [selectedAges, setSelectedAges] = useState<Set<string>>(new Set());
  const [numPools, setNumPools] = useState(1);

  // Sync with global division when it changes
  useEffect(() => {
    if (globalDivision && globalDivision !== 'all') {
      setSelectedDivision(globalDivision);
    }
  }, [globalDivision]);

  // Get unique ages from participants in selected division with unassigned participants
  const availableAges = useMemo(() => {
    if (!selectedDivision) return [];
    
    const agesInDivision = new Set<number>();
    
    // Filter by gender and check for unassigned participants
    participants.forEach((p) => {
      // Check gender match
      const genderMatch = selectedGender === 'mixed' || p.gender.toLowerCase() === selectedGender;
      if (!genderMatch) return;
      
      // Use forms division, fallback to sparring if not participating in forms
      const effectiveDivision = getEffectiveDivision(p, 'forms') || getEffectiveDivision(p, 'sparring');
      if (effectiveDivision === selectedDivision) {
        // Check if participant is unassigned in at least one event type
        const unassignedInForms = p.competingForms && !p.formsCategoryId;
        const unassignedInSparring = p.competingSparring && !p.sparringCategoryId;
        
        if (unassignedInForms || unassignedInSparring) {
          const age = p.age;
          // Only add valid numeric ages
          if (typeof age === 'number' && !isNaN(age) && age > 0) {
            agesInDivision.add(age);
          }
        }
      }
    });
    
    const ages = Array.from(agesInDivision).sort((a, b) => a - b);
    console.log('Available unassigned ages in division:', selectedDivision, ages);
    
    // Convert to display format
    const displayAges = ages.map(age => {
      if (age >= AGE_THRESHOLDS.ADULT) {
        return '18 and Up';
      }
      return age.toString();
    });
    
    console.log('Display ages:', displayAges);
    
    // Remove duplicates
    return Array.from(new Set(displayAges));
  }, [participants, selectedDivision, selectedGender]);

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
    console.log('Calculating participantCounts with:', { selectedDivision, selectedGender, selectedAges: Array.from(selectedAges) });
    
    // Track unique participants who match the criteria (not double-counting)
    const matchingParticipantIds = new Set<string>();
    
    participants.forEach((p) => {
      if (!selectedDivision) return;
      
      const genderMatch = selectedGender === 'mixed' || p.gender.toLowerCase() === selectedGender;
      
      // Age matching with checkbox logic
      let ageMatch = false;
      if (selectedAges.has('18 and Up') && p.age >= AGE_THRESHOLDS.ADULT) {
        ageMatch = true;
      }
      if (selectedAges.has(p.age.toString())) {
        ageMatch = true;
      }
      
      if (!ageMatch || !genderMatch) return;
      
      // Check if they match for forms
      const formsDiv = getEffectiveDivision(p, 'forms');
      const formsMatch = formsDiv === selectedDivision && !p.formsCategoryId && p.competingForms;
      
      // Check if they match for sparring
      const sparringDiv = getEffectiveDivision(p, 'sparring');
      const sparringMatch = sparringDiv === selectedDivision && !p.sparringCategoryId && p.competingSparring;
      
      // Add to set if they match either (counts person once)
      if (formsMatch || sparringMatch) {
        matchingParticipantIds.add(p.id);
      }
    });

    console.log('Participant counts:', {
      matching: matchingParticipantIds.size,
    });

    // Get all unique participants in division (forms or sparring or both)
    const allInDivision = new Set<string>();
    const unassignedInDivision = new Set<string>();
    
    participants.forEach(p => {
      const formsDiv = getEffectiveDivision(p, 'forms');
      const sparringDiv = getEffectiveDivision(p, 'sparring');
      
      if ((formsDiv === selectedDivision && p.competingForms) || 
          (sparringDiv === selectedDivision && p.competingSparring)) {
        allInDivision.add(p.id);
        
        // Check if unassigned in either
        if ((formsDiv === selectedDivision && p.competingForms && !p.formsCategoryId) ||
            (sparringDiv === selectedDivision && p.competingSparring && !p.sparringCategoryId)) {
          unassignedInDivision.add(p.id);
        }
      }
    });

    return {
      matching: matchingParticipantIds.size,
      totalInDivision: allInDivision.size,
      unassignedInDivision: unassignedInDivision.size,
    };
  }, [participants, selectedDivision, selectedGender, selectedAges]);

  // Auto-calculate pools needed based on 12 participants per pool max
  useEffect(() => {
    if (participantCounts.matching > 0) {
      const poolsNeeded = Math.max(1, Math.ceil(participantCounts.matching / 12));
      setNumPools(poolsNeeded);
    }
  }, [participantCounts.matching]);

  const handleAddCategory = () => {
    if (!selectedDivision) {
      alert('Please select a division');
      return;
    }

    if (selectedAges.size === 0) {
      alert('Please select at least one age');
      return;
    }

    // Find participants for forms category
    const formsParticipants = participants.filter((p) => {
      const genderMatch = selectedGender === 'mixed' || p.gender.toLowerCase() === selectedGender;
      const effectiveDivision = getEffectiveDivision(p, 'forms');
      const divisionMatch = effectiveDivision === selectedDivision;
      const unassigned = !p.formsCategoryId;

      let ageMatch = false;
      if (selectedAges.has('18 and Up') && p.age >= AGE_THRESHOLDS.ADULT) {
        ageMatch = true;
      }
      if (selectedAges.has(p.age.toString())) {
        ageMatch = true;
      }
      
      return ageMatch && genderMatch && divisionMatch && unassigned && p.competingForms;
    });

    // Find participants for sparring category
    const sparringParticipants = participants.filter((p) => {
      const genderMatch = selectedGender === 'mixed' || p.gender.toLowerCase() === selectedGender;
      const effectiveDivision = getEffectiveDivision(p, 'sparring');
      const divisionMatch = effectiveDivision === selectedDivision;
      const unassigned = !p.sparringCategoryId;

      let ageMatch = false;
      if (selectedAges.has('18 and Up') && p.age >= AGE_THRESHOLDS.ADULT) {
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
    
    const categoryName = `${selectedGender === 'mixed' ? 'Mixed' : selectedGender === 'male' ? 'Male' : 'Female'} ${ageDisplay}`;

    // Determine minAge and maxAge for Category structure
    const allAges = numericAges.concat(hasAdults ? [18] : []);
    const minAgeValue = Math.min(...allAges);
    const maxAgeValue = hasAdults ? 999 : Math.max(...allAges);

    const newCategories: Category[] = [];
    const updatedParticipants = [...participants];

    // Create Forms category if there are forms participants
    if (formsParticipants.length > 0) {
      const formsCategoryId = generateCategoryId('forms', selectedDivision, selectedGender, minAgeValue, maxAgeValue);
      const formsCategory: Category = {
        id: formsCategoryId,
        name: categoryName,
        division: selectedDivision,
        gender: selectedGender,
        minAge: minAgeValue,
        maxAge: maxAgeValue,
        participantIds: formsParticipants.map((p) => p.id),
        numPools,
        type: 'forms',
      };
      newCategories.push(formsCategory);

      // Update participants with forms category ID
      formsParticipants.forEach((fp) => {
        const index = updatedParticipants.findIndex((p) => p.id === fp.id);
        if (index !== -1) {
          updatedParticipants[index] = { 
            ...updatedParticipants[index], 
            formsCategoryId
          };
        }
      });
    }

    // Create Sparring category if there are sparring participants
    if (sparringParticipants.length > 0) {
      const sparringCategoryId = generateCategoryId('sparring', selectedDivision, selectedGender, minAgeValue, maxAgeValue);
      const sparringCategory: Category = {
        id: sparringCategoryId,
        name: categoryName,
        division: selectedDivision,
        gender: selectedGender,
        minAge: minAgeValue,
        maxAge: maxAgeValue,
        participantIds: sparringParticipants.map((p) => p.id),
        numPools,
        type: 'sparring',
      };
      newCategories.push(sparringCategory);

      // Update participants with sparring category ID
      sparringParticipants.forEach((sp) => {
        const index = updatedParticipants.findIndex((p) => p.id === sp.id);
        if (index !== -1) {
          updatedParticipants[index] = { 
            ...updatedParticipants[index], 
            sparringCategoryId
          };
        }
      });
    }

    setCategories([...categories, ...newCategories]);
    
    // Automatically assign participants to pools and order them
    let finalParticipants = [...updatedParticipants];
    for (const newCategory of newCategories) {
      finalParticipants = autoAssignAndOrderCategory(newCategory, finalParticipants);
    }
    setParticipants(finalParticipants);

    // Reset form
    setSelectedGender('mixed');
    setSelectedAges(new Set());
    setNumPools(1);
  };

  const handleRemoveCategory = (categoryId: string) => {
    // Remove the selected category and any matching opposite category(s)
    const categoryToRemove = categories.find((c) => c.id === categoryId);
    if (!categoryToRemove) return;

    // Find all categories that match the same name/division/gender/age range (both/forms/sparring variants)
    const categoriesToRemove = categories.filter((c) =>
      c.name === categoryToRemove.name &&
      c.division === categoryToRemove.division &&
      c.gender === categoryToRemove.gender &&
      c.minAge === categoryToRemove.minAge &&
      c.maxAge === categoryToRemove.maxAge
    );

    const removeIds = new Set(categoriesToRemove.map(c => c.id));

    // Update categories list by removing all matching categories
    setCategories(categories.filter((c) => !removeIds.has(c.id)));

    // Clear any category IDs on participants that referenced any of these removed categories
    const updatedParticipants = participants.map((p) => {
      let updated = { ...p };
      if (p.formsCategoryId && removeIds.has(p.formsCategoryId)) {
        updated.formsCategoryId = undefined;
      }
      if (p.sparringCategoryId && removeIds.has(p.sparringCategoryId)) {
        updated.sparringCategoryId = undefined;
      }
      return updated;
    });
    setParticipants(updatedParticipants);
  };

  const handleRingsChange = (categoryId: string, rings: number) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    // Update the current category
    updateCategory(categoryId, { numPools: rings });

    // Find the opposite type category with matching criteria
    // (Forms and Sparring use the same physical rings sequentially)
    const oppositeType = category.type === 'forms' ? 'sparring' : 'forms';
    const oppositeCategory = categories.find(
      (c) =>
        c.type === oppositeType &&
        c.division === category.division &&
        c.gender === category.gender &&
        c.minAge === category.minAge &&
        c.maxAge === category.maxAge
    );

    // Sync the opposite category's ring count
    if (oppositeCategory) {
      updateCategory(oppositeCategory.id, { numPools: rings });
    }

    // Automatically reassign and reorder participants for the updated category
    const updatedCategory = { ...category, numPools: rings };
    let finalParticipants = autoAssignAndOrderCategory(updatedCategory, participants);
    
    // Also update the opposite category if it exists
    if (oppositeCategory) {
      const updatedOppositeCategory = { ...oppositeCategory, numPools: rings };
      finalParticipants = autoAssignAndOrderCategory(updatedOppositeCategory, finalParticipants);
    }
    
    setParticipants(finalParticipants);
  };

  const handleReassignParticipants = () => {
    if (categories.length === 0) {
      alert('No categories to reassign to. Please create categories first.');
      return;
    }

    const confirmed = window.confirm(
      'This will reset all participant pool assignments and re-run auto-assignment for all categories. Are you sure?'
    );
    if (!confirmed) return;

    // Start with cleared pool assignments
    let reassignedParticipants = participants.map((p) => ({
      ...p,
      formsPool: undefined,
      formsRankOrder: undefined,
      sparringPool: undefined,
      sparringRankOrder: undefined,
      sparringAltRing: '',
      physicalRingId: undefined,
    }));

    // Re-populate each category's participant list and reassign
    const updatedCategories = categories.map((category) => {
      // Find participants that match this category's criteria
      const categoryParticipants = reassignedParticipants.filter((p) => {
        const genderMatch = p.gender.toLowerCase() === category.gender || category.gender === 'mixed';
        const divisionMatch = category.type === 'forms' 
          ? getEffectiveDivision(p, 'forms') === category.division
          : getEffectiveDivision(p, 'sparring') === category.division;
        const ageMatch = p.age >= category.minAge && p.age <= category.maxAge;
        const competingMatch = category.type === 'forms' ? p.competingForms : p.competingSparring;
        
        return genderMatch && divisionMatch && ageMatch && competingMatch;
      });

      return {
        ...category,
        participantIds: categoryParticipants.map((p) => p.id),
      };
    });

    // Update participant category IDs to match new categories
    reassignedParticipants = reassignedParticipants.map((p) => {
      let updated = { ...p };
      
      // Find forms category for this participant
      const formsCategory = updatedCategories.find(
        (c) => c.type === 'forms' && c.participantIds.includes(p.id)
      );
      if (formsCategory) {
        updated.formsCategoryId = formsCategory.id;
      } else {
        updated.formsCategoryId = undefined;
      }

      // Find sparring category for this participant
      const sparringCategory = updatedCategories.find(
        (c) => c.type === 'sparring' && c.participantIds.includes(p.id)
      );
      if (sparringCategory) {
        updated.sparringCategoryId = sparringCategory.id;
      } else {
        updated.sparringCategoryId = undefined;
      }
      
      return updated;
    });

    // Update categories with new participant lists
    setCategories(updatedCategories);

    // Auto-assign and order participants for each category
    let finalParticipants = reassignedParticipants;
    for (const category of updatedCategories) {
      finalParticipants = autoAssignAndOrderCategory(category, finalParticipants);
    }

    setParticipants(finalParticipants);
    alert('Participants have been reassigned to all categories.');
  };

  // Calculate ring totals per division (only count Forms rings since Sparring uses same physical rings)
  const ringTotalsByDivision = useMemo(() => {
    const totals: { [division: string]: number } = {};
    categories.forEach((category) => {
      // Only count Forms categories - Sparring will use the same physical rings after Forms
      if (category.type === 'forms') {
        if (!totals[category.division]) {
          totals[category.division] = 0;
        }
        totals[category.division] += category.numPools;
      }
    });
    return totals;
  }, [categories]);

  return (
    <div className="card">
      <h2 className="card-title">Category Management</h2>

      <div className="grid grid-2">
        {/* Create Category Form */}
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Create Category</h3>

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
                border: '1px solid var(--border-color)', 
                padding: '10px',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-secondary)'
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
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>No participants in this division</p>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Select a division first</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Pools Needed</label>
            <input
              type="number"
              className="form-control"
              value={numPools}
              onChange={(e) => setNumPools(parseInt(e.target.value) || 1)}
              min={1}
              max={10}
              style={{ width: '100px' }}
            />
          </div>

          {selectedDivision && (
            <div className="info" style={{ marginBottom: '15px' }}>
              <p style={{ margin: '5px 0' }}>
                <strong>Matching participants:</strong> {participantCounts.matching}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Unassigned participants:</strong> {participantCounts.unassignedInDivision} / {participantCounts.totalInDivision}
              </p>
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={(e) => {
              console.log('Add Category clicked', { 
                selectedDivision, 
                selectedAgesSize: selectedAges.size, 
                matching: participantCounts.matching,
                disabled: !selectedDivision || selectedAges.size === 0 || participantCounts.matching === 0
              });
              handleAddCategory();
            }}
            disabled={!selectedDivision || selectedAges.size === 0 || participantCounts.matching === 0}
          >
            Add Category
          </button>
        </div>

        {/* Categories List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', margin: 0 }}>
              Categories ({categories.length})
            </h3>
            {categories.length > 0 && (
              <button
                className="btn btn-warning"
                onClick={handleReassignParticipants}
                title="Reset all participant pool assignments but keep category definitions"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Reassign Participants
              </button>
            )}
          </div>

          {categories.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Division</th>
                    <th>Gender</th>
                    <th>Age</th>
                    <th>Participants</th>
                    <th>Pools</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => {
                    // Find matching category of opposite type
                    const oppositeCategory = categories.find(c => 
                      c.id !== category.id &&
                      c.name === category.name &&
                      c.division === category.division &&
                      c.type !== category.type
                    );
                    
                    // Only show forms categories or sparring-only categories (avoid duplicates)
                    if (category.type === 'sparring' && oppositeCategory) {
                      return null;
                    }

                    // Combine participant counts from both forms and sparring
                    const allParticipantIds = new Set([
                      ...category.participantIds,
                      ...(oppositeCategory?.participantIds || [])
                    ]);
                    const participantCount = allParticipantIds.size;
                    
                    return (
                      <tr key={category.id}>
                        <td>{category.division}</td>
                        <td style={{ textTransform: 'capitalize' }}>{category.gender}</td>
                        <td>
                          {category.maxAge === 999 ? `${category.minAge}+` : `${category.minAge}-${category.maxAge}`}
                        </td>
                        <td style={{ color: participantCount > 0 ? '#007bff' : '#999' }}>
                          {participantCount > 0 ? participantCount : '-'}
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={category.numPools}
                            onChange={(e) =>
                              handleRingsChange(category.id, parseInt(e.target.value) || 1)
                            }
                            style={{ width: '50px', padding: '4px' }}
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleRemoveCategory(category.id)}
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
              <p>No categories created yet. Use the form on the left to create categories.</p>
            </div>
          )}

          {/* Ring Totals by Division */}
          {Object.keys(ringTotalsByDivision).length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>
                Pools Needed by Division
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                (Sparring will use the same physical rings after Forms are completed)
              </p>
              <div style={{ 
                background: 'var(--bg-secondary)', 
                padding: '15px', 
                borderRadius: '4px',
                border: '1px solid var(--border-color)'
              }}>
                {Object.entries(ringTotalsByDivision)
                  .sort(([divA], [divB]) => {
                    const orderA = config.divisions.find(d => d.name === divA)?.order ?? DEFAULT_DIVISION_ORDER;
                    const orderB = config.divisions.find(d => d.name === divB)?.order ?? DEFAULT_DIVISION_ORDER;
                    return orderA - orderB;
                  })
                  .map(([division, total]) => (
                    <div 
                      key={division} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{division}:</span>
                      <span style={{ fontWeight: 'bold' }}>
                        {total} pools
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryManagement;
