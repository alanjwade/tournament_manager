# TournamentManager - Windows Installer

## Quick Start

1. **Download** the latest release:
   - `TournamentManager-Setup-X.X.X.exe`

2. **Install:**
   - Double-click the installer
   - Choose installation location (or use default: `C:\Program Files\TournamentManager`)
   - Select if you want a desktop shortcut and Start Menu entry
   - Click Install
   - Launch TournamentManager from your Desktop or Start Menu

3. **First Launch:**
   - The app will automatically create a data folder in your AppData
   - You can start creating your tournament or import existing data

## Tournament Data Storage

### Installed Version

The application saves your tournament data in your Windows user AppData folder:
```
C:\Users\[YourUsername]\AppData\Roaming\TournamentManager\
  ├── tournament-autosave.json
  └── backups\
      └── backup-*.json
```

This is the standard location for application data on Windows and ensures:
- Data persists across app updates
- Data is backed up with your user profile
- No permission issues

### Sharing Tournament Data

To share or backup your tournament:
1. Go to the Data Viewer tab in the app
2. Use the "Export Database" feature to save a `.json` file anywhere
3. Share this file with others
4. To import someone else's data, use "Load Database" and select their file

**Pro Tip:** The app automatically creates backups every 20 minutes in the backups folder!

## Default Assets Included

The following assets are bundled with the application:
- Default watermark logo
- Tournament logos (CMAA logos)
- Application icons

You can customize these through the Configuration tab if needed.

## System Requirements

- Windows 10 or later (64-bit)
- ~150 MB disk space for installation
- Internet connection NOT required for normal operation

## Updates

When a new version is released:
1. Download the new installer
2. Run it - it will automatically update your existing installation
3. Your tournament data is preserved during updates

## Uninstalling

To remove TournamentManager:
1. Go to Windows Settings → Apps → Apps & features
2. Find "TournamentManager" in the list
3. Click Uninstall

**Note:** This removes the application but your tournament data remains in AppData.
To completely remove all data, manually delete the folder at:
`C:\Users\[YourUsername]\AppData\Roaming\TournamentManager\`

## Troubleshooting

**Windows SmartScreen Warning:**
If you see "Windows protected your PC":
1. Click "More info"
2. Click "Run anyway"

This warning appears because the app is not code-signed. The application is safe to run.

**Application won't start:**
- Make sure you have Windows 10 or later
- Try running as Administrator (right-click → Run as administrator)
- Check that antivirus isn't blocking the file

**Data not saving:**
- Ensure the folder has write permissions
- Don't run from a read-only location (like a CD/DVD)

## Support

For issues or questions, please visit the GitHub repository.
