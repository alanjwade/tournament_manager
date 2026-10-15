import { useState, useMemo, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { generateNameTags } from '../utils/pdfGenerators/nameTags';
import { generateCheckInSheet } from '../utils/pdfGenerators/checkInSheet';
import { generateFormsScoringSheets } from '../utils/pdfGenerators/formsScoringSheet';
import { generateSparringBrackets } from '../utils/pdfGenerators/sparringBracket';
import { generateRingOverviewPDF } from '../utils/pdfGenerators/ringOverview';
import { generateScoreSheetsPerDivision } from '../utils/pdfGenerators/scoreSheetsPerDivision';
import { computeCompetitionRings } from '../utils/computeRings';
import { getEffectiveDivision } from '../utils/excelParser';
import { CompetitionRing } from '../types/tournament';
import logoImage from '../assets/logos/logo_orig_dark_letters.png';

interface PDFExportProps {}

function PDFExport({}: PDFExportProps) {
  const participants = useTournamentStore((state) => state.participants);
  const categories = useTournamentStore((state) => state.categories);
  const categoryPoolMappings = useTournamentStore((state) => state.categoryPoolMappings);
  const physicalRingMappings = useTournamentStore((state) => state.physicalRingMappings);
  const config = useTournamentStore((state) => state.config);
  
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

  // Load file locations
  useEffect(() => {
    const loadFileLocations = async () => {
      try {
        const result = await window.electronAPI.getFileLocations();
        setFileLocations(result);
      } catch (error) {
        console.error('Failed to load file locations:', error);
      }
    };
    loadFileLocations();
  }, []);
  
  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, categories, categoryPoolMappings),
    [participants, categories, categoryPoolMappings]
  );
  
  // Always default to "all divisions" — no persistence, so the selector resets
  // to "All Divisions" every time the Export tab is opened.
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const [fileLocations, setFileLocations] = useState<{
    dataPath: string;
    autosavePath: string;
    defaultPdfOutputDir: string;
    exePath: string;
  } | null>(null);
  
  const savePDF = async (pdf: any, filename: string) => {
    try {
      setExporting(true);
      const pdfBlob = pdf.output('arraybuffer');
      const result = await window.electronAPI.savePDF({
        fileName: filename,
        data: new Uint8Array(pdfBlob),
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

  const handleExportScoreSheets = async () => {
    if (!selectedDivision) {
      alert('Please select a division');
      return;
    }

    const pdf = generateScoreSheetsPerDivision(
      participants,
      competitionRings,
      config.physicalRings,
      selectedDivision,
      config.watermarkImage,
      physicalRingMappings,
      config.schoolAbbreviations
    );
    await savePDF(pdf, `score-sheets-${selectedDivision}.pdf`);
  };

  const handleExportRingOverview = async () => {
    // Build ring pairs similar to RingOverview component
    const pairMap = new Map<string, any>();
    
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

    const ringPairs = Array.from(pairMap.values()).sort((a, b) => {
      // Extract pool numbers from category pool name (e.g., "Division - CategoryName Pool 1" -> 1)
      const aPoolMatch = a.categoryPoolName.match(/Pool\s+(\d+)/i);
      const bPoolMatch = b.categoryPoolName.match(/Pool\s+(\d+)/i);
      const aPool = aPoolMatch ? parseInt(aPoolMatch[1]) : 999;
      const bPool = bPoolMatch ? parseInt(bPoolMatch[1]) : 999;
      
      // Sort by pool number first
      if (aPool !== bPool) {
        return aPool - bPool;
      }
      
      // Then sort by physical ring name if both have one
      if (a.physicalRingName && b.physicalRingName) {
        const aMatch = a.physicalRingName.match(/(?:PR|Ring\s*)(\d+)([a-z])?/i);
        const bMatch = b.physicalRingName.match(/(?:PR|Ring\s*)(\d+)([a-z])?/i);
        
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
      
      return a.categoryPoolName.localeCompare(b.categoryPoolName);
    });

    const divisionFilter = selectedDivision || 'all';
    const pdf = generateRingOverviewPDF(participants, ringPairs, categories, divisionFilter, config.schoolAbbreviations);
    const filename = divisionFilter === 'all' 
      ? 'ring-overview-all-divisions.pdf' 
      : `ring-overview-${divisionFilter}.pdf`;
    await savePDF(pdf, filename);
  };

  const handleExportAllDivisionPDFs = async () => {
    if (!selectedDivision) return;
    setExporting(true);
    try {
      if (selectedDivision === 'all') {
        // Export for all divisions that have participants
        const divisionsWithParticipants = new Set<string>();
        
        participants.forEach((p) => {
          const formsDiv = getEffectiveDivision(p, 'forms');
          const sparringDiv = getEffectiveDivision(p, 'sparring');
          if (formsDiv) divisionsWithParticipants.add(formsDiv);
          if (sparringDiv) divisionsWithParticipants.add(sparringDiv);
        });

        // Export PDFs for each division
        for (const division of Array.from(divisionsWithParticipants).sort()) {
          // Reflect the in-progress division in the selector; the id passed to
          // the generator is what drives output, so this is display only.
          setSelectedDivision(division);

          await exportPDFsForDivision(division);
        }
        // Always return the selector to "All Divisions" once the run completes.
        setSelectedDivision('all');
      } else {
        await exportPDFsForDivision(selectedDivision);
      }
    } finally {
      setExporting(false);
    }
  };

  const exportPDFsForDivision = async (division: string) => {
    // Export the PDFs for a specific division
    const divisionParticipants = participants.filter((p) => {
      const formsDiv = getEffectiveDivision(p, 'forms');
      const sparringDiv = getEffectiveDivision(p, 'sparring');
      return formsDiv === division || sparringDiv === division;
    });

    if (divisionParticipants.length === 0) return;

    // Export name tags
    const namePdf = generateNameTags(
      participants,
      division,
      config.physicalRings,
      config.watermarkImage,
      undefined,
      physicalRingMappings,
      config.schoolAbbreviations,
      logoDataUrl,
      categories
    );
    await savePDF(namePdf, `name-tags-${division}.pdf`);

    // Export check-in sheet
    const checkInPdf = generateCheckInSheet(
      participants,
      division,
      config.physicalRings,
      physicalRingMappings,
      categories,
      config.schoolAbbreviations
    );
    await savePDF(checkInPdf, `check-in-${division}.pdf`);

    // Export ring overview
    const pairMap = new Map<string, any>();
    
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

    const ringPairs = Array.from(pairMap.values()).sort((a, b) => {
      // Extract pool numbers from category pool name (e.g., "Division - CategoryName Pool 1" -> 1)
      const aPoolMatch = a.categoryPoolName.match(/Pool\s+(\d+)/i);
      const bPoolMatch = b.categoryPoolName.match(/Pool\s+(\d+)/i);
      const aPool = aPoolMatch ? parseInt(aPoolMatch[1]) : 999;
      const bPool = bPoolMatch ? parseInt(bPoolMatch[1]) : 999;
      
      // Sort by pool number first
      if (aPool !== bPool) {
        return aPool - bPool;
      }
      
      // Then sort by physical ring name
      const aNum = a.physicalRingName ? parseInt(a.physicalRingName.match(/\d+/)?.[0] || '999') : 999;
      const bNum = b.physicalRingName ? parseInt(b.physicalRingName.match(/\d+/)?.[0] || '999') : 999;
      
      if (aNum !== bNum) {
        return aNum - bNum;
      }
      
      if (a.physicalRingName && b.physicalRingName) {
        const aLetter = a.physicalRingName.match(/[a-z]/i)?.[0]?.toLowerCase() || '';
        const bLetter = b.physicalRingName.match(/[a-z]/i)?.[0]?.toLowerCase() || '';
        
        return aLetter.localeCompare(bLetter);
      }
      
      return (a.physicalRingName || '').localeCompare(b.physicalRingName || '');
    });

    const ringOverviewPdf = generateRingOverviewPDF(participants, ringPairs, categories, division, config.schoolAbbreviations);
    await savePDF(ringOverviewPdf, `ring-overview-${division}.pdf`);

    // Forms scoring sheets and sparring brackets are intentionally NOT exported
    // as separate PDFs here — they are encompassed in the combined score sheets
    // per division that are generated below.

    // Export combined score sheets per division (forms + sparring interleaved by ring)
    const scoreSheetsPdf = generateScoreSheetsPerDivision(
      participants,
      competitionRings,
      config.physicalRings,
      division,
      config.watermarkImage,
      physicalRingMappings,
      config.schoolAbbreviations
    );
    await savePDF(scoreSheetsPdf, `score-sheets-${division}.pdf`);
  };

  const handleOpenPDFFolder = () => {
    if (!fileLocations) {
      alert('File locations not available');
      return;
    }
    // Fire-and-forget one-way IPC call (no reply channel).
    window.electronAPI.openPDFFolder(fileLocations.defaultPdfOutputDir);
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

      <div style={{ marginBottom: '20px' }}>
        <button
          className="btn btn-success"
          onClick={handleExportAllDivisionPDFs}
          disabled={!selectedDivision || exporting}
          style={{ width: '100%' }}
        >
          {exporting ? 'Exporting All PDFs...' : `Export All ${selectedDivision === 'all' ? 'Divisions' : selectedDivision} PDFs`}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          className="btn btn-secondary"
          onClick={handleOpenPDFFolder}
          style={{ width: '100%' }}
        >
          📁 Open PDF Outputs Folder
        </button>
      </div>

      {/* Single column layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Name Tags */}
        <div className="card" style={{ padding: '15px', backgroundColor: 'var(--bg-tertiary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>Name Tags</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 0 }}>
                Print name tags for all participants (2x4 grid per page).
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleExportNameTags}
              disabled={!selectedDivision || exporting}
              style={{ whiteSpace: 'nowrap' }}
            >
              {exporting ? 'Exporting...' : `Export ${selectedDivision} Name Tags`}
            </button>
          </div>
        </div>

        {/* Check-In Sheet */}
        <div className="card" style={{ padding: '15px', backgroundColor: 'var(--bg-tertiary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>Check-In Sheet</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 0 }}>
                Print check-in sheet with participants sorted by last name.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleExportCheckIn}
              disabled={!selectedDivision || exporting}
              style={{ whiteSpace: 'nowrap' }}
            >
              {exporting ? 'Exporting...' : `Export ${selectedDivision} Check-In`}
            </button>
          </div>
        </div>

        {/* Ring Overview */}
        <div className="card" style={{ padding: '15px', backgroundColor: 'var(--bg-tertiary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>Ring Overview</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 0 }}>
                Print complete ring overview with all participants by ring.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleExportRingOverview}
              disabled={exporting}
              style={{ whiteSpace: 'nowrap' }}
            >
              {exporting ? 'Exporting...' : `Export ${selectedDivision} Overview`}
            </button>
          </div>
        </div>

        {/* Score Sheets Per Division (Forms + Sparring interleaved by ring) */}
        <div className="card" style={{ padding: '15px', backgroundColor: 'var(--bg-tertiary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px', marginTop: 0 }}>Score Sheets Per Division</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 0 }}>
                Combined PDF with forms scoring sheet then sparring bracket for each ring in order.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleExportScoreSheets}
              disabled={!selectedDivision || exporting}
              style={{ whiteSpace: 'nowrap' }}
            >
              {exporting ? 'Exporting...' : `Export ${selectedDivision} Score Sheets`}
            </button>
          </div>
        </div>

        {/* Blank Sheets */}
        <div className="card" style={{ padding: '15px', backgroundColor: 'var(--bg-tertiary)' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '15px', marginTop: 0 }}>Blank Scoring Sheets</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
            Export blank scoring sheets for manual use.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={async () => {
                setExporting(true);
                try {
                  const mockRing: CompetitionRing = {
                    id: 'blank-forms',
                    physicalRingId: '',
                    categoryId: 'blank',
                    division: 'Forms Scoring Sheet',
                    type: 'forms',
                    participantIds: [],
                    name: 'Forms Scoring Sheet',
                  };
                  
                  const pdf = generateFormsScoringSheets(
                    [],
                    [mockRing],
                    config.physicalRings,
                    'Forms Scoring Sheet',
                    config.watermarkImage,
                    [],
                    undefined,
                    'Forms Score Sheet'
                  );
                  
                  await savePDF(pdf, 'forms-blank.pdf');
                } catch (err) {
                  alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export Blank Forms Sheet'}
            </button>
            
            <button
              className="btn btn-primary"
              onClick={async () => {
                setExporting(true);
                try {
                  const mockRing: CompetitionRing = {
                    id: 'blank-sparring',
                    physicalRingId: '',
                    categoryId: 'blank',
                    division: 'Sparring Bracket',
                    type: 'sparring',
                    participantIds: [],
                    name: 'Sparring Bracket',
                  };
                  
                  const pdf = generateSparringBrackets(
                    [],
                    [mockRing],
                    config.physicalRings,
                    'Sparring Bracket',
                    config.watermarkImage,
                    [],
                    undefined,
                    'Sparring Score Sheet'
                  );
                  
                  await savePDF(pdf, 'sparring-blank.pdf');
                } catch (err) {
                  alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export Blank Sparring Bracket'}
            </button>
          </div>
        </div>

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
