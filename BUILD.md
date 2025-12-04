# Build and Packaging Guide

This document explains how to build and package the Keyboard Stats Tracker application for different platforms.

## Prerequisites

1. Node.js (v16 or higher)
2. npm (comes with Node.js)
3. All dependencies installed: `npm install`

## Build Scripts

The following npm scripts are available for building and packaging:

### Development Build
```bash
npm run build
```
Compiles TypeScript to JavaScript in the `dist/` directory.

### Run Application
```bash
npm start
```
Builds the application and runs it in development mode.

### Package Without Distribution
```bash
npm run pack
```
Creates an unpacked build in the `release/` directory for testing. This is faster than creating installers and useful for testing the packaged app.

### Create Distribution Packages

#### All Platforms (Current Platform)
```bash
npm run dist
```
Creates distribution packages for the current platform.

#### Windows Only
```bash
npm run dist:win
```
Creates Windows installers:
- NSIS installer (.exe) for x64 and ia32 architectures
- Output: `release/Keyboard Stats Tracker Setup X.X.X.exe`

#### macOS Only
```bash
npm run dist:mac
```
Creates macOS packages:
- DMG image for x64 and arm64 (Apple Silicon) architectures
- Output: `release/Keyboard Stats Tracker-X.X.X.dmg`

**Note:** Building for macOS requires running on a macOS system.

#### Linux Only
```bash
npm run dist:linux
```
Creates Linux packages:
- AppImage (portable, works on most distributions)
- Debian package (.deb) for Ubuntu/Debian-based systems
- Output: 
  - `release/Keyboard Stats Tracker-X.X.X.AppImage`
  - `release/keyboard-stats-tracker_X.X.X_amd64.deb`

## Build Output

All distribution packages are created in the `release/` directory:

```
release/
├── win-unpacked/          # Unpacked Windows build
├── mac/                   # Unpacked macOS build
├── linux-unpacked/        # Unpacked Linux build
├── Keyboard Stats Tracker Setup X.X.X.exe    # Windows installer
├── Keyboard Stats Tracker-X.X.X.dmg          # macOS DMG
├── Keyboard Stats Tracker-X.X.X.AppImage     # Linux AppImage
└── keyboard-stats-tracker_X.X.X_amd64.deb    # Debian package
```

## Platform-Specific Notes

### Windows
- The NSIS installer allows users to choose the installation directory
- Creates desktop and start menu shortcuts
- Supports both 64-bit and 32-bit systems
- No code signing by default (add certificate for production)

### macOS
- Builds universal binaries supporting both Intel and Apple Silicon
- DMG includes drag-to-Applications installation
- No code signing by default (requires Apple Developer account for production)
- May need to allow the app in System Preferences > Security & Privacy on first run

### Linux
- AppImage is portable and doesn't require installation
- Debian package integrates with the system package manager
- May need to make AppImage executable: `chmod +x Keyboard\ Stats\ Tracker-X.X.X.AppImage`

## Testing Builds

### Quick Test (Unpacked)
```bash
npm run pack
```
Then run the unpacked application from `release/[platform]-unpacked/`

### Full Test (With Installer)
```bash
npm run dist
```
Install the generated package and test the full installation experience.

## Troubleshooting

### Build Fails with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Clean and rebuild: `rm -rf dist node_modules && npm install && npm run build`

### Icons Not Showing
- Add proper icon files to the `build/` directory (see `build/README.md`)
- Icons are optional; the app will use default Electron icons if not provided

### Native Module Errors
- Some dependencies (sqlite3, uiohook-napi) use native modules
- electron-builder automatically rebuilds them for the target platform
- If issues persist, try: `npm rebuild`

### Windows Permission Errors During Pack/Dist
If you encounter `EPERM: operation not permitted` errors on Windows:
1. Close any running instances of the application
2. Close any terminals or processes that might be using node_sqlite3.node
3. Run the build command in an elevated (Administrator) PowerShell/CMD
4. Alternative: Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
5. If the issue persists, try building without native module rebuild:
   - Set environment variable: `$env:ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES="true"`
   - Then run: `npm run dist`

### Platform-Specific Builds
- You can only build for the platform you're currently on, with some exceptions:
  - Windows: Can build for Windows only
  - macOS: Can build for macOS and sometimes Linux
  - Linux: Can build for Linux and sometimes Windows (with Wine)

## Production Builds

For production releases, consider:

1. **Code Signing**
   - Windows: Add certificate configuration to package.json
   - macOS: Requires Apple Developer account and certificates
   - Linux: Optional, but recommended for some distributions

2. **Auto-Updates**
   - Configure electron-updater for automatic updates
   - Set up a release server or use GitHub Releases

3. **Version Management**
   - Update version in package.json before building
   - Use semantic versioning (MAJOR.MINOR.PATCH)

4. **Custom Icons**
   - Replace placeholder icons in `build/` directory
   - See `build/README.md` for icon requirements

## CI/CD Integration

Example GitHub Actions workflow for automated builds:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run dist
      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: release/
```

## Size Optimization

The default build includes all dependencies. To reduce size:

1. Review dependencies and remove unused packages
2. Use `electron-builder`'s `asarUnpack` for selective unpacking
3. Consider using `electron-builder`'s compression options

Current estimated sizes:
- Windows installer: ~80-100 MB
- macOS DMG: ~90-110 MB
- Linux AppImage: ~85-105 MB

## Support

For build issues:
- Check electron-builder documentation: https://www.electron.build/
- Review the project's GitHub issues
- Ensure your Node.js and npm versions are up to date
