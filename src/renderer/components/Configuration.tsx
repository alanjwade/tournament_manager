import { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Division } from '../types/tournament';
import { ColumnImport } from './ColumnImport';
import defaultWatermark from '../assets/logos/watermark.png';

function Configuration() {
  const config = useTournamentStore((state) => state.config);
  const setDivisions = useTournamentStore((state) => state.setDivisions);
  const setWatermark = useTournamentStore((state) => state.setWatermark);
  const setSchoolAbbreviations = useTournamentStore((state) => state.setSchoolAbbreviations);
  const participants = useTournamentStore((state) => state.participants);
  const reset = useTournamentStore((state) => state.reset);

  const [divisionName, setDivisionName] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newAbbreviation, setNewAbbreviation] = useState('');
  const [showAbbreviations, setShowAbbreviations] = useState(false);
  const [fileLocations, setFileLocations] = useState<{
    dataPath: string;
    autosavePath: string;
    defaultPdfOutputDir: string;
    exePath: string;
  } | null>(null);

  // Load default watermark if none is set
  useEffect(() => {
    if (!config.watermarkImage && defaultWatermark) {
      // Convert the imported image URL to base64
      fetch(defaultWatermark)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setWatermark(base64);
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => {
          console.log('Could not load default watermark:', err);
        });
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Load file locations
    window.electronAPI.getFileLocations().then(setFileLocations).catch(console.error);
  }, []);

  const handleAddDivision = () => {
    if (!divisionName.trim()) return;
    const newDivision: Division = {
      name: divisionName.trim(),
      order: config.divisions.length + 1,
      numRings: 2,
      abbreviation: '',
    };
    setDivisions([...config.divisions, newDivision]);
    setDivisionName('');
  };

  const handleRemoveDivision = (name: string) => {
    setDivisions(config.divisions.filter((d) => d.name !== name));
  };

  const handleSetDivisionRings = (name: string, rings: number) => {
    const safe = Number.isFinite(rings) ? Math.max(0, Math.floor(rings)) : 0;
    setDivisions(config.divisions.map((d) => (d.name === name ? { ...d, numRings: safe } : d)));
  };

  const handleMoveDivision = (name: string, direction: 'up' | 'down') => {
    const sorted = [...config.divisions].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((d) => d.name === name);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || newIndex < 0 || newIndex >= sorted.length) return;
    [sorted[index], sorted[newIndex]] = [sorted[newIndex], sorted[index]];
    setDivisions(sorted.map((d, idx) => ({ ...d, order: idx + 1 })));
  };

  const handleResetAllData = () => {
    if (confirm('Are you sure you want to reset ALL data? This cannot be undone (recent History commits may still be restorable).')) {
      reset();
    }
  };

  const handleWatermarkSelect = async () => {
    const result = await window.electronAPI.selectImage();
    if (result) {
      const base64 = btoa(
        String.fromCharCode.apply(null, result.data as any)
      );
      setWatermark(`data:image/png;base64,${base64}`);
    }
  };

  const handleAddAbbreviation = () => {
    if (!newSchoolName.trim() || !newAbbreviation.trim()) return;
    
    const updatedAbbreviations = {
      ...config.schoolAbbreviations,
      [newSchoolName.trim()]: newAbbreviation.trim(),
    };
    setSchoolAbbreviations(updatedAbbreviations);
    setNewSchoolName('');
    setNewAbbreviation('');
  };

  const handleRemoveAbbreviation = (schoolName: string) => {
    const updatedAbbreviations = { ...config.schoolAbbreviations };
    delete updatedAbbreviations[schoolName];
    setSchoolAbbreviations(updatedAbbreviations);
  };

  return (
    <div className="card">
      <h2 className="card-title">Tournament Configuration</h2>

      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
        Use the <strong>File</strong> menu to import the initial Excel file, or to export / import the database.
      </p>

      <div>
        <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Divisions</h3>
          
          <div className="form-group">
            <label className="form-label">Add Division</label>
            <div className="flex">
              <input
                type="text"
                className="form-control"
                value={divisionName}
                onChange={(e) => setDivisionName(e.target.value)}
                placeholder="Division name"
                onKeyPress={(e) => e.key === 'Enter' && handleAddDivision()}
              />
              <button className="btn btn-primary" onClick={handleAddDivision}>
                Add
              </button>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Division</th>
                <th>Order</th>
                <th>Rings</th>
                <th>Reorder</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {[...config.divisions].sort((a, b) => a.order - b.order).map((div, index, sortedArray) => (
                <tr key={div.name}>
                  <td>{div.name}</td>
                  <td>{div.order}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      value={div.numRings ?? 0}
                      onChange={(e) => handleSetDivisionRings(div.name, parseInt(e.target.value, 10))}
                      style={{ width: '80px', padding: '4px' }}
                      title="Number of physical rings available for this division"
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleMoveDivision(div.name, 'up')}
                        disabled={index === 0}
                        style={{ padding: '2px 8px', fontSize: '12px', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.5 : 1 }}
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleMoveDivision(div.name, 'down')}
                        disabled={index === sortedArray.length - 1}
                        style={{ padding: '2px 8px', fontSize: '12px', cursor: index === sortedArray.length - 1 ? 'not-allowed' : 'pointer', opacity: index === sortedArray.length - 1 ? 0.5 : 1 }}
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemoveDivision(div.name)}
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Update a single column (moved from the old Import tab) */}
          {participants.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Update a Single Column</h3>
              <ColumnImport />
            </div>
          )}

          {/* Reset all data */}
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#dc3545' }}>Danger Zone</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>
              Remove all participants, categories, and assignments.
            </p>
            <button className="btn btn-danger" onClick={handleResetAllData}>
              Reset All Data
            </button>
          </div>
        </div>

      <div style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>
          Watermark Image (Optional)
        </h3>
        <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
          Upload an image to use as a watermark on forms scoring sheets and
          sparring brackets.
        </p>
        <button className="btn btn-secondary" onClick={handleWatermarkSelect}>
          Select Watermark Image
        </button>
        {config.watermarkImage && (
          <p style={{ marginTop: '10px', color: '#2e7d32' }}>
            ✓ Watermark image loaded
          </p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>
          File Locations
        </h3>
        <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
          Application data and file storage locations (read-only).
        </p>
        {fileLocations ? (
          <div style={{ fontSize: '14px', fontFamily: 'monospace', backgroundColor: 'var(--bg-tertiary)', padding: '15px', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
            <div style={{ marginBottom: '10px' }}>
              <strong>Data Directory:</strong><br />
              <code>{fileLocations.dataPath}</code>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Autosave File:</strong><br />
              <code>{fileLocations.autosavePath}</code>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Default PDF Output:</strong><br />
              <code>{fileLocations.defaultPdfOutputDir}</code>
            </div>
            <div>
              <strong>Application Executable:</strong><br />
              <code>{fileLocations.exePath}</code>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading file locations...</p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>
          School Abbreviations (for Name Tags)
        </h3>
        <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
          Configure short abbreviations for school names to fit better on name tags.
          If no abbreviation is set, the full school name will be used.
        </p>
        
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowAbbreviations(!showAbbreviations)}
          style={{ marginBottom: '15px' }}
        >
          {showAbbreviations ? '▼' : '▶'} {showAbbreviations ? 'Hide' : 'Show'} Abbreviations ({Object.keys(config.schoolAbbreviations || {}).length})
        </button>

        {showAbbreviations && (
          <>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="form-label">Add School Abbreviation</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-control"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="School name (e.g., exclusive-littleton)"
                  style={{ flex: 1 }}
                />
                <span style={{ fontWeight: 'bold' }}>→</span>
                <input
                  type="text"
                  className="form-control"
                  value={newAbbreviation}
                  onChange={(e) => setNewAbbreviation(e.target.value)}
                  placeholder="Abbreviation (e.g., EMA LT)"
                  style={{ flex: 1 }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddAbbreviation()}
                />
                <button className="btn btn-primary" onClick={handleAddAbbreviation}>
                  Add
                </button>
              </div>
            </div>

            {config.schoolAbbreviations && Object.keys(config.schoolAbbreviations).length > 0 && (
              <table className="table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>School Name</th>
                    <th>Abbreviation</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(config.schoolAbbreviations).map(([schoolName, abbrev]) => (
                    <tr key={schoolName}>
                      <td>{schoolName}</td>
                      <td><strong>{abbrev}</strong></td>
                      <td>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleRemoveAbbreviation(schoolName)}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Configuration;
