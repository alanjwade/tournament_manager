# Quick Start Guide - Building Windows Portable Release

## What's Been Set Up

✅ **GitHub Actions** - Automatic builds on tag push
✅ **Portable Build** - No installer needed, runs from any folder
✅ **Bundled Assets** - All logos and icons included automatically
✅ **Smart Data Storage** - Saves next to the exe in `tournament-data/` folder

## Creating a Release

### Option 1: Automatic (Recommended)

```bash
# Commit your changes
git add .
git commit -m "Ready for release"
git push

# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will automatically:
1. Build the Windows portable executable
2. Create a GitHub Release
3. Upload the files for download

### Option 2: Manual Build

```bash
npm install
npm run build
npm run package:win
```

Files will be in `release/`:
- `Tournament Manager-X.X.X-portable.exe` ← Give this to users
- `Tournament Manager-X.X.X-x64.zip` ← Alternative format

## Distributing to Users

1. **Download from GitHub Release** or grab from `release/` folder
2. **Give users:**
   - `Tournament Manager-X.X.X-portable.exe`
   - `WINDOWS_RELEASE_README.md` (instructions)

3. **For tournament data:**
   - You can send them a `tournament-autosave.json` file
   - They create a `tournament-data` folder next to the exe
   - They put the JSON file there
   - App loads it automatically

## User Experience

Users will:
1. Download the `.exe` file
2. Create a folder (e.g., on Desktop)
3. Put the `.exe` in that folder
4. Double-click to run - **No installation!**
5. Tournament data saves in `tournament-data/` subfolder

## Key Features

- **Truly Portable**: Move the folder anywhere, it still works
- **Multiple Tournaments**: Each folder can have different data
- **No Registry**: Clean, no Windows registry modifications
- **Easy Backup**: Just copy the `tournament-data` folder
- **Easy Sharing**: Send the JSON file to anyone

## First Release Checklist

- [ ] Update version in `package.json`
- [ ] Test build locally: `npm run package:win`
- [ ] Test the portable exe in a clean folder
- [ ] Verify data saves/loads correctly
- [ ] Commit and push changes
- [ ] Create and push tag: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] Wait for GitHub Actions to complete (~5-10 min)
- [ ] Download from Releases page and test
- [ ] Share release link with users

## Testing Before Release

```bash
# Build
npm run package:win

# The exe will be in release/
cd release

# Copy to a test folder
mkdir ~/Desktop/TournamentTest
cp "Tournament Manager"*.exe ~/Desktop/TournamentTest/

# Run and test
# (open the exe, create some data, close, reopen, verify data persists)
```

## Notes

- **Windows SmartScreen**: Users will see a warning on first run (unsigned exe)
  - They click "More info" → "Run anyway"
  - This is normal for unsigned apps
  
- **Antivirus**: Some antivirus may flag unknown executables
  - The app is safe, it's just not code-signed
  - Users can add an exception if needed

- **Data Location**: `tournament-data/tournament-autosave.json`
  - Always next to the exe
  - Easy to find, backup, or share
