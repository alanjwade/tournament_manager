# Tournament Manager - Copilot Instructions

## Project Overview

This is an Electron application built with React and TypeScript for managing martial arts tournament participant registration, ring assignments, and PDF generation.

## Tech Stack

- **Electron 28.0.0** - Desktop application framework
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **jsPDF** - PDF generation

## Key Concepts

- **Divisions**: Age/skill groups (e.g., "Youth", "Adult")
- **Categories**: Competition groupings within divisions (forms or sparring)
- **Pools**: Subgroups within categories (Pool 1, Pool 2, etc.) - previously called "rings"
- **Physical Rings**: The actual competition areas (PR1, PR2, etc.)

## Development Commands

- `npm run dev` - Start development mode
- `npm run build` - Build for production
- `npm run dist` - Create distributable

## Theming

The app supports light/dark themes via CSS variables. Default is dark theme.
- Theme toggle is in the app header
- Variables defined in `src/renderer/styles/index.css`

