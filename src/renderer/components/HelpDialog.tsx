import React, { useState } from 'react';

export type HelpTopic = 'overview' | 'pre-tournament' | 'tournament-day' | 'quick-reference' | 'day-of-reference';

interface HelpDialogProps {
  isOpen: boolean;
  initialTopic?: HelpTopic;
  onClose: () => void;
}

export const helpTopics: { key: HelpTopic; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'pre-tournament', label: 'Pre-Tournament Guide' },
  { key: 'tournament-day', label: 'Tournament Day' },
  { key: 'quick-reference', label: 'Quick Reference' },
  { key: 'day-of-reference', label: 'Day-Of Scenarios' },
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
          <tr><td style={tdStyle}><strong>Configuration</strong></td><td style={tdStyle}>Set divisions and their order, physical rings, watermark image, and PDF output folder</td></tr>
          <tr><td style={tdStyle}><strong>Categories</strong></td><td style={tdStyle}>Create competition categories and assign participants to them</td></tr>
          <tr><td style={tdStyle}><strong>Ring Map</strong></td><td style={tdStyle}>Map logical pools to physical rings</td></tr>
          <tr><td style={tdStyle}><strong>Editor</strong></td><td style={tdStyle}>View and manually edit individual participant records</td></tr>
          <tr><td style={tdStyle}><strong>Sanity Check</strong></td><td style={tdStyle}>Totals per division (Forms / Sparring) and a breakdown of anyone not counted</td></tr>
          <tr><td style={tdStyle}><strong>Tournament</strong></td><td style={tdStyle}>Main tournament view — ring overview, quick edit, custom ordering, baselines, and grand champion</td></tr>
          <tr><td style={tdStyle}><strong>Export</strong></td><td style={tdStyle}>Generate PDFs — name tags, check-in sheets, scoring sheets, brackets</td></tr>
          <tr><td style={tdStyle}><strong>History</strong></td><td style={tdStyle}>Browse every committed change and restore any point in time</td></tr>
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
      <ul>
        <li>Import participant data</li>
        <li>Configure divisions and physical rings</li>
        <li>Create and assign categories</li>
        <li>Map pools to physical rings and order competitors</li>
        <li>Review in Tournament</li>
        <li>Export PDFs</li>
      </ul>
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
          <tr><td style={tdStyle}>Branch</td><td style={tdStyle}>Yes</td><td style={tdStyle}>Enter branch name or main school name</td></tr>
          <tr><td style={tdStyle}>division</td><td style={tdStyle}>Yes</td><td style={tdStyle}>Must match configured divisions</td></tr>
        </tbody>
      </table>

      <h4>2. Import Data</h4>
      <ol>
        <li>Open <strong>File → Import Initial Excel File…</strong> and select your file.</li>
        <li>Verify the preview (and resolve any errors) before confirming the import.</li>
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
        <li>Click <strong>Add Category</strong> — matching participants are assigned to it automatically.</li>
        <li>Review for unassigned participants and manually fix if needed.</li>
      </ol>
      <div style={tipStyle}>
        <strong>Tip:</strong> Clicking <strong>Reassign Participants</strong> resets all pool assignments (your category definitions are kept).
      </div>

      <h4>5. Map Pools to Physical Rings</h4>
      <ol>
        <li>Go to the <strong>Ring Map</strong> tab.</li>
        <li>Assign logical pools to physical rings — use <strong>Auto Assign</strong>, adjust as needed, then click <strong>Confirm</strong>.</li>
        <li>Rings are ordered automatically: forms interleaves schools so competitors from the same school don't go back-to-back, and sparring is sorted by height for fair bracket seeding.</li>
        <li>Need a specific order? Enable <strong>Custom Order</strong> on a ring in the Tournament tab.</li>
      </ol>

      <h4>6. Review &amp; Export</h4>
      <ol>
        <li>Check the <strong>Tournament</strong> tab to verify everything looks right.</li>
        <li>Go to <strong>Export</strong> and generate all PDFs.</li>
        <li>Print extras (roughly 10% more name tags and scoring sheets).</li>
      </ol>

      <h4>7. Set a Baseline</h4>
      <p>
        Before tournament day, create a <strong>Baseline</strong> (a tag on the History tab) so you can
        track and restore your work if anything goes wrong.
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
        <li>Verify the <strong>Tournament</strong> tab still looks correct.</li>
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
              Add via the <strong>+ Add Participant</strong> button, assign a category/pool in
              <strong> Quick Edit</strong> — the affected ring re-orders automatically.
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
        <li>Save a final <strong>Baseline</strong> in the app.</li>
      </ul>
    </div>
  );
}

