# Build Resources

This directory contains resources needed for building the application installers.

## Icon Files

To properly package the application, you need to provide icon files for each platform:

### Windows (icon.ico)
- Format: ICO file
- Recommended sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- Tool: You can use online converters or tools like GIMP to create .ico files

### macOS (icon.icns)
- Format: ICNS file
- Recommended sizes: 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- Tool: Use `iconutil` on macOS or online converters

### Linux (icon.png)
- Format: PNG file
- Recommended size: 512x512 or 1024x1024
- Transparent background recommended

## Creating Icons

1. Create a high-resolution square image (at least 1024x1024) with your app logo
2. Use online tools or desktop applications to convert to the required formats:
   - Windows: https://convertio.co/png-ico/
   - macOS: Use `iconutil` command-line tool or online converters
   - Linux: Simply save as PNG at the recommended size

## Placeholder Icons

Currently, the build configuration references these icon files. If they don't exist, electron-builder will use default Electron icons. To use custom icons, replace the placeholder files with your actual icon files.

## Note

The application will build successfully even without custom icons - it will just use the default Electron icon. Add your custom icons here when you're ready to create production builds.
