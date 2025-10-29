import React, { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { PhysicalRing, Division } from '../types/tournament';

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
  const saveState = useTournamentStore((state) => state.saveState);
  const loadState = useTournamentStore((state) => state.loadState);

  const [divisionName, setDivisionName] = useState('');

  const handleAddDivision = () => {
    if (!divisionName.trim()) return;
    const newDivision: Division = {
      name: divisionName.trim(),
      order: config.divisions.length + 1,
      numRings: 1,
    };
    setDivisions([...config.divisions, newDivision]);
    setDivisionName('');
  };

  const handleRemoveDivision = (name: string) => {
    setDivisions(config.divisions.filter((d) => d.name !== name));
  };

  const handleDivisionRingsChange = (divisionName: string, rings: number) => {
    setDivisions(
      config.divisions.map((d) =>
        d.name === divisionName ? { ...d, numRings: rings } : d
      )
    );
  };

  const handleSetPhysicalRings = () => {
    // Find the maximum number of rings needed across all divisions
    const maxRings = Math.max(...config.divisions.map(d => d.numRings || 1), 0);
    if (maxRings < 1 || maxRings > 14) {
      alert('Number of rings must be between 1 and 14');
      return;
    }
    const rings: PhysicalRing[] = [];
    for (let i = 1; i <= maxRings; i++) {
      rings.push({
        id: `ring-${i}`,
        name: `Ring ${i}`,
        color: RING_COLOR_MAP[i],
      });
    }
    setPhysicalRings(rings);
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
                <th>Rings</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {config.divisions.map((div) => (
                <tr key={div.name}>
                  <td>{div.name}</td>
                  <td>{div.order}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={div.numRings || 1}
                      onChange={(e) =>
                        handleDivisionRingsChange(div.name, parseInt(e.target.value) || 1)
                      }
                      style={{ width: '60px', padding: '4px' }}
                    />
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
        </div>

        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>
            Physical Rings
          </h3>
          
          <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
            Set the number of rings for each division above (max 14 per division). Physical rings 
            will be generated based on the maximum rings needed across all divisions. Since divisions 
            run one at a time, rings are reused.
          </p>

          <button className="btn btn-primary" onClick={handleSetPhysicalRings}>
            Set Physical Rings
          </button>

          {config.physicalRings.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>
                Configured Rings ({config.physicalRings.length})
              </h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Ring #</th>
                    <th>Color</th>
                    <th>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {config.physicalRings.map((ring, idx) => (
                    <tr key={ring.id}>
                      <td>{idx + 1}</td>
                      <td>{RING_COLOR_NAMES[idx + 1] || ring.color}</td>
                      <td>
                        <div
                          style={{
                            width: '60px',
                            height: '30px',
                            backgroundColor: ring.color,
                            border: '1px solid #333',
                            borderRadius: '4px',
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
    </div>
  );
}

export default Configuration;
