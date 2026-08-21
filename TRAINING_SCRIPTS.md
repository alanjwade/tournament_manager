# Tournament Manager — Video Training Scripts

Three-part training series covering the complete Tournament Manager workflow.

---

# Part 1: Introduction & Overview

**Estimated length:** 5–8 minutes  
**Goal:** Give viewers a high-level orientation so they understand what the app does and how it's organized before diving into hands-on setup.

---

## Opening

> Welcome to Tournament Manager — the all-in-one desktop tool for organizing martial arts tournaments. Whether you're running 50 competitors or 500, this app handles registration, category grouping, ring assignment, and every PDF you'll need on tournament day.
>
> This video is part one of three. Here we'll take a quick tour of the whole application so you know where everything lives. Parts two and three go step-by-step through the actual setup and tournament-day operations.
>
> Let's start by launching the app.

**[DEMO: Launch the app. Let the splash load.]**

---

## The Tab Bar

> Across the top you'll see the main navigation tabs. They follow a natural left-to-right workflow:

**[DEMO: Point to each tab slowly as you name it.]**

> - **Dashboard** — a home screen with status and quick links.
> - **Import Data** — this is where you load your participant Excel file.
> - **Configuration** — one-time setup: divisions, rings, school abbreviations, watermark.
> - **Categories** — where you define who competes against whom, grouped by age, gender, and division.
> - **Ring Map** — assigns your category pools to the physical rings at your venue.
> - **Editor** — a full spreadsheet view for manual data corrections.
> - **Tournament** — your main screen during tournament day. This is where you'll spend most of your time.
> - **Export** — generates all your PDFs.
> - **Checkpoints** — snapshot, compare, and restore tournament state.

> Notice that some tabs have small colored badges. A yellow badge means there's something that needs attention — like unassigned participants. A blue badge shows a count, like how many participants are loaded.

---

## The Header Bar

> The header bar at the top is always visible, no matter which tab you're on.

**[DEMO: Point to each element in the header.]**

> - The **search box** lets you find any participant by name and jump straight to editing them.
> - The **Add Participant** button lets you register a new competitor at any time.
> - **Undo** and **Redo** — full undo support for almost everything you do. The tooltip tells you how many steps are available.
> - And the **theme toggle** switches between light and dark mode.

---

## The Big Picture Workflow

> Before we go deeper, here's the overall flow you'll follow for any tournament:

**[DEMO: Show the Dashboard or use a simple slide/annotation if preferred.]**

> **Step 1 — Import:** Load your Excel spreadsheet of participants.
>
> **Step 2 — Configure:** Set up your divisions and physical rings.
>
> **Step 3 — Categories:** Define the age and gender groups for competition.
>
> **Step 4 — Ring Map:** Assign those groups to your venue's physical rings.
>
> **Step 5 — Tournament:** Review assignments, make day-of adjustments, manage participants.
>
> **Step 6 — Export:** Print name tags, check-in sheets, scoring sheets, and sparring brackets.
>
> Parts two and three of this series walk through each of these steps in detail. Let's start with data setup in Part 2.

---

## Closing

> In the next video, we'll load a real participant file, configure our tournament, and get every competitor assigned to a ring. See you there.

---

---

# Part 2: Data Entry & Setup

**Estimated length:** 15–20 minutes  
**Goal:** Walk through every setup tab — Import, Configuration, Categories, Ring Map — so that by the end every participant is assigned to a physical ring and the tournament is ready to run.

---

## Introduction

> Welcome to Part 2. By the end of this video, all participants will be loaded, categorized, and assigned to physical rings. We'll cover the Import tab, Configuration, Categories, and Ring Map.

---

## Tab 1: Import Data

> Click the **Import Data** tab.

**[DEMO: Navigate to the Import Data tab.]**

> This is the starting point. Nothing else in the app is fully usable until participants are loaded here.

### Preparing Your Excel File

> Before you import, your spreadsheet needs these columns — the names are case-insensitive:
>
> - `student first name`, `student last name`
> - `age`, `gender` (must be "Male" or "Female" — blank will give you a warning)
> - `height feet`, `height inches`
> - `school`, `division`
> - `sparring?` — yes or no (blank means not participating in sparring)
> - `form?` — optional, defaults to yes
>
> A header row is required. Participants start on row 2. Empty rows are automatically skipped.

