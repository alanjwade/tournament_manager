# Release Instructions

## Creating a Release

### Automated (GitHub Actions)

1. **Create a version tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. GitHub Actions will automatically:
   - Build the Windows portable executable
   - Create a ZIP archive
   - Create a GitHub release
   - Upload both files as release assets

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
- `Tournament Manager-X.X.X-portable.exe` - Single portable executable
- `Tournament Manager-X.X.X-x64.zip` - ZIP archive with all files

## What Gets Included

The build automatically includes:
- ✅ All compiled application code
- ✅ Logo images (watermark, CMAA logos)
- ✅ Application icons
- ✅ All required dependencies

Users just need:
1. The `.exe` file (portable) or
2. The `.zip` file (extract and run)

## Data File Location

When users run the portable version:
- Tournament data saves to: `[app-folder]/tournament-data/tournament-autosave.json`
- This makes it truly portable - they can move the whole folder anywhere
- To share tournament data, just share the `tournament-autosave.json` file

## Distribution

1. After GitHub Actions builds the release, download:
   - `Tournament Manager-X.X.X-portable.exe`
   - `WINDOWS_RELEASE_README.md` (from repo)

2. Provide both files to users:
   - The `.exe` is the application
   - The README explains how to use it

3. Tournament data file:
   - You can create a sample `tournament-autosave.json`
   - Users place it in `tournament-data` folder next to the exe
   - Or just send them the JSON file directly

## Testing the Portable Build

1. Build the portable exe: `npm run package:win`
2. Create a test folder on Desktop
3. Copy the `.exe` from `release/` to the test folder
4. Run the exe
5. Make some changes in the app
6. Close and check that `tournament-data/tournament-autosave.json` was created
7. Run the exe again and verify data loads

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
