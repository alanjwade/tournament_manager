import React, { useState, useEffect, useRef } from 'react';
import { PrintMode, PRINT_MODE_LABELS } from '../utils/printPdf';
import { getPrintMode, setPrintMode, subscribePrintMode } from '../utils/printModeStore';
import {
  getPrinterName,
  setPrinterName,
  subscribePrinter,
  loadPrinters,
  DEFAULT_PRINTER,
  AvailablePrinter,
} from '../utils/printerStore';

/**
 * A split "print" button used across the Tournament tab.
 *
 * - The main button carries the label of the currently selected action
 *   ('Print...' for the print dialog, or 'Print Now' for a silent print).
 * - A caret dropdown on the right lets the user pick between the two actions.
 * - All print buttons share a single app-wide mode (persisted in localStorage),
 *   so changing one updates every button currently on screen in unison.
 */
interface PrintButtonProps {
  /** Invoked when the main button is pressed, with the selected print mode. */
  onPrint: (mode: PrintMode) => void;
  disabled?: boolean;
  /** Tooltip for the whole control. */
  title?: string;
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

/** One selectable printer in the dropdown (mirrors the print-mode rows). */
function PrinterMenuItem({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        padding: '6px 10px',
        fontSize: 12,
        border: 'none',
        background: selected ? 'rgba(23,162,184,0.12)' : 'transparent',
        color: 'var(--text-primary, #333)',
        cursor: 'pointer',
        fontWeight: selected ? 600 : 400,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'rgba(23,162,184,0.08)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ width: 12, flexShrink: 0 }}>{selected ? '✓' : ''}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {hint && <span style={{ fontSize: 10, color: 'var(--text-muted, #777)' }}>{hint}</span>}
    </button>
  );
}

function PrintButton({
  onPrint,
  disabled = false,
  title,
  color = DEFAULT_COLOR,
  textColor = '#ffffff',
  fontSize = 13,
  padding = '6px 12px',
  fontWeight,
  icon = '🖨️ ',
  labelSuffix = '',
  style,
}: PrintButtonProps) {
  const [mode, setMode] = useState<PrintMode>(getPrintMode);
  const [menuOpen, setMenuOpen] = useState(false);
  const [printerName, setPrinterNameState] = useState<string>(getPrinterName);
  const [printers, setPrinters] = useState<AvailablePrinter[]>([]);
  const [printersLoading, setPrintersLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep this button in sync with the shared, app-wide print mode.
  useEffect(() => {
    return subscribePrintMode(setMode);
  }, []);

  // Keep this button in sync with the shared, app-wide silent-printer selection.
  useEffect(() => {
    return subscribePrinter(setPrinterNameState);
  }, []);

  // Load the printer list the first time the dropdown is opened.
  useEffect(() => {
    if (!menuOpen) return;
    let cancelled = false;
    setPrintersLoading(true);
    loadPrinters().then((list) => {
      if (cancelled) return;
      setPrinters(list);
      setPrintersLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [menuOpen]);

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
    setPrintMode(next);
    setMenuOpen(false);
  };

  const isDialog = mode === 'dialog';
  const label = `${icon}${isDialog ? PRINT_MODE_LABELS.dialog : PRINT_MODE_LABELS.now}${labelSuffix}`;

  // Human-readable name of the remembered silent-print target.
  const selectedPrinter = printers.find((p) => p.name === printerName);
  const printerLabel = printerName
    ? selectedPrinter?.displayName || printerName
    : 'System default printer';
  const buttonTitle = isDialog
    ? title
    : `${title ? `${title} — ` : ''}Prints to: ${printerLabel}`;

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
        title={buttonTitle}
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
            minWidth: '230px',
            maxHeight: '60vh',
            overflowY: 'auto',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
            border: '1px solid var(--border-color, #ddd)',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
                    : `Print immediately to ${printerLabel}`}
                </div>
              </button>
            );
          })}

          {/* Silent-print printer picker. Remembered app-wide and used by every
              "Print Now" action. */}
          <div
            style={{
              borderTop: '1px solid var(--border-color, #ddd)',
              padding: '8px 10px 6px',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-muted, #777)',
            }}
          >
            Print Now printer
          </div>
          {printersLoading ? (
            <div style={{ padding: '6px 10px 10px', fontSize: 12, color: 'var(--text-muted, #777)' }}>
              Loading printers…
            </div>
          ) : (
            <>
              <PrinterMenuItem
                label="System default"
                selected={printerName === DEFAULT_PRINTER}
                onClick={() => setPrinterName(DEFAULT_PRINTER)}
              />
              {printers.map((printer) => (
                <PrinterMenuItem
                  key={printer.name}
                  label={printer.displayName || printer.name}
                  hint={printer.description || undefined}
                  selected={printerName === printer.name}
                  onClick={() => setPrinterName(printer.name)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PrintButton;

