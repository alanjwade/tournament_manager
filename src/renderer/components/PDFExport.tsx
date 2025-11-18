import React, { useState, useMemo, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { generateNameTags } from '../utils/pdfGenerators/nameTags';
import { generateCheckInSheet } from '../utils/pdfGenerators/checkInSheet';
import { generateFormsScoringSheets } from '../utils/pdfGenerators/formsScoringSheet';
import { generateSparringBrackets } from '../utils/pdfGenerators/sparringBracket';
import { computeCompetitionRings } from '../utils/computeRings';
import logoImage from '../assets/logos/logo_orig_dark_letters.png';

function PDFExport() {
  const participants = useTournamentStore((state) => state.participants);
  const cohorts = useTournamentStore((state) => state.cohorts);
  const cohortRingMappings = useTournamentStore((state) => state.cohortRingMappings);
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
  
  // Compute competition rings from participant data
  const competitionRings = useMemo(() => 
    computeCompetitionRings(participants, cohorts, cohortRingMappings),
    [participants, cohorts, cohortRingMappings]
  );
  
  const [selectedDivision, setSelectedDivision] = useState<string>('Black Belt');
  const [exporting, setExporting] = useState(false);

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
      cohorts
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
      cohorts
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

        {/* Forms Scoring Sheets */}
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

        {/* Sparring Brackets */}
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
