# Asset Organization Quick Reference

## 📁 Directory Structure

```
src/renderer/assets/
├── logos/                    # Tournament branding
│   ├── watermark.png        # PDF watermark (1000-2000px wide)
│   ├── nametag-symbol.png   # Name tag logo (200-500px)
│   └── tournament-logo.png  # Full tournament logo
├── icons/                    # Application icons
│   ├── app-icon.png         # Main app icon (512x512+)
│   ├── app-icon.icns        # macOS format
│   └── app-icon.ico         # Windows format
├── README.md                 # Detailed documentation
└── USAGE_EXAMPLES.md         # Code examples
```

## 🎯 Where to Put Your Files

### PDF Watermarks
**Location**: `src/renderer/assets/logos/`
**Files**: 
- `watermark.png` - Main watermark
- `watermark-light.png` - For dark backgrounds (optional)

**Format**: PNG with transparency recommended
**Size**: 1000-2000px width, medium opacity (~30-50%)

### Name Tag Symbols
**Location**: `src/renderer/assets/logos/`
**Files**:
- `nametag-symbol.png` or `nametag-symbol.svg`
- `school-logo.png` (if needed)

**Format**: PNG or SVG
**Size**: 200-500px (high resolution for printing)

### App Icon
**Location**: `src/renderer/assets/icons/`
**Files**:
- `app-icon.png` - Main icon (512x512 or 1024x1024)
- `app-icon.icns` - macOS bundle (generated from PNG)
- `app-icon.ico` - Windows executable (generated from PNG)

**Format**: PNG with transparency, square (1:1 ratio)
**Sizes**: Multiple sizes needed (16, 32, 64, 128, 256, 512)

## 🚀 Quick Start

1. **Add your files** to the appropriate directories
2. **Import in your code**:
   ```typescript
   import watermark from '@/assets/logos/watermark.png';
   ```
3. **Use in components or PDF generators**

## 📝 Common Use Cases

### Use Case 1: Set a default watermark
**File to edit**: `src/renderer/components/Configuration.tsx`
```typescript
import defaultWatermark from '@/assets/logos/watermark.png';
```

### Use Case 2: Add logo to name tags
**File to edit**: `src/renderer/utils/pdfGenerators/nameTags.ts`
```typescript
import logo from '@/assets/logos/nametag-symbol.png';
doc.addImage(logo, 'PNG', x, y, width, height);
```

### Use Case 3: Set app icon (Electron)
**File to edit**: `package.json`
```json
"build": {
  "icon": "src/renderer/assets/icons/app-icon"
}
```

## 💡 Tips

- ✅ Use PNG for logos with transparency
- ✅ Keep files under 1MB each
- ✅ Optimize images before adding (TinyPNG, ImageOptim)
- ✅ Use SVG for scalable icons when possible
- ✅ Test watermarks at different opacities (30-50% works well)
- ✅ Name tags need high resolution for printing (300 DPI)

## 🔗 Related Files

- See `README.md` for detailed documentation
- See `USAGE_EXAMPLES.md` for code examples
- PDF generators: `src/renderer/utils/pdfGenerators/`
- Configuration: `src/renderer/components/Configuration.tsx`
