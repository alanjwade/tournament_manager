# Checkpoint System Documentation

## Overview

The checkpoint system allows you to capture snapshots of the tournament state at any point in time, compare the current state against checkpoints to see what changed, and restore previous states. This is particularly useful for identifying which rings have changed so you can selectively reprint only affected rings.

## Features

### 1. Create Checkpoints
- **Automatic naming**: Creates checkpoints with timestamp (e.g., "Checkpoint 2024-01-15 14:30:22")
- **Custom naming**: Provide your own descriptive name (e.g., "Before Adding Late Registrations")
- **Complete state capture**: Saves all participants, cohorts, config, and ring mappings

### 2. Manage Checkpoints
- **Rename**: Update checkpoint names for better organization
- **Delete**: Remove unwanted checkpoints
- **Automatic loading**: All checkpoints are loaded when the app starts

### 3. View Differences (Diff)
The diff feature compares the current state against a checkpoint and shows:
- **Participants Added**: New participants since the checkpoint
- **Participants Removed**: Participants deleted since the checkpoint
- **Participants Modified**: Participants whose relevant fields changed
  - Tracked fields: formsCohortId, sparringCohortId, formsCohortRing, sparringCohortRing, sparringAltRing, competingForms, competingSparring, rankOrder
- **Rings Affected**: List of all ring names that have changes
  - Format: "cohortName_cohortRing" (e.g., "Mixed 8-10_R1")
  - Includes alt ring variants (e.g., "Mixed 8-10_R1_a", "Mixed 8-10_R1_b")

### 4. Load Checkpoints
- Restore any previous state with a single click
- Confirmation dialog prevents accidental overwrites
- Complete state replacement (participants, cohorts, config, ring mappings)

## How to Use

### Creating a Checkpoint

1. Navigate to the **Checkpoints** tab
2. Enter an optional name in the text field (or leave blank for auto-generated name)
3. Click **Create Checkpoint**
4. The checkpoint will be saved to disk and appear in the list

### Viewing Changes

1. In the checkpoint list, click **View Diff** for any checkpoint
2. The diff panel will show:
   - Summary counts (added, removed, modified, rings affected)
   - List of affected rings (color-coded badges)
   - Details of participants added (green)
   - Details of participants removed (red)
   - Details of participants modified (yellow) with field-by-field changes

### Renaming a Checkpoint

1. Click **Rename** next to the checkpoint
2. Edit the name in the input field
3. Click **Save** or press Enter
4. Click **Cancel** or press Escape to abort

### Loading a Checkpoint

1. Click **Load** next to the checkpoint you want to restore
2. Confirm the action in the dialog
3. The entire tournament state will be replaced with the checkpoint state

### Deleting a Checkpoint

1. Click **Delete** next to the checkpoint
2. Confirm the deletion
3. The checkpoint file will be permanently removed from disk

## Use Cases

### 1. Selective Ring Printing
**Scenario**: You've already printed all rings, but then made changes to some participants.

**Workflow**:
1. Create a checkpoint after your initial ring setup
2. Make changes to participants (add, remove, modify assignments)
3. View the diff against the checkpoint
4. Note the "Rings Affected" list
5. Use this list to print only the changed rings

### 2. Experiment Safely
**Scenario**: You want to try a different cohort assignment strategy without losing your current setup.

**Workflow**:
1. Create a checkpoint with your current setup
2. Experiment with different assignments
3. If you don't like the results, load the checkpoint to restore
4. If you like the results, create a new checkpoint

### 3. Track Progress
**Scenario**: You're working through tournament setup over multiple sessions.

**Workflow**:
1. Create checkpoints at key milestones:
   - "Initial Import"
   - "Cohorts Created"
   - "Rings Assigned"
   - "Physical Rings Mapped"
   - "Ring Order Set"
2. View diffs between checkpoints to see your progress
3. Load any checkpoint to return to that stage

### 4. Collaboration
**Scenario**: Multiple people are working on tournament setup.

**Workflow**:
1. Create checkpoint before handing off to another person
2. The next person can see exactly what changed by viewing the diff
3. If mistakes are made, load the checkpoint to undo changes

## Technical Details

### Storage Location
Checkpoints are stored in the application's user data directory:
- Linux: `~/.config/tournament-manager/checkpoints/`
- Windows: `C:\Users\<username>\AppData\Roaming\tournament-manager\checkpoints\`
- macOS: `~/Library/Application Support/tournament-manager/checkpoints/`

### File Format
Each checkpoint is stored as a separate JSON file named `<checkpointId>.json` containing:
```json
{
  "id": "checkpoint_1705330222123",
  "name": "Before Adding Late Registrations",
  "timestamp": "2024-01-15T14:30:22.123Z",
  "state": {
    "participants": [...],
    "cohorts": [...],
    "config": {...},
    "physicalRingMappings": [...],
    "cohortRingMappings": [...]
  }
}
```

### Change Detection Algorithm
The diff algorithm performs a comprehensive comparison:

1. **Participant Tracking**: Uses participant IDs to match across states
2. **Added Detection**: Finds IDs in current state but not in checkpoint
3. **Removed Detection**: Finds IDs in checkpoint but not in current state
4. **Modified Detection**: Compares 9 key fields for each participant
5. **Ring Tracking**: Builds ring names from cohort assignments
   - Forms rings: `${formsCohortName}_${formsCohortRing}`
   - Sparring rings: `${sparringCohortName}_${sparringCohortRing}`
   - Alt sparring rings: `${sparringCohortName}_${sparringCohortRing}_${sparringAltRing}`

### Performance Considerations
- Uses Map data structures for O(1) lookup during diffing
- Deep clones entire state to prevent reference issues
- All file I/O operations are asynchronous and non-blocking
- Checkpoints are loaded once on app startup and cached in memory

## Limitations

1. **Checkpoints are local**: Not shared across devices or users
2. **No automatic checkpoints**: You must manually create them
3. **No checkpoint merging**: Loading a checkpoint replaces the entire state
4. **No partial restore**: Cannot restore individual participants or cohorts
5. **No diff history**: Can only diff against checkpoints, not between two arbitrary states

## Future Enhancements

Possible future improvements:
- Automatic checkpoint creation at key milestones
- Export/import checkpoints for sharing
- Checkpoint comparison (diff between two checkpoints)
- Partial restore (restore only specific rings or cohorts)
- Checkpoint annotations (add notes to checkpoints)
- Checkpoint branching (create checkpoint variants)
- Integration with PDF export (auto-print changed rings)
