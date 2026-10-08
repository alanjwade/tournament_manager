import React, { useState } from 'react';
import jsPDF from 'jspdf';

type AssistantTopic = 'sparring' | 'withdraw' | 'move' | 'baseline';

interface TournamentAssistantDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const topics: { key: AssistantTopic; label: string }[] = [
  { key: 'sparring', label: 'Add / Remove from Sparring' },
  { key: 'withdraw', label: 'Withdraw / Unwithdraw' },
  { key: 'move', label: 'Move to Another Ring' },
  { key: 'baseline', label: 'Baseline & Print Changes' },
];

/* ------------------------------------------------------------------ */
/*  Content sections                                                   */
/* ------------------------------------------------------------------ */

function SparringHelp() {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Add / Remove a Person from Sparring</h3>
      <p>Use this when a competitor signs up for sparring on the day of the tournament or decides not to compete in it.</p>

      <h4>Adding Someone to Sparring</h4>
      <ol>
        <li>
          Open <strong>Quick Edit</strong> for the participant: find them in any ring on the Tournament
          tab and click their name, or — often faster — type their name in the{' '}
          <strong>Search Participants</strong> box at the top of the screen and click their name in the
          results.
        </li>
        <li>
          In the <strong>Sparring</strong> section, check the <strong>Competing Sparring</strong> checkbox so it is
          enabled.
        </li>
        <li>
          Choose their <strong>Division</strong>, <strong>Category</strong>, and <strong>Pool</strong> from the
          dropdowns that appear.
        </li>
        <li>
          Click <strong>Save</strong>. The participant will appear in the selected sparring ring immediately.
        </li>
      </ol>
      <div style={tipStyle}>
        <strong>Tip:</strong> If you leave <em>Copy sparring from forms</em> checked, the division and category fields
        will automatically match the participant's forms assignment — just pick the pool.
      </div>

      <h4>Removing Someone from Sparring</h4>
      <ol>
        <li>
          Open <strong>Quick Edit</strong>: click their name in a ring, or type their name in the{' '}
          <strong>Search Participants</strong> box and click the result.
        </li>
        <li>
          In the <strong>Sparring</strong> section, uncheck the <strong>Competing Sparring</strong> checkbox.
        </li>
        <li>
          Click <strong>Save</strong>. The participant will be removed from their sparring ring but will remain in
          forms.
        </li>
      </ol>
      <div style={tipStyle}>
        <strong>Note:</strong> Removing someone from sparring does <em>not</em> delete their record. You can add them
        back at any time.
      </div>
    </div>
  );
}

function WithdrawHelp() {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Withdraw / Unwithdraw a Participant</h3>
      <p>Use this when a competitor does not show up or needs to be fully removed from competition.</p>

      <h4>Withdrawing a Participant</h4>
      <ol>
        <li>
          Open <strong>Quick Edit</strong> for the participant: click their name in any ring, or type
          their name in the <strong>Search Participants</strong> box at the top of the screen and click
          the result.
        </li>
        <li>
          Click the <strong>Withdraw</strong> button. This marks the participant as not competing in{' '}
          <em>both</em> forms and sparring.
        </li>
        <li>
          Click <strong>Save</strong>. The participant disappears from all rings but is still in the system.
        </li>
      </ol>
      <div style={tipStyle}>
        <strong>Tip:</strong> Withdrawn participants appear grayed out in the Editor tab so you can always find and
        edit them later.
      </div>

      <h4>Undoing a Withdrawal (Unwithdraw)</h4>
      <ol>
        <li>
          Use the <strong>Search Participants</strong> box at the top of the screen to find the person by
          name.
        </li>
        <li>
          Click their name in the search results to open <strong>Quick Edit</strong>.
        </li>
        <li>
          Manually re-check <strong>Competing Forms</strong> and / or <strong>Competing Sparring</strong> in their
          respective sections.
        </li>
        <li>
          Re-assign their <strong>Division</strong>, <strong>Category</strong>, and <strong>Pool</strong> if the fields
          were cleared.
        </li>
        <li>
          Click <strong>Save</strong>.
        </li>
      </ol>
    </div>
  );
}

