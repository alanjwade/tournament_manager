import React from 'react';

/**
 * Shared layout tokens for the participant forms (Add Participant and Quick
 * Edit). Keeping these in one place keeps the two modals visually consistent:
 * biographical fields on the left, Forms/Sparring assignments on the right.
 */

export const participantFieldGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
  marginBottom: '12px',
};

export const participantFieldLabel: React.CSSProperties = {
  display: 'block',
  marginBottom: '4px',
  fontWeight: 600,
  fontSize: '12px',
  color: 'var(--text-secondary)',
};

export const participantFieldInput: React.CSSProperties = {
  width: '100%',
  padding: '7px 8px',
  fontSize: '13px',
  border: '1px solid var(--input-border)',
  borderRadius: '4px',
  backgroundColor: 'var(--input-bg)',
  color: 'var(--text-primary)',
};

export const participantFieldInputDisabled: React.CSSProperties = {
  ...participantFieldInput,
  backgroundColor: 'var(--bg-tertiary)',
  opacity: 0.6,
  cursor: 'not-allowed',
};

export const participantModalCard: React.CSSProperties = {
  minWidth: 0,
  padding: '14px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-secondary)',
};

export const participantBioColumn: React.CSSProperties = {
  minWidth: 0,
  paddingRight: '20px',
  borderRight: '1px solid var(--border-color)',
};

export const participantSectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 600,
};
