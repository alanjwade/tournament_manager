# Data Change Flow Analysis & Recommendations

## Executive Summary

This document analyzes how users enter and modify participant data in the Tournament Manager application. The analysis identifies friction points, potential bugs, and opportunities to simplify the user experience while maintaining the flexibility needed for complex tournament scenarios.

---

## Current System Overview

### Key Data Concepts

1. **Divisions**: Skill levels (Black Belt, Level 1, Level 2, etc.)
2. **Categories**: Age/gender groupings within a division (e.g., "Mixed 8-10")
3. **Pools**: Subgroups within categories (P1, P2, P3) to limit group sizes
4. **Physical Rings**: The actual competition areas (PR1, PR2, PR1a, PR1b, etc.)

### Participant Data Structure

Each participant has:
- Basic info: name, age, gender, height, school, branch
- Forms: `formsDivision`, `formsCategoryId`, `formsPool`, `formsRankOrder`
- Sparring: `sparringDivision`, `sparringCategoryId`, `sparringPool`, `sparringRankOrder`, `sparringAltRing`
- Competition flags: `competingForms`, `competingSparring`

### Special Division Values
- `"not participating"` - Participant is not competing in this type
- `"same as forms"` - Sparring uses forms category/pool
- `"same as sparring"` - Forms uses sparring category/pool

---

## Current Edit Locations & Capabilities

### 1. Data Import (`DataImport.tsx`)
**Purpose**: Initial bulk data entry from Excel/CSV
**What it does**: Sets basic info and divisions; determines `competingForms`/`competingSparring` flags

**Issues**:
- ✅ Good: Validates and normalizes division values
- ⚠️ Only place to initially set "same as forms" / "same as sparring"

### 2. Participant Editor (`ParticipantEditor.tsx`)
**Purpose**: Edit basic participant info

**What you CAN do**:
- Edit first name, last name, age, height, school, branch
- View forms/sparring divisions, categories, rings (display only)
- View forms/sparring order (display only)

**What you CANNOT do**:
- ❌ Change divisions (forms or sparring)
- ❌ Change category assignments
- ❌ Change pool assignments
- ❌ Change competition order
- ❌ Remove from competition
- ❌ Split forms and sparring into different pools

**Issues**:
- Very limited - primarily for name/demographic corrections
- Shows ring info but doesn't allow editing it
- Column headers suggest editability but cells are read-only

### 3. Data Viewer (`DataViewer.tsx`)
**Purpose**: Comprehensive participant grid with inline editing

**What you CAN do**:
- Change forms/sparring division (including "not participating")
- Change forms/sparring category assignment
- Change forms/sparring pool assignment
- Change forms/sparring order (displays as multiplied by 10)
- Change physical ring mapping

**What you CANNOT do**:
- ❌ Edit basic info (name, age, height, school, branch) - display only
- ❌ Remove participant entirely

**Issues**:
- ⚠️ **Pool dropdown depends on category being selected first** - if you clear category, pool dropdown shows no options
- ⚠️ **Changing pool doesn't automatically renumber** - ranks may get out of order
- ⚠️ **Physical ring dropdown is complex** - shows all rings from all divisions, hard to find correct one
- ⚠️ **"same as forms" special handling** - when sparring is "same as forms", the sparring category/pool dropdowns still show but may not work correctly
- ⚠️ **Order is displayed × 10** - confusing UI pattern (shows "10" but stores 1)
- ⚠️ **No validation feedback** - silent failures if invalid combinations are selected

### 4. Ring Overview (`RingOverview.tsx`)
**Purpose**: View rings with pool contents and make quick edits

**What you CAN do**:
- Move participants up/down in ranking order
- Click participant name to open "Quick Edit" modal
- In Quick Edit modal:
  - Change category & pool (combined dropdown)
  - Change physical ring mapping (pool-level, affects entire pool)
  - View but not edit basic info

