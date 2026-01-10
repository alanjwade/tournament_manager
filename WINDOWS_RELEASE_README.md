# Tournament Manager - Windows Portable

## Quick Start

1. **Download** the latest release:
   - `Tournament-Manager-X.X.X-portable.exe` (recommended - single file)
   - OR `Tournament-Manager-X.X.X-x64.zip` (zip archive)

2. **For Portable EXE:**
   - Download `Tournament-Manager-X.X.X-portable.exe`
   - Create a folder on your Desktop (e.g., `Tournament Manager`)
   - Move the `.exe` file into this folder
   - Double-click to run - **No installation required!**

3. **For ZIP Archive:**
   - Download and extract the `.zip` file to a folder (e.g., Desktop)
   - Open the extracted folder
   - Double-click `Tournament Manager.exe` to run

## Tournament Data Storage

### For Portable Version (.exe)

The application saves your tournament data in a `tournament-data` folder next to the executable:
```
[Your Folder]\
  ├── Tournament Manager.exe  (or Tournament-Manager-X.X.X-portable.exe)
  └── tournament-data\
      └── tournament-autosave.json
```

### For Extracted ZIP Version

Same structure - data is saved in `tournament-data` folder next to the `.exe`.

### Sharing Tournament Data

To share or backup your tournament:
1. Locate the `tournament-data` folder in your app folder
2. Copy the `tournament-autosave.json` file to share with others or backup
3. To use someone else's tournament data:
   - Create a `tournament-data` folder next to your `.exe` if it doesn't exist
   - Place their `tournament-autosave.json` file in this folder
   - Restart the application
   - The tournament data will load automatically

**Pro Tip:** You can have multiple portable installations with different tournaments by keeping them in separate folders!

## Default Assets Included

The following assets are bundled with the application:
- Default watermark logo
- Tournament logos (CMAA logos)
- Application icons

You can customize these through the Configuration tab if needed.

## System Requirements

- Windows 10 or later (64-bit)
- No additional software installation required
- Internet connection NOT required for normal operation

## Portable vs Installed

This is a **portable application**:
- ✅ No installation wizard
- ✅ No registry modifications
- ✅ Can run from USB drive or any folder
- ✅ Easy to move or delete - just delete the folder
- ✅ Multiple versions can run side-by-side (in different folders)

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
