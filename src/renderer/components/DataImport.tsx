import React, { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { parseExcelFile } from '../utils/excelParser';
import { Division } from '../types/tournament';

interface ImportPreview {
  total: number;
  warnings: Array<{ participant: any; issues: string[] }>;
  participants: any[];
}

function DataImport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const participants = useTournamentStore((state) => state.participants);
  const reset = useTournamentStore((state) => state.reset);
  const loadState = useTournamentStore((state) => state.loadState);
  const config = useTournamentStore((state) => state.config);
  const setDivisions = useTournamentStore((state) => state.setDivisions);

  const validateImport = (participants: any[]): Array<{ participant: any; issues: string[] }> => {
    const warnings: Array<{ participant: any; issues: string[] }> = [];

    participants.forEach((p) => {
      const issues: string[] = [];
      
      if (!p.heightFeet || p.heightInches === undefined || p.heightInches === null) {
        issues.push('Missing height information');
      }
      if (!p.formsDivision && !p.sparringDivision) {
        issues.push('Not assigned to any division');
      }
      if (!p.age || p.age < 3 || p.age > 100) {
        issues.push('Invalid age');
      }
      
      if (issues.length > 0) {
        warnings.push({ participant: p, issues });
      }
    });

    return warnings;
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

      const parsedParticipants = parseExcelFile(result.data);
      const warnings = validateImport(parsedParticipants);
      
      setPreview({
        total: parsedParticipants.length,
        warnings,
        participants: parsedParticipants
      });
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
    }
  };

  const cancelImport = () => {
    setPreview(null);
  };

  const handleReset = () => {
    if (
      confirm(
        'Are you sure you want to reset all data? This action cannot be undone.'
      )
    ) {
      reset();
    }
  };

  const handleLoadDatabase = async () => {
    try {
      setLoading(true);
      setError(null);
      await loadState();
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading database');
      setLoading(false);
    }
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
      const parsedParticipants = parseExcelFile(Array.from(new Uint8Array(arrayBuffer)));
      const warnings = validateImport(parsedParticipants);

      setPreview({
        total: parsedParticipants.length,
        warnings,
        participants: parsedParticipants
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing file');
      setLoading(false);
    }
  };

  const handleMoveDivision = (index: number, direction: 'up' | 'down') => {
    const sortedDivisions = [...config.divisions].sort((a, b) => a.order - b.order);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= sortedDivisions.length) return;
    
    // Swap the divisions
    const temp = sortedDivisions[index];
    sortedDivisions[index] = sortedDivisions[newIndex];
    sortedDivisions[newIndex] = temp;
    
    // Update orders
    const updatedDivisions = sortedDivisions.map((div, idx) => ({
      ...div,
      order: idx + 1
    }));
    
    setDivisions(updatedDivisions);
  };

  return (
    <div className="card">
      <h2 className="card-title">Import Participant Data</h2>
      
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `3px dashed ${isDragging ? '#007bff' : 'var(--border-color)'}`,
          borderRadius: '8px',
          padding: '30px',
          marginBottom: '20px',
          backgroundColor: isDragging ? 'rgba(0, 123, 255, 0.1)' : 'var(--bg-secondary)',
          textAlign: 'center',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
        onClick={() => !loading && !preview && handleFileSelect()}
      >
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
        <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
          {isDragging ? 'Drop file here' : 'Drag and drop Excel file here'}
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
          or click to browse for a file
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Accepts .xlsx, .xls, or .csv files
        </p>
      </div>

      {/* Expected Columns Info */}
      <details style={{ marginBottom: '20px', fontSize: '13px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '10px' }}>
          Expected File Format
        </summary>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
          The file should have a header row with the following columns:
        </p>
        <ul style={{ marginLeft: '20px', color: 'var(--text-secondary)' }}>
          <li>Student First Name</li>
          <li>Student Last Name</li>
          <li>Age</li>
          <li>Gender</li>
          <li>Height Feet</li>
          <li>Height Inches</li>
          <li>School</li>
          <li>Branch (optional)</li>
          <li>Division</li>
        </ul>
      </details>

      {error && (
        <div className="warning" style={{ marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Import Preview */}
      {preview && (
        <div style={{
          border: '2px solid #007bff',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', color: 'var(--text-primary)' }}>
            Import Preview
          </h3>
          <div style={{ fontSize: '14px', marginBottom: '15px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Total Participants:</strong>{' '}
            <span style={{ color: '#28a745', fontSize: '16px', fontWeight: 'bold' }}>{preview.total}</span>
          </div>
          
          {preview.warnings.length > 0 && (
            <div>
              <strong style={{ color: '#ffc107', display: 'block', marginBottom: '8px' }}>⚠️ Warnings ({preview.warnings.length} participant(s)):</strong>
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '10px',
                backgroundColor: 'var(--bg-primary)'
              }}>
                {preview.warnings.map((warning, idx) => (
                  <div key={idx} style={{ 
                    marginBottom: '8px', 
                    paddingBottom: '8px',
                    borderBottom: idx < preview.warnings.length - 1 ? '1px solid var(--border-color)' : 'none'
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                      {warning.participant.firstName} {warning.participant.lastName}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {warning.issues.map((issue, issueIdx) => (
                        <li key={issueIdx}>{issue}</li>
                      ))}
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
              style={{ flex: 1 }}
            >
              ✓ Confirm Import
            </button>
            <button
              className="btn btn-secondary"
              onClick={cancelImport}
              style={{ flex: 1 }}
            >
              ✗ Cancel
            </button>
          </div>
        </div>
      )}

      {participants.length > 0 && !preview && (
        <div className="info mb-2">
          <strong>{participants.length} participants</strong> loaded successfully.
        </div>
      )}

      {!preview && (
        <div className="flex">
          <button
            className="btn btn-primary"
            onClick={handleFileSelect}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Select Excel File'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleLoadDatabase}
            disabled={loading}
          >
            Load Database
          </button>

          {participants.length > 0 && (
            <button className="btn btn-danger" onClick={handleReset}>
              Reset All Data
            </button>
          )}
        </div>
      )}

      {/* Division Order Management */}
      {config.divisions.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Division Order</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '15px', fontSize: '14px' }}>
            Drag divisions to reorder them. This order will be used in all division dropdowns throughout the application.
          </p>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            maxWidth: '500px'
          }}>
            {[...config.divisions]
              .sort((a, b) => a.order - b.order)
              .map((div, index, sortedArray) => (
                <div
                  key={div.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 15px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '5px',
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                    <button
                      onClick={() => handleMoveDivision(index, 'up')}
                      disabled={index === 0}
                      className="btn btn-secondary"
                      style={{
                        padding: '2px 8px',
                        fontSize: '12px',
                        minWidth: '30px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        opacity: index === 0 ? 0.5 : 1
                      }}
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveDivision(index, 'down')}
                      disabled={index === sortedArray.length - 1}
                      className="btn btn-secondary"
                      style={{
                        padding: '2px 8px',
                        fontSize: '12px',
                        minWidth: '30px',
                        cursor: index === sortedArray.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: index === sortedArray.length - 1 ? 0.5 : 1
                      }}
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>
                  <div style={{ 
                    flex: 1,
                    fontWeight: 'bold',
                    color: 'var(--text-primary)'
                  }}>
                    {index + 1}. {div.name}
                  </div>
                  <div style={{ 
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                  }}>
                    Order: {div.order}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default DataImport;