**[DEMO: Show a sample spreadsheet briefly, then switch back to the app.]**

### Importing

> There are two ways to load your file. You can drag and drop it onto the dashed box here, or click the box to browse. I'll click it.

**[DEMO: Click the drag-and-drop zone, select the Excel file from the file picker.]**

> The app immediately parses the file and shows you a preview — before anything is committed. Look at what we get:

**[DEMO: Point to the validation panel.]**

> - The large green number is the **total participant count**.
> - If there are **errors** — shown in red — those participants have a blocking issue like a missing gender or missing branch. The Confirm button will be disabled until those are fixed in the source file. You'll need to correct the spreadsheet and re-import.
> - **Warnings** in amber are non-blocking. Things like missing height or an invalid age. You can still proceed.
> - If there are **duplicate names**, you'll see an amber banner listing them. This doesn't block the import — sometimes two people genuinely share a name — but it's worth a look.

**[DEMO: Point to each section. If there are errors, explain them; if not, note that this is a clean file.]**

> Once everything looks good, click **Confirm Import**.

**[DEMO: Click Confirm Import.]**

> You'll see a success message showing how many participants were loaded. The blue reminder box disappears, and the Categories tab becomes available.

### Column Import (Supplemental Updates)

> Now that participants are loaded, notice there's a new section below — **Column Import**. This is for when you get a correction spreadsheet later. For example, if someone sends you updated heights for 20 participants, you don't have to re-import everything. You load the new file here, pick the source column and the field to update, and only those values get patched. Matching is done by first and last name.

**[DEMO: Briefly show the Column Import section — point to the drag zone, the dropdowns, and the results panel. You don't have to run it if you don't have sample data.]**

> We'll come back to this if needed. Let's move to Configuration.

---

## Tab 2: Configuration

> Click **Configuration**.

**[DEMO: Navigate to Configuration.]**

### Saving and Backups

> The first thing to notice is the **Save Tournament** and **Load Tournament** buttons. The app auto-saves after every change, but you can use these to export and reload full state files manually. The backup section below shows auto-saved recovery points — the app keeps backups every 20 minutes for up to 12 hours. If something goes wrong, you can load one of these.

**[DEMO: Point to Save/Load buttons and the Backup dropdown.]**

### Divisions

> Next is **Divisions**. These should match the division names in your Excel file. By default you get Black Belt, Level 1 through 3, and Beginner.

**[DEMO: Show the divisions list.]**

> To add a division, type the name here and click Add — or just press Enter.

**[DEMO: Type a division name and add it, then remove it to show that too.]**

> To remove one, click the Remove button. No confirmation — it's immediate — so double-check before clicking.

### Physical Rings

> Physical rings are the actual competition areas at your venue. You'll enter each one here, and the names you give them will appear on name tags and other documents.

**[DEMO: Show the physical rings section. If none exist, add one or two.]**

> Enter a ring name — I'll use "Ring 1" — and a color, like "Red". Click Add Ring.

**[DEMO: Add a ring.]**

> The color shows up on name tags so competitors know which ring to go to. Add as many rings as your venue has.

### School Abbreviations

> School abbreviations let the Tournament tab show compact names in the ring tables. If your school is called "Exclusive Martial Arts Littleton", you'd add an abbreviation like "EMA LT" here.

**[DEMO: Expand the School Abbreviations section. Show an existing abbreviation or add one.]**

> Enter the full school name — it needs to match exactly what's in your data — and the abbreviation you want. If no abbreviation is set, the full name is used.

### Watermark

> The watermark is an optional image that appears faintly in the background of your scoring sheets and sparring brackets. Click **Select Watermark Image** to choose a PNG or JPG.

**[DEMO: Point to the watermark section. If you have a watermark loaded, show the green checkmark.]**

> A light, semi-transparent version of your school logo or tournament branding works well. Keep it subtle so the text stays readable.

---

## Tab 3: Categories

> Now click the **Categories** tab.

**[DEMO: Navigate to Categories.]**

> This is where you define who competes against whom. Each category covers a specific division, gender, and age range.

### Creating a Category

**[DEMO: Point to the left-side form panel.]**

