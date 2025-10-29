# Changelog

## Latest Updates (October 6, 2025)

### Major UI Revamp: Cohort Management

#### **New Age Selection with Checkboxes**
- **Replaced**: Min/Max age inputs + Adult checkbox
- **New**: Multi-select age checkboxes
- **How it works**:
  1. Select a division (only shows ages present in that division)
  2. Select gender (Male, Female, Mixed)
  3. Check one or more ages from the list
  4. Ages shown include numeric ages (4-17) and "18 and up"
  5. See live matching participant count
  6. Set rings needed and click "Add Cohort"

**Benefits:**
- More intuitive age selection
- See exactly which ages are available in the division
- Easily create age combinations (e.g., check 8, 9, 10 for an 8-10 cohort)
- Mix specific ages with adults (e.g., check 16, 17, and "18 and up")

**Example Workflows:**

1. **Single Age Cohort**: 
   - Select "Black Belt", "Male"
   - Check only "10"
   - Result: "Male 10" cohort

2. **Age Range Cohort**:
   - Select "Level 1", "Female"  
   - Check 8, 9, 10, 11
   - Result: "Female 8-11" cohort

3. **Mixed Age with Adults**:
   - Select "Level 2", "Mixed"
   - Check 16, 17, "18 and up"
   - Result: "Mixed 16-17,18+" cohort

4. **Adults Only**:
   - Select "Black Belt", "Male"
   - Check only "18 and up"
   - Result: "Male 18+" cohort

---

### Configuration Changes

#### 1. **Rings Per Division (Clarification)**
- **Each division can have up to 14 rings** (max 14 per division)
- **Divisions run one at a time** - rings are reused between divisions
- **Physical rings generated based on maximum** across all divisions
- Example:
  - Black Belt: 10 rings
  - Level 1: 8 rings  
  - Level 2: 5 rings
  - **Result**: 10 physical rings created (reused for each division)

#### 2. **Adult Cohort Support**
- **New Feature**: "Adult" checkbox in Cohort Management
- **Purpose**: Handle participants 16+ or 18+ grouped together
- **How it works**:
  - Check "Adult (16+ or 18+)" checkbox
  - Set minimum age (e.g., 16 or 18)
  - Max age becomes disabled and auto-set to 999
  - Matches all participants >= minimum age
  - Displays as "16+" or "18+" in cohort table

**Use Cases:**
- **18+ Adults**: Check Adult, set Min Age = 18 → Creates "Male 18+" or "Female 18+"
- **16-17 with Adults**: Check Adult, set Min Age = 16 → Creates "Male 16+" or "Female 16+"
- **Normal age ranges**: Uncheck Adult, set Min Age = 8, Max Age = 12 → Creates "Male 8-12"

#### 3. **Excel Parser Enhancement**
- **New**: Handles "18 and up" string in Student Age column
- Converts "18 and up" → age 18
- Normal numeric ages work as before
- Case-insensitive matching

---

## Previous Updates (October 5, 2025)

### Major Features Added

#### 1. **Rings Per Division** (Configuration Tab)
- Each division now has its own configurable number of rings (1-14)
- Divisions table shows: Division Name, Order, Rings (editable), and Remove button
- Physical rings are generated automatically based on total ring count across all divisions
- Rings are auto-named (Ring 1, Ring 2, etc.) with predefined colors from color map

**How to Use:**
1. Go to Configuration tab
2. Add divisions as before
3. Set the number of rings for each division in the "Rings" column
4. Click "Set Physical Rings" to generate the physical ring configuration

#### 2. **Interactive Cohort Creation** (Cohort Management Tab)
- **NEW UI**: Create cohorts manually with real-time participant counts
- Form shows:
  - Division (dropdown)
  - Gender (Mixed, Male, Female)
  - Age Range (Min/Max)
  - Rings Needed (1-10)
- **Participant Counter**: Shows matching participants and unassigned counts in real-time
- **Live Feedback**: Button disabled if no participants match criteria
- Cohorts table shows: Division, Gender, Age Range, Participant Count, Rings (editable), Remove button

**How to Use:**
1. Go to Cohort Management tab
2. Select division, gender, age range, and rings needed
3. See live count of matching participants
4. Click "Add Cohort" to create the cohort
5. Repeat for all desired cohorts
6. Edit "Rings" for any cohort directly in the table
7. Remove cohorts as needed (participants become unassigned)

#### 3. **Auto-Save Functionality**
- **Automatic**: State is saved to localStorage after every major change
- Changes that trigger auto-save:
  - Import participants
  - Create/remove cohorts
  - Update cohort rings
  - Assign rings
  - Configure divisions
  - Set physical rings
- **Manual Save/Load**: Buttons in Configuration tab to save/load tournament files
- **Auto-restore**: On app start, automatically loads the last autosave from localStorage
- **File Save**: "💾 Save Tournament" button saves to a JSON file you choose
- **File Load**: "📂 Load Tournament" button loads from a previously saved JSON file

**Benefits:**
- Never lose work due to accidental closure
- Pick up where you left off
- Save different tournament configurations
- Create templates for recurring tournaments

### Updated Excel Column Mappings

Fixed Excel parser to match your spreadsheet columns:
- **Student Age** (was "Age")
- **Feet** (was "Height Feet")  
- **Inches** (was "Height Inches")

Other columns remain: student first name, student last name, gender, school, Branch, division

### Removed Features

- **Cohort Criteria** removed from Configuration tab (now handled in Cohort Management)
- **Auto-assign Cohorts** button removed (manual cohort creation is more flexible)

### Technical Changes

- `Division` type now includes `numRings` field
- Store includes `autoSave()` function
- App.tsx loads autosave on mount
- Tournament state includes `lastSaved` timestamp
- IPC handlers for `save-tournament-state` and `load-tournament-state`

## Workflow

### Complete Tournament Setup Workflow:

1. **Import Data** (Data Import tab)
   - Upload Excel file
   - Verify participant data

2. **Configure Tournament** (Configuration tab)
   - Add/edit divisions with ring counts per division
   - Click "Set Physical Rings" to generate ring configuration
   - Upload watermark image (optional)
   - Use "💾 Save Tournament" to save your progress

3. **Create Cohorts** (Cohort Management tab)
   - Select division, gender, age range
   - See live count of matching participants
   - Set rings needed for cohort
   - Click "Add Cohort"
   - Repeat until all participants are assigned

4. **Assign Rings** (Ring Management tab)
   - Continues as before

5. **Order Participants** (Ring Overview tab)
   - Continues as before

6. **Export PDFs** (PDF Export tab)
   - Continues as before

### Recovery Workflow:

If you close the app or it crashes:
1. Reopen the app - autosave loads automatically
2. OR: Use "📂 Load Tournament" to load a specific saved file
3. Continue from where you left off

## Build Info

- **Build Status**: ✅ Successful
- **TypeScript**: 0 errors
- **Vite Build**: 4.33s
- **Output**: dist/renderer/ and dist/src/main/
