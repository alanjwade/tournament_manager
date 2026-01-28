# Tournament Manager - User Guide

## Overview

Tournament Manager is a desktop application designed to simplify the organization and execution of martial arts tournaments. It handles participant registration, category grouping, ring assignments, competition ordering, and generates all necessary PDF documents for running a successful tournament.

## Getting Started

### Initial Setup

1. Launch the Tournament Manager application
2. You'll see six main tabs:
   - Import Data
   - Configuration
   - Category Management
   - Ring Assignment
   - Overview
   - Export PDFs

### Step 1: Import Participant Data

1. Navigate to the **Import Data** tab
2. Click "Choose Excel File" or use the file selection dialog
3. Select your participant spreadsheet

**Required Excel Columns:**
- student first name
- student last name
- age
- gender
- height feet
- height inches
- school
- Branch (optional - leave blank if school has no branches)
- division

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

1. Navigate to the **Category Management** tab
2. For each category:
   - Select the division
   - Choose gender category (Male/Female/Mixed)
   - Set minimum age
   - Set maximum age (use 999 or high number for "18+")
   - Specify number of rings this category will need
3. Click "Add Category Criteria"
4. Repeat for all categories needed
5. Click "Assign Categories" to apply

**Tips:**
- Age 18 and up = Adults
- Consider category sizes when deciding ring counts
- Smaller categories may only need 1 ring
- Larger categories may need multiple rings to avoid delays

#### Manual Adjustments

After initial category assignment:
1. View the category list showing participants in each category
2. Individual participants can be moved between categories using the edit functions
3. Check for unassigned participants

⚠️ **Warning:** Re-running "Assign Categories" will overwrite all previous category assignments and manual edits!

### Step 4: Ring Assignment

This step assigns participants to specific physical rings within their category.

1. Navigate to the **Ring Assignment** tab
2. Choose assignment scope:
   - Single category
   - All categories in a division
   - All categories
3. Click "Assign Rings"

**How It Works:**
- Participants are distributed evenly across rings
- Age is used as the primary distribution factor
- Participants competing in both forms AND sparring are kept in the same ring when possible
- Forms and sparring may use different rings if participant only competes in one

⚠️ **Warning:** Re-running ring assignment will overwrite previous assignments!

#### Forms Ring Ordering

Run this for each ring to determine competition order:
1. Select a forms ring
2. Click "Order Forms Ring"

**Algorithm:**
- Within each school, participants are ordered by a hash of their name
- Participants from different schools are interleaved
- First three competitors are ensured to be from different schools (when possible)
- Each participant receives a rank_order number (10x their position)

**Rank Order Numbers:**
- Multiples of 10 (10, 20, 30, 40...)
- Allows easy manual reordering by changing numbers
- Example: To move position 40 between 20 and 30, change it to 25

✅ Can be run anytime per ring without affecting other data.

#### Sparring Ring Ordering

Run this for each ring to order by height:
1. Select a sparring ring
2. Click "Order Sparring Ring"

**Algorithm:**
- Participants ordered by total height (feet × 12 + inches)
- Shortest to tallest
- Ensures similar-sized competitors face each other early in brackets

✅ Can be run anytime per ring without affecting other data.

### Step 5: Review Ring Overview

Navigate to the **Overview** tab to see a comprehensive view of all rings.

**Display Format:**
- Forms rings on the left
- Sparring rings on the right
- Each ring shows:
  - Division
  - Category
  - Ring color
  - Participant count
  - Participant details (name, age, height, gender)
  - Rank order numbers

Use this view to:
- Verify correct assignments
- Check for balanced ring sizes
- Identify any issues before generating PDFs

### Step 6: Export PDFs

Navigate to the **Export PDFs** tab to generate tournament documents.

#### Name Tags

**What:** 2 columns × 4 rows grid of name tags per page

**Contents:**
- Participant first and last name
- Division
- School
- Ring color (with color indicator box)

**Configuration:**
- Adjustable width, height, margins, and font size
- Default: 95mm × 65mm tags

**Usage:**
1. Select division
2. Adjust dimensions if needed
3. Click "Generate Name Tags"
4. Choose save location

Print on cardstock or adhesive label sheets.

