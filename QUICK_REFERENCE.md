# Tournament Manager - Quick Reference Card

## 🚀 Quick Start

```bash
npm install          # Install dependencies (first time only)
npm run dev          # Start development mode
npm run build        # Build for production
npm start            # Run built application
npm run package      # Create distributable
```

## 📋 Excel File Format

Required columns (exact names):
- `student first name`
- `student last name`
- `age`
- `gender`
- `height feet`
- `height inches`
- `school`
- `Branch` (optional)
- `division`

## 🎯 Workflow

- **Import** → Upload Excel file
- **Configure** → Set divisions & rings
- **Categories** → Assign participants to categories
- **Rings** → Distribute to physical rings
- **Order** → Run forms/sparring ordering
- **Overview** → Review assignments
- **Export** → Generate PDFs

## ⚠️ Important Warnings

| Action | Warning | Impact |
|--------|---------|--------|
| Re-run Category Assignment | ⚠️ Destroys previous category assignments | All manual edits lost |
| Re-run Ring Assignment | ⚠️ Destroys previous ring assignments | Participant distribution reset |
| Re-order Forms Ring | ✅ Safe - per ring only | No impact on other data |
| Re-order Sparring Ring | ✅ Safe - per ring only | No impact on other data |

## 📊 Category Guidelines

### Age Ranges
- **Young Children**: 2-year ranges (5-6, 7-8, 9-10)
- **Teens**: 3-4 year ranges (11-14, 15-17)
- **Adults**: 18+ or (18-34, 35+)

### Gender
- **Male**: Male participants only
- **Female**: Female participants only
- **Mixed**: All genders (good for young children & forms)

### Ring Counts
| Participants | Recommended Rings |
|--------------|-------------------|
| 1-8 | 1 ring |
| 9-16 | 2 rings |
| 17-24 | 3 rings |
| 25+ | 4 rings |

## 📄 PDF Outputs

### Name Tags
- **Format**: 2 columns × 4 rows per page
- **Contains**: Name, division, school, ring color
- **Print On**: Perforated business card sheets

### Check-In Sheets
- **Format**: One per division
- **Sorted**: Last name, first name
- **Contains**: School, ring color, checkbox

### Forms Scoring Sheets
- **Format**: One per ring
- **Contains**: Participants in rank order, 3 judge columns, final score, placements table
- **Features**: Watermark support

### Sparring Brackets
- **Format**: 16-person bracket (landscape)
- **Contains**: Height-ordered participants, numbered matches, color-coded rounds, 3rd place match
- **Features**: Watermark support, automatic bye placement

## 🔢 Rank Order Numbers

- Forms/Sparring orders are adjusted using **Up/Down buttons**
- Click the up arrow to move a participant higher in rank
- Click the down arrow to move a participant lower in rank
- Changes are saved automatically to the ring

## 🎨 Ring Color Codes

Default color support in PDFs:
- Red → #FF0000
- Blue → #0000FF
- Green → #00FF00
- Yellow → #FFFF00
- Orange → #FFA500
- Purple → #800080

## 💾 Data Management

**Important**: All data is currently in memory!
- ✅ Keep original Excel file safe
- ✅ Export all PDFs before closing app
- ❌ No auto-save (yet)
- ❌ Closing app loses all work

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Excel won't import | Check column names match exactly |
| Participant missing category | Review age/gender criteria or assign manually |
| Unbalanced rings | Manually move participants in Ring Management |
| First 3 same school in forms | Adjust rank_order numbers manually |
| PDF won't open | Install PDF reader, try different filename |
| Build errors | Run `npm install` again |
| App won't start | Run `npm run build` first |

## ⌨️ Keyboard Shortcuts

- **Tab**: Navigate between fields
- **Enter**: Submit forms
- **Escape**: Close dialogs
- **Ctrl/Cmd + R**: Refresh (dev mode)

## 📏 PDF Customization

Edit these files to adjust PDF layouts:
```
src/utils/pdfGenerators/
├── nameTags.ts        # Adjust width, height, margins, fontSize
├── checkInSheet.ts    # Modify table layout
├── formsScoringSheet.ts  # Change column widths
└── sparringBracket.ts    # Adjust bracket spacing
```

## 🏷️ Name Tag Dimensions

Default configuration (in mm):
```javascript
{
  width: 95,      // Tag width
  height: 65,     // Tag height
  marginX: 10,    // Horizontal margin
  marginY: 10,    // Vertical margin
  fontSize: 14,   // Base font size
  columns: 2,     // Tags per row
  rows: 4         // Tags per column
}
```

## 📱 File Locations

- **Config**: `src/store/tournamentStore.ts`
- **Types**: `types/tournament.ts`
- **Styles**: `src/renderer/styles/index.css`
- **Components**: `src/renderer/components/`
- **Utils**: `src/renderer/utils/`

## 🎓 For Developers

### Type Definitions
- `Participant`: Individual competitor
- `Division`: Tournament division (Black Belt, Level 1, etc.)
- `Category`: Group of participants who compete together
- `PhysicalRing`: Actual ring at venue
- `CompetitionRing`: Virtual ring assignment for category
- `TournamentConfig`: Global settings

### State Management
Uses Zustand for state:
```typescript
const participants = useTournamentStore(state => state.participants);
const setParticipants = useTournamentStore(state => state.setParticipants);
```

### Adding Features
1. Add types to `types/tournament.ts`
2. Update store in `src/store/tournamentStore.ts`
3. Create utility functions in `src/utils/`
4. Build UI component in `src/renderer/components/`
5. Wire up in `App.tsx`

---

**Print this page for quick reference during tournament setup!**
