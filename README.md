# Tournament Manager

A desktop application for managing martial arts tournament participation, built with Electron, React, and TypeScript.

## Features

- **Data Import**: Import participant data from Excel spreadsheets (.xlsx, .xls, .csv)
- **Division Management**: Configure tournament divisions and physical rings
- **Category Assignment**: Automatically group participants by age, gender, and division
- **Ring Assignment**: Distribute participants across physical rings
- **Forms Competition**: Automated ordering to prevent same-school clustering
- **Sparring Competition**: Height-based ordering with automated bracket generation
- **Custom Order**: Per-ring manual ordering with automatic reorder bypass
- **Checkpoints**: Save, compare, and restore tournament state snapshots
- **Quick Edit**: Click any participant name to edit assignments inline
- **Grand Champion**: Custom rings for grand champion rounds
- **Undo/Redo**: Full undo/redo support for all changes
- **Auto-Save**: Automatic state persistence across restarts
- **PDF Generation**:
  - Name tags (2x4 grid)
  - Check-in sheets
  - Forms scoring sheets
  - Sparring brackets (16-person format)
  - Print only changed rings via checkpoint diff

## Requirements

- Node.js 18+ 
- npm or yarn

## Installation

```bash
npm install
```

## Development

```bash
# Run in development mode
npm run dev

# Build the app
npm run build

# Start the built app
npm start
```

## Building for Distribution

```bash
npm run package
```

This will create distributable packages in the `release` directory.

## Excel File Format

The input Excel file should have the following columns (case-insensitive):

- **Student First Name**: First name of participant
- **Student Last Name**: Last name of participant
- **Age**: Numeric age
- **Gender**: "Male" or "Female"
- **Height Feet**: Height in feet (numeric)
- **Height Inches**: Height in inches (numeric)
- **School**: School name
- **Branch**: Branch name
- **Division**: Division name (e.g., "Black Belt", "Level 1", etc.)

## Usage Workflow

1. **Import Data**: Load participant data from an Excel file
2. **Configuration**: 
   - Set up divisions (default: Black Belt, Level 1-3, Beginner)
   - Add physical rings with names and colors
   - Configure school abbreviations
   - Optionally add a watermark image for PDFs
   - Optionally set a default PDF output directory
3. **Category Management**: 
   - Auto-assign participants to categories based on division, gender, and age
   - Adjust pool counts per category as needed
4. **Ring Map**:
   - Map category pools to physical rings at the venue
5. **Tournament**:
   - Review all ring assignments with the division filter
   - Click participant names to Quick Edit their assignments
   - Rings auto-reorder when participants are moved between pools
   - Enable **Custom Order** per-ring for manual reordering (disables auto-reorder for that ring)
   - Set up Grand Champion rings
6. **Checkpoints**:
   - Save named snapshots before making changes
   - View diffs to see what changed (added/removed/modified participants, affected rings)
   - Load a checkpoint to revert changes
   - Print only changed rings for reprinting
7. **Export PDFs**: Generate and save tournament documents

## Project Structure

```
tournament-manager/
├── src/
│   ├── main/              # Electron main process
│   │   └── index.ts
│   ├── renderer/          # React application
│   │   ├── components/    # React components
│   │   ├── store/         # Zustand state management
│   │   ├── utils/         # Utility functions
│   │   │   ├── pdfGenerators/  # PDF generation
│   │   │   ├── categoryAssignment.ts
│   │   │   ├── ringAssignment.ts
│   │   │   ├── ringOrdering.ts
│   │   │   └── excelParser.ts
│   │   ├── types/         # TypeScript type definitions
│   │   ├── styles/        # CSS styles
│   │   └── App.tsx        # Main app component
│   ├── preload.ts         # Electron preload script
│   └── types/             # Shared type definitions
├── dist/                  # Built files
├── release/               # Packaged application
└── package.json
```

## Technology Stack

- **Electron**: Desktop application framework
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Zustand**: State management
- **jsPDF**: PDF generation
- **XLSX**: Excel file parsing
- **Vite**: Build tool

## License

MIT
