import React, { useMemo, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { useTournamentStore } from '../store/tournamentStore';
import { computeCompetitionRings } from '../utils/computeRings';
import { generateFormsScoringSheets } from '../utils/pdfGenerators/formsScoringSheet';
import { generateSparringBrackets } from '../utils/pdfGenerators/sparringBracket';
import { formatPoolNameForDisplay, isRingAffected, isRingAffectedSimple } from '../utils/ringNameFormatter';
import { CompetitionRing } from '../types/tournament';
import { DEFAULT_DIVISION_ORDER } from '../utils/constants';

interface RingPair {
  categoryPoolName: string;
  formsRing?: CompetitionRing;
  sparringRing?: CompetitionRing;
  physicalRingName?: string;
  division: string;
}

interface TournamentDayProps {
  globalDivision?: string;
}

function TournamentDay({ globalDivision }: TournamentDayProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const config = useTournamentStore((state) => state.config);
  const checkpoints = useTournamentStore((state) => state.checkpoints);
  const diffCheckpoint = useTournamentStore((state) => state.diffCheckpoint);

  const [selectedDivision, setSelectedDivision] = useState<string>(globalDivision || 'all');
  const [printing, setPrinting] = useState<string | null>(null);

  // Sync with global division when it changes
  useEffect(() => {
    if (globalDivision) {
      setSelectedDivision(globalDivision);
    }
  }, [globalDivision]);

  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
  );

  // Get the latest checkpoint
  const latestCheckpoint = useMemo(() => {
    if (checkpoints.length === 0) return null;
    return [...checkpoints].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  }, [checkpoints]);

  // Compute which rings have changed since latest checkpoint
  const changedRings = useMemo(() => {
    if (!latestCheckpoint) return new Set<string>();
    const diff = diffCheckpoint(latestCheckpoint.id);
    if (!diff) return new Set<string>();
    return diff.ringsAffected;
  }, [latestCheckpoint, diffCheckpoint]);

  // Group Forms and Sparring rings by their ring name AND division AND physical ring
  const ringPairs = useMemo(() => {
    const pairMap = new Map<string, RingPair>();
    
    competitionRings.forEach(ring => {
      const ringName = ring.name || `${ring.division} Ring`;
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

    // Sort by division order, then by physical ring name
    return pairs.sort((a, b) => {
      // First sort by division order
      const aDivOrder = config.divisions.find(d => d.name === a.division)?.order ?? DEFAULT_DIVISION_ORDER;
      const bDivOrder = config.divisions.find(d => d.name === b.division)?.order ?? DEFAULT_DIVISION_ORDER;
      if (aDivOrder !== bDivOrder) return aDivOrder - bDivOrder;

      // Then sort by physical ring name
      if (a.physicalRingName && b.physicalRingName) {
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

  // Get unique divisions for filter
  const divisions = useMemo(() => {
    const divSet = new Set<string>();
    ringPairs.forEach(pair => {
      if (pair.division) divSet.add(pair.division);
    });
    // Sort by division order from config
    return Array.from(divSet).sort((a, b) => {
      const aOrder = config.divisions.find(d => d.name === a)?.order ?? DEFAULT_DIVISION_ORDER;
      const bOrder = config.divisions.find(d => d.name === b)?.order ?? DEFAULT_DIVISION_ORDER;
      return aOrder - bOrder;
    });
  }, [ringPairs, config.divisions]);

  // Filter ring pairs by selected division
  const filteredRingPairs = useMemo(() => {
    if (selectedDivision === 'all') return ringPairs;
    return ringPairs.filter(pair => pair.division === selectedDivision);
  }, [ringPairs, selectedDivision]);

  // Count changed rings
  const changedRingsCount = useMemo(() => {
    return filteredRingPairs.filter(pair => {
      const formsChanged = pair.formsRing && isRingAffectedSimple(pair.categoryPoolName, 'forms', changedRings);
      const sparringChanged = pair.sparringRing && isRingAffectedSimple(pair.categoryPoolName, 'sparring', changedRings);
      return formsChanged || sparringChanged;
    }).length;
  }, [filteredRingPairs, changedRings]);

  // Count changed rings by type (forms vs sparring)
  const changedRingsCounts = useMemo(() => {
    const changedFormsCount = competitionRings
      .filter(ring => ring.type === 'forms' && 
              isRingAffected(ring.name || ring.division, 'forms', changedRings).isAffected &&
              (selectedDivision === 'all' || ring.division === selectedDivision))
      .length;
    const changedSparringCount = competitionRings
      .filter(ring => ring.type === 'sparring' && 
              isRingAffected(ring.name || ring.division, 'sparring', changedRings).isAffected &&
              (selectedDivision === 'all' || ring.division === selectedDivision))
      .length;
    return { forms: changedFormsCount, sparring: changedSparringCount };
  }, [competitionRings, changedRings, selectedDivision]);

  // Print a single ring's forms
  const handlePrintForms = async (ring: CompetitionRing) => {
    setPrinting(`forms-${ring.id}`);
    try {
      const pdf = generateFormsScoringSheets(
        participants,
        [ring],
        config.physicalRings,
        ring.division,
        config.watermarkImage,
        physicalRingMappings
      );
      
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
        });
      } else {
        URL.revokeObjectURL(pdfUrl);
        alert('Popup blocked. Please allow popups for printing.');
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPrinting(null);
    }
  };

  // Print a single ring's sparring bracket
  const handlePrintSparring = async (ring: CompetitionRing) => {
    setPrinting(`sparring-${ring.id}`);
    try {
      const pdf = generateSparringBrackets(
        participants,
        [ring],
        config.physicalRings,
        ring.division,
        config.watermarkImage,
        physicalRingMappings
      );
      
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
        });
      } else {
        URL.revokeObjectURL(pdfUrl);
        alert('Popup blocked. Please allow popups for printing.');
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPrinting(null);
    }
  };

  // Print all changed rings combined into one PDF
  const handlePrintAllChanged = async () => {
    if (changedRings.size === 0) {
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

  // Get division abbreviation
  const getDivisionAbbr = (division: string) => {
    const div = config.divisions.find(d => d.name === division);
    return div?.abbreviation || division.substring(0, 4).toUpperCase();
  };

  return (
    <div style={{ padding: '20px', width: 'fit-content', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Tournament Day Dashboard</h2>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* Division filter */}
          <div>
            <label style={{ marginRight: '8px' }}>Division:</label>
            <select 
              value={selectedDivision} 
              onChange={(e) => setSelectedDivision(e.target.value)}
              style={{ padding: '5px 10px' }}
            >
              <option value="all">All Divisions</option>
              {divisions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
          </div>

          {/* Print all changed button */}
          {latestCheckpoint && (
            <button
              onClick={handlePrintAllChanged}
              disabled={printing !== null || changedRingsCount === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: changedRingsCount > 0 ? '#dc3545' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: changedRingsCount > 0 ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
              }}
            >
              🖨️ Print All {selectedDivision !== 'all' ? `${selectedDivision} ` : ''}Changed ({changedRingsCounts.forms} forms, {changedRingsCounts.sparring} sparring)
            </button>
          )}
        </div>
      </div>

      {/* Checkpoint info */}
      {latestCheckpoint ? (
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px 15px', 
          backgroundColor: 'var(--bg-secondary)',
          border: changedRingsCount > 0 ? '2px solid #dc3545' : '2px solid #28a745',
          borderRadius: '4px',
          fontSize: '14px',
          color: 'var(--text-primary)'
        }}>
          {changedRingsCount > 0 ? (
            <>
              ⚠️ <strong>{changedRingsCount} ring{changedRingsCount !== 1 ? 's' : ''}</strong> changed since checkpoint "{latestCheckpoint.name}" 
              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                ({new Date(latestCheckpoint.timestamp).toLocaleString()})
              </span>
            </>
          ) : (
            <>
              ✅ No changes since checkpoint "{latestCheckpoint.name}"
              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                ({new Date(latestCheckpoint.timestamp).toLocaleString()})
              </span>
            </>
          )}
        </div>
      ) : (
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px 15px', 
          backgroundColor: '#f8d7da',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          ⚠️ No checkpoint saved. Create a checkpoint in the Checkpoints tab to track changes.
        </div>
      )}

      {/* Ring grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '15px' 
      }}>
        {filteredRingPairs.map((pair, idx) => {
          const formsChanged = pair.formsRing && isRingAffectedSimple(pair.categoryPoolName, 'forms', changedRings);
          const sparringChanged = pair.sparringRing && isRingAffectedSimple(pair.categoryPoolName, 'sparring', changedRings);
          const isChanged = formsChanged || sparringChanged;
          const formsCount = pair.formsRing?.participantIds.length || 0;
          const sparringCount = pair.sparringRing?.participantIds.length || 0;

          return (
            <div 
              key={idx}
              style={{
                border: isChanged ? '2px solid #dc3545' : '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: isChanged ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                padding: '15px',
                position: 'relative',
              }}
            >
              {/* Changed badge */}
              {isChanged && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}>
                  CHANGED
                </div>
              )}

              {/* Ring header */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: 'var(--text-primary)'
                }}>
                  {pair.physicalRingName || 'Unassigned'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {getDivisionAbbr(pair.division)} • {formatPoolNameForDisplay(pair.categoryPoolName)}
                </div>
              </div>

              {/* Participant counts */}
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                marginBottom: '12px',
                fontSize: '13px'
              }}>
                <div>
                  <span style={{ color: '#0056b3' }}>Forms:</span> {formsCount}
                </div>
                <div>
                  <span style={{ color: '#dc3545' }}>Sparring:</span> {sparringCount}
                </div>
              </div>

              {/* Print buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {pair.formsRing && (
                  <button
                    onClick={() => handlePrintForms(pair.formsRing!)}
                    disabled={printing !== null}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#0056b3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: printing ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: printing === `forms-${pair.formsRing.id}` ? 0.7 : 1,
                    }}
                  >
                    {printing === `forms-${pair.formsRing.id}` ? '...' : '🖨️ Forms'}
                  </button>
                )}
                {pair.sparringRing && (
                  <button
                    onClick={() => handlePrintSparring(pair.sparringRing!)}
                    disabled={printing !== null}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: printing ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: printing === `sparring-${pair.sparringRing.id}` ? 0.7 : 1,
                    }}
                  >
                    {printing === `sparring-${pair.sparringRing.id}` ? '...' : '🖨️ Sparring'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredRingPairs.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px'
        }}>
          No rings found. Make sure participants are assigned to categories and rings.
        </div>
      )}
    </div>
  );
}

export default TournamentDay;
