# Tournament Manager - Tab Documentation

This document describes each tab in the Tournament Manager application, its purpose, and what data it modifies.

## Tab Overview

The application has 8 tabs that guide you through the tournament setup process:

---

## 1. Import Data
**Purpose:** Load participant data into the application

**What it does:**
- Imports Excel files (.xlsx, .xls) containing participant information
- Parses participant data including name, age, division, rank, etc.
- Loads tournament configuration settings from Excel
- Initializes the tournament state
- Provides access to tournament configuration settings:
  - Division setup
  - Physical ring configuration
  - Watermark image for PDFs
  - **PDF output directory** (optional default save location for all PDFs)

**Data Modified:**
- `participants` - Array of all tournament participants
- `config` - Tournament configuration (divisions, age groups, ring settings, PDF directory)

**Typical workflow:** Start here to load your participant roster and configure settings

---

## 2. Cohort Management
**Purpose:** Group participants into cohorts based on division, age, rank, and other criteria

**What it does:**
- Automatically creates cohorts using configurable rules
- Groups participants by division (e.g., Forms, Sparring, Weapons, Mixed)
- Separates by age groups
- Separates by rank/belt level
- Allows manual editing of cohort assignments

**Data Modified:**
- `cohorts` - Array of cohort groups with participant assignments

**Typical workflow:** After importing data, create cohorts to organize participants

---

## 3. Cohort Ring Assignment
**Purpose:** Assign cohorts to competition rings and split large cohorts if needed

**What it does:**
- Assigns each cohort to a competition ring
- Splits large cohorts into multiple rings (e.g., "Mixed 8-10_R1", "Mixed 8-10_R2")
- Configures maximum participants per ring
- Creates the competition ring structure

**Data Modified:**
- `competitionRings` - Array of competition rings with cohort assignments

**Typical workflow:** After creating cohorts, assign them to rings

---

## 4. Ring Map Editor
**Purpose:** Map competition rings to physical rings at the venue

**What it does:**
- Maps competition rings (e.g., "Mixed 8-10_R1") to physical rings (e.g., "PR1a", "PR2b")
- Auto-assigns physical rings based on number available
- Uses pattern: PR1a, PR1b, PR2a, PR2b when physical rings are reused
- Assigns sequentially (PR1, PR2, PR3) when enough physical rings exist
- Allows manual editing of physical ring assignments

**Data Modified:**
- `physicalRingMappings` - Mapping of cohort rings to physical venue rings

**Typical workflow:** After ring assignment, map to actual venue layout

---

## 5. Order Rings
**Purpose:** Set the execution order for competition rings

**What it does:**
- Defines the sequence in which rings will run
- Allows drag-and-drop or manual ordering
- Helps organize tournament flow and timing

**Data Modified:**
- Ring execution order (ordering metadata for competition rings)

**Typical workflow:** Before exporting, set the order rings will be called

---

## 6. Participant Editor
**Purpose:** View and manually edit individual participant data

**What it does:**
- Displays all participant information in a table
- Allows editing of participant details
- Fixes data entry errors
- Adds or removes participants

**Data Modified:**
- `participants` - Individual participant records

**Typical workflow:** Use anytime to make corrections or updates

---

## 7. Ring Overview
**Purpose:** Visual summary of all competition rings and their assignments

**What it does:**
- Shows all competition rings with participant counts
- Displays cohort assignments
- Provides a high-level view of tournament organization
- Helps verify balanced ring distribution

**Data Modified:**
- None (read-only view)

**Typical workflow:** Review before exporting to verify setup

---

## 8. Export PDFs
**Purpose:** Generate printable PDF documents for tournament day

**What it does:**
- Generates check-in sheets for participant registration
- Creates forms scoring sheets for judges
- Produces sparring brackets (single/double elimination)
- Generates participant name tags
- Exports documents organized by division and ring
- Uses configured PDF output directory if set (otherwise prompts for location)

**Data Modified:**
- None (generates PDF files based on current data)

**Configuration:**
- PDF output directory can be set in the Import Data tab's Configuration section
- When configured, all PDFs will default to saving in this directory
- If not configured, you'll be prompted to choose a location each time

**Typical workflow:** Final step - export all documents needed for tournament day

---

## Typical Workflow Summary

1. **Import Data** - Load participant Excel file
2. **Cohort Management** - Create and organize cohorts
3. **Cohort Ring Assignment** - Assign cohorts to competition rings
4. **Ring Map Editor** - Map to physical venue rings
5. **Order Rings** - Set execution order
6. **Participant Editor** - Make any corrections (as needed)
7. **Ring Overview** - Verify setup looks correct
8. **Export PDFs** - Generate all tournament documents

---

## Data Persistence

The application uses **localStorage autosave** to preserve your work. All changes are automatically saved and will be restored when you reopen the application.
