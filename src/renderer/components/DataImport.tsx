import React, { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { parseExcelFile } from '../utils/excelParser';

function DataImport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const participants = useTournamentStore((state) => state.participants);
  const reset = useTournamentStore((state) => state.reset);
  const loadState = useTournamentStore((state) => state.loadState);

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


    </div>
  );
}

export default DataImport;
