import React, { useState, useMemo } from 'react';
import { Checkpoint } from '../types/tournament';

interface CheckpointItemProps {
  checkpoint: { id: string; name: string; timestamp: string };
  onLoad: () => void;
}

function CheckpointItem({ checkpoint, onLoad }: CheckpointItemProps) {
  return (
    <div
      style={{
        padding: '8px',
        marginBottom: '6px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        fontSize: '12px',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-primary)' }}>
        {checkpoint.name}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
        {new Date(checkpoint.timestamp).toLocaleString()}
      </div>
      <button
        onClick={onLoad}
        style={{
          width: '100%',
          padding: '4px 8px',
          fontSize: '11px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
          fontWeight: '600',
        }}
      >
        Load
      </button>
    </div>
  );
}

interface CheckpointSidebarProps {
  checkpoints: Checkpoint[];
  onCreateCheckpoint: (name?: string) => Promise<Checkpoint>;
  onLoadCheckpoint: (checkpointId: string) => void;
}

function CheckpointSidebar({ 
  checkpoints, 
  onCreateCheckpoint, 
  onLoadCheckpoint 
}: CheckpointSidebarProps) {
  const [newCheckpointName, setNewCheckpointName] = useState('');

  // Sort checkpoints by timestamp, newest first
  const sortedCheckpoints = useMemo(() => {
    return [...checkpoints].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [checkpoints]);

  const handleCreateCheckpoint = async () => {
    const name = newCheckpointName.trim() || `Checkpoint ${checkpoints.length + 1}`;
    await onCreateCheckpoint(name);
    setNewCheckpointName('');
  };

  return (
    <div
      style={{
        minWidth: '250px',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)',
        border: '2px solid var(--border-color)',
        borderRadius: '8px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
        Checkpoints
      </h3>
      
      {/* Create Checkpoint */}
      <div>
        <input
          type="text"
          placeholder="Checkpoint name (optional)"
          value={newCheckpointName}
          onChange={(e) => setNewCheckpointName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleCreateCheckpoint();
            }
          }}
          style={{
            width: '100%',
            padding: '6px',
            fontSize: '12px',
            marginBottom: '6px',
            border: '1px solid var(--input-border)',
            borderRadius: '4px',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleCreateCheckpoint}
          style={{
            width: '100%',
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Create Checkpoint
        </button>
      </div>
      
      {/* Checkpoint List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '10px',
        }}
      >
        {sortedCheckpoints.length === 0 ? (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
            No checkpoints saved
          </p>
        ) : (
          sortedCheckpoints.map((checkpoint) => (
            <CheckpointItem
              key={checkpoint.id}
              checkpoint={checkpoint}
              onLoad={() => onLoadCheckpoint(checkpoint.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default CheckpointSidebar;