function MoveHelp() {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Move a Person to Another Ring</h3>
      <p>
        Use this to reassign a competitor to a different pool (ring) — for example when manually balancing ring sizes
        or correcting an import error.
      </p>

      <h4>Steps</h4>
      <ol>
        <li>
          Open <strong>Quick Edit</strong> for the participant: click their name in any ring, or type
          their name in the <strong>Search Participants</strong> box at the top of the screen and click
          the result.
        </li>
        <li>
          Under <strong>Forms</strong>, use the <strong>Category</strong> and <strong>Pool</strong> dropdowns to select
          the new forms ring.
        </li>
        <li>
          Under <strong>Sparring</strong>, do the same if the participant also competes in sparring.{' '}
          If the <em>Copy sparring from forms</em> checkbox is checked, the sparring division and
          category will automatically follow the forms selection — you only need to confirm or change
          the Pool.
        </li>
        <li>
          Click <strong>Save</strong>. The participant will move immediately and the ring counts will update.
        </li>
      </ol>

      <h4>Moving Between Divisions</h4>
      <ol>
        <li>
          Open <strong>Quick Edit</strong> for the participant (find them in a ring or use the{' '}
          <strong>Search Participants</strong> box).
        </li>
        <li>
          Change the <strong>Division</strong> dropdown to the target division — the Category and Pool options will
          refresh automatically.
        </li>
        <li>Select the appropriate Category and Pool, then click <strong>Save</strong>.</li>
      </ol>
      <div style={tipStyle}>
        <strong>Tip:</strong> After moving several people, check the ring balance indicators (green / yellow / red) on
        the Tournament tab to confirm the rings are still reasonable sizes.
      </div>

      <h4>Balance Guidelines</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Indicator</th>
            <th style={thStyle}>Count</th>
            <th style={thStyle}>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>🟢 Green</td>
            <td style={tdStyle}>8–12 participants</td>
            <td style={tdStyle}>Ideal ring size</td>
          </tr>
          <tr>
            <td style={tdStyle}>🟡 Yellow</td>
            <td style={tdStyle}>5–7 or 13–15</td>
            <td style={tdStyle}>Acceptable but consider rebalancing</td>
          </tr>
          <tr>
            <td style={tdStyle}>🔴 Red</td>
            <td style={tdStyle}>&lt;5 or &gt;15</td>
            <td style={tdStyle}>Unbalanced — move participants if possible</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BaselineHelp() {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Baseline &amp; Print Changed Rings</h3>
      <p>
        This workflow lets you track which rings have changed since your last printing and reprint only those rings —
        saving time and paper when last-minute changes happen on tournament day.
      </p>

      <h4>Setting a Baseline</h4>
      <ol>
        <li>
          After you have printed your initial PDFs and competition is underway, click{' '}
          <strong>📍 Set Baseline</strong> in the Tournament tab toolbar.
        </li>
        <li>
          A baseline is created (timestamped automatically). All ring-change indicators reset to clear.
        </li>
        <li>
          You can set a new baseline at any time — for example, after a batch of changes — to start tracking from that
          point.
        </li>
      </ol>

      <h4>Identifying Changed Rings</h4>
      <ul>
        <li>
          After a baseline is set, any ring whose participants change (addition, removal, move, withdrawal) will display
          a <strong>⚠️ yellow warning</strong> indicator.
        </li>
        <li>
          A summary banner at the top of the tab shows how many rings have changed.
        </li>
      </ul>

      <h4>Printing Only Changed Rings</h4>
      <ol>
        <li>
          When changed rings exist, the <strong>🖨️ Print Changed (N)</strong> button appears in the toolbar.
        </li>
        <li>
          Click it to regenerate and save PDFs for only the affected rings (forms scoring sheets and / or sparring
          brackets as appropriate).
        </li>
        <li>
          Hand the reprinted sheets to the ring judges or post the updated brackets.
        </li>
        <li>
          Click <strong>📍 Set Baseline</strong> again to reset the change indicators after distributing the new
          sheets.
        </li>
      </ol>

      <div style={tipStyle}>
        <strong>Tip:</strong> You can print an individual ring's sheets at any time using the print buttons inside each
        expanded ring card, regardless of whether it is marked as changed.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '1rem',
  fontSize: '0.9rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  borderBottom: '2px solid var(--border-color)',
  backgroundColor: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid var(--border-color)',
  verticalAlign: 'top',
};

const tipStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  backgroundColor: 'var(--info-bg, #e8f4fd)',
  border: '1px solid var(--info-border, #bee3f8)',
  borderRadius: '4px',
  color: 'var(--info-text, #1a5276)',
  marginBottom: '1rem',
  fontSize: '0.9rem',
};

/* ------------------------------------------------------------------ */
/*  PDF generation — compact one-page two-column layout               */
/* ------------------------------------------------------------------ */