> On the left, you have the category creation form.
>
> First, pick a **Division**. I'll choose Black Belt.
>
> Then pick **Gender** — Male, Female, or Mixed.
>
> Now the age checkboxes appear. These are the actual ages of unassigned participants in that division and gender combination. I'll check the ages I want to group together. For adults, I'll check everything 18 and up — those are grouped under "18 and Up".
>
> Watch the **Matching participants** count update in real time as I check ages.

**[DEMO: Select a division, gender, and check some ages. Point to the matching count.]**

> **Pools Needed** is automatically calculated. The app aims for a maximum of 12 people per pool. If you have 25 participants in this category, it'll suggest 3 pools. You can manually adjust this if needed.

**[DEMO: Show the auto-calculated pools value. Optionally adjust it manually.]**

> When you're happy, click **Add Category**. The app creates both a Forms category and a Sparring category for this group, then immediately auto-assigns those participants and sets their competition order.

**[DEMO: Click Add Category and watch the right-side list update.]**

> Repeat this for every division and age group in your tournament. The right side shows your running list of categories.

### The Categories List

**[DEMO: Point to the right-side categories list.]**

> Each row in the list shows the gender, age range, and participant count. You can adjust the **Pools** number directly in this table if you change your mind about splits.

> The **Reassign Participants** button at the top is for when you need to start over. It clears all pool assignments and re-runs auto-assignment from scratch for all categories. You'll get a confirmation warning before it runs — this is not reversible.

**[DEMO: Point to the Reassign Participants button. Do NOT click it unless demonstrating re-assignment.]**

> At the bottom of the page you'll see a **Pools Needed by Division** summary. This tells you the total ring count per division — useful for planning your venue layout before you fill in the Ring Map.

**[DEMO: Scroll down to show the Pools Needed summary.]**

> ⚠️ **Important:** After you click Reassign, all manual adjustments you've made to individual pools are lost. Always create a Checkpoint before using this button. We'll cover Checkpoints in Part 3.

---

## Tab 4: Ring Map

> Now click **Ring Map**.

**[DEMO: Navigate to Ring Map.]**

> The Ring Map connects your abstract category pools — like "Black Belt Pool 1" — to the physical rings at your venue — like "Ring 3". This determines where competitors will actually compete.

### Selecting a Division

> Use the **Division selector** at the top to work one division at a time.

**[DEMO: Select a division from the dropdown.]**

### Manual Assignment

**[DEMO: Show the assignments table — pool name, division, age, participant count, and the Physical Ring input.]**

> The table shows each pool with its participant count. The last column is the **Physical Ring** — just type in the ring name. It should match one of the rings you set up in Configuration, like "Ring 1" or "Ring 3a".

### Auto Assign

> For a quick first pass, enter the **Number of Physical Rings Available** and click **Auto Assign**.

**[DEMO: Set the ring count and click Auto Assign.]**

> The app distributes your pools sequentially. If you have more pools than rings, it'll add letter suffixes — Ring 1a, Ring 1b, Ring 2a, etc.

> After auto-assigning, review the table and adjust any ring assignments manually if needed.

**[DEMO: Edit one physical ring field manually to show it works.]**

### Confirming

> This is important: changes here are **not saved until you click Confirm**. Watch the "unsaved changes" indicator at the bottom.

**[DEMO: Point to the unsaved changes indicator, then click Confirm.]**

> Click **Confirm**, and the assignments are saved. If you switch divisions without confirming, your local changes are discarded.

> Repeat this for each division. Once all pools have a physical ring assigned, your setup is complete. Part 3 covers what happens on tournament day itself.

---

## Quick Recap

> Let's recap what we just did:
>
> 1. **Imported** participants from Excel and confirmed the data looked clean.
> 2. **Configured** divisions, physical rings, abbreviations, and watermark.
> 3. **Created categories** grouping competitors by age, gender, and division.
> 4. **Mapped rings** — assigned each pool to a physical ring at the venue.
>
> You're now ready for tournament day. Let's go to Part 3.

---

---

# Part 3: Tournament Day Operations

**Estimated length:** 20–25 minutes  
**Goal:** Cover everything you'll do on the day of the tournament — reviewing rings, handling changes, the Quick Edit modal, Grand Champion, checkpoints, and printing.

---

## Introduction

> Welcome to Part 3. The tournament is today. Participants are assigned, PDFs are ready, and now things are going to change — late arrivals, no-shows, ring rebalancing. This video walks through every operation you'll need.

---

## The Tournament Tab

