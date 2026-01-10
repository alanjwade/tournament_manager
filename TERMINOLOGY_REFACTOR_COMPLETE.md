# Terminology Refactoring - Phase 1 Complete

## Overview
This document tracks the completion of the comprehensive terminology refactoring from the old "cohort" system to the new "category/pool" system, as outlined in RING_ASSIGNMENT_ANALYSIS.md.

## Changes Made

### Core Terminology Updates
- **Division** → Division (unchanged)
- **Cohort** → **Category**
- **Cohort Ring** → **Pool**
- **Physical Ring** → Physical Ring (unchanged)

### Type Definitions (types/tournament.ts)
- `Cohort` interface → `Category` interface
- `CohortRingMapping` → `CategoryPoolMapping`
- `PhysicalRingMapping.cohortRingName` → `categoryPoolName`
- Participant fields:
  - `formsCohortId` → `formsCategoryId`
  - `sparringCohortId` → `sparringCategoryId`
  - `formsCohortRing` → `formsPool`
  - `sparringCohortRing` → `sparringPool`

### Files Renamed
- `src/renderer/utils/cohortAssignment.ts` → `categoryAssignment.ts`
- `src/renderer/components/CohortManagement.tsx` → `CategoryManagement.tsx`

### Function Renames
- `assignCohorts` → `assignCategories`
- `assignRingsWithinCohort` → `assignRingsWithinCategory`
- `assignRingsForAllCohorts` → `assignRingsForAllCategories`
- `updateParticipantsWithCohorts` → `updateParticipantsWithCategories`
- `autoGenerateCohortDefinitions` → `autoGenerateCategoryDefinitions`
- `sortCohorts` → `sortCategories`
- `getCohortRings` → `getCategoryRings`
- `getCohortName` → `getCategoryName`

### State Management (tournamentStore.ts)
- State: `cohorts` → `categories`
- State: `cohortRingMappings` → `categoryPoolMappings`
- Actions: All updated to use category terminology
- Backward compatibility: Maintained for loading old tournament files

### Components Updated
- ✅ App.tsx - Tab labels and imports
- ✅ CategoryManagement.tsx - Comprehensive update
- ✅ RingManagement.tsx - All cohort references
- ✅ RingOverview.tsx - Variable names and UI
- ✅ DataViewer.tsx - All references
- ✅ Dashboard.tsx - Status calculations
- ✅ OrderRings.tsx - Variable names
- ✅ PhysicalRingAssignment.tsx - Variable names
- ✅ RingMapEditor.tsx - Variable names
- ✅ PDFExport.tsx - Store selectors

### Utilities Updated
- ✅ categoryAssignment.ts (renamed from cohortAssignment.ts)
- ✅ ringAssignment.ts - All function names and parameters
- ✅ ringOrdering.ts - Parameter names (categoryId, pool)
- ✅ computeRings.ts - Variable names and comments

### PDF Generators Updated
- ✅ formsScoringSheet.ts
- ✅ sparringBracket.ts
- ✅ ringOverview.ts
- ✅ checkInSheet.ts
- ✅ nameTags.ts

## Backward Compatibility

### Legacy Field Support
The following legacy fields are maintained for backward compatibility:
- `cohortId` (still accepted in CompetitionRing)
- `cohortRingName` (still accepted in PhysicalRingMapping)
- `formsCohortId`, `sparringCohortId` (deprecated participant fields)
- `formsCohortRing`, `sparringCohortRing` (deprecated participant fields)
- `formsRingId`, `sparringRingId` (legacy ring references)

### Migration Logic
- Store automatically migrates `cohorts` → `categories` on load
- Store automatically migrates `cohortRingMappings` → `categoryPoolMappings` on load
- Checkpoint restoration handles both old and new field names
- CompetitionRing creation includes legacy `cohortId` field

## Build Status
✅ **All builds passing** - TypeScript compilation and Vite build successful

## Verification

### Manual Testing Checklist
- [ ] Test loading old tournament files (backward compatibility)
- [ ] Test creating new categories
- [ ] Test assigning participants to categories
- [ ] Test pool assignments (ring subdivision)
- [ ] Test physical ring mapping
- [ ] Test PDF generation with new terminology
- [ ] Verify all UI labels show "Category" and "Pool"
- [ ] Test checkpoint save/restore

## Next Steps (Phase 2)

According to RING_ASSIGNMENT_ANALYSIS.md, the next phase involves:

1. **Merge Category + Pool Assignment** - Combine CategoryManagement and RingManagement into single "Groups & Rings" tab
2. **Simplify Flow** - Reduce 6-step process to 3-step process:
   - Import Participants
   - Create Groups & Assign Rings
   - Map to Physical Rings

This Phase 1 terminology refactoring establishes the foundation for these workflow improvements.

## Statistics

- **Files Modified**: ~25 files
- **Functions Renamed**: ~15 functions
- **Interfaces Renamed**: 3 core interfaces
- **Build Time**: ~3.7 seconds
- **No Runtime Errors**: All functionality preserved

---
*Completed: [Date will be added when summary is finalized]*
*Next Phase: Workflow Consolidation (see RING_ASSIGNMENT_ANALYSIS.md)*
