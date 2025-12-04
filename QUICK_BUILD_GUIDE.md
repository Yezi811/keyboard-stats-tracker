# Quick Build Guide

## TL;DR - Build Commands

```bash
# 1. Verify configuration
npm run verify-build

# 2. Build TypeScript
npm run build

# 3. Create installer for your platform
npm run dist

# Output will be in: release/
```

## Step-by-Step

### First Time Setup
1. Install dependencies: `npm install`
2. Verify build config: `npm run verify-build`

### Development
```bash
npm run build    # Compile TypeScript
npm start        # Run the app
```

### Testing Package (Fast)
```bash
npm run pack     # Creates unpacked build in release/
```

### Creating Installers

#### Current Platform
```bash
npm run dist
```

#### Specific Platform
```bash
npm run dist:win     # Windows NSIS installer
npm run dist:mac     # macOS DMG
npm run dist:linux   # Linux AppImage + DEB
```

## Output Location

All builds go to `release/` directory:
- Windows: `Keyboard Stats Tracker Setup X.X.X.exe`
- macOS: `Keyboard Stats Tracker-X.X.X.dmg`
- Linux: `Keyboard Stats Tracker-X.X.X.AppImage` and `.deb`

## Common Issues

### "EPERM: operation not permitted" on Windows
- Close all running instances of the app
- Run in Administrator mode
- Or delete `node_modules` and reinstall

### Missing Icons
- Icons are optional - app will use default Electron icon
- To add custom icons, see `build/README.md`

### Build Fails
1. Ensure TypeScript compiles: `npm run build`
2. Check configuration: `npm run verify-build`
3. Reinstall dependencies: `rm -rf node_modules && npm install`

## Platform Requirements

- **Windows builds**: Can only be created on Windows
- **macOS builds**: Can only be created on macOS
- **Linux builds**: Can be created on Linux (and sometimes macOS)

## Size Expectations

- Windows installer: ~80-100 MB
- macOS DMG: ~90-110 MB
- Linux AppImage: ~85-105 MB

## For More Details

See `BUILD.md` for comprehensive documentation.