> Click the **Tournament** tab. This is your primary screen for the rest of the day.

**[DEMO: Navigate to Tournament tab. Show the full ring overview.]**

### Division Filter and Ring Count

> At the top left is the **Division filter**. Use this to narrow the view to one division at a time. The dropdown shows each division and how many rings it has. Your selection is remembered between sessions.

**[DEMO: Select a specific division from the filter.]**

### Sort Options

> The **Sort** dropdown controls how rings are ordered on screen:
> - **Sort: Ring** — ordered by physical ring number. PR1, PR1a, PR1b, PR2, and so on.
> - **Sort: Group First** — groups rings by letter suffix. All "a" rings, then all "b" rings, then unlettered rings.
> - **Sort: Category** — sorted by the youngest participant age in each ring.

**[DEMO: Toggle through the sort options to show the reorder.]**

### Ring Cards

> Each card represents one competition pool — Forms on the left, Sparring on the right.

**[DEMO: Expand one ring card.]**

> The card header shows:
> - The **division** in blue
> - The **pool name**, like "Adult Beginner - Pool 1"
> - The **physical ring** in green, like "(PR1)"
> - **Balance badges**: F:N and S:N show participant counts color-coded — green is ideal (8–12), yellow is acceptable (5–7 or 13–15), red means you need to rebalance.

**[DEMO: Point to the balance badges on a few rings to show green, yellow, red if available.]**

> Inside the card, the Forms section on the left lists competitors in rank order — name, school abbreviation, age, and gender. The Sparring section on the right adds a height column since sparring is ordered by height.
>
> Each name is a **blue link**. Clicking it opens the Quick Edit modal, which is how you make any change to a participant's assignment.

### Collapse All / Expand All

**[DEMO: Click "Collapse All", then "Expand All".]**

> Use **Collapse All** to get a high-level overview of all your rings, then **Expand All** to see details. You can also click individual card headers to expand or collapse them.

---

## Setting a Baseline

> Before you start making any day-of changes, click **Set Baseline** in the toolbar.

**[DEMO: Click Set Baseline. Show the checkpoint is created with a "Baseline HH:MM" name.]**

> This creates a snapshot of the current state. From this point on, any ring that gets changed will show a red `CHANGED` badge and a red border. You'll also get a change summary strip under the header showing which participants were added or removed from that ring.
>
> The **Print Changed** button appears in the toolbar as soon as any ring changes. It prints PDFs for only the modified rings so you don't have to reprint everything. We'll use it a bit later.

---

## Operation 1: Moving a Participant to a Different Ring

> Let's say a participant in Pool 1 needs to move to Pool 2 to balance the ring sizes.

**[DEMO: Find a participant in a ring. Click their name.]**

> The **Quick Edit** modal opens. At the top you see their name, age, gender, and height.

**[DEMO: Show the Quick Edit modal.]**

> To move them, look at the **Forms** column. The **Category & Pool** dropdown shows all available pools with live participant counts — so you can see which rings are over and under before you commit.

**[DEMO: Click the Category & Pool dropdown and show the options with counts.]**

> Select the destination pool and click **Submit**.

**[DEMO: Select a different pool and submit.]**

> Both the old and new rings are automatically re-ordered — forms rings by school interleaving, sparring rings by height. Watch for the `CHANGED` badge to appear on both cards.

---

## Operation 2: Withdrawing a Participant

> A competitor just told you they're not competing today.

**[DEMO: Open Quick Edit for a participant.]**

> Click **Withdraw** at the top of the modal. This immediately unchecks both "Competing in Forms" and "Competing in Sparring" and saves their last assignments internally.

**[DEMO: Click Withdraw and submit.]**

> The participant disappears from both their rings. The rings re-order to fill the gap. Notice the CHANGED badge and the "−First Last" pill in the change strip.
>
> Their data is preserved — if they show up late, you can restore them in seconds.

---

## Operation 3: Restoring a Withdrawn Participant

> The competitor shows up after all. Let's restore them.

**[DEMO: Search for the participant by name in the header search box, or find them in the Editor tab.]**

> The easiest way is to use the **search box** in the header. Type their name — at least two characters — and click the result.

**[DEMO: Type the name, click the result. Quick Edit opens.]**

> You'll see a red **"⛔ Withdrawn"** badge and a green **Restore** button. Click **Restore**.

**[DEMO: Click Restore and Submit.]**

