# Assets Directory Structure

This directory contains all static assets for the tournament manager application.

## Directory Organization

```
assets/
├── logos/           # Tournament logos and watermarks
│   ├── watermark-*.png/jpg     # PDF watermark images
│   └── nametag-*.png/svg       # Logo/symbols for nametags
├── icons/           # Application icons
│   └── app-icon.*             # Main app icon (various formats)
└── README.md        # This file
```

## Usage Guidelines

### Logos (`/logos`)
**Purpose**: Branding elements for tournament documents

**Files to add here**:
- `watermark.png` - Main watermark for PDFs (recommend PNG with transparency)
- `watermark-light.png` - Light version for dark backgrounds
- `nametag-symbol.png` - Symbol/logo for name tags
- `tournament-logo.png` - Full tournament logo

**Recommendations**:
- Use PNG format for transparency support
- Watermarks: 1000-2000px width, medium opacity
- Name tag logos: 200-500px, high resolution for printing
- Keep file sizes reasonable (< 1MB each)

### Icons (`/icons`)
**Purpose**: Application icon and UI elements

**Files to add here**:
- `app-icon.png` - Main app icon (512x512px or larger)
- `app-icon.icns` - macOS icon format
- `app-icon.ico` - Windows icon format
- `app-icon-*.png` - Various sizes (16x16, 32x32, 64x64, 128x128, 256x256, 512x512)

**Recommendations**:
- Square dimensions (1:1 aspect ratio)
- Multiple sizes for different contexts
- Use PNG with transparency

## How to Use in Code

### Import in Components (PNG/JPG/SVG)
```typescript
import watermarkLogo from '@/assets/logos/watermark.png';
import appIcon from '@/assets/icons/app-icon.png';

// Use in component
<img src={watermarkLogo} alt="Tournament Logo" />
```

### For PDF Generation
```typescript
import watermarkImage from '@/assets/logos/watermark.png';

// In PDF generator utilities
doc.addImage(watermarkImage, 'PNG', x, y, width, height, undefined, 'FAST');
```

### For Electron App Icon
Update `package.json` build configuration:
```json
"build": {
  "appId": "com.tournament.manager",
  "icon": "src/renderer/assets/icons/app-icon"
}
```

## File Formats

| Asset Type | Recommended Format | Alternative Formats |
|------------|-------------------|---------------------|
| Watermarks | PNG (transparency) | JPG, SVG |
| Name Tags | PNG, SVG | JPG |
| App Icon | PNG | ICNS (Mac), ICO (Windows) |

## Current Watermark System

The app currently stores watermark images in the config via base64 encoding. 
To use a logo from this directory:

1. Add your logo file to `/logos`
2. Import it in the component that sets watermarks
3. Convert to base64 or use directly based on your PDF library

Example:
```typescript
import defaultWatermark from '@/assets/logos/watermark.png';

// Set as default watermark
updateConfig({ watermarkImage: defaultWatermark });
```

## Notes

- Assets in this directory are bundled with the app by Vite
- Keep total asset size reasonable to avoid large bundle sizes
- Consider lazy loading for large images
- All assets are version-controlled in git
- Images should be optimized before adding (use tools like TinyPNG, ImageOptim)

## Path Aliases

If using TypeScript path aliases, you can reference assets like:
```typescript
import logo from '@/assets/logos/watermark.png';
```

Otherwise use relative paths:
```typescript
import logo from '../assets/logos/watermark.png';
```
