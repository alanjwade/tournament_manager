import React, { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { readSpreadsheetHeaders, applyColumnImport, UPDATABLE_FIELDS, ColumnImportResult } from '../utils/columnImport';
import { Participant } from '../types/tournament';

type Step = 'idle' | 'file_loaded' | 'applied';

interface State {
  step: Step;
  fileData: number[] | null;
  fileName: string;
  headers: string[];
  selectedHeader: string;
  selectedField: keyof Participant | '';
  result: ColumnImportResult | null;
  error: string | null;
}

const INITIAL_STATE: State = {
  step: 'idle',
  fileData: null,
  fileName: '',
  headers: [],
  selectedHeader: '',
  selectedField: '',
  result: null,
  error: null,
};

export function ColumnImport() {
  const participants = useTournamentStore((state) => state.participants);
  const setParticipants = useTournamentStore((state) => state.setParticipants);
  const [state, setState] = useState<State>(INITIAL_STATE);

  // ── file selection ──────────────────────────────────────────────────────────

  const handleSelectFile = async () => {
    setState(s => ({ ...s, error: null }));
    try {
      const result = await window.electronAPI.selectFile();
      if (!result) return;

      const headers = readSpreadsheetHeaders(result.data);
      if (headers.length === 0) {
        setState(s => ({ ...s, error: 'Could not read any headers from the file.' }));
        return;
      }

      setState(s => ({
        ...s,
        step: 'file_loaded',
        fileData: result.data,
        fileName: result.path.split('/').pop() ?? result.path,
        headers,
        selectedHeader: '',
        selectedField: '',
        result: null,
        error: null,
      }));
    } catch (e) {
      setState(s => ({ ...s, error: e instanceof Error ? e.message : 'Error reading file' }));
    }
  };

  const handleDropFile = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const data = Array.from(new Uint8Array(arrayBuffer));
    const headers = readSpreadsheetHeaders(data);
    if (headers.length === 0) {
      setState(s => ({ ...s, error: 'Could not read any headers from the file.' }));
      return;
    }
    setState(s => ({
      ...s,
      step: 'file_loaded',
      fileData: data,
      fileName: file.name,
      headers,
      selectedHeader: '',
      selectedField: '',
      result: null,
      error: null,
    }));
  };

  // ── apply ───────────────────────────────────────────────────────────────────

  const handleApply = () => {
    if (!state.fileData || !state.selectedHeader || !state.selectedField) return;

    const { updatedParticipants, result } = applyColumnImport(
      state.fileData,
      state.selectedHeader,
      state.selectedField,
      participants,
    );

    setParticipants(updatedParticipants);
    setState(s => ({ ...s, step: 'applied', result }));
  };

  const handleReset = () => setState(INITIAL_STATE);

  // ── render ──────────────────────────────────────────────────────────────────

  const canApply =
    state.step === 'file_loaded' &&
    state.selectedHeader !== '' &&
    state.selectedField !== '';

  return (
    <div
      style={{
        marginTop: '30px',
        padding: '20px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '6px', color: 'var(--text-primary)' }}>
        Update a Single Column
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: 0 }}>
        Import one column from a spreadsheet and apply it to your existing participants.
        Rows are matched by first name + last name (case-insensitive).
      </p>

      {state.error && (
        <div className="warning" style={{ marginBottom: '12px' }}>
          <strong>Error:</strong> {state.error}
        </div>
      )}

      {/* ── Step 1: pick file ── */}
      {state.step === 'idle' && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDropFile}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: '6px',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--bg-primary)',
          }}
          onClick={handleSelectFile}
        >
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            Drag & drop or <strong>click to browse</strong> for a spreadsheet
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Accepts .xlsx, .xls, or .csv
          </p>
        </div>
      )}

      {/* ── Step 2: configure ── */}
      {state.step === 'file_loaded' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>📄</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{state.fileName}</span>
            <span style={{ color: 'var(--text-muted)' }}>— {state.headers.length} columns detected</span>
            <button
              className="btn btn-secondary"
              style={{ marginLeft: 'auto', padding: '2px 10px', fontSize: '12px' }}
              onClick={handleReset}
            >
              Change file
            </button>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {/* Source column */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Source column in spreadsheet
              </span>
              <select
                className="form-control"
                value={state.selectedHeader}
                onChange={e => setState(s => ({ ...s, selectedHeader: e.target.value }))}
              >
                <option value="">— select column —</option>
                {state.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </label>

            {/* Target field */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                Participant field to update
              </span>
              <select
                className="form-control"
                value={state.selectedField}
                onChange={e => setState(s => ({ ...s, selectedField: e.target.value as keyof Participant | '' }))}
              >
                <option value="">— select field —</option>
                {Object.entries(UPDATABLE_FIELDS).map(([label, field]) => (
                  <option key={field} value={field}>{label} → {field}</option>
                ))}
              </select>
            </label>
          </div>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(33,150,243,0.1)',
              border: '1px solid rgba(33,150,243,0.3)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginBottom: '14px',
            }}
          >
            <strong>Verification:</strong> each row in the spreadsheet must have a column named{' '}
            <em>First Name</em> (or "Student First Name") and <em>Last Name</em> (or "Student Last
            Name"). Those are used to confirm the right record is being updated.
          </div>

          <button
            className="btn btn-primary"
            disabled={!canApply}
            onClick={handleApply}
          >
            Apply column update
          </button>
        </div>
      )}

      {/* ── Step 3: results ── */}
      {state.step === 'applied' && state.result && (
        <div>
          <ResultSummary result={state.result} />
          <button
            className="btn btn-secondary"
            style={{ marginTop: '14px' }}
            onClick={handleReset}
          >
            Import another column
          </button>
        </div>
      )}
    </div>
  );
}

