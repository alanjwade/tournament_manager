# Windows Portable Build - Complete Setup Summary

## ✅ What's Configured

### 1. Build Configuration (`package.json`)
- **Portable executable** target (no installer needed)
- **ZIP archive** for alternative distribution
- **All assets bundled** (logos, icons automatically included)
- **Artifact naming** configured for clear version tracking

### 2. GitHub Actions (`.github/workflows/build.yml`)
- **Automatic builds** when you push a version tag
- **Windows-only** builds (on `windows-latest` runner)
- **Artifacts uploaded** to GitHub Releases automatically
- **Trigger**: Push a tag like `v1.0.0`

### 3. Data Storage (`src/main/index.ts`)
- **Portable-aware** data location
- **Saves next to exe**: `tournament-data/tournament-autosave.json`
- **Automatic folder creation** on first run
- **Fallback** to standard location if portable dir fails

### 4. Assets Bundled
All these are automatically included in the build:
- ✅ `watermark.png` (default watermark)
- ✅ `logo_orig_dark_letters.png` (CMAA logo)
- ✅ `app-icon.png` (application icon)
- ✅ All other logos in `/src/renderer/assets/logos/`

## 🚀 How to Create a Release

### For Your First Release:

```bash
# 1. Ensure code is ready
git add .
git commit -m "Release v1.0.0"
git push

# 2. Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# 3. GitHub Actions will automatically build
# Watch progress at: https://github.com/alanjwade/tournament_manager/actions

# 4. After ~5-10 minutes, release appears at:
# https://github.com/alanjwade/tournament_manager/releases

# 5. Download files:
# - Tournament Manager-1.0.0-portable.exe
# - Tournament Manager-1.0.0-x64.zip
```

## 📦 What Users Get

### Downloads:
1. **`Tournament Manager-1.0.0-portable.exe`** (recommended)
   - Single executable file
   - ~150-200 MB
   - All assets included

2. **`Tournament Manager-1.0.0-x64.zip`**
   - Alternative format
   - Extract and run

### User Instructions:
Give them `WINDOWS_RELEASE_README.md` which explains:
- Download and extract
- No installation needed
- Where data is saved
- How to share tournament files

## 📁 File Structure After Running

```
User's Folder (e.g., Desktop/Tournament Manager)/
├── Tournament Manager.exe          ← The application
└── tournament-data/                ← Created on first run
    └── tournament-autosave.json   ← Tournament data here
```

## 🔄 Workflow for Updates

```bash
# 1. Make changes to code
# 2. Update version in package.json (e.g., 1.0.0 → 1.1.0)
# 3. Commit changes
git add .
git commit -m "Version 1.1.0 - Added XYZ feature"
git push

# 4. Create new tag
git tag v1.1.0
git push origin v1.1.0

# 5. GitHub Actions builds new release automatically
```

## 📤 Sharing Tournament Data

### Option 1: JSON File
1. You create/edit a tournament in the app
2. Find `tournament-data/tournament-autosave.json`
3. Send this file to others
4. They put it in their `tournament-data/` folder
5. Restart app - data loads automatically

### Option 2: Whole Folder
1. Zip the entire `tournament-data/` folder
2. Send to others
3. They extract next to their exe

## 🧪 Testing Locally

Before creating a release, test the Windows build:

```bash
# Build for Windows (can run on Linux/Mac with electron-builder)
npm run package:win

# Output will be in release/
ls release/

# Copy to test location and verify:
# - App starts correctly
# - Data saves to tournament-data/
# - Data loads on restart
# - Logos display correctly
```

## ❓ Common Questions

**Q: Why portable instead of installer?**
A: Portable apps are simpler - just download and run. No admin rights needed, no registry changes, easy to move or delete.

**Q: Can users run multiple versions?**
A: Yes! Each folder is independent. They can have v1.0.0 in one folder and v1.1.0 in another with different tournament data.

**Q: What if they already have data in the old location?**
A: The app checks multiple locations. Existing data will still work.

**Q: Do they need internet?**
A: No, the app works completely offline once downloaded.

**Q: How big is the download?**
A: ~150-200 MB for the portable exe (includes Electron runtime + assets)

## 🎯 Next Steps

1. **Test the build** locally: `npm run package:win`
2. **Create first release**: Push tag `v1.0.0`
3. **Download and test** from GitHub Releases
4. **Share with users** along with `WINDOWS_RELEASE_README.md`

## 📚 Related Documentation

- `BUILD_GUIDE.md` - Quick reference for building
- `RELEASE.md` - Detailed release instructions
- `WINDOWS_RELEASE_README.md` - User-facing instructions
- `.github/workflows/build.yml` - GitHub Actions config

---

Everything is ready! Just push a tag to create your first release. 🎉