**What you CANNOT do**:
- ❌ Edit basic info (name, age, etc.) - only displayed
- ❌ Remove from competition
- ❌ Change division

**Issues**:
- ✅ **Good**: Best place for reordering - clear visual feedback
- ✅ **Good**: Quick Edit modal handles pool-changing renumbering logic
- ⚠️ **Quick Edit physical ring dropdown only shows rings for current division** - can't easily move across divisions
- ⚠️ **Pool change puts participant at top of new pool** - may not be desired behavior
- ⚠️ **Sparring "same as forms" participants show in both forms and sparring views** - potentially confusing

### 5. Category Management (`CategoryManagement.tsx`)
**Purpose**: Create categories and auto-assign participants to pools

**What you CAN do**:
- Create new categories with specific criteria
- Auto-assign unassigned participants matching criteria
- Adjust number of pools in a category
- Delete categories

**What you CANNOT do**:
- ❌ Move individual participants between categories
- ❌ Edit participants directly

**Issues**:
- ✅ **Good**: Batch assignment is efficient
- ⚠️ **One-way operation** - once assigned, participants can only be moved via DataViewer or Quick Edit
- ⚠️ **Category criteria is frozen** - can't expand/contract age range after creation
- ⚠️ **No way to split categories** - if you need to break one up, must recreate

---

## Analysis of User Intent vs. Implementation

### Intent 1: "Change someone from one pool to another for forms and sparring"

**Current paths**:
1. **DataViewer**: Change category dropdown, then pool dropdown (two steps)
2. **Ring Overview Quick Edit**: Combined category+pool dropdown (one step, better UX)

**Issues Found**:
- In DataViewer, if forms and sparring use the same category (via "same as forms"), changing the forms pool does NOT automatically update the effective sparring pool - the UI may show stale data
- Pool renumbering in DataViewer doesn't happen - participant keeps old rank order
- Ring Overview Quick Edit handles renumbering correctly ✅

**Recommendations**:
1. Add visual indicator when sparring is "same as forms" - make it clear the pools are linked
2. Add renumbering logic to DataViewer pool changes
3. Consider deprecating DataViewer for pool changes in favor of Ring Overview

### Intent 2: "Remove someone from competition altogether"

**Current paths**:
1. **DataViewer**: Set `formsDivision` and `sparringDivision` to "not participating"
2. No delete button anywhere

**Issues Found**:
- No single "remove from competition" action
- Must manually clear both divisions
- Participant remains in the data (correctly - may rejoin later)
- No confirmation dialog
- No way to see "removed" participants easily

**Recommendations**:
1. Add a "Withdraw from Competition" button that sets both divisions to "not participating" with one click
2. Add a filter/view option to show withdrawn participants
3. Consider adding "Withdraw from Forms only" / "Withdraw from Sparring only" quick actions

### Intent 3: "Move participants around in the order of a pool"

**Current paths**:
1. **Ring Overview**: Up/down arrow buttons ✅
2. **DataViewer**: Edit the order number directly (confusing ×10 display)

**Issues Found**:
- Ring Overview is the correct place - works well
- DataViewer order editing is confusing and doesn't handle conflicts

**Recommendations**:
1. Remove direct order editing from DataViewer OR fix the ×10 display confusion
2. Document that Ring Overview is the proper place for ordering

### Intent 4: "Put a person in one forms pool and a different sparring pool"

**Current paths**:
1. **Data Import**: Set different divisions for forms vs sparring
2. **DataViewer**: Change sparring division from "same as forms" to a specific division, then assign different category/pool

**Issues Found**:
- Works correctly when divisions differ
- When divisions are the same but pools should differ, the "same as forms" shortcut breaks this
- No clear UI guidance that you need to change division first

**Implementation Gap**:
The system currently handles this case but the UI makes it confusing:
1. If sparring is "same as forms", you CANNOT have a different pool
2. To have different pools within the same division, you must set sparring to the actual division name (not "same as forms")
3. This creates two separate category entries (forms category + sparring category)