// ── Result summary sub-component ─────────────────────────────────────────────

function ResultSummary({ result }: { result: ColumnImportResult }) {
  const [showDetails, setShowDetails] = useState(false);
  const [detailFilter, setDetailFilter] = useState<'all' | 'updated' | 'unchanged' | 'not_matched'>('all');

  const filtered = showDetails
    ? result.details.filter(d => detailFilter === 'all' || d.status === detailFilter)
    : [];

  return (
    <div>
      <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--text-primary)' }}>
        ✅ Update complete — <em style={{ fontStyle: 'normal' }}>{result.fieldName}</em>
      </h4>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '14px',
        }}
      >
        <Stat label="Updated" value={result.updated} color="#28a745" />
        <Stat label="Already same" value={result.unchanged} color="var(--text-muted)" />
        <Stat label="No match in data" value={result.notMatched.length} color="#ffc107" />
      </div>

      {result.notMatched.length > 0 && (
        <div
          className="warning"
          style={{ marginBottom: '12px', fontSize: '12px' }}
        >
          <strong>⚠ Rows not matched ({result.notMatched.length}):</strong>{' '}
          {result.notMatched.slice(0, 8).join(', ')}
          {result.notMatched.length > 8 && ` …and ${result.notMatched.length - 8} more`}
        </div>
      )}

      <button
        className="btn btn-secondary"
        style={{ fontSize: '12px', padding: '4px 12px' }}
        onClick={() => setShowDetails(v => !v)}
      >
        {showDetails ? 'Hide' : 'Show'} details
      </button>

      {showDetails && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {(['all', 'updated', 'unchanged', 'not_matched'] as const).map(f => (
              <button
                key={f}
                className={`btn ${detailFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '2px 10px' }}
                onClick={() => setDetailFilter(f)}
              >
                {f === 'not_matched' ? 'No match' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div
            style={{
              maxHeight: '280px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              fontSize: '12px',
            }}
          >
            {filtered.length === 0 && (
              <div style={{ padding: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                No entries in this category
              </div>
            )}
            {filtered.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '10px',
                  padding: '5px 10px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none',
                  backgroundColor: d.status === 'updated' ? 'rgba(40,167,69,0.06)' :
                    d.status === 'not_matched' ? 'rgba(255,193,7,0.08)' : 'transparent',
                }}
              >
                <span style={{ width: '16px', textAlign: 'center', flexShrink: 0 }}>
                  {d.status === 'updated' ? '✓' : d.status === 'not_matched' ? '⚠' : '–'}
                </span>
                <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: d.status === 'updated' ? 'bold' : 'normal' }}>
                  {d.name}
                </span>
                {d.status === 'updated' && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>
                      {String(d.oldValue ?? '(empty)')}
                    </span>
                    →{' '}
                    <span style={{ color: '#28a745' }}>{String(d.newValue ?? '')}</span>
                  </span>
                )}
                {d.status === 'unchanged' && (
                  <span style={{ color: 'var(--text-muted)' }}>{String(d.oldValue ?? '(empty)')}</span>
                )}
                {d.status === 'not_matched' && (
                  <span style={{ color: '#ffc107' }}>not found in participants</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        padding: '8px 16px',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-primary)',
        textAlign: 'center',
        minWidth: '90px',
      }}
    >
      <div style={{ fontSize: '22px', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}
