import React, { useState, useMemo, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { generateNameTags } from '../utils/pdfGenerators/nameTags';
import { generateCheckInSheet } from '../utils/pdfGenerators/checkInSheet';
import { generateFormsScoringSheets } from '../utils/pdfGenerators/formsScoringSheet';
import { generateSparringBrackets } from '../utils/pdfGenerators/sparringBracket';
import { generateRingOverviewPDF } from '../utils/pdfGenerators/ringOverview';
import { computeCompetitionRings } from '../utils/computeRings';
import { CompetitionRing } from '../types/tournament';
import logoImage from '../assets/logos/logo_orig_dark_letters.png';

interface PDFExportProps {
  globalDivision?: string;
}

function PDFExport({ globalDivision }: PDFExportProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const config = useTournamentStore((state) => state.config);
  const checkpoints = useTournamentStore((state) => state.checkpoints);
  const diffCheckpoint = useTournamentStore((state) => state.diffCheckpoint);
  
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  
  // Load logo as data URL
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setLogoDataUrl(canvas.toDataURL('image/png'));
      }
    };
    img.src = logoImage;
  }, []);
  
  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
  );
  
  const [selectedDivision, setSelectedDivision] = useState<string>(
    globalDivision && globalDivision !== 'all' ? globalDivision : 'Black Belt'
  );
  const [exporting, setExporting] = useState(false);
  
  // State for forms/sparring advanced options
  const [formsExpanded, setFormsExpanded] = useState(false);
  const [sparringExpanded, setSparringExpanded] = useState(false);
  const [selectedFormsDivision, setSelectedFormsDivision] = useState<string>('');
  const [selectedSparringDivision, setSelectedSparringDivision] = useState<string>('');
  const [selectedFormsRings, setSelectedFormsRings] = useState<Set<string>>(new Set());
  const [selectedSparringRings, setSelectedSparringRings] = useState<Set<string>>(new Set());
  const [selectedFormsCheckpoint, setSelectedFormsCheckpoint] = useState<string>('');
  const [selectedSparringCheckpoint, setSelectedSparringCheckpoint] = useState<string>('');
  
  // Sync with global division when it changes
  useEffect(() => {
    if (globalDivision && globalDivision !== 'all') {
      setSelectedDivision(globalDivision);
    }
  }, [globalDivision]);
  
  // Get sorted checkpoints (latest first)
  const sortedCheckpoints = useMemo(() => {
    return [...checkpoints].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [checkpoints]);
  
  // Set default checkpoint to latest when checkpoints available
  useEffect(() => {
    if (sortedCheckpoints.length > 0 && !selectedFormsCheckpoint) {
      setSelectedFormsCheckpoint(sortedCheckpoints[0].id);
    }
  }, [sortedCheckpoints]);
  
  useEffect(() => {
    if (sortedCheckpoints.length > 0 && !selectedSparringCheckpoint) {
      setSelectedSparringCheckpoint(sortedCheckpoints[0].id);
    }
  }, [sortedCheckpoints]);
  
  // Get available rings for selected divisions
  const availableFormsRings = useMemo(() => {
    if (!selectedFormsDivision) return [];
    return competitionRings
      .filter(r => r.division === selectedFormsDivision && r.type === 'forms')
      .sort((a, b) => {
        const getPhysicalRingNum = (ring: CompetitionRing) => {
          const mapping = physicalRingMappings.find(m => m.cohortRingName === ring.name);
          if (!mapping) return 999;
          const match = mapping.physicalRingName.match(/(\d+)([a-z]?)/i);
          if (!match) return 999;
          return parseInt(match[1]) * 100 + (match[2] ? match[2].charCodeAt(0) : 0);
        };
        return getPhysicalRingNum(a) - getPhysicalRingNum(b);
      });
  }, [selectedFormsDivision, competitionRings, physicalRingMappings]);
  
  const availableSparringRings = useMemo(() => {
    if (!selectedSparringDivision) return [];
    return competitionRings
      .filter(r => r.division === selectedSparringDivision && r.type === 'sparring')
      .sort((a, b) => {
        const getPhysicalRingNum = (ring: CompetitionRing) => {
          const mapping = physicalRingMappings.find(m => m.cohortRingName === ring.name);
          if (!mapping) return 999;
          const match = mapping.physicalRingName.match(/(\d+)([a-z]?)/i);
          if (!match) return 999;
          return parseInt(match[1]) * 100 + (match[2] ? match[2].charCodeAt(0) : 0);
        };
        return getPhysicalRingNum(a) - getPhysicalRingNum(b);
      });
  }, [selectedSparringDivision, competitionRings, physicalRingMappings]);
  
  // Update selected rings when division changes
  useEffect(() => {
    if (selectedFormsDivision) {
      setSelectedFormsRings(new Set(availableFormsRings.map(r => r.id)));
    }
  }, [selectedFormsDivision, availableFormsRings]);
  
  useEffect(() => {
    if (selectedSparringDivision) {
      setSelectedSparringRings(new Set(availableSparringRings.map(r => r.id)));
    }
  }, [selectedSparringDivision, availableSparringRings]);

  // Select rings that changed since checkpoint
  const handleSelectFormsDiff = () => {
    if (!selectedFormsCheckpoint) {
      alert('Please select a checkpoint');
      return;
    }
    
    const diff = diffCheckpoint(selectedFormsCheckpoint);
    if (!diff) {
      alert('Failed to compute diff');
      return;
    }
    
    // Get affected ring names for the selected division
    const affectedRings = new Set<string>();
    diff.ringsAffected.forEach(ringName => {
      // Find corresponding competition ring
      const ring = availableFormsRings.find(r => r.name === ringName && r.type === 'forms');
      if (ring) {
        affectedRings.add(ring.id);
      }
    });
    
    if (affectedRings.size === 0) {
      alert(`No forms rings changed in ${selectedFormsDivision} division since checkpoint`);
    } else {
      setSelectedFormsRings(affectedRings);
    }
  };
  
  const handleSelectSparringDiff = () => {
    if (!selectedSparringCheckpoint) {
      alert('Please select a checkpoint');
      return;
    }
    
    const diff = diffCheckpoint(selectedSparringCheckpoint);
    if (!diff) {
      alert('Failed to compute diff');
      return;
    }
    
    // Get affected ring names for the selected division
    const affectedRings = new Set<string>();
    diff.ringsAffected.forEach(ringName => {
      // Find corresponding competition ring
      const ring = availableSparringRings.find(r => r.name === ringName && r.type === 'sparring');
      if (ring) {
        affectedRings.add(ring.id);
      }
    });
    
    if (affectedRings.size === 0) {
      alert(`No sparring rings changed in ${selectedSparringDivision} division since checkpoint`);
    } else {
      setSelectedSparringRings(affectedRings);
    }
  };

  const savePDF = async (pdf: any, filename: string) => {
    try {
      setExporting(true);
      const pdfBlob = pdf.output('arraybuffer');
      const result = await window.electronAPI.savePDF({
        fileName: filename,
        data: new Uint8Array(pdfBlob),
        outputDirectory: config.pdfOutputDirectory,
      });

      if (!result.success && result.error) {
        // Only show alert on error
        alert(`Error saving PDF: ${result.error}`);
      }
      // Success: no dialog, file saved silently
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportNameTags = async () => {
    if (!selectedDivision) {
      alert('Please select a division');
      return;
    }

    const pdf = generateNameTags(
      participants,
      selectedDivision,
      config.physicalRings,
      config.watermarkImage,
      undefined, // use default config
      physicalRingMappings,
      config.schoolAbbreviations,
      logoDataUrl,
      categories
    );
    await savePDF(pdf, `name-tags-${selectedDivision}.pdf`);
  };

  const handleExportCheckIn = async () => {
    if (!selectedDivision) {
      alert('Please select a division');
      return;
    }

    const pdf = generateCheckInSheet(
      participants,
      selectedDivision,
      config.physicalRings,
      physicalRingMappings,
      categories,
      config.schoolAbbreviations
    );
    await savePDF(pdf, `check-in-${selectedDivision}.pdf`);
  };

  const handleExportFormsScoring = async () => {
    if (!selectedDivision) {
      alert('Please select a division');
      return;
    }

    const pdf = generateFormsScoringSheets(
      participants,
      competitionRings,
      config.physicalRings,
      selectedDivision,
      config.watermarkImage,
      physicalRingMappings
    );
    await savePDF(pdf, `forms-scoring-${selectedDivision}.pdf`);
  };
  
  const handleExportFormsAdvanced = async (printDirectly: boolean = false) => {
    if (!selectedFormsDivision) {
      alert('Please select a division');
      return;
    }
    
    if (selectedFormsRings.size === 0) {
      alert('Please select at least one ring');
      return;
    }
    
    // Get current checkbox state - create new Set to ensure fresh snapshot
    const currentSelectedRings = new Set(selectedFormsRings);
    
    // Filter competition rings to only selected ones
    const filteredRings = competitionRings.filter(r => currentSelectedRings.has(r.id));
    
    const pdf = generateFormsScoringSheets(
      participants,
      filteredRings,
      config.physicalRings,
      selectedFormsDivision,
      config.watermarkImage,
      physicalRingMappings
    );
    
    if (printDirectly) {
      // Open print dialog
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
          // Clean up blob URL after a delay
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
        });
      } else {
        // If popup was blocked, clean up immediately
        URL.revokeObjectURL(pdfUrl);
      }
    } else {
      await savePDF(pdf, `forms-scoring-${selectedFormsDivision}.pdf`);
    }
  };

  const handleExportSparringBrackets = async () => {
    if (!selectedDivision) {
      alert('Please select a division');
      return;
    }

    const pdf = generateSparringBrackets(
      participants,
      competitionRings,
      config.physicalRings,
      selectedDivision,
      config.watermarkImage,
      physicalRingMappings
    );
    await savePDF(pdf, `sparring-brackets-${selectedDivision}.pdf`);
  };
  
  const handleExportSparringAdvanced = async (printDirectly: boolean = false) => {
    if (!selectedSparringDivision) {
      alert('Please select a division');
      return;
    }
    
    if (selectedSparringRings.size === 0) {
      alert('Please select at least one ring');
      return;
    }
    
    // Get current checkbox state - create new Set to ensure fresh snapshot
    const currentSelectedRings = new Set(selectedSparringRings);
    
    // Filter competition rings to only selected ones
    const filteredRings = competitionRings.filter(r => currentSelectedRings.has(r.id));
    
    const pdf = generateSparringBrackets(
      participants,
      filteredRings,
      config.physicalRings,
      selectedSparringDivision,
      config.watermarkImage,
      physicalRingMappings
    );
    
    if (printDirectly) {
      // Open print dialog
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
          // Clean up blob URL after a delay
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
        });
      } else {
        // If popup was blocked, clean up immediately
        URL.revokeObjectURL(pdfUrl);
      }
    } else {
      await savePDF(pdf, `sparring-brackets-${selectedSparringDivision}.pdf`);
    }
  };

  const handleExportRingOverview = async () => {
    // Build ring pairs similar to RingOverview component
    const pairMap = new Map<string, any>();
    
    competitionRings.forEach(ring => {
      const ringName = ring.name || `${ring.division} Ring`;
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

    const ringPairs = Array.from(pairMap.values()).sort((a, b) => {
      if (a.physicalRingName && b.physicalRingName) {
        const aMatch = a.physicalRingName.match(/PR(\d+)([a-z])?/i);
        const bMatch = b.physicalRingName.match(/PR(\d+)([a-z])?/i);
        
        if (aMatch && bMatch) {
          const aNum = parseInt(aMatch[1]);
          const bNum = parseInt(bMatch[1]);
          
          if (aNum !== bNum) {
            return aNum - bNum;
          }
          
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

    const divisionFilter = selectedDivision || 'all';
    const pdf = generateRingOverviewPDF(participants, ringPairs, categories, divisionFilter);
    const filename = divisionFilter === 'all' 
      ? 'ring-overview-all-divisions.pdf' 
      : `ring-overview-${divisionFilter}.pdf`;
    await savePDF(pdf, filename);
  };

  return (
    <div className="card">
      <h2 className="card-title">Export PDFs</h2>

      <div className="form-group">
        <label className="form-label">Select Division</label>
        <select
          className="form-control"
          value={selectedDivision}
          onChange={(e) => setSelectedDivision(e.target.value)}
        >
          <option value="">Choose a division...</option>
          <option value="all">All Divisions</option>
          {config.divisions.map((div) => (
            <option key={div.name} value={div.name}>
              {div.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-2 mt-2">
        {/* Name Tags */}
        <div className="card" style={{ padding: '15px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Name Tags</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Print name tags for all participants in the selected division (2x4
            grid per page).
          </p>
          <button
            className="btn btn-primary"
            onClick={handleExportNameTags}
            disabled={!selectedDivision || exporting}
          >
            {exporting ? 'Exporting...' : 'Export Name Tags'}
          </button>
        </div>

        {/* Check-In Sheet */}
        <div className="card" style={{ padding: '15px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
            Check-In Sheet
          </h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Print check-in sheet with participants sorted by last name.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleExportCheckIn}
            disabled={!selectedDivision || exporting}
          >
            {exporting ? 'Exporting...' : 'Export Check-In Sheet'}
          </button>
        </div>

        {/* Forms Scoring Sheets - Simple */}
        <div className="card" style={{ padding: '15px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
            Forms Scoring Sheets
          </h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Print scoring sheets for all forms rings in the selected division.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleExportFormsScoring}
            disabled={!selectedDivision || exporting}
          >
            {exporting ? 'Exporting...' : 'Export Forms Scoring'}
          </button>
        </div>

        {/* Sparring Brackets - Simple */}
        <div className="card" style={{ padding: '15px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
            Sparring Brackets
          </h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Print 16-person tournament brackets for all sparring rings.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleExportSparringBrackets}
            disabled={!selectedDivision || exporting}
          >
            {exporting ? 'Exporting...' : 'Export Sparring Brackets'}
          </button>
        </div>

        {/* Ring Overview */}
        <div className="card" style={{ padding: '15px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
            Ring Overview
          </h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            Print complete ring overview with all participants by ring. Select "All Divisions" or a specific division.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleExportRingOverview}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export Ring Overview'}
          </button>
        </div>
      </div>

      {/* Advanced Forms Scoring Options */}
      <div className="card mt-2">
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            padding: '10px 0'
          }}
          onClick={() => setFormsExpanded(!formsExpanded)}
        >
          <h3 style={{ fontSize: '16px', margin: 0 }}>
            Advanced Forms Scoring Options
          </h3>
          <span style={{ fontSize: '20px' }}>{formsExpanded ? '▼' : '▶'}</span>
        </div>
        
        {formsExpanded && (
          <div style={{ marginTop: '15px' }}>
            <div className="form-group">
              <label className="form-label">Select Division</label>
              <select
                className="form-control"
                value={selectedFormsDivision}
                onChange={(e) => setSelectedFormsDivision(e.target.value)}
              >
                <option value="">Choose a division...</option>
                {config.divisions.map((div) => (
                  <option key={div.name} value={div.name}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedFormsDivision && availableFormsRings.length > 0 && (
              <>
                <div className="form-group mt-2">
                  <label className="form-label">Select Rings to Print</label>
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px',
                    marginBottom: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedFormsRings(new Set(availableFormsRings.map(r => r.id)))}
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                    >
                      Select All
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedFormsRings(new Set())}
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                    >
                      Deselect All
                    </button>
                    {checkpoints.length > 0 && (
                      <>
                        <button
                          className="btn btn-secondary"
                          onClick={handleSelectFormsDiff}
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                        >
                          Select Diff from Checkpoint
                        </button>
                        <select
                          value={selectedFormsCheckpoint}
                          onChange={(e) => setSelectedFormsCheckpoint(e.target.value)}
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                        >
                          {sortedCheckpoints.map(cp => (
                            <option key={cp.id} value={cp.id}>
                              {cp.name} ({new Date(cp.timestamp).toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '10px'
                  }}>
                    {availableFormsRings.map((ring) => {
                      const mapping = physicalRingMappings.find(m => m.cohortRingName === ring.name);
                      const physicalRing = mapping?.physicalRingName || 'No Physical Ring';
                      
                      return (
                        <div key={ring.id} style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selectedFormsRings.has(ring.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedFormsRings);
                                if (e.target.checked) {
                                  newSet.add(ring.id);
                                } else {
                                  newSet.delete(ring.id);
                                }
                                setSelectedFormsRings(newSet);
                              }}
                              style={{ marginRight: '8px' }}
                            />
                            <span>{ring.name || 'Unnamed Ring'} - {physicalRing} ({ring.participantIds.length} participants)</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleExportFormsAdvanced(false)}
                    disabled={selectedFormsRings.size === 0 || exporting}
                  >
                    {exporting ? 'Exporting...' : 'Export to File'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleExportFormsAdvanced(true)}
                    disabled={selectedFormsRings.size === 0 || exporting}
                  >
                    Print Directly
                  </button>
                </div>
              </>
            )}
            
            {selectedFormsDivision && availableFormsRings.length === 0 && (
              <div className="warning mt-2">
                No forms rings found for this division.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Sparring Brackets Options */}
      <div className="card mt-2">
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer',
            padding: '10px 0'
          }}
          onClick={() => setSparringExpanded(!sparringExpanded)}
        >
          <h3 style={{ fontSize: '16px', margin: 0 }}>
            Advanced Sparring Brackets Options
          </h3>
          <span style={{ fontSize: '20px' }}>{sparringExpanded ? '▼' : '▶'}</span>
        </div>
        
        {sparringExpanded && (
          <div style={{ marginTop: '15px' }}>
            <div className="form-group">
              <label className="form-label">Select Division</label>
              <select
                className="form-control"
                value={selectedSparringDivision}
                onChange={(e) => setSelectedSparringDivision(e.target.value)}
              >
                <option value="">Choose a division...</option>
                {config.divisions.map((div) => (
                  <option key={div.name} value={div.name}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedSparringDivision && availableSparringRings.length > 0 && (
              <>
                <div className="form-group mt-2">
                  <label className="form-label">Select Rings to Print</label>
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px',
                    marginBottom: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedSparringRings(new Set(availableSparringRings.map(r => r.id)))}
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                    >
                      Select All
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedSparringRings(new Set())}
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                    >
                      Deselect All
                    </button>
                    {checkpoints.length > 0 && (
                      <>
                        <button
                          className="btn btn-secondary"
                          onClick={handleSelectSparringDiff}
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                        >
                          Select Diff from Checkpoint
                        </button>
                        <select
                          value={selectedSparringCheckpoint}
                          onChange={(e) => setSelectedSparringCheckpoint(e.target.value)}
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                        >
                          {sortedCheckpoints.map(cp => (
                            <option key={cp.id} value={cp.id}>
                              {cp.name} ({new Date(cp.timestamp).toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '10px'
                  }}>
                    {availableSparringRings.map((ring) => {
                      const mapping = physicalRingMappings.find(m => m.cohortRingName === ring.name);
                      const physicalRing = mapping?.physicalRingName || 'No Physical Ring';
                      
                      return (
                        <div key={ring.id} style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selectedSparringRings.has(ring.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedSparringRings);
                                if (e.target.checked) {
                                  newSet.add(ring.id);
                                } else {
                                  newSet.delete(ring.id);
                                }
                                setSelectedSparringRings(newSet);
                              }}
                              style={{ marginRight: '8px' }}
                            />
                            <span>{ring.name || 'Unnamed Ring'} - {physicalRing} ({ring.participantIds.length} participants)</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleExportSparringAdvanced(false)}
                    disabled={selectedSparringRings.size === 0 || exporting}
                  >
                    {exporting ? 'Exporting...' : 'Export to File'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleExportSparringAdvanced(true)}
                    disabled={selectedSparringRings.size === 0 || exporting}
                  >
                    Print Directly
                  </button>
                </div>
              </>
            )}
            
            {selectedSparringDivision && availableSparringRings.length === 0 && (
              <div className="warning mt-2">
                No sparring rings found for this division.
              </div>
            )}
          </div>
        )}
      </div>

      {!config.watermarkImage && (
        <div className="warning mt-2">
          <strong>Note:</strong> No watermark image has been set. You can add one
          in the Configuration tab.
        </div>
      )}
    </div>
  );
}

export default PDFExport;