function QuickReference() {
  return (
    <div>
      {/* Header row with title + print button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Quick Reference</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Common setup and administrative operations.
          </p>
        </div>
        <button
          onClick={printQuickReferenceCookbook}
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.85rem',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginLeft: '1rem',
          }}
          title="Open a printable 1-page cookbook of this reference"
        >
          🖨 Print Cookbook
        </button>
      </div>

      <div style={qrCardStyle}>
        <p style={qrCardTitleStyle}>Adding a Walk-In Participant</p>
        <p style={{ margin: '0 0 0.3rem' }}>
          Click <strong>+ Add Participant</strong> in the app header (or use the Dashboard quick action).
        </p>
        <ul style={qrListStyle}>
          <li style={qrListItemStyle}>After adding, open the <strong>Editor</strong> tab to assign their category and pool.</li>
          <li style={qrListItemStyle}>The affected ring re-orders automatically — enable <strong>Custom Order</strong> in the Tournament tab if you need a specific order.</li>
        </ul>
      </div>

      <div style={qrCardStyle}>
        <p style={qrCardTitleStyle}>Ring Ordering</p>
        <p style={{ margin: '0 0 0.25rem' }}>
          Rings re-order <strong>automatically</strong> whenever participants are moved — forms interleaves
          schools, and sparring sorts by height. Use the <strong>Custom Order</strong> checkbox on a ring in
          the Tournament tab to switch that ring to manual ordering.
        </p>
      </div>

      <div style={qrCardStyle}>
        <p style={qrCardTitleStyle}>Fine-Tune Competitor Order</p>
        <p style={{ margin: '0 0 0.25rem' }}>
          In the <strong>Tournament</strong> tab, check <strong>Custom Order</strong> on the ring, then use the
          <strong> ▲ Up</strong> and <strong>▼ Down</strong> arrow buttons next to each competitor to adjust
          their position. Uncheck <strong>Custom Order</strong> to return to automatic ordering.
        </p>
      </div>

      <div style={qrCardStyle}>
        <p style={qrCardTitleStyle}>Generate PDFs</p>
        <p style={{ margin: '0 0 0.35rem' }}>Go to the <strong>Export</strong> tab and choose what to generate:</p>
        <table style={{ ...tableStyle, fontSize: '0.875rem', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={thStyle}>Document</th>
              <th style={thStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>Name Tags</td><td style={tdStyle}>2×4 grid per page, ring color coded</td></tr>
            <tr><td style={tdStyle}>Check-In Sheets</td><td style={tdStyle}>Per division, alphabetical with checkboxes</td></tr>
            <tr><td style={tdStyle}>Ring Overview</td><td style={tdStyle}>All participants by ring and division</td></tr>
            <tr><td style={tdStyle}>Forms Scoring</td><td style={tdStyle}>Per forms ring with judge score columns</td></tr>
            <tr><td style={tdStyle}>Sparring Brackets</td><td style={tdStyle}>16-person bracket per ring, seeded by height</td></tr>
            <tr><td style={tdStyle}>Score Sheets Per Division</td><td style={tdStyle}>Forms + sparring interleaved by ring, one file per division</td></tr>
            <tr><td style={{ ...tdStyle, borderBottom: 'none' }}>Blank Forms / Brackets</td><td style={{ ...tdStyle, borderBottom: 'none' }}>Blank sheets for manual use (see Export tab)</td></tr>
          </tbody>
        </table>
      </div>

      <div style={qrCardStyle}>
        <p style={qrCardTitleStyle}>Print Blank Scoring Sheets</p>
        <p style={{ margin: 0 }}>
          Go to <strong>Export</strong> → scroll to <strong>Blank Scoring Sheets</strong> at the bottom.
          Click <em>Export Blank Forms Sheet</em> or <em>Export Blank Sparring Bracket</em> for
          unmarked, reusable sheets.
        </p>
      </div>

      <div style={qrCardStyle}>
        <p style={qrCardTitleStyle}>Save &amp; Restore Data</p>
        <ul style={qrListStyle}>
          <li style={qrListItemStyle}><strong>Autosave</strong> — saves automatically as you work. No action needed.</li>
          <li style={qrListItemStyle}><strong>History</strong> — every change is saved as a commit labelled with the action that caused it (e.g. "Moved Mason Crosby from … Pool 1 to … Pool 2"). Open the <strong>History</strong> tab to review and restore any point.</li>
          <li style={qrListItemStyle}><strong>Baselines</strong> — create named tags on the <strong>History</strong> tab to mark important moments. Restore any time; history is never lost.</li>
        </ul>
      </div>

      <div style={qrCardStyle}>
        <p style={qrCardTitleStyle}>Category Design Tips</p>
        <table style={{ ...tableStyle, fontSize: '0.875rem', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={thStyle}>Age Group</th>
              <th style={thStyle}>Suggested Range</th>
              <th style={thStyle}>Gender</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>Young children</td><td style={tdStyle}>2-yr ranges (5–6, 7–8)</td><td style={tdStyle}>Mixed OK</td></tr>
            <tr><td style={tdStyle}>Teens</td><td style={tdStyle}>3–4 yr (11–14)</td><td style={tdStyle}>Separate M / F</td></tr>
            <tr><td style={{ ...tdStyle, borderBottom: 'none' }}>Adults</td><td style={{ ...tdStyle, borderBottom: 'none' }}>18+ or 18–34, 35+</td><td style={{ ...tdStyle, borderBottom: 'none' }}>Separate M / F</td></tr>
          </tbody>
        </table>
      </div>

      <div style={qrCardStyle}>
        <p style={qrCardTitleStyle}>Pool Sizing Guide</p>
        <ul style={qrListStyle}>
          <li style={qrListItemStyle}>1–8 participants → 1 pool</li>
          <li style={qrListItemStyle}>9–16 participants → 2 pools</li>
          <li style={qrListItemStyle}>17–24 participants → 3 pools</li>
          <li style={qrListItemStyle}>25+ participants → 4 pools</li>
        </ul>
      </div>

      <div style={qrCardStyle}>
        <p style={qrCardTitleStyle}>Troubleshooting</p>
        <table style={{ ...tableStyle, fontSize: '0.875rem', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={thStyle}>Problem</th>
              <th style={thStyle}>Fix</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>Unassigned participants</td><td style={tdStyle}>Check category age/gender criteria, or manually assign in the Editor tab.</td></tr>
            <tr><td style={tdStyle}>Unbalanced rings</td><td style={tdStyle}>Move participants between pools via Quick Edit (search name → open Quick Edit).</td></tr>
            <tr><td style={tdStyle}>Same school back-to-back in forms</td><td style={tdStyle}>Rings auto-interleave schools; enable Custom Order in the Tournament tab to fine-tune.</td></tr>
            <tr><td style={{ ...tdStyle, borderBottom: 'none' }}>PDF won't open</td><td style={{ ...tdStyle, borderBottom: 'none' }}>Ensure a PDF reader is installed; try a different file name.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Day-Of Scenarios                                                   */
/* ------------------------------------------------------------------ */

function Scenario({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div style={scenarioCardStyle}>
      <div style={scenarioTitleRowStyle}>
        <span style={scenarioBadgeStyle}>{num}</span>
        <p style={scenarioTitleStyle}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function DayOfReference() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '0.2rem' }}>Day-Of Scenarios</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Step-by-step answers to common tournament day situations.
            Most actions start by finding the person — type their name in the{' '}
            <strong>Search Participants</strong> box at the top of the screen.
          </p>
        </div>
        <button
          onClick={printDayOfScenarios}
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.85rem',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginLeft: '1rem',
          }}
          title="Open a printable reference of all day-of scenarios"
        >
          🖨 Print Scenarios
        </button>
      </div>

      <Scenario num={1} title={'"What ring is James in?" — Look Up a Participant'}>
        <ol style={stepListStyle}>
          <li style={stepListItemStyle}>
            Type the participant's name (or partial name) in the <strong>Search Participants</strong> box at the top of the screen.
          </li>
          <li style={stepListItemStyle}>
            Results appear instantly, showing their division, age, and ring assignments.
          </li>
          <li style={stepListItemStyle}>
            Click their name to open <strong>Quick Edit</strong> for full details.
          </li>
        </ol>
        <div style={tipStyle}>
          <strong>Tip:</strong> The search result shows "F: Pool 1 (PR2) | S: Pool 2 (PR3)" — F = Forms ring, S = Sparring ring, the label in parentheses is the physical ring name.
        </div>
      </Scenario>

      <Scenario num={2} title="Move a Participant to a Different Ring / Pool">
        <ol style={stepListStyle}>
          <li style={stepListItemStyle}>
            Find them via <strong>Search Participants</strong> or click their name on the <strong>Tournament</strong> tab.
          </li>
          <li style={stepListItemStyle}>
            In <strong>Quick Edit</strong>, change the <strong>Pool</strong> dropdown under Forms and/or Sparring to the desired pool.
          </li>
          <li style={stepListItemStyle}>
            Click <strong>Save</strong>. The participant moves immediately and ring counts update.
          </li>
          <li style={stepListItemStyle}>
            After moving, check the balance indicators on the Tournament tab (green = good, red = unbalanced).
          </li>
        </ol>
        <div style={tipStyle}>
          <strong>To move between categories/divisions:</strong> change the Division and Category dropdowns first, then pick the Pool.
        </div>
      </Scenario>

      <Scenario num={3} title="Withdraw from Sparring Only">
        <ol style={stepListStyle}>
          <li style={stepListItemStyle}>
            Find them via <strong>Search Participants</strong> or on the <strong>Tournament</strong> tab.
          </li>
          <li style={stepListItemStyle}>
            In <strong>Quick Edit</strong>, uncheck <strong>Competing Sparring</strong> (in the Sparring section).
          </li>
          <li style={stepListItemStyle}>
            Click <strong>Save</strong>. They're removed from sparring but remain in forms.
          </li>
        </ol>
        <div style={tipStyle}>
          Their sparring assignment is remembered — you can add them back at any time.
        </div>
      </Scenario>

      <Scenario num={4} title="Add Sparring for a Participant">
        <ol style={stepListStyle}>
          <li style={stepListItemStyle}>
            Find them via <strong>Search Participants</strong> or on the <strong>Tournament</strong> tab.
          </li>
          <li style={stepListItemStyle}>
            In <strong>Quick Edit</strong>, check <strong>Competing Sparring</strong>.
          </li>
          <li style={stepListItemStyle}>
            Select their <strong>Division</strong>, <strong>Category</strong>, and <strong>Pool</strong> from the dropdowns.
          </li>
          <li style={stepListItemStyle}>
            Click <strong>Save</strong>. They appear in the selected sparring ring immediately.
          </li>
        </ol>
        <div style={tipStyle}>
          <strong>Tip:</strong> Enable <em>Copy sparring from forms</em> to auto-fill division and category — you just need to pick the pool.
        </div>
      </Scenario>

      <Scenario num={5} title="Withdraw Completely (Forms + Sparring)">
        <ol style={stepListStyle}>
          <li style={stepListItemStyle}>
            Find them via <strong>Search Participants</strong> or click their name on the <strong>Tournament</strong> tab.
          </li>
          <li style={stepListItemStyle}>
            In <strong>Quick Edit</strong>, click the <strong>Withdraw</strong> button.
          </li>
          <li style={stepListItemStyle}>
            Click <strong>Save</strong>. They disappear from all rings but remain in the system.
          </li>
        </ol>
        <div style={tipStyle}>
          Withdrawn participants appear grayed out in the <strong>Editor</strong> tab and can still be found via Search.
        </div>
      </Scenario>

      <Scenario num={6} title="Come Back After Withdrawing (Re-Register)">
        <ol style={stepListStyle}>
          <li style={stepListItemStyle}>
            Type their name in <strong>Search Participants</strong> (they won't appear on the Tournament tab while withdrawn, but Search still finds them).
          </li>
          <li style={stepListItemStyle}>
            Click their name to open <strong>Quick Edit</strong>.
          </li>
          <li style={stepListItemStyle}>
            Click <strong>Restore</strong> (or manually re-check <strong>Competing Forms</strong> and/or <strong>Competing Sparring</strong>).
          </li>
          <li style={stepListItemStyle}>
            Verify their category and pool are correct, then click <strong>Save</strong>.
          </li>
        </ol>
        <div style={tipStyle}>
          The system remembers their last category and pool assignment — Restore typically puts them right back where they were.
        </div>
      </Scenario>

      <Scenario num={7} title="Person Needs to Spar in a Different Division">
        <ol style={stepListStyle}>
          <li style={stepListItemStyle}>
            Find them via <strong>Search Participants</strong> or on the <strong>Tournament</strong> tab.
          </li>
          <li style={stepListItemStyle}>
            In <strong>Quick Edit</strong>, go to the <strong>Sparring</strong> section and make sure <strong>Competing Sparring</strong> is checked.
          </li>
          <li style={stepListItemStyle}>
            Uncheck <em>Copy sparring from forms</em> so you can set sparring independently.
          </li>
          <li style={stepListItemStyle}>
            Choose the target <strong>Division</strong>, <strong>Category</strong>, and <strong>Pool</strong> for sparring.
          </li>
          <li style={stepListItemStyle}>
            Click <strong>Save</strong>. Their forms ring is unchanged; they compete in sparring under the new division.
          </li>
        </ol>
        <div style={tipStyle}>
          Common when a competitor's age or skill places them in a different sparring bracket than their forms division.
        </div>
      </Scenario>

      <Scenario num={8} title="Create a Grand Champion Ring">
        <ol style={stepListStyle}>
          <li style={stepListItemStyle}>
            Go to the <strong>Categories</strong> tab and create a new category (e.g., "Grand Champion") — set the type to <em>Forms</em> or <em>Sparring</em> as appropriate, with a wide age range to cover all divisions.
          </li>
          <li style={stepListItemStyle}>
            Use <strong>Quick Edit</strong> or the <strong>Editor</strong> tab to manually assign each grand champion competitor to this category (Pool 1).
          </li>
          <li style={stepListItemStyle}>
            Go to <strong>Ring Map</strong> and assign the Grand Champion pool to a physical ring.
          </li>
          <li style={stepListItemStyle}>
            The ring re-orders automatically — enable <strong>Custom Order</strong> in the Tournament tab if you need a specific order.
          </li>
          <li style={stepListItemStyle}>
            Go to <strong>Export</strong> to generate the scoring sheet or bracket for this ring.
          </li>
        </ol>
        <div style={tipStyle}>
          <strong>Tip:</strong> Grand Champion competitors can be in their regular ring <em>and</em> the Grand Champion ring simultaneously — assigning the new category does not remove them from their original ring.
        </div>
      </Scenario>

      <Scenario num={9} title="Print Blank Sparring or Forms Sheets">
        <ol style={stepListStyle}>
          <li style={stepListItemStyle}>Go to the <strong>Export</strong> tab.</li>
          <li style={stepListItemStyle}>Scroll to the <strong>Blank Scoring Sheets</strong> section at the bottom.</li>
          <li style={stepListItemStyle}>
            Click <em>Export Blank Forms Sheet</em> for a blank forms scoring sheet, or
            {' '}<em>Export Blank Sparring Bracket</em> for a blank bracket.
          </li>
          <li style={stepListItemStyle}>The PDF will be saved to your configured output folder.</li>
        </ol>
        <div style={tipStyle}>
          Blank sheets are useful for same-day add-on events or as a physical backup.
        </div>
      </Scenario>
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
  padding: '0.65rem 0.9rem',
  backgroundColor: 'var(--info-bg, #e8f4fd)',
  border: '1px solid var(--info-border, #bee3f8)',
  borderRadius: '4px',
  color: 'var(--info-text, #1a5276)',
  marginBottom: '0.75rem',
  fontSize: '0.88rem',
};

// Quick Reference section card
const qrCardStyle: React.CSSProperties = {
  marginBottom: '0.85rem',
  padding: '0.65rem 0.9rem 0.5rem',
  backgroundColor: 'var(--bg-tertiary)',
  borderRadius: '6px',
  borderLeft: '4px solid var(--accent-primary)',
};

const qrCardTitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  margin: '0 0 0.4rem',
  color: 'var(--text-primary)',
};