#### Check-In Sheets

**What:** One sheet per division listing all participants

**Contents:**
- Sorted by last name, then first name
- School
- Ring color
- Checkbox for attendance

**Usage:**
1. Select division
2. Click "Generate Check-In Sheet"
3. Print for registration table

#### Forms Scoring Sheets

**What:** One sheet per forms ring

**Contents:**
- Ring and division information
- Participant list in rank order
- Columns for 3 judge scores
- Final score column
- Placements table (1st, 2nd, 3rd)
- Watermark (if configured)

**Usage:**
1. Select division
2. Select forms ring
3. Click "Generate Forms Scoring Sheet"
4. Print for each ring

#### Sparring Brackets

**What:** Tournament bracket for each sparring ring (16-person format)

**Contents:**
- Participants placed in height order
- Byes placed toward top
- Numbered matches
- Color-coded rounds (darker = later rounds)
- Lines showing match progression
- Third place match
- Placements table (1st, 2nd, 3rd)
- Watermark (if configured)

**Usage:**
1. Select division
2. Select sparring ring
3. Click "Generate Sparring Bracket"
4. Print in landscape orientation

**Bracket Details:**
- Round 1: 8 matches (positions 1-16)
- Round 2: 4 matches (quarter-finals)
- Round 3: 2 matches (semi-finals)
- Round 4: Finals + 3rd place match
- Byes automatically placed for <16 participants

## Tips and Best Practices

### Before the Tournament

1. **Import Early:** Import and verify participant data at least a week before
2. **Test Run:** Practice the entire workflow with sample data
3. **Print Extras:** Print 10% extra name tags and scoring sheets
4. **Watermark:** Use a light, semi-transparent watermark so text remains readable

### Category Design

1. **Age Ranges:**
   - Young children: 2-year ranges (5-6, 7-8, 9-10)
   - Teens: 3-4 year ranges (11-14, 15-17)
   - Adults: 18+ (all together) or 18-34, 35+

2. **Gender:**
   - Use "Mixed" for younger children (under 10)
   - Separate male/female for teens and adults
   - Mixed divisions work well for forms

3. **Ring Counts:**
   - 1-8 participants: 1 ring
   - 9-16 participants: 2 rings
   - 17-24 participants: 3 rings
   - 25+ participants: 4 rings

### Ring Management

1. **Forms Ordering:** Run once and only re-run if participants are added
2. **Sparring Ordering:** Can adjust anytime based on late registrations
3. **Same Ring:** Keeping forms/sparring together helps smaller tournaments run smoothly

### PDF Generation

1. **Name Tags:** Print on perforated business card sheets for easy separation
2. **Check-In:** Print multiple copies for different registration stations
3. **Scoring Sheets:** Use clipboards at each ring
4. **Brackets:** Print larger format (11x17) for visibility

### Common Issues

**Problem:** Some participants don't have a category
- **Solution:** Check age/gender criteria, manually assign them, or create a new category

**Problem:** Rings are very unbalanced in size
- **Solution:** Manually move participants between rings in Ring Management

**Problem:** First three in forms ring are from same school
- **Solution:** Manually adjust rank_order numbers (change 10 to 5, 20 to 15, etc.)

**Problem:** PDF won't open
- **Solution:** Ensure you have a PDF reader installed, try saving with a different filename

## Keyboard Shortcuts

- **Tab:** Navigate between form fields
- **Enter:** Submit forms (Add Division, Add Ring, etc.)
- **Ctrl/Cmd + S:** (Future feature) Save current state

## Data Management

### Saving Work

Currently, all data is held in memory. To preserve your work:
1. Do not close the application until all PDFs are generated
2. Keep the original Excel file as your master data source
3. Future versions will add save/load functionality

### Making Changes

If you need to add/remove participants after category/ring assignment:
1. Re-import the updated Excel file
2. This will reset all assignments
3. You'll need to re-run category and ring assignments

## Support

For issues or questions:
- Check this user guide first
- Review the README.md for technical information
- Contact your system administrator

## Version History

- v1.0.0: Initial release
  - Excel import
  - Category and ring assignment
  - Forms and sparring ordering
  - PDF generation (name tags, check-in, scoring, brackets)
