import React, { useEffect, useState } from 'react';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getAppVersion().then(v => setVersion(v));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'var(--bg-color)',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>About TournamentManager</h2>
        <div style={{ marginBottom: '1.5rem' }}>
          <p><strong>Version:</strong> {version}</p>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            Martial Arts Tournament Management Application
          </p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Manage tournament participant registration, ring assignments, and PDF generation.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutDialog;
