# Windows Installer Build - Complete Setup Summary

## ✅ What's Configured

### 1. Build Configuration (`package.json`)
- **NSIS installer** for professional Windows installation
- **All assets bundled** (logos, icons automatically included)
- **Product name**: TournamentManager
- **Artifact naming** configured for clear version tracking

### 2. GitHub Actions (`.github/workflows/build.yml`)
- **Automatic builds** when you push a version tag
- **Windows-only** builds (on `windows-latest` runner)
- **Installer uploaded** to GitHub Releases automatically
- **Trigger**: Push a tag like `v1.0.0`

### 3. Data Storage (`src/main/index.ts`)
- **AppData location**: `C:\Users\[Username]\AppData\Roaming\TournamentManager\`
- **Automatic folder creation** on first run
- **Persistent across updates**
- **Standard Windows app data location**

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

# 5. Download file:
# - TournamentManager-Setup-1.0.0.exe
```

## 📦 What Users Get

### Downloads:
1. **`TournamentManager-Setup-1.0.0.exe`**
   - Windows installer
   - ~150-200 MB
   - All assets included
   - Creates Start Menu and Desktop shortcuts

### User Instructions:
Give them `WINDOWS_RELEASE_README.md` which explains:
- Download and run installer
- Choose installation location
- Where data is saved
- How to export/import tournament data

## 📁 File Structure After Installation

```
Installation:
C:\Program Files\TournamentManager\
├── TournamentManager.exe           ← The application
├── resources\
└── ... (other app files)

User Data:
C:\Users\[Username]\AppData\Roaming\TournamentManager\
├── tournament-autosave.json       ← Tournament data
└── backups\                       ← Automatic backups
    └── backup-*.json
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

### Using Built-in Export/Import:
1. Open the app and go to Data Viewer tab
2. Click "Export Database" to save a JSON file
3. Send this file to others
4. They click "Load Database" and select the file
5. Data is imported automatically

### Direct File Access:
1. Navigate to: `%APPDATA%\TournamentManager\`
2. Find `tournament-autosave.json`
3. Copy and share this file

## 🧪 Testing Locally

Before creating a release, test the Windows build:

```bash
# Build for Windows (can run on Linux/Mac with electron-builder)
npm run package:win

# Output will be in release/
ls release/

# Install and verify:
# - Installer runs correctly
# - App installs to Program Files
# - Data saves to AppData
# - Data loads on restart
# - Logos display correctly
# - Uninstaller works
```

## ❓ Common Questions

**Q: Why use an installer instead of portable?**
A: Installers provide a more professional experience with automatic updates, proper uninstall, and standard Windows integration.

**Q: Will updates preserve data?**
A: Yes! Data is stored separately in AppData, so updates won't affect tournament data.

**Q: Can they have multiple installations?**
A: No, the installer updates the existing installation. Use export/import to manage multiple tournaments.

**Q: What if they want to move to another computer?**
A: Export the tournament data from one computer and import it on the other.

**Q: Do they need internet?**
A: No, the app works completely offline once installed.

**Q: How big is the download?**
A: ~150-200 MB for the installer (includes Electron runtime + assets)

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
