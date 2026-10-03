import React, { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { parseExcelFile } from '../utils/excelParser';

interface ImportPreview {
  total: number;
  errors: Array<{ participant: any; issues: string[] }>;
  warnings: Array<{ participant: any; issues: string[] }>;
  participants: any[];
  duplicateNames: string[];
}

interface InitialImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Initial Excel/CSV participant import, shown as a modal (opened from the File
 * menu or the Dashboard). Ports the validation/preview flow that previously
 * lived on the Import tab.
 */
export default function InitialImportModal({ isOpen, onClose }: InitialImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateBannerDismissed, setDuplicateBannerDismissed] = useState(false);

  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const participants = useTournamentStore((state) => state.participants);
  const config = useTournamentStore((state) => state.config);

  const findDuplicateNames = (list: any[]): string[] => {
    const counts = new Map<string, number>();
    for (const p of list) {
      const key = `${(p.firstName ?? '').trim()} ${(p.lastName ?? '').trim()}`.trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
      .sort();
  };

  const validateImport = (list: any[]): { errors: ImportPreview['errors']; warnings: ImportPreview['warnings'] } => {
    const errors: ImportPreview['errors'] = [];
    const warnings: ImportPreview['warnings'] = [];

    list.forEach((p) => {
      const errs: string[] = [];
      const warns: string[] = [];

      if (!p.gender) errs.push('Missing gender (required)');
      if (!p.branch) errs.push('Missing branch (required)');

      if (!Number.isFinite(p.heightFeet) || !Number.isFinite(p.heightInches) ||
          (p.heightFeet === 0 && (p.heightInches === undefined || p.heightInches === null || p.heightInches === 0))) {
        warns.push('Missing height information');
      }
      if (!p.formsDivision && !p.sparringDivision) warns.push('Not assigned to any division');
      if (!p.age || p.age < 3 || p.age > 100) warns.push('Invalid age');

      if (errs.length > 0) errors.push({ participant: p, issues: errs });
      if (warns.length > 0) warnings.push({ participant: p, issues: warns });
    });

    return { errors, warnings };
  };

  const buildPreview = (parsedParticipants: any[]): ImportPreview => {
    const { errors, warnings } = validateImport(parsedParticipants);
    const duplicateNames = findDuplicateNames(parsedParticipants);
    return { total: parsedParticipants.length, errors, warnings, participants: parsedParticipants, duplicateNames };
  };

  const handleFileSelect = async () => {
    try {
      setLoading(true);
      setError(null);
      setPreview(null);

      const result = await window.electronAPI.selectFile();
      if (!result) {
        setLoading(false);
        return;
      }

      const validDivisions = config.divisions.map((d) => d.name);
      const parsedParticipants = parseExcelFile(result.data, validDivisions);
      setDuplicateBannerDismissed(false);
      setPreview(buildPreview(parsedParticipants));
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading file');
      setLoading(false);
    }
  };

  const confirmImport = () => {
    if (preview) {
      setParticipants(preview.participants);
      setPreview(null);
      onClose();
    }
  };

  const handleClose = () => {
    setPreview(null);
    setError(null);
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExt)) {
      setError('Please drop a valid Excel file (.xlsx, .xls, or .csv)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPreview(null);

      const arrayBuffer = await file.arrayBuffer();
      const validDivisions = config.divisions.map((d) => d.name);
      const parsedParticipants = parseExcelFile(Array.from(new Uint8Array(arrayBuffer)), validDivisions);
      setDuplicateBannerDismissed(false);
      setPreview(buildPreview(parsedParticipants));
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing file');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)', padding: '30px', borderRadius: '8px',
          width: '90%', maxWidth: '720px', maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Import Initial Excel File</h2>

        {participants.length > 0 && (
          <div style={{ marginBottom: '15px', padding: '10px 12px', backgroundColor: 'rgba(255,193,7,0.12)', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)' }}>
            ⚠️ {participants.length} participants are currently loaded. Confirming an import will <strong>replace</strong> them.
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !loading && !preview && handleFileSelect()}
          style={{
            border: `3px dashed ${isDragging ? '#007bff' : 'var(--border-color)'}`,
            borderRadius: '8px', padding: '30px', marginBottom: '20px',
            backgroundColor: isDragging ? 'rgba(0, 123, 255, 0.1)' : 'var(--bg-secondary)',
            textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
          <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
            {isDragging ? 'Drop file here' : 'Drag and drop Excel file here'}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '15px' }}>or click to browse for a file</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Accepts .xlsx, .xls, or .csv files</p>
        </div>

        {/* Expected Columns Info */}
        <details style={{ marginBottom: '20px', fontSize: '13px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '10px' }}>
            Expected File Format
          </summary>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>The file should have a header row with the following columns:</p>
          <ul style={{ marginLeft: '20px', color: 'var(--text-secondary)' }}>
            <li>Student First Name</li>
            <li>Student Last Name</li>
            <li>Age</li>
            <li>Gender</li>
            <li>Height Feet</li>
            <li>Height Inches</li>
            <li>School</li>
            <li>Branch</li>
            <li>Division</li>
            <li>Form? (optional — default is "yes")</li>
            <li>Sparring? (yes / no — required)</li>
          </ul>
        </details>

        {error && (
          <div className="warning" style={{ marginBottom: '20px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Import Preview */}
        {preview && (
          <div style={{ border: '2px solid #007bff', borderRadius: '8px', padding: '20px', marginBottom: '20px', backgroundColor: 'var(--bg-secondary)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', color: 'var(--text-primary)' }}>Import Preview</h3>
            <div style={{ fontSize: '14px', marginBottom: '15px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Total Participants:</strong>{' '}
              <span style={{ color: '#28a745', fontSize: '16px', fontWeight: 'bold' }}>{preview.total}</span>
            </div>

            {preview.duplicateNames.length > 0 && !duplicateBannerDismissed && (
              <div style={{ marginBottom: '15px', padding: '12px 14px', backgroundColor: 'rgba(255, 193, 7, 0.12)', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <strong style={{ color: '#ffc107' }}>ℹ️ Duplicate name{preview.duplicateNames.length > 1 ? 's' : ''} detected ({preview.duplicateNames.length})</strong>
                    <div style={{ marginTop: '6px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{preview.duplicateNames.join(', ')}</div>
                  </div>
                  <button onClick={() => setDuplicateBannerDismissed(true)} title="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                </div>
              </div>
            )}


            {preview.errors.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#dc3545', display: 'block', marginBottom: '8px' }}>❌ Errors ({preview.errors.length} participant(s)) — must be fixed before importing:</strong>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dc3545', borderRadius: '4px', padding: '10px', backgroundColor: 'rgba(220, 53, 69, 0.08)' }}>
                  {preview.errors.map((err, idx) => (
                    <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: idx < preview.errors.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{err.participant.firstName} {err.participant.lastName}</div>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#dc3545' }}>
                        {err.issues.map((issue, issueIdx) => (<li key={issueIdx}>{issue}</li>))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.warnings.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#ffc107', display: 'block', marginBottom: '8px' }}>⚠️ Warnings ({preview.warnings.length} participant(s)):</strong>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', backgroundColor: 'var(--bg-primary)' }}>
                  {preview.warnings.map((warning, idx) => (
                    <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: idx < preview.warnings.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{warning.participant.firstName} {warning.participant.lastName}</div>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {warning.issues.map((issue, issueIdx) => (<li key={issueIdx}>{issue}</li>))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-success"
                onClick={confirmImport}
                disabled={preview.errors.length > 0}
                title={preview.errors.length > 0 ? 'Fix errors in spreadsheet before importing' : ''}
                style={{ flex: 1, opacity: preview.errors.length > 0 ? 0.5 : 1, cursor: preview.errors.length > 0 ? 'not-allowed' : 'pointer' }}
              >
                ✓ Confirm Import
              </button>
              <button className="btn btn-secondary" onClick={() => setPreview(null)} style={{ flex: 1 }}>
                ✗ Back
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button className="btn btn-secondary" onClick={handleClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