function generateAssistantPDF(): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = 215.9;
  const mX = 12;
  const mY = 12;
  const colGap = 6;
  const colW = (pageW - mX * 2 - colGap) / 2;
  const col1X = mX;
  const col2X = mX + colW + colGap;

  // Per-column Y cursor
  const cy: [number, number] = [mY, mY];

  // ---- Helper: advance Y by font-height-based line count ----
  const advance = (col: 0 | 1, lines: number, ptSize: number, extra = 0) => {
    cy[col] += lines * ptSize * 0.38 + extra;
  };

  const colX = (col: 0 | 1) => (col === 0 ? col1X : col2X);

  const sectionHeading = (col: 0 | 1, text: string) => {
    cy[col] += 2;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 0, 0);
    doc.text(text, colX(col), cy[col]);
    advance(col, 1, 10, 1);
    doc.setDrawColor(180, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(colX(col), cy[col], colX(col) + colW, cy[col]);
    doc.setLineWidth(0.2);
    doc.setDrawColor(150);
    doc.setTextColor(0);
    cy[col] += 3;
  };

  const subheading = (col: 0 | 1, text: string) => {
    cy[col] += 1;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(text, colX(col), cy[col]);
    doc.setTextColor(0);
    advance(col, 1, 8.5, 1);
  };

  const stepList = (col: 0 | 1, steps: string[]) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    for (let i = 0; i < steps.length; i++) {
      const prefix = `${i + 1}.  `;
      const lines = doc.splitTextToSize(prefix + steps[i], colW - 4) as string[];
      doc.text(lines, colX(col) + 3, cy[col]);
      advance(col, lines.length, 8, 0.5);
    }
    cy[col] += 1;
  };

  const tipBox = (col: 0 | 1, text: string) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(30, 80, 140);
    const lines = doc.splitTextToSize('Tip: ' + text, colW - 5) as string[];
    const boxH = lines.length * 7.5 * 0.38 + 4;
    doc.setFillColor(232, 244, 253);
    doc.setDrawColor(190, 227, 248);
    doc.roundedRect(colX(col), cy[col] - 1.5, colW, boxH, 1.2, 1.2, 'FD');
    doc.text(lines, colX(col) + 2.5, cy[col] + 0.5);
    doc.setTextColor(0);
    doc.setDrawColor(150);
    cy[col] += boxH + 1;
  };

  // ---- Title bar ----
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Tournament Tab — Quick Reference', mX, mY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(new Date().toLocaleDateString(), pageW - mX, mY, { align: 'right' });
  doc.setTextColor(0);
  const titleLineY = mY + 4;
  doc.setDrawColor(180, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(mX, titleLineY, pageW - mX, titleLineY);
  doc.setLineWidth(0.2);
  doc.setDrawColor(150);
  cy[0] = titleLineY + 5;
  cy[1] = titleLineY + 5;

  // ======== COLUMN 1 ========

  // --- 1. Add / Remove from Sparring ---
  sectionHeading(0, '1. Add / Remove from Sparring');

  subheading(0, 'Adding to Sparring');
  stepList(0, [
    'Open Quick Edit: click their name in a ring, or type their name in the Search Participants box.',
    'In the Sparring section, check "Competing Sparring".',
    'Choose their Division, Category, and Pool.',
    'Click Save — they appear in the ring immediately.',
  ]);
  tipBox(0, 'Leave "Copy sparring from forms" checked to auto-fill division and category.');

  subheading(0, 'Removing from Sparring');
  stepList(0, [
    'Open Quick Edit: click their name in a ring, or type their name in the Search Participants box.',
    'Uncheck "Competing Sparring" in the Sparring section.',
    'Click Save — removed from sparring, stays in forms.',
  ]);

  // --- 2. Withdraw / Unwithdraw ---
  sectionHeading(0, '2. Withdraw / Unwithdraw');

  subheading(0, 'Withdrawing');
  stepList(0, [
    'Open Quick Edit: click their name in a ring, or type their name in the Search Participants box.',
    'Click the Withdraw button — removes from all rings.',
    'Click Save.',
  ]);

  subheading(0, 'Unwithdrawing');
  stepList(0, [
    'Use the Search Participants box at the top of the screen to find the person.',
    'Click their name in the results to open Quick Edit.',
    'Re-check "Competing Forms" and/or "Competing Sparring".',
    'Re-assign Division, Category, and Pool if needed, then Save.',
  ]);

  // ======== COLUMN 2 ========

  // --- 3. Move to Another Ring ---
  sectionHeading(1, '3. Move a Person to Another Ring');

  stepList(1, [
    'Open Quick Edit: click their name in a ring, or type their name in the Search Participants box.',
    'Under Forms, change the Category and/or Pool dropdowns.',
    'Under Sparring, do the same if needed. If "Copy sparring from forms" is checked, the division and category auto-update — just verify the Pool.',
    'Click Save — participant moves immediately.',
  ]);
  tipBox(1, 'To move between divisions, change the Division dropdown first — Category and Pool will refresh.');

  // Balance mini-table
  cy[1] += 1;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Ring Balance Reference', col2X, cy[1]);
  cy[1] += 4.5;

  const tW = colW;
  const cWidths = [tW * 0.26, tW * 0.3, tW * 0.44];
  const tRowH = 4.8;
  // Header row
  doc.setFillColor(220, 220, 220);
  doc.rect(col2X, cy[1] - 3.2, tW, tRowH, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  let cx = col2X;
  ['Color', 'Count', 'Meaning'].forEach((h, i) => {
    doc.text(h, cx + 1.5, cy[1]);
    cx += cWidths[i];
  });
  cy[1] += tRowH - 0.5;
  // Data rows
  const balanceRows: [string, string, string, [number, number, number]][] = [
    ['Green',  '8–12',        'Ideal ring size',      [0, 140, 0]],
    ['Yellow', '5–7 or 13–15','Acceptable',           [160, 130, 0]],
    ['Red',    '<5 or >15',   'Unbalanced — rebalance',[180, 0, 0]],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  balanceRows.forEach(([color, count, meaning, rgb]) => {
    cx = col2X;
    // Colored dot
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.circle(cx + 2.5, cy[1] - 1, 1.5, 'F');
    doc.setTextColor(0);
    doc.text(color, cx + 5.5, cy[1]);
    cx += cWidths[0];
    doc.text(count, cx + 1.5, cy[1]);
    cx += cWidths[1];
    const mLines = doc.splitTextToSize(meaning, cWidths[2] - 2) as string[];
    doc.text(mLines, cx + 1.5, cy[1]);
    cy[1] += tRowH;
  });
  cy[1] += 3;

  // --- 4. Baseline & Print Changed Rings ---
  sectionHeading(1, '4. Baseline & Print Changed Rings');

  subheading(1, 'Setting a Baseline');
  stepList(1, [
    'After printing initial PDFs, click "Set Baseline" in the Tournament toolbar.',
    'A baseline tags current state and all change indicators reset.',
  ]);

  subheading(1, 'Printing Changed Rings');
  stepList(1, [
    'After changes, affected rings show a yellow warning indicator.',
    'Click "Print Changed (N)" to reprint only the affected rings.',
    'Distribute updated sheets to judges.',
    'Click "Set Baseline" again to reset the change indicators.',
  ]);
  tipBox(1, 'Print any individual ring at any time using the print button inside its expanded ring card.');

  // ---- Print (open in print dialog) ----
  doc.autoPrint();
  const blobUrl = doc.output('bloburl') as unknown as string;
  const win = window.open(blobUrl, '_blank');
  if (win) win.focus();
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const TournamentAssistantDialog: React.FC<TournamentAssistantDialogProps> = ({ isOpen, onClose }) => {
  const [activeTopic, setActiveTopic] = useState<AssistantTopic>('sparring');

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeTopic) {
      case 'sparring': return <SparringHelp />;
      case 'withdraw': return <WithdrawHelp />;
      case 'move': return <MoveHelp />;
      case 'baseline': return <BaselineHelp />;
    }
  };

  return (
    <div
      style={{
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
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            Tournament Day Assistant
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={generateAssistantPDF}
              style={{
                padding: '0.4rem 0.9rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
              title="Print a PDF of all these instructions"
            >
              🖨️ Print as PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                lineHeight: 1,
                padding: '0.25rem',
              }}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: '0.25rem',
            padding: '0.5rem 1.5rem 0',
            borderBottom: '1px solid var(--border-color)',
            // Keep all topic tabs on a single row instead of wrapping.
            flexWrap: 'nowrap',
          }}
        >
          {topics.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTopic(t.key)}
              style={{
                // Allow each tab to shrink (with ellipsis) rather than wrap, so
                // all four stay on one line even in a narrower window.
                flex: '0 1 auto',
                minWidth: 0,
                padding: '0.5rem 0.5rem',
                border: 'none',
                borderBottom: activeTopic === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTopic === t.key ? 600 : 400,
                color: activeTopic === t.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'center',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
            color: 'var(--text-primary)',
            lineHeight: 1.6,
          }}
        >
          {renderContent()}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Need more help? Open the main Help dialog from the app header.
          </span>
          <button
            onClick={generateAssistantPDF}
            style={{
              padding: '0.4rem 0.9rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
            title="Save a PDF with all topics"
          >
            🖨️ Print as PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentAssistantDialog;
