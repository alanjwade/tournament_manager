import React, { useState, useMemo, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { assignRingsForAllCategories, mapSparringToForms } from '../utils/ringAssignment';
import { CompetitionRing } from '../types/tournament';
import { computeCompetitionRings } from '../utils/computeRings';

interface RingManagementProps {
  globalDivision?: string;
}

function RingManagement({ globalDivision }: RingManagementProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const config = useTournamentStore((state) => state.config);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const setCompetitionRings = useTournamentStore((state) => state.setCompetitionRings);

  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
  );

  const [selectedDivision, setSelectedDivision] = useState<string>(globalDivision && globalDivision !== 'all' ? globalDivision : 'Black Belt');
  const [numPhysicalRings, setNumPhysicalRings] = useState<number>(14);

  // Sync with global division when it changes
  useEffect(() => {
    if (globalDivision && globalDivision !== 'all') {
      setSelectedDivision(globalDivision);
    }
  }, [globalDivision]);

  // Helper function to sort categories by age, then gender
  const sortCategories = (categoryList: typeof categories) => {
    return categoryList.sort((a, b) => {
      // First, sort by minimum age
      if (a.minAge !== b.minAge) {
        return a.minAge - b.minAge;
      }
      
      // If same age, sort by gender: mixed, female, male
      const genderOrder = { mixed: 0, female: 1, male: 2 };
      return genderOrder[a.gender] - genderOrder[b.gender];
    });
  };

  // Get forms categories for selected division
  const formsCategories = useMemo(() => {
    if (!selectedDivision) return [];
    const filtered = categories.filter(c => c.division === selectedDivision && c.type === 'forms');
    return sortCategories([...filtered]);
  }, [categories, selectedDivision]);

  // Get sparring categories for selected division
  const sparringCategories = useMemo(() => {
    if (!selectedDivision) return [];
    const filtered = categories.filter(c => c.division === selectedDivision && c.type === 'sparring');
    return sortCategories([...filtered]);
  }, [categories, selectedDivision]);

  // Calculate total rings needed for forms
  const formsRingsNeeded = useMemo(() => {
    return formsCategories.reduce((sum, category) => sum + category.numPools, 0);
  }, [formsCategories]);

  // Calculate total rings needed for sparring
  const sparringRingsNeeded = useMemo(() => {
    return sparringCategories.reduce((sum, category) => sum + category.numPools, 0);
  }, [sparringCategories]);

  // Get pools for a specific category and type
  const getCategoryRings = (categoryId: string, type: 'forms' | 'sparring'): CompetitionRing[] => {
    return competitionRings.filter(ring => 
      ring.categoryId === categoryId && 
      ring.type === type
    ).sort((a, b) => {
      // Sort by ring name (R1, R2, R3, etc.)
      const aNum = parseInt(a.name?.split('_R')[1] || '0');
      const bNum = parseInt(b.name?.split('_R')[1] || '0');
      return aNum - bNum;
    });
  };

  const handleAssignRings = (type: 'forms' | 'sparring') => {
    console.log('=== handleAssignRings called ===');
    console.log('Selected division:', selectedDivision);
    console.log('Type:', type);
    
    if (!selectedDivision) {
      alert('Please select a division first');
      return;
    }

    // We only allow a single unified assign flow: forms then map sparring
    const targetCategories = formsCategories;
    console.log('Forms categories:', targetCategories);
    console.log('Forms categories length:', targetCategories.length);

    if (targetCategories.length === 0) {
      alert(`No forms categories found for ${selectedDivision}`);
      return;
    }

    // Check if participants competing in sparring have sparring category assignments
    const sparringParticipants = participants.filter(p => p.competingSparring);
    const sparringWithCohorts = participants.filter(p => p.competingSparring && p.sparringCategoryId);
    
    if (sparringParticipants.length > 0 && sparringWithCohorts.length === 0) {
      alert(
        `⚠️ Warning: ${sparringParticipants.length} participants are marked as competing in sparring, but NONE are assigned to sparring categories!\n\n` +
        `Sparring rings will NOT be created.\n\n` +
        `To fix this:\n` +
        `1. Go to the "Category Management" tab\n` +
        `2. Create or verify sparring categories exist\n` +
        `3. Assign participants to sparring categories\n` +
        `4. Then return here to assign rings\n\n` +
        `Do you want to continue with Forms ring assignment only?`
      );
      // Don't return - let them continue with forms if they want
    } else if (sparringParticipants.length > 0 && sparringWithCohorts.length < sparringParticipants.length) {
      const unassigned = sparringParticipants.length - sparringWithCohorts.length;
      alert(
        `⚠️ Warning: ${unassigned} of ${sparringParticipants.length} sparring participants are NOT assigned to sparring categories.\n\n` +
        `These participants will not be included in sparring rings.\n\n` +
        `Consider going to Category Management to assign them before continuing.`
      );
    }

    console.log('About to show confirm dialog');
    if (!confirm(`This will assign Forms rings for ${selectedDivision} and map Sparring participants into the same rings. Continue?`)) {
      console.log('User cancelled');
      return;
    }

    console.log('User confirmed, proceeding with ring assignment');
    try {
      // Create temporary physical rings based on user input
      const maxRingsNeeded = Math.max(...targetCategories.map(c => c.numPools), numPhysicalRings);
      console.log('Max rings needed:', maxRingsNeeded);
      console.log('Num physical rings:', numPhysicalRings);
      
      const tempPhysicalRings = Array.from({ length: maxRingsNeeded }, (_, i) => ({
        id: `temp-ring-${i}`,
        name: `Ring ${i + 1}`,
        color: config.physicalRings[i % config.physicalRings.length]?.color || `Color ${i + 1}`
      }));
      console.log('Created temp physical rings:', tempPhysicalRings.length);

      // Assign forms rings
      const formsResult = assignRingsForAllCategories(
        categories,
        participants,
        tempPhysicalRings,
        'forms',
        selectedDivision
      );

      // Now map sparring participants into the same physical rings
      const sparringResult = mapSparringToForms(categories, formsResult.updatedParticipants, formsResult.competitionRings);

      // Merge forms + sparring competition rings with any other existing rings from other divisions
      const otherRings = competitionRings.filter((r) => r.division !== selectedDivision);
      setCompetitionRings([...otherRings, ...formsResult.competitionRings, ...sparringResult.competitionRings]);

      // Update participants: apply updates from forms then sparring mapping
      setParticipants(sparringResult.updatedParticipants);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error assigning rings');
    }
  };

  const filteredRings = selectedDivision
    ? competitionRings.filter((r) => r.division === selectedDivision)
    : competitionRings;

  const formsRings = filteredRings.filter((r) => r.type === 'forms');
  const sparringRings = filteredRings.filter((r) => r.type === 'sparring');

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <h2 className="card-title" style={{ flexShrink: 0 }}>Ring Management</h2>

      {competitionRings.length > 0 && (
        <div className="warning mb-2" style={{ flexShrink: 0 }}>
          <strong>Warning:</strong> Re-running ring assignment will destroy any
          previous assignments and orderings.
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
        <div className="grid grid-2">
        {/* Division Selection */}
        <div>
          <div className="form-group">
            <label className="form-label">Select Division</label>
            <select
              className="form-control"
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setNumPhysicalRings(14); // Reset when division changes
              }}
            >
              <option value="">Choose a division...</option>
              {config.divisions.map((div) => (
                <option key={div.name} value={div.name}>
                  {div.name}
                </option>
              ))}
            </select>
          </div>

          {selectedDivision && (
            <div className="form-group">
              <label className="form-label">Number of Physical Rings Available</label>
              <input
                type="number"
                className="form-control"
                min={1}
                max={14}
                value={numPhysicalRings}
                onChange={(e) => setNumPhysicalRings(parseInt(e.target.value) || 1)}
                style={{ fontSize: '16px', padding: '8px' }}
              />
              <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                Maximum 14 rings per division
              </small>
            </div>
          )}
        </div>

      </div>

      {/* Forms Categories Section */}
      {selectedDivision && (
        <div className="grid grid-2 mt-2">
          {/* Forms + Sparring (single assign) */}
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>
              Assign Rings
            </h3>
            <button
              className="btn btn-primary mb-1"
              onClick={() => handleAssignRings('forms')}
              disabled={formsCategories.length === 0 || formsRingsNeeded === 0 || formsRingsNeeded > 14}
            >
              Assign Rings
            </button>

            {formsRings.length > 0 && (
              <div className="mt-1">
                <p style={{ fontSize: '14px', marginBottom: '10px' }}>
                  {formsRings.length} forms rings assigned
                </p>
              </div>
            )}

            {/* Forms Categories Table */}
            {formsCategories.length > 0 && (
              <>
                <h4 style={{ fontSize: '15px', marginTop: '20px', marginBottom: '10px' }}>
                  Forms Categories in {selectedDivision} ({formsCategories.length})
                </h4>
                <div style={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '10px',
                  background: '#f8f9fa'
                }}>
                  <table style={{ width: '100%', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Category</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Participants</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Rings Needed</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Assigned Rings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formsCategories.map(category => {
                        const rings = getCategoryRings(category.id, 'forms');
                        
                        return (
                          <tr key={category.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '8px' }}>{category.name}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{category.participantIds.length}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{category.numPools}</td>
                            <td style={{ padding: '8px', fontSize: '12px' }}>
                              {rings.length > 0 ? (
                                <span style={{ color: '#007bff' }}>
                                  {rings.map(r => r.name).join(', ')}
                                </span>
                              ) : (
                                <span style={{ color: '#999', fontStyle: 'italic' }}>Not assigned</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #dee2e6', fontWeight: 'bold' }}>
                        <td style={{ padding: '8px' }}>TOTAL</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {formsCategories.reduce((sum, c) => sum + c.participantIds.length, 0)}
                        </td>
                        <td style={{ 
                          padding: '8px', 
                          textAlign: 'center',
                          color: formsRingsNeeded > 14 ? '#dc3545' : formsRingsNeeded > numPhysicalRings ? '#ffc107' : '#28a745'
                        }}>
                          {formsRingsNeeded}
                          {formsRingsNeeded > 14 && ' ⚠️'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {formsRingsNeeded > numPhysicalRings && (
                  <div className="warning" style={{ marginTop: '10px', fontSize: '13px' }}>
                    ⚠️ Total rings needed ({formsRingsNeeded}) exceeds physical rings available ({numPhysicalRings})
                  </div>
                )}
                {formsRingsNeeded > 14 && (
                  <div className="error" style={{ marginTop: '10px', fontSize: '13px' }}>
                    🛑 Total rings needed ({formsRingsNeeded}) exceeds maximum of 14 rings per division
                  </div>
                )}
              </>
            )}
            {formsCategories.length === 0 && (
              <div className="info" style={{ marginTop: '10px' }}>
                <p>No forms categories created for {selectedDivision} yet.</p>
              </div>
            )}
          </div>

          {/* Sparring (readout) */}
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>
              Sparring Rings
            </h3>
            <div style={{ marginBottom: '8px', color: '#666' }}>
              Sparring participants will be placed into the same physical rings assigned to Forms
              when you click "Assign Rings". Participants not competing in sparring will not be assigned.
            </div>

            {sparringRings.length > 0 && (
              <div className="mt-1">
                <p style={{ fontSize: '14px', marginBottom: '10px' }}>
                  {sparringRings.length} sparring rings assigned
                </p>
              </div>
            )}

            {/* Sparring Categories Table */}
            {sparringCategories.length > 0 && (
              <>
                <h4 style={{ fontSize: '15px', marginTop: '20px', marginBottom: '10px' }}>
                  Sparring Categories in {selectedDivision} ({sparringCategories.length})
                </h4>
                <div style={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '10px',
                  background: '#f8f9fa'
                }}>
                  <table style={{ width: '100%', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Category</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Participants</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Rings Needed</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Assigned Rings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sparringCategories.map(category => {
                        const rings = getCategoryRings(category.id, 'sparring');
                        
                        return (
                          <tr key={category.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '8px' }}>{category.name}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{category.participantIds.length}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{category.numPools}</td>
                            <td style={{ padding: '8px', fontSize: '12px' }}>
                              {rings.length > 0 ? (
                                <span style={{ color: '#28a745' }}>
                                  {rings.map(r => r.name).join(', ')}
                                </span>
                              ) : (
                                <span style={{ color: '#999', fontStyle: 'italic' }}>Not assigned</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #dee2e6', fontWeight: 'bold' }}>
                        <td style={{ padding: '8px' }}>TOTAL</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {sparringCategories.reduce((sum, c) => sum + c.participantIds.length, 0)}
                        </td>
                        <td style={{ 
                          padding: '8px', 
                          textAlign: 'center',
                          color: sparringRingsNeeded > 14 ? '#dc3545' : sparringRingsNeeded > numPhysicalRings ? '#ffc107' : '#28a745'
                        }}>
                          {sparringRingsNeeded}
                          {sparringRingsNeeded > 14 && ' ⚠️'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {sparringRingsNeeded > numPhysicalRings && (
                  <div className="warning" style={{ marginTop: '10px', fontSize: '13px' }}>
                    ⚠️ Total rings needed ({sparringRingsNeeded}) exceeds physical rings available ({numPhysicalRings})
                  </div>
                )}
                {sparringRingsNeeded > 14 && (
                  <div className="error" style={{ marginTop: '10px', fontSize: '13px' }}>
                    🛑 Total rings needed ({sparringRingsNeeded}) exceeds maximum of 14 rings per division
                  </div>
                )}
              </>
            )}
            {sparringCategories.length === 0 && (
              <div className="info" style={{ marginTop: '10px' }}>
                <p>No sparring categories created for {selectedDivision} yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default RingManagement;