const qrListStyle: React.CSSProperties = {
  paddingLeft: '1.6rem',
  margin: '0.2rem 0 0.3rem',
};

const qrListItemStyle: React.CSSProperties = {
  marginBottom: '0.25rem',
  lineHeight: 1.45,
};

// Day-Of scenario card
const scenarioCardStyle: React.CSSProperties = {
  marginBottom: '0.85rem',
  padding: '0.65rem 0.9rem 0.4rem',
  backgroundColor: 'var(--bg-tertiary)',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
};

const scenarioTitleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '0.4rem',
};

const scenarioBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '1.5rem',
  height: '1.5rem',
  borderRadius: '50%',
  backgroundColor: 'var(--accent-primary)',
  color: '#fff',
  fontWeight: 700,
  fontSize: '0.78rem',
  marginRight: '0.5rem',
  flexShrink: 0,
};

const scenarioTitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: 0,
};

const stepListStyle: React.CSSProperties = {
  paddingLeft: '1.6rem',
  margin: '0.2rem 0 0.35rem',
};

const stepListItemStyle: React.CSSProperties = {
  marginBottom: '0.25rem',
  lineHeight: 1.45,
};

/* ------------------------------------------------------------------ */
/*  Print cookbook                                                     */
/* ------------------------------------------------------------------ */

