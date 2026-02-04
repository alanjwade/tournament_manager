import React, { useState, useMemo } from 'react';
import { Checkpoint } from '../types/tournament';

interface CheckpointItemProps {
  checkpoint: { id: string; name: string; timestamp: string };
  isLatest: boolean;
  onLoad: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

function CheckpointItem({ checkpoint, isLatest, onLoad, onRename, onDelete }: CheckpointItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(checkpoint.name);

  const handleRename = () => {
    if (newName.trim() && newName !== checkpoint.name) {
      onRename(newName.trim());
    }
    setIsRenaming(false);
    setNewName(checkpoint.name);
  };

  return (
    <div
      style={{
        padding: '8px',
        marginBottom: '6px',
        backgroundColor: isLatest ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: isLatest ? '2px solid #007bff' : '1px solid var(--border-color)',
        borderRadius: '4px',
        fontSize: '12px',
      }}
    >
      {isRenaming ? (
        <div style={{ marginBottom: '6px' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            autoFocus
            style={{
              width: '100%',
              padding: '4px',
              fontSize: '11px',
              border: '1px solid var(--input-border)',
              borderRadius: '3px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              boxSizing: 'border-box',
              marginBottom: '4px',
            }}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleRename}
              style={{
                flex: 1,
                padding: '3px 6px',
                fontSize: '10px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              ✓
            </button>
            <button
              onClick={() => {
                setIsRenaming(false);
                setNewName(checkpoint.name);
              }}
              style={{
                flex: 1,
                padding: '3px 6px',
                fontSize: '10px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-primary)' }}>
            {checkpoint.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            {new Date(checkpoint.timestamp).toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={onLoad}
              style={{
                flex: 1,
                padding: '4px 6px',
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
            <button
              onClick={() => setIsRenaming(true)}
              style={{
                flex: 0.5,
                padding: '4px 6px',
                fontSize: '11px',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
              title="Rename"
            >
              ✎
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete checkpoint "${checkpoint.name}"?`)) {
                  onDelete();
                }
              }}
              style={{
                flex: 0.5,
                padding: '4px 6px',
                fontSize: '11px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
              title="Delete"
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface CheckpointSidebarProps {
  checkpoints: Checkpoint[];
  onCreateCheckpoint: (name?: string) => Promise<Checkpoint>;
  onLoadCheckpoint: (checkpointId: string) => void;
  onRenameCheckpoint: (checkpointId: string, newName: string) => void;
  onDeleteCheckpoint: (checkpointId: string) => void;
  onPrintAllChanged?: () => void;
  changedRingsCounts?: { forms: number; sparring: number; total: number };
  selectedDivision?: string;
  printingAllChanged?: boolean;
}

function CheckpointSidebar({ 
  checkpoints, 
  onCreateCheckpoint, 
  onLoadCheckpoint,
  onRenameCheckpoint,
  onDeleteCheckpoint,
  onPrintAllChanged,
  changedRingsCounts,
  selectedDivision = 'all',
  printingAllChanged = false,
}: CheckpointSidebarProps) {
  const [newCheckpointName, setNewCheckpointName] = useState('');

  // Sort checkpoints by timestamp, newest first
  const sortedCheckpoints = useMemo(() => {
    return [...checkpoints].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [checkpoints]);

  const latestCheckpoint = sortedCheckpoints[0] || null;

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

      {/* Print All Changed */}
      {latestCheckpoint && onPrintAllChanged && changedRingsCounts && changedRingsCounts.total > 0 && (
        <div>
          <div style={{
            marginBottom: '8px',
            padding: '8px 10px',
            backgroundColor: 'var(--bg-secondary)',
            border: '2px solid #dc3545',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--text-primary)',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>⚠️</span>
            <span style={{ marginLeft: '6px', fontWeight: 'bold' }}>
              {changedRingsCounts.total} ring{changedRingsCounts.total !== 1 ? 's' : ''} changed
            </span>
          </div>
          <button
            onClick={onPrintAllChanged}
            disabled={printingAllChanged}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: printingAllChanged ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: printingAllChanged ? 0.6 : 1,
            }}
          >
            🖨️ Print All {selectedDivision !== 'all' ? `${selectedDivision} ` : ''}Changed
          </button>
        </div>
      )}
      
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
              isLatest={latestCheckpoint?.id === checkpoint.id}
              onLoad={() => onLoadCheckpoint(checkpoint.id)}
              onRename={(newName) => onRenameCheckpoint(checkpoint.id, newName)}
              onDelete={() => onDeleteCheckpoint(checkpoint.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default CheckpointSidebar;
