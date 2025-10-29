# Migration to Separate Forms/Sparring Divisions

## Changes Made

### 1. Data Model Updates
- `Participant` type now has:
  - `formsDivision: string` (was `division`)
  - `sparringDivision: string` (new)
  - `competingForms: boolean` (was optional)
  - `competingSparring: boolean` (was optional)

- `Cohort` type now has:
  - `type: 'forms' | 'sparring'` (new field)

### 2. Excel Parser Updates
- Now reads "Form" and "Sparring" columns from Excel
- If column value is "no" → not participating
- If column is empty or has value → uses that division or base division
- Exports `getEffectiveDivision()` helper function

### 3. UI Components Need

 Updates

**Still TODO - requires manual updates:**

1. **CohortManagement.tsx**: Add dropdown to select Forms/Sparring, filter participants by effective division
2. **ParticipantEditor.tsx**: Show both formsDivision and sparringDivision columns
3. **RingManagement.tsx**: Filter by cohort type when assigning
4. **RingOverview.tsx**: Separate forms/sparring properly
5. All components using `p.division` need to use `getEffectiveDivision(p, type)` instead

## Excel Format

New columns:
- **Form**: Division name, "same as sparring", "not participating", or "no"
- **Sparring**: Division name, "same as forms", "not participating", or "no"
- **Division**: Base division (used if Form/Sparring columns are empty)

## Migration Path

For existing data without Form/Sparring columns:
- Both formsDivision and sparringDivision will use the base division value
- Both competingForms and competingSparring will be true
