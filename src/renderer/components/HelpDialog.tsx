import React, { useState } from 'react';

export type HelpTopic = 'overview' | 'pre-tournament' | 'tournament-day' | 'quick-reference';

interface HelpDialogProps {
  isOpen: boolean;
  initialTopic?: HelpTopic;
  onClose: () => void;
}

const topics: { key: HelpTopic; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'pre-tournament', label: 'Pre-Tournament Guide' },
  { key: 'tournament-day', label: 'Tournament Day' },
  { key: 'quick-reference', label: 'Quick Reference' },
];

/* ------------------------------------------------------------------ */
/*  Content sections                                                   */
/* ------------------------------------------------------------------ */

function Overview() {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Welcome to TournamentManager</h3>
      <p>
        TournamentManager is a desktop application designed to simplify the
        organization and execution of martial arts tournaments. It handles
        participant registration, category grouping, ring assignments,
        competition ordering, and generates all necessary PDF documents.
      </p>

      <h4>Main Tabs</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Tab</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}><strong>Dashboard</strong></td><td style={tdStyle}>At-a-glance summary of tournament status and quick actions</td></tr>
          <tr><td style={tdStyle}><strong>Import</strong></td><td style={tdStyle}>Load participant data from an Excel / CSV spreadsheet</td></tr>
          <tr><td style={tdStyle}><strong>Configuration</strong></td><td style={tdStyle}>Set divisions, physical rings, watermark image, and PDF output folder</td></tr>
          <tr><td style={tdStyle}><strong>Categories</strong></td><td style={tdStyle}>Create competition categories and assign participants to them</td></tr>
          <tr><td style={tdStyle}><strong>Ring Map</strong></td><td style={tdStyle}>Map logical pools to physical rings and order competitors</td></tr>
          <tr><td style={tdStyle}><strong>Data Editor</strong></td><td style={tdStyle}>View and manually edit individual participant records</td></tr>
          <tr><td style={tdStyle}><strong>Overview</strong></td><td style={tdStyle}>Full read-only view of all rings, divisions, and assignments</td></tr>
          <tr><td style={tdStyle}><strong>Export</strong></td><td style={tdStyle}>Generate PDFs — name tags, check-in sheets, scoring sheets, brackets</td></tr>
          <tr><td style={tdStyle}><strong>Checkpoints</strong></td><td style={tdStyle}>Save and restore snapshots of your tournament data</td></tr>
        </tbody>
      </table>

      <h4>Key Concepts</h4>
      <ul>
        <li><strong>Division</strong> — An age / skill grouping (e.g. "Black Belt", "Beginner").</li>
        <li><strong>Category</strong> — A competition grouping within a division (filtered by gender, age range, etc.).</li>
        <li><strong>Pool</strong> — A subgroup within a category (Pool 1, Pool 2, …). Participants in the same pool compete against each other.</li>
        <li><strong>Physical Ring</strong> — The actual competition area at the venue (PR1, PR2, …). Pools are mapped to physical rings.</li>
      </ul>

      <h4>Typical Workflow</h4>
      <ol>
        <li>Import participant data</li>
        <li>Configure divisions and physical rings</li>
        <li>Create and assign categories</li>
        <li>Map pools to physical rings and order competitors</li>
        <li>Review in Overview</li>
        <li>Export PDFs</li>
      </ol>
    </div>
  );
}

