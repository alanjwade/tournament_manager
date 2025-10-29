# Tournament Manager

A desktop application for managing martial arts tournament participation, built with Electron, React, and TypeScript.

## Features

- **Data Import**: Import participant data from Excel spreadsheets (.xlsx, .xls, .csv)
- **Division Management**: Configure tournament divisions and physical rings
- **Cohort Assignment**: Automatically group participants by age, gender, and division
- **Ring Assignment**: Distribute participants across physical rings
- **Forms Competition**: Automated ordering to prevent same-school clustering
- **Sparring Competition**: Height-based ordering with automated bracket generation
- **PDF Generation**:
  - Name tags (2x4 grid)
  - Check-in sheets
  - Forms scoring sheets
  - Sparring brackets (16-person format)

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
- **Branch**: Branch name (optional)
- **Division**: Division name (e.g., "Black Belt", "Level 1", etc.)

## Usage Workflow

1. **Import Data**: Load participant data from an Excel file
2. **Configuration**: 
   - Set up divisions (default: Black Belt, Level 1-3, Beginner)
   - Add physical rings with names and colors
   - Optionally add a watermark image for PDFs
3. **Cohort Management**: 
   - Auto-assign participants to cohorts based on division, gender, and age
   - Adjust ring counts per cohort as needed
4. **Ring Assignment**:
   - Assign forms and sparring rings
   - Order participants within each ring
5. **Ring Overview**: Review all ring assignments
6. **Export PDFs**: Generate and save tournament documents

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
│   │   │   ├── cohortAssignment.ts
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