> They're placed back in their previous ring and the order is recalculated. The ring shows CHANGED since they were temporarily gone.

---

## Operation 4: Withdrawing from Sparring Only

> A competitor is fine for Forms but has an injury and won't do Sparring.

**[DEMO: Open Quick Edit for a participant.]**

> In the modal, look at the **Sparring** column. Uncheck **Competing in Sparring**.

**[DEMO: Uncheck Competing in Sparring. Show the fields graying out.]**

> Their sparring assignment is preserved internally. If they recover, you just come back here and re-check the box to reinstate them at the same pool.

**[DEMO: Click Submit.]**

> They remain in their Forms ring and disappear from Sparring. Clean and simple.

---

## Operation 5: Adding a Late Registration

> Someone just walked in and needs to be registered on the spot.

**[DEMO: Click the "Add Participant" button in the header.]**

> The **Add Participant** modal opens. Fill in the required fields:
> - First and last name
> - Age
> - Gender

**[DEMO: Fill in the fields.]**

> Then assign them to a division, category, and pool for **Forms**.
>
> If they're also doing Sparring and it's the same division and pool, leave the **"Use same settings for Sparring"** checkbox checked and it mirrors automatically. If they're in a different sparring pool, uncheck it and set sparring separately.

**[DEMO: Fill in the division/category/pool fields. Show the "Use forms for sparring" checkbox behavior.]**

> Click **Add Participant**. They're added immediately, and their new ring is re-ordered.

---

## Operation 6: Using Quick Edit for Granular Changes

> Quick Edit lets you do more than just move people between pools. Let's look at all the controls.

**[DEMO: Open Quick Edit for any participant.]**

> **Rank Order** — if you need someone in a specific position, you can type a number directly. Use decimals like "1.5" to insert between existing positions without renumbering everyone.
>
> **Copy from Forms** — when checked, the sparring assignment mirrors forms. This is the default for people competing in both. Uncheck it if someone is in a different division for sparring.
>
> **Alt Ring** — for sparring, you can assign a participant to Alt Ring A or Alt Ring B. This splits a large sparring pool into two separate brackets in the ring. When all participants in a pool are assigned to either A or B, the ring card shows them as two separate sub-groups, each printable independently.
>
> **Physical Ring** is read-only here. To change which physical ring a pool is assigned to, go to the Ring Map tab.

**[DEMO: Point to each of these controls.]**

---

## Operation 7: Manual Ring Ordering (Custom Order)

> By default, forms rings are ordered to minimize same-school adjacency, and sparring rings are ordered by height. But sometimes you need manual control.

**[DEMO: Expand a ring card and point to the Custom Order checkbox.]**

> Check the **Custom Order** checkbox on a ring. The ▲ and ▼ move buttons become active.

**[DEMO: Check Custom Order. Use the arrow buttons to move someone up or down.]**

> While Custom Order is on, moving participants in or out of this ring will not trigger automatic reordering. You maintain full manual control.
>
> To go back to automatic ordering, simply uncheck the box. The ring is instantly re-sorted by the algorithm.

**[DEMO: Uncheck Custom Order and show the automatic re-sort.]**

---

## Operation 8: Grand Champion Rings

> Grand Champion rings are custom rings you create for championship rounds — outside the normal pool structure.

**[DEMO: Click the ⭐ GC button in the toolbar.]**

> You're now in the Grand Champion view.

### Creating a GC Ring

**[DEMO: Click "Add Ring".]**

> A dialog asks for a ring name and type — Forms or Sparring.

**[DEMO: Enter "Black Belt Grand Champion", select "Forms", click Create Ring.]**

> The ring appears with a yellow border and no participants yet.

### Adding Participants

**[DEMO: Click "+ Add Participant" on the GC ring.]**

> A search modal shows all participants not already in this ring. Select the competitors you want in the Grand Champion round.

**[DEMO: Select a few participants.]**

> They're added in the order you select them.

### Reordering

**[DEMO: Show the ▲/▼ buttons and move someone.]**

> Use the ▲ and ▼ arrows to set the competition order. The ✕ button removes a participant from the ring without affecting their other assignments.

### Printing

**[DEMO: Click Print on the GC ring.]**

> For a Forms GC ring, this generates a scoring sheet. For Sparring, it generates a bracket. Same format as the regular rings — it just uses the custom ring's participant list and competition order.