function PreTournamentGuide() {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Pre-Tournament Guide</h3>
      <p>Complete these steps <em>before</em> tournament day — ideally at least a few days ahead.</p>

      <h4>1. Prepare Your Spreadsheet</h4>
      <p>Your Excel / CSV file needs these columns:</p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Column</th>
            <th style={thStyle}>Required?</th>
            <th style={thStyle}>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>student first name</td><td style={tdStyle}>Yes</td><td style={tdStyle}></td></tr>
          <tr><td style={tdStyle}>student last name</td><td style={tdStyle}>Yes</td><td style={tdStyle}></td></tr>
          <tr><td style={tdStyle}>age</td><td style={tdStyle}>Yes</td><td style={tdStyle}>Numeric</td></tr>
          <tr><td style={tdStyle}>gender</td><td style={tdStyle}>Yes</td><td style={tdStyle}>M / F</td></tr>
          <tr><td style={tdStyle}>height feet</td><td style={tdStyle}>Yes</td><td style={tdStyle}>Numeric</td></tr>
          <tr><td style={tdStyle}>height inches</td><td style={tdStyle}>Yes</td><td style={tdStyle}>Numeric (0–11)</td></tr>
          <tr><td style={tdStyle}>school</td><td style={tdStyle}>Yes</td><td style={tdStyle}></td></tr>
          <tr><td style={tdStyle}>Branch</td><td style={tdStyle}>No</td><td style={tdStyle}>Leave blank if N/A</td></tr>
          <tr><td style={tdStyle}>division</td><td style={tdStyle}>Yes</td><td style={tdStyle}>Must match configured divisions</td></tr>
        </tbody>
      </table>

      <h4>2. Import Data</h4>
      <ol>
        <li>Open the <strong>Import</strong> tab and select your file.</li>
        <li>Verify the preview matches your expectations.</li>
        <li>Check the Dashboard for any warnings about missing or mismatched data.</li>
      </ol>

      <h4>3. Configure the Tournament</h4>
      <ol>
        <li><strong>Divisions</strong> — Add / remove to match your spreadsheet values.</li>
        <li><strong>Physical Rings</strong> — Define each competition area with a name and color. Colors appear on name tags so participants can find their ring.</li>
        <li><strong>Watermark</strong> (optional) — Upload a logo that will appear on scoring sheets and brackets.</li>
        <li><strong>PDF Output Folder</strong> — Choose where generated PDFs will be saved.</li>
      </ol>

      <h4>4. Create Categories</h4>
      <ol>
        <li>Go to the <strong>Categories</strong> tab.</li>
        <li>For each category, set the division, gender, and age range.</li>
        <li>Click <strong>Assign Categories</strong> to auto-assign participants.</li>
        <li>Review for unassigned participants and manually fix if needed.</li>
      </ol>
      <div style={tipStyle}>
        <strong>Tip:</strong> Re-running "Assign Categories" will overwrite all previous assignments and manual edits.
      </div>

      <h4>5. Map Pools to Physical Rings</h4>
      <ol>
        <li>Go to the <strong>Ring Map</strong> tab.</li>
        <li>Assign logical pools to physical rings.</li>
        <li>Run <strong>Order Forms Ring</strong> for each forms pool — this interleaves schools so competitors from the same school don't go back-to-back.</li>
        <li>Run <strong>Order Sparring Ring</strong> for each sparring pool — this sorts by height for fair bracket seeding.</li>
      </ol>

      <h4>6. Review &amp; Export</h4>
      <ol>
        <li>Check the <strong>Overview</strong> tab to verify everything looks right.</li>
        <li>Go to <strong>Export</strong> and generate all PDFs.</li>
        <li>Print extras (roughly 10% more name tags and scoring sheets).</li>
      </ol>

      <h4>7. Save a Checkpoint</h4>
      <p>
        Before tournament day, save a <strong>Checkpoint</strong> so you can restore your
        work if anything goes wrong.
      </p>
    </div>
  );
}

function TournamentDayGuide() {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Tournament Day Guide</h3>
      <p>Quick steps for running the tournament smoothly on the day itself.</p>

      <h4>Before Competitors Arrive</h4>
      <ul>
        <li>Launch TournamentManager — your most recent data is automatically restored.</li>
        <li>Verify the <strong>Overview</strong> tab still looks correct.</li>
        <li>Have printed PDFs ready at each station: check-in sheets at the door, scoring sheets and brackets at each ring, name tags at the registration table.</li>
      </ul>

      <h4>During Check-In</h4>
      <ul>
        <li>Use <strong>check-in sheets</strong> at the registration table to mark attendance.</li>
        <li>Hand out <strong>name tags</strong> — the ring color tells participants where to go.</li>
        <li>If a walk-in needs to register, use the <strong>+ Add Participant</strong> button in the header (or the keyboard shortcut) to add them on the fly.</li>
      </ul>

      <h4>Handling Late Changes</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Situation</th>
            <th style={thStyle}>What to Do</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>New participant added</td>
            <td style={tdStyle}>
              Add via the <strong>+ Add</strong> button, assign a category in the <strong>Data Editor</strong>,
              then re-order the affected ring.
            </td>
          </tr>
          <tr>
            <td style={tdStyle}>Participant no-show</td>
            <td style={tdStyle}>
              Cross them off the printed scoring sheet. In the app, you can optionally remove them
              and re-print the sheet, or simply skip them.
            </td>
          </tr>
          <tr>
            <td style={tdStyle}>Need to reprint a PDF</td>
            <td style={tdStyle}>Go to <strong>Export</strong>, select the specific ring / division, and generate again.</td>
          </tr>
        </tbody>
      </table>

      <h4>Running Forms Rings</h4>
      <ol>
        <li>Hand the <strong>forms scoring sheet</strong> to the judges.</li>
        <li>Call competitors in the printed rank order.</li>
        <li>Judges record scores; calculate the final score by dropping the highest and lowest.</li>
        <li>Record placements (1st, 2nd, 3rd) at the bottom of the sheet.</li>
      </ol>

      <h4>Running Sparring Rings</h4>
      <ol>
        <li>Post the <strong>sparring bracket</strong> where competitors can see it.</li>
        <li>Call matches by number (Match 1, Match 2, …).</li>
        <li>Winners advance along the bracket lines.</li>
        <li>Semi-final losers compete in the 3rd place match.</li>
      </ol>

      <h4>End of Day</h4>
      <ul>
        <li>Collect all scoring sheets and brackets for your records.</li>
        <li>Save a final <strong>Checkpoint</strong> in the app.</li>
      </ul>
    </div>
  );
}

