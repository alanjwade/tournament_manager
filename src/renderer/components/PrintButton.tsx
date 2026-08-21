import React, { useState, useEffect, useRef } from 'react';
import { PrintMode, PRINT_MODE_LABELS } from '../utils/printPdf';

/**
 * A split "print" button used across the Tournament tab.
 *
 * - The main button carries the label of the currently selected action
 *   ('Print...' for the print dialog, or 'Print Now' for a silent print).
 * - A caret dropdown on the right lets the user pick between the two actions.
 * - The selected action is remembered in localStorage so it persists.
 */
interface PrintButtonProps {
  /** Invoked when the main button is pressed, with the selected print mode. */
  onPrint: (mode: PrintMode) => void;
  disabled?: boolean;
  /** Tooltip for the whole control. */
  title?: string;
  /** Optional storage key used to remember the selected mode (defaults to a shared key). */
  storageKey?: string;
  /** Background color of the buttons. */
  color?: string;
  /** Text color of the buttons. */
  textColor?: string;
  fontSize?: string | number;
  padding?: string;
  fontWeight?: string | number;
  /** Optional icon to show before the label (defaults to a printer emoji). */
  icon?: string;
  /** Optional text appended after the label (e.g. ' (5)'). */
  labelSuffix?: string;
  /** Extra style overrides merged into the main button's style. */
  style?: React.CSSProperties;
}

const DEFAULT_COLOR = '#17a2b8';

function PrintButton({
  onPrint,
  disabled = false,
  title,
  storageKey = 'tournament-print-mode',
  color = DEFAULT_COLOR,
  textColor = '#ffffff',
  fontSize = 13,
  padding = '6px 12px',
  fontWeight,
  icon = '🖨️ ',
  labelSuffix = '',
  style,
}: PrintButtonProps) {
  const [mode, setMode] = useState<PrintMode>(() => {
    const saved = localStorage.getItem(storageKey) as PrintMode | null;
    return saved === 'dialog' || saved === 'now' ? saved : 'dialog';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Persist the chosen mode.
  useEffect(() => {
    localStorage.setItem(storageKey, mode);
  }, [mode, storageKey]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectMode = (next: PrintMode) => {
    setMode(next);
    setMenuOpen(false);
  };

  const isDialog = mode === 'dialog';
  const label = `${icon}${isDialog ? PRINT_MODE_LABELS.dialog : PRINT_MODE_LABELS.now}${labelSuffix}`;

  const base: React.CSSProperties = {
    backgroundColor: color,
    color: textColor,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    whiteSpace: 'nowrap',
    ...style,
  };

  return (
    <div
      ref={rootRef}
      style={{ display: 'inline-flex', position: 'relative', alignItems: 'stretch' }}
    >
      <button
        type="button"
        onClick={() => onPrint(mode)}
        disabled={disabled}
        title={title}
        style={{
          ...base,
          padding,
          fontSize,
          fontWeight,
          borderTopLeftRadius: '4px',
          borderBottomLeftRadius: '4px',
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        disabled={disabled}
        aria-label={`Choose print action (currently ${PRINT_MODE_LABELS[mode]})`}
        title={title}
        style={{
          ...base,
          padding: '0 7px',
          fontSize,
          fontWeight,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: '4px',
          borderBottomRightRadius: '4px',
          borderLeft: '1px solid rgba(0,0,0,0.15)',
        }}
      >
        ▼
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '2px',
            zIndex: 1000,
            minWidth: '190px',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
            border: '1px solid var(--border-color, #ddd)',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}
        >
          {(Object.keys(PRINT_MODE_LABELS) as PrintMode[]).map((option) => {
            const active = option === mode;
            return (
              <button
                key={option}
                type="button"
                onClick={() => selectMode(option)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  fontSize: 13,
                  border: 'none',
                  background: active ? 'rgba(23,162,184,0.12)' : 'transparent',
                  color: 'var(--text-primary, #333)',
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'rgba(23,162,184,0.08)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {option === 'dialog' ? 'Print...' : 'Print Now'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #777)' }}>
                  {option === 'dialog'
                    ? 'Show print dialog to pick a printer / options'
                    : 'Print immediately with last options'}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PrintButton;