**Recommendations**:
1. Add a tooltip explaining "same as forms" vs explicit division
2. When user tries to change sparring pool while "same as forms" is set, prompt them to confirm switching to explicit division
3. Add documentation/help text explaining the difference

### Intent 5: "Allow someone to be sparring only (not forms)"

**Current paths**:
1. **Data Import**: Set formsDivision to "not participating"
2. **DataViewer**: Change formsDivision to "not participating"

**Issues Found**:
- Works correctly ✅
- If participant was already assigned to a forms category, changing to "not participating" doesn't remove the categoryId
- Stale `formsCategoryId` and `formsPool` remain in data (but are ignored since `competingForms` is false)

**Recommendations**:
1. When division changes to "not participating", clear the corresponding categoryId and pool
2. Add validation to flag participants with stale category assignments

### Intent 6: "Easy to correct things like name, age, height"

**Current paths**:
1. **Participant Editor**: Click Edit, change fields, Save

**Issues Found**:
- Works correctly ✅
- Name changes propagate correctly to all views
- Age/height changes don't trigger category re-evaluation (may now be in wrong category)

**Recommendations**:
1. After age change, check if participant still fits in assigned category age range
2. If not, show a warning suggesting the user reassign them

---

## Code Issues & Potential Bugs

### Issue 1: Stale Competition Ring References

**Location**: Multiple places reference `competitionRings` but these are computed on-demand

**Code Pattern**:
```typescript
const competitionRings = useMemo(() => 
  computeCompetitionRings(participants, categories, categoryPoolMappings),
  [participants, categories, categoryPoolMappings]
);
```

**Risk**: UI may show stale data if memoization dependencies don't include all needed values.

### Issue 2: Legacy Field Duplication

**Location**: `types/tournament.ts` - Multiple legacy fields that duplicate new ones

**Current Fields**:
- `formsCategoryId` vs `formsCohortId` vs `cohortId`
- `formsPool` vs `formsCohortRing`
- `formsRingId` (deprecated)

**Risk**: Some code paths may update one field but not the other, causing inconsistencies.

**Recommendation**: 
1. Audit all field writes to ensure both legacy and new fields are updated
2. Add migration to clean up legacy-only data

### Issue 3: getEffectiveSparringInfo/getEffectiveFormsInfo Not Used Everywhere

**Location**: `computeRings.ts` has helper functions, but not all code paths use them

**Risk**: Some UI components may not correctly resolve "same as forms" relationships.

**Affected Areas**:
- DataViewer pool dropdowns
- CategoryManagement participant counts
- PDF generators (recently fixed)

**Recommendation**: Audit all places that read sparring/forms category+pool and use the helper functions.

### Issue 4: Race Condition in Pool Renumbering

**Location**: `RingOverview.tsx` `handleSave` function

**Code**:
```typescript
// This uses updateParticipant multiple times in a loop
oldPoolParticipants.forEach((p, index) => {
  updateParticipant(p.id, { formsRankOrder: index + 1 });
});
```

**Risk**: If Zustand batches these updates, intermediate states may be visible. If not batched, many re-renders occur.

**Recommendation**: Use `setParticipants` with a single batch update instead of multiple `updateParticipant` calls.

### Issue 5: Physical Ring Mapping Confusion

**Location**: `DataViewer.tsx` `updateParticipantPhysicalRing` function

**What it does**: Changes the physical ring for a participant

**What it actually does**: Finds the mapping for that physical ring and updates the participant's category/pool to match

**Problem**: The function name suggests it's changing which physical ring a participant is in, but it's actually reassigning them to a different category/pool based on existing mappings.

**Recommendation**: Rename function or clarify UI to indicate this reassigns the participant to a different pool.

---

## Recommended UI Simplifications

### Recommendation 1: Consolidate Edit Locations

**Current State**: Three edit locations with overlapping but different capabilities

