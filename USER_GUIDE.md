# Tournament Manager - User Guide

## Overview

Tournament Manager is a desktop application designed to simplify the organization and execution of martial arts tournaments. It handles participant registration, category grouping, ring assignments, competition ordering, history and baseline management, and generates all necessary PDF documents for running a successful tournament.

## Application Tabs

The application has the following tabs:

| Tab | Purpose |
|-----|---------|
| **Dashboard** | Overview of tournament status and quick navigation |
| **Configuration** | Set up divisions (and their order), physical rings, watermark, school abbreviations |
| **Categories** | Create and assign age/gender/division categories |
| **Ring Map** | Assign categories to physical rings |
| **Editor** | Inline-editable table of all participants |
| **Tournament** | Main tournament view — ring overview, quick edit, grand champion |
| **Export** | Generate PDFs (name tags, check-in sheets, scoring sheets, brackets) |
| **History** | Git-like commit history — every change with its operation; restore any point |

## Getting Started

### Step 1: Import Participant Data

1. Open the **File** menu → **Import Initial Excel File…**
2. Drag and drop your spreadsheet onto the dialog, or click to browse
3. Review the preview (and fix any errors) before confirming the import

**Required Excel Columns:**
- student first name
- student last name
- age
- gender (Male / Female — must be explicit; blank triggers a warning)
- height feet
- height inches
- school
- division
- sparring? (yes / no — must be explicit; blank is treated as "not participating")

**Optional Columns:**
- form? (yes / no — default is "yes" when blank or omitted)

**Tips:**
- Ensure your Excel file has a header row
- All participant data should start from row 2
- Empty rows will be automatically skipped

### Step 2: Configuration

Navigate to the **Configuration** tab to set up your tournament parameters.

#### Divisions

Default divisions are provided:
- Black Belt
- Level 1
- Level 2
- Level 3
- Beginner

You can add or remove divisions as needed:
1. Enter division name in the text field
2. Click "Add Division"
3. To remove a division, click the "Remove" button next to it

**Important:** Divisions should match the division names in your Excel import.

#### Physical Rings

Define the actual rings available at your tournament venue:
1. Enter a ring name (e.g., "Ring 1", "Main Ring")
2. Enter a ring color (e.g., "Red", "Blue", "Green")
3. Click "Add Ring"

Ring colors will appear on name tags and other documents to help participants find their location.

#### School Abbreviations

Configure short abbreviations for each school name. These abbreviations are displayed in the Tournament tab ring tables for compact display.

#### Watermark (Optional)

Upload a watermark image to appear on forms scoring sheets and sparring brackets:
1. Click "Select Watermark Image"
2. Choose a PNG, JPG, or other image file
3. The watermark will appear faintly in the background of PDFs

### Step 3: Category Assignment

Categories group participants who will compete against each other. Typically, categories are divided by:
- Gender (male, female, or mixed)
- Age range
- Division

#### Creating Categories

1. Navigate to the **Categories** tab
2. For each category:
   - Select the division
   - Choose gender category (Male/Female/Mixed)
   - Set minimum age
   - Set maximum age (use 999 or high number for "18+")
   - Specify number of pools this category will need
3. Click "Add Category Criteria"
4. Repeat for all categories needed
5. Click "Assign Categories" to apply

**Tips:**
- Consider category sizes when deciding pool counts
- Smaller categories may only need 1 pool
- Larger categories may need multiple pools to avoid delays

#### Manual Adjustments

After initial category assignment:
1. View the category list showing participants in each category
2. Individual participants can be moved between categories using the Editor tab or Quick Edit
3. Check for unassigned participants

⚠️ **Warning:** Re-running "Assign Categories" will overwrite all previous category assignments and manual edits!

### Step 4: Ring Map

The **Ring Map** tab lets you assign category pools to physical rings at your venue.

1. Navigate to the **Ring Map** tab
2. For each category pool, assign it to a physical ring
3. This determines where participants will physically compete

### Step 5: Tournament View

The **Tournament** tab is your main working view during tournament setup and execution.

#### Division Filter

Use the dropdown at the top to filter rings by division. The dropdown shows participant counts per division. Your selection is remembered between sessions.

#### Ring Cards

Each ring card shows:
- Physical ring name and category information
- Participant count with a **balance indicator** (green = 8-12, yellow = 5-7 or 13-15, red = outside range)
- Forms participants on the left, sparring on the right
- Collapsible cards (use Collapse All / Expand All buttons)

#### Sort Order

Toggle between sorting rings by:
- **Ring** — sorted by physical ring number
- **Group First** — grouped by category
- **Category** — sorted by age range

#### Quick Edit

Click any participant's name (shown as a blue link) to open the **Quick Edit modal**:
- View participant info (age, gender, height)
- Change forms division, category, and pool
- Change sparring division, category, pool, and alt ring
- Toggle "Competing in Forms" or "Competing in Sparring" on/off
- Adjust rank order within the ring
- Use "Copy from Forms" to mirror forms settings to sparring

