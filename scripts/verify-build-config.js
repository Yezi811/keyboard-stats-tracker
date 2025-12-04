#!/usr/bin/env node

/**
 * Build Configuration Verification Script
 * 
 * This script verifies that the electron-builder configuration is valid
 * and all required files are in place.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build configuration...\n');

let hasErrors = false;
let hasWarnings = false;

// Check package.json exists and has build config
console.log('✓ Checking package.json...');
try {
  const packageJson = require('../package.json');
  
  if (!packageJson.build) {
    console.error('  ✗ Missing "build" configuration in package.json');
    hasErrors = true;
  } else {
    console.log('  ✓ Build configuration found');
    
    // Check required fields
    if (!packageJson.build.appId) {
      console.error('  ✗ Missing "appId" in build configuration');
      hasErrors = true;
    }
    
    if (!packageJson.build.productName) {
      console.error('  ✗ Missing "productName" in build configuration');
      hasErrors = true;
    }
  }
  
  // Check scripts
  const requiredScripts = ['build', 'pack', 'dist'];
  requiredScripts.forEach(script => {
    if (!packageJson.scripts[script]) {
      console.error(`  ✗ Missing "${script}" script`);
      hasErrors = true;
    }
  });
  
} catch (error) {
  console.error('  ✗ Error reading package.json:', error.message);
  hasErrors = true;
}

// Check if build directory exists
console.log('\n✓ Checking build resources directory...');
const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
  console.error('  ✗ Build directory does not exist');
  hasErrors = true;
} else {
  console.log('  ✓ Build directory exists');
  
  // Check for icon files (warnings only)
  const iconFiles = {
    'icon.ico': 'Windows',
    'icon.icns': 'macOS',
    'icon.png': 'Linux'
  };
  
  Object.entries(iconFiles).forEach(([file, platform]) => {
    const iconPath = path.join(buildDir, file);
    if (!fs.existsSync(iconPath)) {
      console.warn(`  ⚠ Missing ${file} for ${platform} (will use default icon)`);
      hasWarnings = true;
    } else {
      console.log(`  ✓ Found ${file} for ${platform}`);
    }
  });
}

// Check if dist directory exists
console.log('\n✓ Checking compiled output...');
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  console.warn('  ⚠ Dist directory does not exist. Run "npm run build" first.');
  hasWarnings = true;
} else {
  console.log('  ✓ Dist directory exists');
  
  // Check for main entry point
  const mainFile = path.join(distDir, 'main', 'main.js');
  if (!fs.existsSync(mainFile)) {
    console.error('  ✗ Main entry point not found at dist/main/main.js');
    hasErrors = true;
  } else {
    console.log('  ✓ Main entry point found');
  }
}

// Check electron-builder is installed
console.log('\n✓ Checking electron-builder installation...');
try {
  require.resolve('electron-builder');
  console.log('  ✓ electron-builder is installed');
} catch (error) {
  console.error('  ✗ electron-builder is not installed. Run "npm install"');
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Build configuration has errors. Please fix them before building.');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  Build configuration is valid but has warnings.');
  console.log('   You can proceed with building, but consider addressing the warnings.');
  process.exit(0);
} else {
  console.log('✅ Build configuration is valid! Ready to build.');
  process.exit(0);
}
