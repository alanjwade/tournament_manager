import React, { useState } from 'react';

interface UpdateCheckerProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpdateChecker: React.FC<UpdateCheckerProps> = ({ isOpen, onClose }) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkForUpdates = async () => {
    setChecking(true);
    setResult(null);
    
    try {
      const updateInfo = await window.electronAPI.checkForUpdates();
      setResult(updateInfo);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to check for updates',
      });
    } finally {
      setChecking(false);
    }
  };

  const handleDownload = async () => {
    await window.electronAPI.openDownloadPage();
    onClose();
  };

  React.useEffect(() => {
    if (isOpen && !result) {
      checkForUpdates();
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
        maxWidth: '450px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Check for Updates</h2>
        
        {checking && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p>Checking for updates...</p>
          </div>
        )}

        {!checking && result && result.success && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p><strong>Current Version:</strong> {result.currentVersion}</p>
            <p><strong>Latest Version:</strong> {result.latestVersion}</p>
            
            {result.updateAvailable ? (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--success-bg, #d4edda)',
                color: 'var(--success-text, #155724)',
                borderRadius: '4px',
              }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>
                  ✓ A new version is available!
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  Click "Download Update" to get the latest version.
                </p>
              </div>
            ) : (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--info-bg, #d1ecf1)',
                color: 'var(--info-text, #0c5460)',
                borderRadius: '4px',
              }}>
                <p style={{ margin: 0 }}>
                  ✓ You are running the latest version.
                </p>
              </div>
            )}
          </div>
        )}

        {!checking && result && !result.success && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: 'var(--error-bg, #f8d7da)',
            color: 'var(--error-text, #721c24)',
            borderRadius: '4px',
          }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>
              Failed to check for updates
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              {result.error || 'Please check your internet connection and try again.'}
            </p>
            {result.currentVersion && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                Current version: {result.currentVersion}
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {result && result.success && result.updateAvailable && (
            <button
              onClick={handleDownload}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: 'var(--success-color, #28a745)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Download Update
            </button>
          )}
          {result && !result.success && (
            <button
              onClick={checkForUpdates}
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: 'var(--secondary-color, #6c757d)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateChecker;
