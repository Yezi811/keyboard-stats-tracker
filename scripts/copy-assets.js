// Copy non-TypeScript assets to dist directory after build
const fs = require('fs');
const path = require('path');

// Ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Copy file
function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

// Files to copy
const filesToCopy = [
  // Infrastructure
  { src: 'src/infrastructure/schema.sql', dest: 'dist/infrastructure/schema.sql' },
  
  // Renderer
  { src: 'src/renderer/index.html', dest: 'dist/renderer/index.html' },
  { src: 'src/renderer/styles.css', dest: 'dist/renderer/styles.css' }
];

// Copy assets folder if it exists
const assetsDir = 'assets';
if (fs.existsSync(assetsDir)) {
  const destAssetsDir = 'dist/assets';
  ensureDir(destAssetsDir);
  
  const files = fs.readdirSync(assetsDir);
  files.forEach(file => {
    const srcPath = path.join(assetsDir, file);
    const destPath = path.join(destAssetsDir, file);
    if (fs.statSync(srcPath).isFile()) {
      filesToCopy.push({ src: srcPath, dest: destPath });
    }
  });
}

// Copy all files
console.log('Copying asset files...');
filesToCopy.forEach(({ src, dest }) => {
  try {
    copyFile(src, dest);
  } catch (error) {
    console.error(`Failed to copy ${src}:`, error.message);
    process.exit(1);
  }
});

console.log('Asset files copied successfully!');
