# App Icon Configuration

## Current Setup

The application icon is configured to use `logo.png` from the assets directory.

### Icon Location
- **Source**: `src/renderer/assets/logos/logo.png`
- **Icon File**: `src/renderer/assets/icons/app-icon.png` (copy of logo.png)
- **Configuration**: `package.json` build section

### Configuration in package.json

```json
"build": {
  "icon": "src/renderer/assets/icons/app-icon.png"
}
```

This setting is used by `electron-builder` when packaging the application.

## How It Works

When you run `npm run package`, electron-builder will:

1. Read the icon from `src/renderer/assets/icons/app-icon.png`
2. Automatically generate platform-specific formats:
   - **macOS**: `.icns` file for the app bundle
   - **Windows**: `.ico` file for the executable
   - **Linux**: PNG files for various sizes

## Icon Requirements

### Current Icon
- **File**: `logo.png`
- **Format**: PNG
- **Recommended Size**: 512x512 or 1024x1024 pixels (square)
- **Background**: Should work on both light and dark backgrounds

### Best Practices
- Use PNG format with transparency
- Square dimensions (1:1 aspect ratio)
- High resolution (at least 512x512, ideally 1024x1024)
- Simple, recognizable design
- Works well at small sizes (16x16) and large sizes

## Updating the Icon

To change the app icon:

1. **Replace the file**: 
   ```bash
   cp /path/to/new-icon.png src/renderer/assets/icons/app-icon.png
   ```

2. **Or update both locations**:
   ```bash
   cp /path/to/new-icon.png src/renderer/assets/logos/logo.png
   cp /path/to/new-icon.png src/renderer/assets/icons/app-icon.png
   ```

3. **Rebuild and package**:
   ```bash
   npm run build
   npm run package
   ```

## Platform-Specific Icons (Optional)

If you need different icons per platform:

```json
"build": {
  "mac": {
    "icon": "src/renderer/assets/icons/mac-icon.icns"
  },
  "win": {
    "icon": "src/renderer/assets/icons/win-icon.ico"
  },
  "linux": {
    "icon": "src/renderer/assets/icons/linux-icon.png"
  }
}
```

## Generating Platform Icons

You can use online tools or command-line utilities to generate platform-specific formats:

### Tools
- **iconutil** (macOS) - Built-in tool for creating .icns files
- **ImageMagick** - Cross-platform image conversion
- **electron-icon-builder** - npm package for generating all formats
- **Online**: https://cloudconvert.com/png-to-icns (PNG to ICNS)
- **Online**: https://cloudconvert.com/png-to-ico (PNG to ICO)

### Using electron-icon-builder (Recommended)

```bash
npm install --save-dev electron-icon-builder

# Add to package.json scripts:
"icon": "electron-icon-builder --input=src/renderer/assets/icons/app-icon.png --output=build"
```

## Verifying Icon Setup

1. **During Development**: Icon won't show in `npm start`, that's normal
2. **After Packaging**: Icon will appear in the packaged app
3. **Test Package**:
   ```bash
   npm run package
   # Check release/ directory for packaged app
   ```

## Current Status

✅ Icon configured in package.json  
✅ app-icon.png copied from logo.png  
✅ Ready for packaging  
✅ Will auto-generate platform formats  

The icon is ready to use when you run `npm run package`!