**Proposed Change**: 
- **Participant Editor**: All basic info (name, age, height, school, branch)
- **Ring Overview**: All assignment changes (division, category, pool, order) via Quick Edit modal
- **DataViewer**: Read-only view with links to appropriate edit location

### Recommendation 2: Unified Quick Edit Modal

**Current**: Ring Overview Quick Edit only shows partial info

**Proposed Change**: Expand Quick Edit modal to include:
- Basic info section (editable)
- Forms section: division, category+pool, physical ring, order
- Sparring section: division, category+pool, physical ring, order, alt ring
- "Withdraw" button
- History/audit trail of changes

### Recommendation 3: Smart Pool Dropdowns

**Current**: Pool dropdown only shows pools for selected category

**Proposed Change**: 
- Show pools with participant counts: "Pool 1 (8 participants)"
- Show balance indicators (green/yellow/red)
- Auto-suggest which pool to assign to based on balance

### Recommendation 4: "Same As" Visual Indicator

**Current**: When sparring is "same as forms", sparring fields show but edits may not work correctly

**Proposed Change**:
- Gray out or hide sparring category/pool when "same as forms"
- Show clear "Using Forms Assignment" badge
- If user tries to edit, prompt: "Change sparring to independent assignment?"

### Recommendation 5: Withdraw Workflow

**Current**: Manual two-step process to set both divisions to "not participating"

**Proposed Change**:
- Add "Withdraw from Competition" button with confirmation
- Options: "Withdraw from Forms only", "Withdraw from Sparring only", "Withdraw completely"
- Clear associated category/pool assignments when withdrawing

### Recommendation 6: Age/Category Mismatch Detection

**Current**: Changing age doesn't validate against category age range

**Proposed Change**:
- After age edit, check if still in valid range
- Show warning: "Alex (age 11) is assigned to category 'Mixed 8-10'. Consider reassigning."
- Offer quick action to reassign

---

## Summary of Priority Actions

### High Priority (Bugs/Data Integrity)
1. Clear categoryId/pool when setting division to "not participating"
2. Use getEffectiveSparringInfo/getEffectiveFormsInfo everywhere
3. Add pool renumbering to DataViewer when pool changes
4. Audit legacy field writes for consistency

### Medium Priority (UX Improvements)
1. Add "Withdraw" quick action
2. Gray out sparring fields when "same as forms"
3. Show pool participant counts in dropdowns
4. Fix ×10 order display confusion in DataViewer

### Low Priority (Nice to Have)
1. Consolidate edit UIs
2. Add age/category mismatch detection
3. Expand Quick Edit modal
4. Add audit trail for changes

---

## Appendix: Field Usage Map

| Field | Written By | Read By | Notes |
|-------|-----------|---------|-------|
| `formsDivision` | DataImport, DataViewer | Everywhere | Controls competingForms |
| `sparringDivision` | DataImport, DataViewer | Everywhere | Controls competingSparring |
| `formsCategoryId` | CategoryManagement, DataViewer, RingOverview | computeRings, all UIs | Should be cleared when not competing |
| `formsPool` | CategoryManagement, DataViewer, RingOverview | computeRings, all UIs | Depends on category |
| `formsRankOrder` | autoAssign, RingOverview, DataViewer | Ring display, PDFs | Must be unique per pool |
| `sparringCategoryId` | CategoryManagement, DataViewer, RingOverview | computeRings, all UIs | May equal formsCategoryId |
| `sparringPool` | CategoryManagement, DataViewer, RingOverview | computeRings, all UIs | May equal formsPool |
| `sparringRankOrder` | autoAssign, RingOverview, DataViewer | Ring display, PDFs | Must be unique per pool |
| `sparringAltRing` | RingOverview | sparringBracket | For split brackets |
| `competingForms` | DataImport, derived from division | PDF generation, filtering | Should be derived, not stored |
| `competingSparring` | DataImport, derived from division | PDF generation, filtering | Should be derived, not stored |
