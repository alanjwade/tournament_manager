import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';

export default function CheckpointManager() {
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedDiff, setSelectedDiff] = useState<{
    checkpointName: string;
    participantsAdded: any[];
    participantsRemoved: any[];
    participantsModified: any[];
    ringsAffected: string[];
  } | null>(null);
  
  const checkpoints = useTournamentStore((state) => state.checkpoints);
  const createCheckpoint = useTournamentStore((state) => state.createCheckpoint);
  const renameCheckpoint = useTournamentStore((state) => state.renameCheckpoint);
  const deleteCheckpoint = useTournamentStore((state) => state.deleteCheckpoint);
  const diffCheckpoint = useTournamentStore((state) => state.diffCheckpoint);
  const loadCheckpoint = useTournamentStore((state) => state.loadCheckpoint);

  const handleCreateCheckpoint = () => {
    if (newCheckpointName.trim()) {
      createCheckpoint(newCheckpointName.trim());
      setNewCheckpointName('');
    } else {
      createCheckpoint();
    }
  };

  const handleRename = (checkpointId: string) => {
    if (editingName.trim()) {
      renameCheckpoint(checkpointId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleDelete = (checkpointId: string, checkpointName: string) => {
    if (confirm(`Delete checkpoint "${checkpointName}"?`)) {
      deleteCheckpoint(checkpointId);
      if (selectedDiff && checkpoints.find(c => c.id === checkpointId)?.name === selectedDiff.checkpointName) {
        setSelectedDiff(null);
      }
    }
  };

  const handleViewDiff = (checkpointId: string) => {
    const diff = diffCheckpoint(checkpointId);
    if (diff) {
      const checkpoint = checkpoints.find(c => c.id === checkpointId);
      setSelectedDiff({
        checkpointName: checkpoint?.name || 'Unknown',
        participantsAdded: diff.participantsAdded,
        participantsRemoved: diff.participantsRemoved,
        participantsModified: diff.participantsModified,
        ringsAffected: Array.from(diff.ringsAffected).sort(),
      });
    }
  };

  const sortedCheckpoints = [...checkpoints].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="checkpoint-manager" style={{ width: 'fit-content', minWidth: 0 }}>
      <h2>Checkpoint Manager</h2>
      
      {/* Create New Checkpoint */}
      <div className="checkpoint-create" style={{ marginBottom: '20px' }}>
        <h3>Create Checkpoint</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Checkpoint name (optional)"
            value={newCheckpointName}
            onChange={(e) => setNewCheckpointName(e.target.value)}
            style={{ flex: 1, padding: '5px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px' }}
          />
          <button onClick={handleCreateCheckpoint}>Create Checkpoint</button>
        </div>
      </div>

      {/* Checkpoint List */}
      <div className="checkpoint-list">
        <h3>Saved Checkpoints ({checkpoints.length})</h3>
        {sortedCheckpoints.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No checkpoints saved yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Created</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCheckpoints.map((checkpoint) => (
                <tr key={checkpoint.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px' }}>
                    {editingId === checkpoint.id ? (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(checkpoint.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={{ flex: 1, padding: '3px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '3px' }}
                          autoFocus
                        />
                        <button onClick={() => handleRename(checkpoint.id)}>Save</button>
                        <button onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <strong>{checkpoint.name}</strong>
                    )}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {new Date(checkpoint.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => {
                          setEditingId(checkpoint.id);
                          setEditingName(checkpoint.name);
                        }}
                        disabled={editingId !== null}
                      >
                        Rename
                      </button>
                      <button onClick={() => handleViewDiff(checkpoint.id)}>
                        View Diff
                      </button>
                      <button onClick={() => loadCheckpoint(checkpoint.id)}>
                        Load
                      </button>
                      <button 
                        onClick={() => handleDelete(checkpoint.id, checkpoint.name)}
                        style={{ backgroundColor: '#ff4444', color: 'white' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Diff Display */}
      {selectedDiff && (
        <div className="checkpoint-diff" style={{ 
          marginTop: '30px', 
          padding: '20px', 
          border: '2px solid var(--border-color)',
          borderRadius: '5px',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Changes from "{selectedDiff.checkpointName}"</h3>
            <button onClick={() => setSelectedDiff(null)}>Close</button>
          </div>

          {/* Summary */}
          <div style={{ marginTop: '15px', marginBottom: '20px' }}>
            <p><strong>Summary:</strong></p>
            <ul>
              <li>Participants Added: {selectedDiff.participantsAdded.length}</li>
              <li>Participants Removed: {selectedDiff.participantsRemoved.length}</li>
              <li>Participants Modified: {selectedDiff.participantsModified.length}</li>
              <li>Rings Affected: {selectedDiff.ringsAffected.length}</li>
            </ul>
          </div>

          {/* Affected Rings */}
          {selectedDiff.ringsAffected.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>Affected Rings ({selectedDiff.ringsAffected.length})</h4>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '10px',
                padding: '10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '3px'
              }}>
                {selectedDiff.ringsAffected.map((ring) => (
                  <span key={ring} style={{ 
                    padding: '5px 10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    borderRadius: '3px',
                    fontSize: '14px'
                  }}>
                    {ring}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Participants Added */}
          {selectedDiff.participantsAdded.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#28a745' }}>Participants Added ({selectedDiff.participantsAdded.length})</h4>
              <ul style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {selectedDiff.participantsAdded.map((p) => (
                  <li key={p.id}>
                    {p.firstName} {p.lastName} - {p.school}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Participants Removed */}
          {selectedDiff.participantsRemoved.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#dc3545' }}>Participants Removed ({selectedDiff.participantsRemoved.length})</h4>
              <ul style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {selectedDiff.participantsRemoved.map((p) => (
                  <li key={p.id}>
                    {p.firstName} {p.lastName} - {p.school}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Participants Modified */}
          {selectedDiff.participantsModified.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#ffc107' }}>Participants Modified ({selectedDiff.participantsModified.length})</h4>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {selectedDiff.participantsModified.map((change) => (
                  <div key={`${change.participantId}-${change.field}`} style={{ 
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '3px'
                  }}>
                    <strong>{change.participantName}</strong>
                    <div style={{ marginTop: '5px', fontSize: '14px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{change.field}:</span>{' '}
                      <span style={{ color: '#dc3545' }}>{String(change.oldValue) || '(empty)'}</span>
                      {' → '}
                      <span style={{ color: '#28a745' }}>{String(change.newValue) || '(empty)'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Changes */}
          {selectedDiff.participantsAdded.length === 0 && 
           selectedDiff.participantsRemoved.length === 0 && 
           selectedDiff.participantsModified.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No changes detected.</p>
          )}
        </div>
      )}
    </div>
  );
}
