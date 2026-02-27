# Tournament Manager - Quick Reference Card

## Quick Start

```bash
npm install          # Install dependencies (first time only)
npm run dev          # Start development mode
npm run build        # Build for production
npm start            # Run built application
npm run package      # Create distributable
```

## Excel File Format

Required columns (exact names):
- `student first name`
- `student last name`
- `age`
- `gender`
- `height feet`
- `height inches`
- `school`
- `Branch` (optional)
- `division`

## Workflow

1. **Import** → Upload Excel file
2. **Configure** → Set divisions, physical rings, school abbreviations
3. **Categories** → Assign participants to categories by age/gender/division
4. **Ring Map** → Map category pools to physical rings
5. **Tournament** → Review rings, quick-edit participants, adjust ordering
6. **Checkpoints** → Save snapshots, track and print changes
7. **Export** → Generate PDFs

## Standard Flows

| Task | How |
|------|-----|
| **Move to another ring** | Tournament → click name → Quick Edit → change Category/Pool → Save |
| **Withdraw from sparring** | Quick Edit → uncheck "Competing in Sparring" → Save |
| **Add to sparring** | Quick Edit → check "Competing in Sparring" → select Division/Category/Pool → Save |
| **Withdraw completely** | Quick Edit → uncheck both Forms and Sparring → Save |
| **Add new participant** | Header bar → "+ Add Participant" → fill fields → Add |
| **Custom order a ring** | Tournament → check "Custom Order" on ring → use ▲/▼ buttons |
| **Return to auto order** | Uncheck "Custom Order" → ring re-orders automatically |
| **Create checkpoint** | Checkpoints tab → "Create Checkpoint" → name it |
| **View changes** | Click "View Diff" on a checkpoint |
| **Revert changes** | Click "Load" on a checkpoint |
| **Print only changed rings** | Tournament → "Print All Changed" button |

## Ring Ordering

| Mode | Behavior |
|------|----------|
| **Auto (default)** | Rings re-order automatically when participants are moved. ▲/▼ buttons disabled. |
| **Custom Order** | Check the "Custom Order" checkbox. ▲/▼ buttons enabled. Auto-reorder skipped for that ring. |
| **Uncheck Custom** | Ring immediately re-orders using the automatic algorithm. |

**Forms algorithm:** Interleaves schools, distributes branches evenly, first 3 from different schools.

**Sparring algorithm:** Sorted by height, shortest to tallest. Alt rings (a/b) sorted independently.

## Warnings

| Action | Warning | Impact |
|--------|---------|--------|
| Re-run Category Assignment | ⚠️ Destroys previous assignments | All manual edits lost |
| Load Checkpoint | ⚠️ Replaces current state | Create a checkpoint first |
| Uncheck Custom Order | ✅ Re-orders that ring only | Other rings unaffected |

## Category Guidelines

### Age Ranges
- **Young Children**: 2-year ranges (5-6, 7-8, 9-10)
- **Teens**: 3-4 year ranges (11-14, 15-17)
- **Adults**: 18+ or (18-34, 35+)

### Ring Balance
| Participants | Recommended Pools |
|--------------|-------------------|
| 1-8 | 1 pool |
| 9-16 | 2 pools |
| 17-24 | 3 pools |
| 25+ | 4 pools |

## PDF Outputs

| Document | Format | Key Features |
|----------|--------|-------------|
| **Name Tags** | 2×4 grid per page | Name, division, school, ring color |
| **Check-In Sheets** | One per division | Sorted by last name, checkbox |
| **Forms Scoring Sheets** | One per ring | Rank order, 3 judges, watermark |
| **Sparring Brackets** | 16-person landscape | Height order, byes, color-coded rounds |

## Quick Edit Modal

Click any participant name in the Tournament tab to open:
- Toggle competing in forms/sparring
- Change division, category, pool
- Set sparring alt ring (a/b)
- Adjust rank order
- "Copy from Forms" checkbox mirrors settings to sparring

## Checkpoints

- **Create**: Save a named snapshot of the current state
- **Diff**: Compare current state vs. checkpoint (added/removed/modified participants, affected rings)
- **Load**: Restore to a previous checkpoint
- **Print Changed**: Print only the rings that changed since the last checkpoint

## Day-of-Tournament Checklist

1. Create a checkpoint at start of day
2. Handle late registrations (+ Add Participant)
3. Handle no-shows (Quick Edit → uncheck competing)
4. Move participants between rings as needed (Quick Edit)
5. Use Custom Order for finalized rings
6. Print All Changed for updated sheets
7. Create checkpoints before major changes

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Excel won't import | Check column names match exactly |
| Participant missing from ring | Check category/pool in Quick Edit |
| Unbalanced rings | Move participants between pools via Quick Edit |
| Need specific order | Enable Custom Order on that ring |
| Need to undo changes | Load a previous checkpoint |
| Build errors | Run `npm install` again |

---

**Print this page for quick reference during tournament setup!**