function printQuickReferenceCookbook() {
  const printStyles = `
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      color: #111;
      background: #fff;
      margin: 0;
      padding: 1.2cm 1.5cm;
    }
    h1 {
      font-size: 13pt;
      margin: 0 0 2px;
      border-bottom: 2px solid #444;
      padding-bottom: 5px;
    }
    h1 .date { font-size: 8pt; font-weight: normal; color: #666; float: right; }
    p.subtitle { font-size: 8.5pt; color: #555; margin: 3px 0 10px; }
    .columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .card {
      margin-bottom: 8px;
      padding: 5px 8px 4px;
      background: #f4f4f4;
      border-left: 3px solid #555;
      border-radius: 3px;
    }
    .card h2 {
      font-size: 9.5pt;
      font-weight: bold;
      margin: 0 0 3px;
      color: #222;
    }
    p { margin: 0 0 3px; line-height: 1.3; }
    ul, ol { margin: 2px 0 3px; padding-left: 16px; }
    li { margin-bottom: 2px; line-height: 1.3; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-top: 3px; }
    th { background: #e0e0e0; border: 1px solid #aaa; padding: 2px 5px; text-align: left; font-weight: bold; }
    td { border: 1px solid #ccc; padding: 2px 5px; vertical-align: top; }
    .tip {
      background: #e8f4fd;
      border: 1px solid #bee3f8;
      padding: 3px 6px;
      margin: 3px 0;
      border-radius: 2px;
      font-style: italic;
      font-size: 8.5pt;
      color: #1a5276;
    }
    @media print { @page { size: letter; margin: 1cm; } body { padding: 0; } }
  `;

  const dateStr = new Date().toLocaleDateString();

  const html = `
  <h1>Tournament Manager — Quick Reference <span class="date">${dateStr}</span></h1>
  <p class="subtitle">Common setup and administrative operations. For tournament-day scenarios, see the Day-Of Scenarios tab.</p>
  <div class="columns">
    <div>
      <div class="card">
        <h2>Adding a Walk-In Participant</h2>
        <p>Click <strong>+ Add Participant</strong> in the app header (or Dashboard quick action).</p>
        <ul>
          <li>After adding, assign their category/pool in <strong>Quick Edit</strong> (or the <strong>Editor</strong> tab).</li>
          <li>The affected ring re-orders automatically.</li>
        </ul>
      </div>
      <div class="card">
        <h2>Ring Ordering</h2>
        <p>Rings re-order <strong>automatically</strong> when participants are moved (forms interleaves schools; sparring sorts by height). Use <strong>Custom Order</strong> on a ring in the Tournament tab for manual control.</p>
      </div>
      <div class="card">
        <h2>Fine-Tune Competitor Order</h2>
        <p>In the <strong>Tournament</strong> tab, check <strong>Custom Order</strong> on a ring, then use the ▲ Up / ▼ Down arrows to adjust position. Uncheck <strong>Custom Order</strong> to return to automatic ordering.</p>
      </div>
      <div class="card">
        <h2>Print Blank Sheets</h2>
        <p>Go to <strong>Export</strong> → scroll to <strong>Blank Scoring Sheets</strong>. Click <em>Export Blank Forms Sheet</em> or <em>Export Blank Sparring Bracket</em>.</p>
      </div>
      <div class="card">
        <h2>Save &amp; Restore Data</h2>
        <ul>
          <li><strong>Autosave</strong> — saves every change automatically; each change is committed to History.</li>
          <li><strong>History</strong> — every change is a commit labelled with its operation; open the History tab to review or restore any point.</li>
          <li><strong>Baselines</strong> — named tags that mark important commits (e.g. "Before round 2"). Create them on the History tab.</li>
        </ul>
      </div>
    </div>
    <div>
      <div class="card">
        <h2>Generate PDFs (Export tab)</h2>
        <table>
          <thead><tr><th>Document</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Name Tags</td><td>2×4 per page, ring color coded</td></tr>
            <tr><td>Check-In Sheets</td><td>Per division, alphabetical + checkboxes</td></tr>
            <tr><td>Ring Overview</td><td>All participants by ring and division</td></tr>
            <tr><td>Forms Scoring</td><td>Per forms ring, judge score columns</td></tr>
            <tr><td>Sparring Brackets</td><td>16-person bracket, seeded by height</td></tr>
            <tr><td>Score Sheets Per Division</td><td>Forms + sparring interleaved by ring</td></tr>
            <tr><td>Blank Forms / Bracket</td><td>Blank sheets for manual use</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2>Category Design Tips</h2>
        <table>
          <thead><tr><th>Age Group</th><th>Range</th><th>Gender</th></tr></thead>
          <tbody>
            <tr><td>Young children</td><td>2-yr (5–6, 7–8)</td><td>Mixed OK</td></tr>
            <tr><td>Teens</td><td>3–4 yr (11–14)</td><td>Separate M/F</td></tr>
            <tr><td>Adults</td><td>18+ or 18–34, 35+</td><td>Separate M/F</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2>Pool Sizing Guide</h2>
        <ul>
          <li>1–8 participants → 1 pool</li>
          <li>9–16 participants → 2 pools</li>
          <li>17–24 participants → 3 pools</li>
          <li>25+ participants → 4 pools</li>
        </ul>
      </div>
      <div class="card">
        <h2>Troubleshooting</h2>
        <table>
          <thead><tr><th>Problem</th><th>Fix</th></tr></thead>
          <tbody>
            <tr><td>Unassigned participants</td><td>Check category age/gender criteria or assign manually in Editor</td></tr>
            <tr><td>Unbalanced rings</td><td>Move participants between pools via Quick Edit</td></tr>
            <tr><td>Same school back-to-back</td><td>Rings auto-interleave schools; use Custom Order in the Tournament tab to fine-tune</td></tr>
            <tr><td>PDF won't open</td><td>Ensure a PDF reader is installed</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>`;

  const win = window.open('', '_blank', 'width=920,height=720,scrollbars=yes');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Quick Reference — Tournament Manager</title>
    <style>${printStyles}</style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

function printDayOfScenarios() {
  const printStyles = `
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #111;
      background: #fff;
      margin: 0;
      padding: 1.2cm 1.5cm;
    }
    h1 {
      font-size: 13pt;
      margin: 0 0 2px;
      border-bottom: 2px solid #444;
      padding-bottom: 5px;
    }
    h1 .date { font-size: 8pt; font-weight: normal; color: #666; float: right; }
    p.subtitle { font-size: 8.5pt; color: #555; margin: 3px 0 10px; }
    .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .scenario {
      margin-bottom: 8px;
      padding: 5px 8px 4px;
      background: #f4f4f4;
      border: 1px solid #ddd;
      border-radius: 3px;
    }
    .scenario h2 {
      font-size: 9pt;
      font-weight: bold;
      margin: 0 0 3px;
      color: #222;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: #555;
      color: #fff;
      font-size: 7.5pt;
      font-weight: bold;
      flex-shrink: 0;
    }
    p { margin: 0 0 3px; line-height: 1.3; }
    ol { margin: 2px 0 3px; padding-left: 16px; }
    li { margin-bottom: 2px; line-height: 1.3; }
    .tip {
      background: #e8f4fd;
      border: 1px solid #bee3f8;
      padding: 2px 5px;
      margin: 3px 0 0;
      border-radius: 2px;
      font-style: italic;
      font-size: 8pt;
      color: #1a5276;
    }
    @media print { @page { size: letter; margin: 1cm; } body { padding: 0; } }
  `;

  const dateStr = new Date().toLocaleDateString();

  const html = `
  <h1>Day-Of Scenarios <span class="date">${dateStr}</span></h1>
  <p class="subtitle">Step-by-step answers to common tournament day situations. Find anyone using the Search box at the top of the screen.</p>
  <div class="columns">
    <div>
      <div class="scenario">
        <h2><span class="num">1</span> Look up what ring someone is in</h2>
        <ol>
          <li>Type their name in <strong>Search Participants</strong> (top of screen).</li>
          <li>Results show instantly with ring info (F = forms, S = sparring).</li>
          <li>Click their name to open Quick Edit for full details.</li>
        </ol>
      </div>
      <div class="scenario">
        <h2><span class="num">2</span> Move to a different ring / pool</h2>
        <ol>
          <li>Find them via Search or click name on Tournament tab.</li>
          <li>In Quick Edit, change the Pool dropdown (Forms and/or Sparring).</li>
          <li>Click Save. Ring counts update immediately.</li>
        </ol>
        <p class="tip">To move divisions: change Division + Category first, then Pool.</p>
      </div>
      <div class="scenario">
        <h2><span class="num">3</span> Withdraw from sparring only</h2>
        <ol>
          <li>Find them via Search or Tournament tab.</li>
          <li>In Quick Edit, uncheck <strong>Competing Sparring</strong>.</li>
          <li>Click Save. They stay in forms.</li>
        </ol>
        <p class="tip">Their sparring assignment is saved — can re-add any time.</p>
      </div>
      <div class="scenario">
        <h2><span class="num">4</span> Add sparring for a participant</h2>
        <ol>
          <li>Find them via Search or Tournament tab.</li>
          <li>In Quick Edit, check <strong>Competing Sparring</strong>.</li>
          <li>Select Division, Category, and Pool.</li>
          <li>Click Save.</li>
        </ol>
        <p class="tip">Enable <em>Copy sparring from forms</em> to auto-fill division/category.</p>
      </div>
      <div class="scenario">
        <h2><span class="num">5</span> Withdraw completely (forms + sparring)</h2>
        <ol>
          <li>Find them via Search or Tournament tab.</li>
          <li>In Quick Edit, click <strong>Withdraw</strong>.</li>
          <li>Click Save. Hidden from rings but still in system.</li>
        </ol>
        <p class="tip">Withdrawn participants appear grayed out in the Editor tab.</p>
      </div>
    </div>
    <div>
      <div class="scenario">
        <h2><span class="num">6</span> Come back after withdrawing</h2>
        <ol>
          <li>Type their name in <strong>Search Participants</strong> (Search finds withdrawn people).</li>
          <li>Click name to open Quick Edit.</li>
          <li>Click <strong>Restore</strong> (or re-check Competing Forms/Sparring manually).</li>
          <li>Verify category and pool, then click Save.</li>
        </ol>
        <p class="tip">Restore puts them back in their last category and pool.</p>
      </div>
      <div class="scenario">
        <h2><span class="num">7</span> Spar in a different division</h2>
        <ol>
          <li>Find them via Search or Tournament tab.</li>
          <li>In Quick Edit, ensure <strong>Competing Sparring</strong> is checked.</li>
          <li>Uncheck <em>Copy sparring from forms</em>.</li>
          <li>Select the different Division, Category, and Pool for sparring.</li>
          <li>Click Save. Forms ring is unchanged.</li>
        </ol>
      </div>
      <div class="scenario">
        <h2><span class="num">8</span> Create a Grand Champion ring</h2>
        <ol>
          <li>Categories tab → create a new category (e.g. &ldquo;Grand Champion&rdquo;), wide age range.</li>
          <li>Use Quick Edit or Editor to assign each champion to this category, Pool 1.</li>
          <li>Ring Map → assign Grand Champion pool to a physical ring.</li>
          <li>The ring re-orders automatically (enable Custom Order if you need a specific order).</li>
          <li>Export → generate scoring sheet or bracket.</li>
        </ol>
        <p class="tip">Competitors can be in their regular ring AND the Grand Champion ring.</p>
      </div>
      <div class="scenario">
        <h2><span class="num">9</span> Print blank sparring or forms sheets</h2>
        <ol>
          <li>Go to <strong>Export</strong> tab.</li>
          <li>Scroll to <strong>Blank Scoring Sheets</strong> at the bottom.</li>
          <li>Click <em>Export Blank Forms Sheet</em> or <em>Export Blank Sparring Bracket</em>.</li>
        </ol>
        <p class="tip">PDF saved to your configured output folder.</p>
      </div>
    </div>
  </div>`;

  const win = window.open('', '_blank', 'width=920,height=720,scrollbars=yes');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Day-Of Scenarios — Tournament Manager</title>
    <style>${printStyles}</style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

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
      case 'overview':          return <Overview />;
      case 'pre-tournament':    return <PreTournamentGuide />;
      case 'tournament-day':    return <TournamentDayGuide />;
      case 'quick-reference':   return <QuickReference />;
      case 'day-of-reference':  return <DayOfReference />;
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
          overflow: 'hidden',
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
            flexShrink: 0,
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
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          {helpTopics.map((t) => (
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
            minHeight: 0,
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