### Renaming and Deleting

**[DEMO: Click Edit to rename inline. Then click Delete.]**

> **Edit** lets you rename the ring inline. **Delete** asks for confirmation since this can't be undone.

---

## Operation 9: Checkpoints and Change Tracking

> Checkpoints are your safety net. Use them before making any significant batch of changes.

### Creating a Checkpoint

**[DEMO: Click the "Checkpoints" segment button in the Tournament toolbar, or click the Checkpoints tab.]**

> Either place works. Type a name — like "Before lunch adjustments" — and click **Create Checkpoint**. Or just press Enter.

**[DEMO: Create a named checkpoint.]**

> The newest checkpoint is highlighted in green with a ✓. That's the active baseline for change tracking.

### Viewing What Changed

**[DEMO: Go to the Checkpoints tab and click "View Diff" on an earlier checkpoint.]**

> The diff panel shows:
> - **Participants Added** — green section
> - **Participants Removed** — red section
> - **Participants Modified** — each changed field, old value in red, new value in green
> - **Rings Affected** — blue badge pills for each ring that changed

**[DEMO: Point to each section.]**

### Loading a Checkpoint

**[DEMO: Point to the Load button on a non-current checkpoint.]**

> If you need to revert, click **Load** on any older checkpoint. This replaces your entire current state with that snapshot. Always create a new checkpoint before loading an old one — just in case.

> There's no Undo for a checkpoint load, so treat it like a nuclear option. The confirmation dialog will remind you.

### Printing Only Changed Rings

**[DEMO: Go back to the Tournament tab. Point to the "Print Changed (N)" button in the toolbar.]**

> After making changes since the last checkpoint, the **Print Changed** button appears showing how many rings are affected. Click it to generate scoring sheets and brackets for only those rings — for the currently filtered division.

**[DEMO: Click Print Changed and show the PDF being generated.]**

> This is your best friend when you're 3 hours into tournament day and you just need to reprint 2 rings, not 30.

---

## Operation 10: Exporting PDFs

> When you need to generate all your documents upfront, use the **Export** tab.

**[DEMO: Click the Export tab.]**

> From here you can generate:
> - **Name Tags** — 2×4 grid format, includes name, division, school, and ring color. Print on perforated business card sheets.
> - **Check-In Sheets** — one per division, sorted alphabetically, with a checkbox column for attendance.
> - **Forms Scoring Sheets** — one per ring, participants in rank order, three judge score columns, placements table. Watermark is included if configured.
> - **Sparring Brackets** — 16-person landscape bracket, height-ordered, automatic bye placement, color-coded rounds. Watermark included.

**[DEMO: Click each generate button and briefly show the resulting PDF. You don't have to print them all — just show the preview.]**

---

## Day-of Workflow Summary

> Here's the recommended flow for tournament day:
>
> 1. **Launch the app** — state is auto-loaded from the last session.
> 2. Click **Set Baseline** before doing anything else.
> 3. Print **Name Tags** and **Check-In Sheets** from the Export tab.
> 4. Print **Forms Scoring Sheets** and **Sparring Brackets** from Export.
> 5. As people arrive, use the **search bar** or Editor tab to check them in.
> 6. Handle **no-shows** with Quick Edit → Withdraw.
> 7. Handle **late arrivals** with Add Participant.
> 8. **Rebalance rings** if needed using Quick Edit → change pool.
> 9. Create a **Checkpoint** before lunch or any large batch of changes.
> 10. After changes, use **Print Changed** to reprint only affected rings.
> 11. Set up **Grand Champion rings** when the qualifying rounds finish.
> 12. **Save Tournament** from Configuration when done for the day.

---

## Closing

> That wraps up the three-part Tournament Manager training series.
>
> To summarize what you've learned:
> - **Part 1** — the overall layout and workflow
> - **Part 2** — importing data, configuring the tournament, creating categories, and mapping rings
> - **Part 3** — everything you'll do on the day: moving participants, withdrawals, late registrations, custom order, Grand Champion rings, checkpoints, and printing
>
> For a quick reference during a live tournament, check the **QUICK_REFERENCE.md** file included with the app. It covers the most common operations in a condensed format.
>
> Good luck with your tournament!

---

*Generated for Tournament Manager. See USER_GUIDE.md for full reference documentation.*
