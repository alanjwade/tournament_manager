import React, { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { parseExcelFile } from '../utils/excelParser';
import { Division } from '../types/tournament';

function DataImport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const participants = useTournamentStore((state) => state.participants);
  const reset = useTournamentStore((state) => state.reset);
  const loadState = useTournamentStore((state) => state.loadState);
  const config = useTournamentStore((state) => state.config);
  const setDivisions = useTournamentStore((state) => state.setDivisions);

  const handleFileSelect = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await window.electronAPI.selectFile();
      if (!result) {
        setLoading(false);
        return;
      }

      const parsedParticipants = parseExcelFile(result.data);
      setParticipants(parsedParticipants);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading file');
      setLoading(false);
    }
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
      
      <p className="mb-2" style={{ color: '#666' }}>
        Select an Excel file (.xlsx, .xls, or .csv) with participant information.
        The file should have a header row with the following columns:
      </p>
      
      <ul style={{ marginBottom: '20px', marginLeft: '20px', color: '#666' }}>
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

      {error && (
        <div className="warning">
          <strong>Error:</strong> {error}
        </div>
      )}

      {participants.length > 0 && (
        <div className="info mb-2">
          <strong>{participants.length} participants</strong> loaded successfully.
        </div>
      )}

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