#### Ring Ordering

**Automatic ordering** is the default behavior. Whenever a participant is moved to a different pool/category, or their competing status changes, all affected rings are automatically re-ordered:
- **Forms rings** are ordered to minimize same-school adjacency (schools are interleaved, branches distributed evenly)
- **Sparring rings** are ordered by height (shortest to tallest)

#### Custom Order

If you need to manually control the order within a specific ring:

1. Check the **Custom Order** checkbox on that ring
2. The ▲/▼ move buttons become active
3. Use the buttons to reorder participants as needed
4. Moving participants in/out of a custom-ordered ring will **not** trigger automatic reordering for that ring

To return to automatic ordering:
1. Uncheck the **Custom Order** checkbox
2. The ring will immediately be re-ordered using the automatic algorithm
3. The ▲/▼ buttons become disabled again

**Note:** Custom Order is per-ring. You can have some rings with custom order and others with automatic ordering.

#### Grand Champion

Access the Grand Champion section from the **GC** button in the toolbar:
- Create custom Grand Champion rings (forms or sparring)
- Add participants from any division to Grand Champion rings
- Reorder participants within Grand Champion rings
- Rename or delete Grand Champion rings

### Step 6: Baselines &amp; History

Every change you make is recorded in a git-like **History**. **Baselines** are named tags that mark "compare from here" points used by the change indicators and **Print All Changed**.

#### Creating a Baseline

1. Open the **History** tab (or the **📋 Baselines** view in the Tournament tab)
2. Enter a name (optional) and click "Create Baseline"

#### Reviewing Changes

The **History** tab lists every commit with the operation that caused it, for example *"Moved Mason Crosby from Beginner - Mixed 7-9 Pool 1 to Beginner - Mixed 7-9 Pool 2 (forms)"*. Rings changed since the selected baseline are highlighted in the Tournament view.

#### Restoring

Click **Restore** on any commit in the History tab to return the data to that point. Restoring is non-destructive: it appends a new "Restored to …" commit, so you can always move forward again.

#### Print All Changed

In the Tournament tab, use the **Print All Changed** button to print scoring sheets and brackets only for rings that changed since the selected baseline. This is useful when making mid-tournament adjustments.

### Step 7: History

Every change you make is recorded as a **commit** in a git-like history, labelled with the operation that caused it — for example, *"Moved Mason Crosby from Beginner - Mixed 7-9 Pool 1 to Beginner - Mixed 7-9 Pool 2 (forms)"*.

1. Open the **History** tab
2. Each row shows the operation, timestamp, and participant count; the current state is marked *(current)*
3. Click **Restore** on any commit to return the data to that point

Restoring is non-destructive: it appends a new "Restored to …" commit, so you can always move forward again or restore a different point. You can also create **checkpoints** here — named tags that mark important commits (e.g. "Check-in complete"). These replace the older standalone checkpoint snapshots, which are imported automatically the first time you run this version.

### Step 8: Export PDFs

Navigate to the **Export** tab to generate tournament documents.

#### Name Tags

- **Format**: 2 columns × 4 rows per page
- **Contains**: Name, division, school, ring color
- **Print on**: Perforated business card sheets or cardstock

#### Check-In Sheets

- **Format**: One per division
- **Sorted**: By last name, then first name
- **Contains**: School, ring color, checkbox for attendance

#### Forms Scoring Sheets

- **Format**: One per ring
- **Contains**: Participants in rank order, 3 judge columns, final score, placements table
- **Features**: Watermark support

#### Sparring Brackets

- **Format**: 16-person bracket (landscape)
- **Contains**: Height-ordered participants, numbered matches, color-coded rounds, 3rd place match
- **Features**: Watermark support, automatic bye placement

---

## Standard Flows

These are the most common actions you'll perform during tournament setup and execution.

### Move a Participant from One Ring to Another

1. In the **Tournament** tab, click the participant's name to open Quick Edit
2. Change the **Category** or **Pool** dropdown to move them to a different ring
3. Click **Save**
4. Both the old and new rings are automatically re-ordered (unless Custom Order is enabled on either ring)

**Alternative:** Use the **Editor** tab to change the participant's category or pool directly in the table.

### Withdraw a Participant from Sparring Only

1. In the **Tournament** tab, click the participant's name to open Quick Edit
2. Uncheck **Competing in Sparring**
3. Click **Save**
4. The participant remains in their forms ring but is removed from sparring
5. Their last sparring assignment is saved internally for easy reinstatement later

### Add a Participant to Sparring

1. Click the participant's name in the **Tournament** tab to open Quick Edit
2. Check **Competing in Sparring**
3. Select the sparring **Division**, **Category**, and **Pool**
4. Click **Save**
5. The sparring ring is automatically re-ordered to include them (sorted by height)