function QuickReference() {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Quick Reference</h3>
      <p>Common operations at a glance.</p>

      <h4>Adding a Participant</h4>
      <p>Click <strong>+ Add Participant</strong> in the app header or use the Dashboard quick action.</p>

      <h4>Re-Ordering a Forms Ring</h4>
      <ol>
        <li>Go to <strong>Ring Map</strong>.</li>
        <li>Select the forms pool.</li>
        <li>Click <strong>Order Forms Ring</strong>.</li>
      </ol>
      <p>This is safe to re-run and won't affect other data.</p>

      <h4>Re-Ordering a Sparring Ring</h4>
      <ol>
        <li>Go to <strong>Ring Map</strong>.</li>
        <li>Select the sparring pool.</li>
        <li>Click <strong>Order Sparring Ring</strong>.</li>
      </ol>

      <h4>Manual Rank Ordering</h4>
      <p>
        Rank orders are assigned in multiples of 10 (10, 20, 30, …). To move a
        competitor between positions 20 and 30, change their rank order to 25.
      </p>

      <h4>Saving &amp; Restoring Data</h4>
      <ul>
        <li><strong>Autosave</strong> — The app automatically saves your state periodically and on close.</li>
        <li><strong>Checkpoints</strong> — Create named snapshots on the Checkpoints tab. Restore any time.</li>
        <li><strong>Backups</strong> — Automatic backups are kept for 12 hours in your data directory.</li>
      </ul>

      <h4>Generating PDFs</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Document</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Name Tags</td><td style={tdStyle}>2×4 grid per page with name, division, school, ring color</td></tr>
          <tr><td style={tdStyle}>Check-In Sheets</td><td style={tdStyle}>One per division, sorted alphabetically with a check box</td></tr>
          <tr><td style={tdStyle}>Forms Scoring Sheets</td><td style={tdStyle}>One per forms ring with judge score columns and placements</td></tr>
          <tr><td style={tdStyle}>Sparring Brackets</td><td style={tdStyle}>16-person bracket per sparring ring, seeded by height</td></tr>
        </tbody>
      </table>

      <h4>Category Design Tips</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Age Group</th>
            <th style={thStyle}>Suggested Range</th>
            <th style={thStyle}>Gender</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Young children</td><td style={tdStyle}>2-year ranges (5-6, 7-8)</td><td style={tdStyle}>Mixed OK</td></tr>
          <tr><td style={tdStyle}>Teens</td><td style={tdStyle}>3-4 year ranges (11-14)</td><td style={tdStyle}>Separate M / F</td></tr>
          <tr><td style={tdStyle}>Adults</td><td style={tdStyle}>18+ (one group or 18-34, 35+)</td><td style={tdStyle}>Separate M / F</td></tr>
        </tbody>
      </table>

      <h4>Pool Sizing Guide</h4>
      <ul>
        <li>1–8 participants → 1 pool</li>
        <li>9–16 participants → 2 pools</li>
        <li>17–24 participants → 3 pools</li>
        <li>25+ participants → 4 pools</li>
      </ul>

      <h4>Troubleshooting</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Problem</th>
            <th style={thStyle}>Solution</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={tdStyle}>Unassigned participants</td><td style={tdStyle}>Check category age/gender criteria or manually assign in the Data Editor.</td></tr>
          <tr><td style={tdStyle}>Unbalanced rings</td><td style={tdStyle}>Move participants between pools in the Data Editor.</td></tr>
          <tr><td style={tdStyle}>Same school back-to-back in forms</td><td style={tdStyle}>Re-run Order Forms Ring — the algorithm interleaves schools automatically.</td></tr>
          <tr><td style={tdStyle}>PDF won't open</td><td style={tdStyle}>Ensure a PDF reader is installed; try a different file name.</td></tr>
        </tbody>
      </table>
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
  backgroundColor: 'var(--info-bg)',
  border: '1px solid var(--info-border)',
  borderRadius: '4px',
  color: 'var(--info-text)',
  marginBottom: '1rem',
  fontSize: '0.9rem',
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, initialTopic, onClose }) => {
  const [activeTopic, setActiveTopic] = useState<HelpTopic>(initialTopic ?? 'overview');

  // Sync initialTopic when the dialog opens with a different topic
  React.useEffect(() => {
    if (isOpen && initialTopic) {
      setActiveTopic(initialTopic);
    }
  }, [isOpen, initialTopic]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeTopic) {
      case 'overview':
        return <Overview />;
      case 'pre-tournament':
        return <PreTournamentGuide />;
      case 'tournament-day':
        return <TournamentDayGuide />;
      case 'quick-reference':
        return <QuickReference />;
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
          maxWidth: '860px',
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
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Help</h2>
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

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: '0.25rem',
            padding: '0.5rem 1.5rem 0',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {topics.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTopic(t.key)}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderBottom: activeTopic === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTopic === t.key ? 600 : 400,
                color: activeTopic === t.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
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
      </div>
    </div>
  );
};

export default HelpDialog;
