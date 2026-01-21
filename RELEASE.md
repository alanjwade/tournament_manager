# Release Instructions

## Creating a Release

### Automated (GitHub Actions)

1. **Create a version tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. GitHub Actions will automatically:
   - Build the Windows installer
   - Create a GitHub release
   - Upload the installer as a release asset

3. Users can then download from the Releases page

### Manual Build (for testing)

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Package for Windows
npm run package:win
```

The output will be in the `release/` folder:
- `TournamentManager-Setup-X.X.X.exe` - Windows installer

## What Gets Included

The build automatically includes:
- ✅ All compiled application code
- ✅ Logo images (watermark, CMAA logos)
- ✅ Application icons
- ✅ All required dependencies

Users just need to:
1. Download the installer
2. Run it and follow the installation wizard

## Data File Location

When users run the installed version:
- Tournament data saves to: `C:\Users\[Username]\AppData\Roaming\TournamentManager\`
- Data persists across updates
- To share tournament data, use the Export/Import features in the Data Viewer tab

## Distribution

1. After GitHub Actions builds the release, download:
   - `TournamentManager-Setup-X.X.X.exe`
   - `WINDOWS_RELEASE_README.md` (from repo)

2. Provide the installer to users:
   - The installer includes everything needed
   - The README explains installation and usage

3. Tournament data:
   - Users can export/import tournament data via the app
   - Data is automatically saved in AppData

## Testing the Installer

1. Build the installer: `npm run package:win`
2. Run the installer from `release/` folder
3. Install to a test location
4. Run the application
5. Make some changes in the app
6. Close and check that data was saved in AppData
7. Run the app again and verify data loads
8. Test uninstall to ensure it works correctly

## Troubleshooting

**Build fails:**
- Ensure all dependencies are installed: `npm install`
- Try cleaning: `rm -rf dist release node_modules && npm install`

**Windows SmartScreen blocks the exe:**
- This is expected for unsigned executables
- Users can click "More info" → "Run anyway"
- To avoid this, you'd need to code-sign (requires paid certificate)

**App won't start:**
- Check that build completed successfully
- Ensure all assets are in `release/` directory
- Try building in a clean environment