### Withdraw a Participant Completely

**Option A — Quick Edit:**
1. Click the participant's name to open Quick Edit
2. Uncheck both **Competing in Forms** and **Competing in Sparring**
3. Click **Save**

**Option B — Editor tab:**
1. Go to the **Editor** tab
2. Find the participant
3. Set both forms and sparring divisions to "Not Participating"

The participant's previous category/pool assignments are preserved internally so they can be reinstated easily if needed.

### Add a New Participant

1. Click the **+ Add Participant** button in the header bar (available from any tab)
2. Fill in the required fields:
   - First Name, Last Name (required)
   - Age (required)
   - Gender, Height, School, Branch
3. Assign to a division, category, and pool for forms and/or sparring
4. Use "Use forms settings for sparring" checkbox to mirror forms assignments
5. Click **Add Participant**
6. The participant is added and relevant rings are automatically re-ordered

### Use Custom Order on a Ring

1. Go to the **Tournament** tab
2. Find the ring you want to manually order
3. Check the **Custom Order** checkbox on that ring
4. Use the **▲** and **▼** buttons to move participants up or down
5. While Custom Order is checked:
   - Moving participants in/out of the ring will **not** trigger automatic reordering
   - You have full manual control over the order
6. To go back to automatic ordering, uncheck **Custom Order** — the ring will be instantly re-ordered

### Use Baselines &amp; History

**Before making changes:**
1. Go to the **History** tab or the **📋 Baselines** view in the Tournament tab
2. Click **Create Baseline** and give it a descriptive name (e.g., "Before lunch adjustments")

**After making changes:**
1. Open **History** to review the commits and the operation behind each one
2. Rings changed since the selected baseline are highlighted in the Tournament view

**If you need to undo changes:**
1. In the **History** tab, click **Restore** on the commit you want to return to
2. A new "Restored to …" commit is added, so nothing is lost

**Printing only changed rings:**
1. In the **Tournament** tab, after making changes since a baseline
2. Click **Print All Changed** to generate PDFs only for affected rings
3. This avoids reprinting everything — only the rings with changes are printed

---

## Editor Tab

The **Editor** tab provides a full spreadsheet-like view of all participants:

- **Filter** any column with text search or multi-select dropdowns
- **Inline edit** any field by clicking on it
- **Show/hide columns** using the column visibility toggle
- **Find duplicates** using the Duplicates button
- **Export to Excel** to save filtered data as CSV
- **Navigate** with pagination (50 rows per page)

---

## Tips and Best Practices

### Before the Tournament

1. **Import Early:** Import and verify participant data at least a week before
2. **Create a Baseline:** Set a baseline after completing initial setup
3. **Test Run:** Practice the entire workflow with sample data
4. **Print Extras:** Print 10% extra name tags and scoring sheets
5. **Watermark:** Use a light, semi-transparent watermark so text remains readable

### Category Design

| Age Range | Recommendation |
|-----------|---------------|
| Young children | 2-year ranges (5-6, 7-8, 9-10) |
| Teens | 3-4 year ranges (11-14, 15-17) |
| Adults | 18+ (all together) or 18-34, 35+ |

- Use "Mixed" gender for younger children (under 10)
- Separate male/female for teens and adults
- Mixed divisions work well for forms

### Ring Balance

| Participants | Recommended Pools |
|--------------|-------------------|
| 1-8 | 1 pool |
| 9-16 | 2 pools |
| 17-24 | 3 pools |
| 25+ | 4 pools |

### Day-of-Tournament Workflow

1. **Create a baseline** at the start of the day
2. Handle late registrations and no-shows using Quick Edit or Add Participant
3. Use **Print All Changed** to reprint only the affected scoring sheets and brackets
4. Create additional baselines before major changes (e.g., "Before round 2 adjustments")
5. Use Custom Order on rings where you need specific competitor placement

### Common Issues

| Problem | Solution |
|---------|----------|
| Participant missing from a ring | Check their category/pool assignment in Quick Edit |
| Rings unbalanced in size | Move participants between pools using Quick Edit |
| Need specific competitor order | Enable Custom Order on that ring |
| Wrong ring assignment | Click participant name → Quick Edit → change category/pool |
| Need to undo changes | Restore a previous commit in the History tab |
| Late registration | Use Add Participant button, assign to appropriate category/pool |
| No-show | Quick Edit → uncheck Competing in Forms/Sparring |

## Data Management

### Auto-Save

The application automatically saves your work after every change. Your state is preserved across application restarts.

### Saving and Loading

- **Save**: Use File → Save to export your full tournament state
- **Load**: Use File → Load to import a previously saved state
- **History**: Every change is committed with the operation that caused it; restore any point from the History tab
- **Baselines**: Create named baseline tags to track changes and print only what changed

### Undo/Redo

The application supports undo and redo for most actions, allowing you to quickly reverse mistakes.
