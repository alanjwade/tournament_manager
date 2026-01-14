# Fixes Applied - January 13, 2026

## Issue 1: Stale Competition Ring References (FIXED)

### Problem
When setting division to "not participating", the participant's categoryId and pool assignments were not cleared, leaving stale data that could cause confusion or incorrect behavior.

### Solution Applied
Updated `DataViewer.tsx` `updateParticipantDivision()` function to:
- Clear `formsCategoryId`, `formsCohortId`, `formsPool`, `formsCohortRing`, and `formsRankOrder` when `formsDivision` is set to "not participating"
- Clear `sparringCategoryId`, `sparringCohortId`, `sparringPool`, `sparringCohortRing`, `sparringRankOrder`, and `sparringAltRing` when `sparringDivision` is set to "not participating"

### Files Modified
- `src/renderer/components/DataViewer.tsx` - Lines 232-254

### Impact
- Prevents participants from appearing in competition rings they're not supposed to be in
- Eliminates confusion when a participant withdraws from competition
- Cleaner data state with no orphaned assignments

---

## Issue 2: Legacy Field Duplication (FIXED)

### Problem
The codebase has multiple legacy fields that duplicate newer ones:
- `formsCategoryId` vs `formsCohortId` vs `cohortId`
- `formsPool` vs `formsCohortRing`
- `sparringCategoryId` vs `sparringCohortId`
- `sparringPool` vs `sparringCohortRing`

Some code paths were updating only the new fields, causing inconsistencies when other code still relied on legacy fields.

### Solution Applied

#### 1. DataViewer.tsx - All update functions now sync legacy fields
- `updateParticipantDivision()`: Syncs cohort fields when "same as forms" is set
- `updateParticipantCohort()`: Syncs `formsCohortId` when `formsCategoryId` changes, `sparringCohortId` when `sparringCategoryId` changes
- `updateParticipantCohortRing()`: Syncs `formsCohortRing` when `formsPool` changes, `sparringCohortRing` when `sparringPool` changes  
- `updateParticipantPhysicalRing()`: Syncs all legacy fields when category/pool is updated

#### 2. tournamentStore.ts - Central update function syncs automatically
- `updateParticipant()` now automatically syncs legacy fields whenever new fields are updated
- This provides a safety net for any code path that uses the store's update function

#### 3. CategoryManagement.tsx - Category assignment syncs legacy fields
- When assigning forms category: syncs both `formsCohortId` and `cohortId`
- When assigning sparring category: syncs `sparringCohortId`

### Files Modified
1. `src/renderer/components/DataViewer.tsx` - Lines 232-361
2. `src/renderer/store/tournamentStore.ts` - Lines 98-119
3. `src/renderer/components/CategoryManagement.tsx` - Lines 250-289

### Files Already Correct
- `src/renderer/utils/autoAssignAndOrder.ts` - Already syncing legacy fields ✓
- `src/renderer/utils/ringAssignment.ts` - Already syncing legacy fields ✓
- `src/renderer/utils/categoryAssignment.ts` - Already syncing legacy fields ✓

### Impact
- Ensures backward compatibility with older data
- Eliminates bugs where different parts of the system see different values
- Makes eventual migration to remove legacy fields safer

---

## Testing Recommendations

### Test Case 1: Withdraw from Competition
1. Open Data Viewer
2. Select a participant competing in both forms and sparring
3. Set Forms Division to "not participating"
4. Verify:
   - `formsCategoryId` is cleared
   - `formsPool` is cleared
   - `formsRankOrder` is cleared
   - Participant no longer appears in any forms rings
5. Set Sparring Division to "not participating"
6. Verify:
   - `sparringCategoryId` is cleared
   - `sparringPool` is cleared
   - `sparringRankOrder` is cleared
   - Participant no longer appears in any sparring rings

### Test Case 2: "Same as Forms" Handling
1. Set a participant's sparring division to "same as forms"
2. Verify both `sparringCategoryId` and `sparringCohortId` match forms values
3. Verify both `sparringPool` and `sparringCohortRing` match forms values

### Test Case 3: Legacy Field Sync
1. Use Ring Overview Quick Edit to change a participant's pool
2. Check the raw data (browser console or save file)
3. Verify both `formsPool` and `formsCohortRing` are updated
4. Verify both `formsCategoryId` and `formsCohortId` are consistent

### Test Case 4: Category Assignment
1. Use Category Management to create a new category
2. Auto-assign participants to the category
3. Verify all participants have both new and legacy category fields set

---

## Migration Path for Future Cleanup

Once all instances of legacy field usage are eliminated, follow this cleanup path:

1. **Phase 1**: Add deprecation warnings when legacy fields are read
2. **Phase 2**: Create migration script to remove legacy fields from saved data
3. **Phase 3**: Remove legacy field sync code
4. **Phase 4**: Remove legacy field definitions from TypeScript types

**Estimated timeline**: 3-6 months after all old tournament files have been migrated

---

## Build Status

✅ All changes compile successfully with no TypeScript errors
✅ Build time: 3.64s
✅ No new warnings introduced
