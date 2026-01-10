import React, { useState, useEffect } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { PhysicalRing, Division } from '../types/tournament';
import defaultWatermark from '../assets/logos/watermark.png';

// Color map from your original Google Sheets script
const RING_COLOR_MAP: { [key: number]: string } = {
  1: '#ff0000',
  2: '#ffa500',
  3: '#ffff00',
  4: '#34a853',
  5: '#0000ff',
  6: '#fd2670',
  7: '#8441be',
  8: '#999999',
  9: '#000000',
  10: '#b68a46',
  11: '#f78db3',
  12: '#6fa8dc',
  13: '#b6d7a8',
  14: '#b4a7d6',
};

const RING_COLOR_NAMES: { [key: number]: string } = {
  1: 'Red',
  2: 'Orange',
  3: 'Yellow',
  4: 'Green',
  5: 'Blue',
  6: 'Pink',
  7: 'Purple',
  8: 'Gray',
  9: 'Black',
  10: 'Brown',
  11: 'Light Pink',
  12: 'Light Blue',
  13: 'Light Green',
  14: 'Light Purple',
};

function Configuration() {
  const config = useTournamentStore((state) => state.config);
  const setDivisions = useTournamentStore((state) => state.setDivisions);
  const setPhysicalRings = useTournamentStore((state) => state.setPhysicalRings);
  const setWatermark = useTournamentStore((state) => state.setWatermark);
  const setPdfOutputDirectory = useTournamentStore((state) => state.setPdfOutputDirectory);
  const setSchoolAbbreviations = useTournamentStore((state) => state.setSchoolAbbreviations);
  const saveState = useTournamentStore((state) => state.saveState);
  const loadState = useTournamentStore((state) => state.loadState);

  const [divisionName, setDivisionName] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newAbbreviation, setNewAbbreviation] = useState('');
  const [showAbbreviations, setShowAbbreviations] = useState(false);

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

  const handleAddDivision = () => {
    if (!divisionName.trim()) return;
    const newDivision: Division = {
      name: divisionName.trim(),
      order: config.divisions.length + 1,
      numPools: 1,
    };
    setDivisions([...config.divisions, newDivision]);
    setDivisionName('');
  };

  const handleRemoveDivision = (name: string) => {
    setDivisions(config.divisions.filter((d) => d.name !== name));
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

  const handlePdfDirectorySelect = async () => {
    const directory = await window.electronAPI.selectDirectory();
    if (directory) {
      setPdfOutputDirectory(directory);
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

      {/* Save/Load Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button className="btn btn-primary" onClick={saveState}>
          💾 Save Tournament
        </button>
        <button className="btn btn-secondary" onClick={loadState}>
          📂 Load Tournament
        </button>
      </div>

      <div className="grid grid-2">
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {config.divisions.map((div) => (
                <tr key={div.name}>
                  <td>{div.name}</td>
                  <td>{div.order}</td>
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
          PDF Output Directory (Optional)
        </h3>
        <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
          Select a default directory where all PDFs will be saved. If not set,
          you'll be prompted to choose a location each time you export a PDF.
        </p>
        <button className="btn btn-secondary" onClick={handlePdfDirectorySelect}>
          Select PDF Directory
        </button>
        {config.pdfOutputDirectory && (
          <p style={{ marginTop: '10px', color: '#2e7d32', fontSize: '14px' }}>
            ✓ PDFs will be saved to: <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>{config.pdfOutputDirectory}</code>
          </p>
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
