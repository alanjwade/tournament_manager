# UX Suggestions for Tournament Manager

This document contains suggestions for improving the user experience, organized by usage scenario.

---

## Tournament Day: Quick Changes & Fast Reprinting

### 1. "Quick Reprint" Mode or Dashboard

**Problem:** Reprinting a single ring's forms requires navigating through multiple tabs and expanding options.

**Current flow:**
1. Go to Export PDFs tab
2. Select division
3. Expand advanced options
4. Select the specific ring(s)
5. Click Export or Print

**Suggestion:** Add a dedicated "Tournament Day" dashboard that shows:
- All rings at a glance (like Ring Overview but with action buttons)
- One-click "Print Forms" and "Print Bracket" buttons per ring
- Visual indicators for rings that have changed since last print (integrating checkpoint diff)

---

### 2. Inline Editing from Ring Overview

**Problem:** The Ring Overview tab shows participants per ring, but editing a participant requires switching to the Participant Editor tab and searching for them.

**Suggestion:** Make participant names clickable in Ring Overview to open a quick-edit popup for common changes:
- Rank order
- Alt ring assignment
- Physical ring assignment

---

### 3. Recently Changed Rings Badge/Highlight

**Problem:** The checkpoint diff feature exists but isn't visible until you're in Export PDFs tab.

**Suggestion:** Show a visual badge on the Ring Overview and Export PDFs tabs indicating:
- "3 rings changed since last checkpoint"
- Making it obvious what needs reprinting

---

### 4. Last Printed Timestamp per Ring

**Problem:** There's no way to know if you've already printed updated sheets for a ring.

**Suggestion:** Track and display when each ring's PDF was last generated/printed. Highlight rings where changes occurred after last print.

---

### 5. Bulk "Print All Changed" Button

**Problem:** The "Select Diff from Checkpoint" feature requires manually picking a checkpoint and division, generating one division at a time.

**Suggestion:** Add a single button: "Print All Changed Since [Latest Checkpoint]" that generates a combined PDF of all modified forms/brackets across all divisions in one action.

---

## Pre-Tournament: Big Picture & Low-Friction Experimentation

### 6. Summary Dashboard / Home Tab

**Problem:** There's no overview of tournament status. Users must click through tabs to understand the current state.

**Suggestion:** Add a summary dashboard showing:
- Total participants, by division
- Cohort coverage (% assigned to cohorts)
- Ring coverage (% with ring assignments)
- Warnings (unassigned participants, unbalanced rings, missing physical ring mappings)
- Quick links to problem areas

---

### 7. "What If" Mode / Sandbox

**Problem:** Re-running cohort or ring assignment is destructive and shows a scary warning, which discourages experimentation.

**Suggestion:** Add a "Preview Changes" mode that shows what cohorts/rings *would* look like without committing. Let users compare before/after and then apply or cancel.

---

### 8. Undo/Redo Stack

**Problem:** Checkpoints exist but are manual and don't support quick undo of the last action.

**Suggestion:** Implement automatic micro-checkpoints after major actions (cohort assign, ring assign) with `Ctrl+Z` to undo the last action without needing to manually create/load checkpoints.

---

### 9. Visual Ring Balance Indicators

**Problem:** Ring Management shows participant counts per ring, but it's not immediately obvious if rings are unbalanced.

**Suggestion:** Add color-coded indicators (green/yellow/red) showing ring balance. For example:
- Green: 8-12 participants (balanced)
- Yellow: 5-7 or 13-15 participants (acceptable)
- Red: <5 or >15 participants (unbalanced)

---

### 10. Guided Workflow / Progress Tracker

**Problem:** The tab order implies a workflow, but there's no explicit guidance for first-time users or progress tracking.

**Suggestion:** Add a progress indicator or wizard-style guidance:
```
✅ Import Data (154 participants)
✅ Configure Divisions (5 divisions)
🔄 Assign Cohorts (12/15 complete)
⬜ Assign Rings
⬜ Map Physical Rings
⬜ Export PDFs
```

---

### 11. Cohort Templates / Presets

**Problem:** Creating cohorts is repetitive - same pattern for each division (ages 5-7, 8-10, 11-13, etc.).

**Suggestion:** Allow saving cohort templates (e.g., "Standard Youth Ages") and applying them across divisions with one click.

---

### 12. Division-Scoped Views

**Problem:** Many tabs require selecting a division first, and the selection doesn't persist across tabs.

**Suggestion:** Add a global division selector in the header that filters all views, persisting as you switch tabs.

---

## General Usability

### 13. Tab Labels with Status Badges

**Problem:** Tabs currently only show names. Users can't tell at a glance where work is needed.

**Suggestion:** Add badges to tabs showing status:
- "Cohorts (3 unassigned)"
- "Rings ⚠️"
- "Export (ready)"

---

### 14. Keyboard Shortcuts for Common Actions

**Problem:** No keyboard shortcuts exist, requiring mouse navigation for repetitive tasks.

**Suggestion:** Add shortcuts:
- `Ctrl+P` → Quick print dialog
- `Ctrl+S` → Create checkpoint
- `Ctrl+1-9` → Switch tabs
- `Ctrl+Z` → Undo last major action

---

### 15. Global Participant Search

**Problem:** The Participant Editor has filters, but they're per-column and require knowing where to look. There's no way to globally search for a participant.

**Suggestion:** Add a global search bar that finds participants by name across the entire app, then navigates to their ring/cohort.

---

### 16. Physical Ring Color Display

**Problem:** Physical rings have colors defined, but they're not prominently displayed in the UI when making assignments.

**Suggestion:** Show ring colors as colored dots/badges next to ring names throughout the app:
- Ring Map Editor
- Ring Overview
- Physical ring dropdowns in Participant Editor

---

## Priority Matrix

### High Impact, Low Effort
- #13 - Tab status badges
- #12 - Global division selector
- #3 - Recently changed rings badge
- #9 - Visual ring balance indicators

### High Impact, Medium Effort
- #6 - Summary dashboard
- #4 - Last printed timestamp per ring
- #16 - Physical ring color display

### Medium Impact, Low Effort
- #14 - Keyboard shortcuts
- #15 - Global participant search

### High Impact, High Effort
- #1 - Tournament day dashboard
- #2 - Inline editing from Ring Overview
- #8 - Undo/redo stack
- #7 - Preview mode
- #11 - Cohort templates

### Lower Priority / Nice to Have
- #10 - Progress tracker (may be redundant with #6)
- #5 - Bulk print all changed (nice to have)

---

## Notes for Implementation

- Many of these suggestions build on existing features (checkpoints, ring mappings, cohort assignments)
- Some can be implemented incrementally (status badges first, then full dashboard)
- The global division selector (#12) would improve the entire UX if implemented early
- Keyboard shortcuts (#14) are low-cost wins that power users will appreciate
- The preview/sandbox mode (#7) would significantly reduce user hesitation during setup

