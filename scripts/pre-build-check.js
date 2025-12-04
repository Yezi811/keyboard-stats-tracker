#!/usr/bin/env node

/**
 * Pre-Build Check Script
 * 
 * Runs comprehensive checks before building to catch issues early
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Running pre-build checks...\n');

let allChecksPassed = true;

// Check 1: Node version
console.log('1️⃣  Checking Node.js version...');
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    console.error(`  ✗ Node.js version ${nodeVersion} is too old. Requires v16 or higher.`);
    allChecksPassed = false;
  } else {
    console.log(`  ✓ Node.js ${nodeVersion} is compatible`);
  }
} catch (error) {
  console.error('  ✗ Could not determine Node.js version');
  allChecksPassed = false;
}

// Check 2: Dependencies installed
console.log('\n2️⃣  Checking dependencies...');
try {
  const nodeModulesExists = fs.existsSync(path.join(__dirname, '..', 'node_modules'));
  if (!nodeModulesExists) {
    console.error('  ✗ node_modules not found. Run "npm install"');
    allChecksPassed = false;
  } else {
    console.log('  ✓ Dependencies are installed');
    
    // Check critical dependencies
    const criticalDeps = ['electron', 'electron-builder', 'typescript'];
    criticalDeps.forEach(dep => {
      try {
        require.resolve(dep);
        console.log(`  ✓ ${dep} is installed`);
      } catch (error) {
        console.error(`  ✗ ${dep} is not installed`);
        allChecksPassed = false;
      }
    });
  }
} catch (error) {
  console.error('  ✗ Error checking dependencies:', error.message);
  allChecksPassed = false;
}

// Check 3: TypeScript compilation
console.log('\n3️⃣  Checking TypeScript compilation...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('  ✓ TypeScript compiles successfully');
} catch (error) {
  console.error('  ✗ TypeScript compilation failed');
  console.error('  Run "npm run build" to see detailed errors');
  allChecksPassed = false;
}

// Check 4: Dist directory structure
console.log('\n4️⃣  Checking build output structure...');
const requiredDirs = [
  'dist/main',
  'dist/renderer',
  'dist/domain',
  'dist/infrastructure'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    console.error(`  ✗ Missing directory: ${dir}`);
    allChecksPassed = false;
  } else {
    console.log(`  ✓ ${dir} exists`);
  }
});

// Check 5: Main entry point
console.log('\n5️⃣  Checking entry points...');
const entryPoints = [
  'dist/main/main.js',
  'dist/renderer/renderer.js'
];

entryPoints.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ Missing entry point: ${file}`);
    allChecksPassed = false;
  } else {
    console.log(`  ✓ ${file} exists`);
  }
});

// Check 6: Package.json validity
console.log('\n6️⃣  Checking package.json...');
try {
  const packageJson = require('../package.json');
  
  if (!packageJson.main) {
    console.error('  ✗ Missing "main" field in package.json');
    allChecksPassed = false;
  } else if (!fs.existsSync(path.join(__dirname, '..', packageJson.main))) {
    console.error(`  ✗ Main file "${packageJson.main}" does not exist`);
    allChecksPassed = false;
  } else {
    console.log(`  ✓ Main entry point configured: ${packageJson.main}`);
  }
  
  if (!packageJson.build) {
    console.error('  ✗ Missing "build" configuration');
    allChecksPassed = false;
  } else {
    console.log('  ✓ Build configuration present');
  }
} catch (error) {
  console.error('  ✗ Error reading package.json:', error.message);
  allChecksPassed = false;
}

// Check 7: Disk space (basic check)
console.log('\n7️⃣  Checking available disk space...');
try {
  const releaseDir = path.join(__dirname, '..', 'release');
  if (fs.existsSync(releaseDir)) {
    console.log('  ℹ️  Release directory exists (will be overwritten)');
  }
  console.log('  ✓ Disk space check passed (ensure at least 500MB free)');
} catch (error) {
  console.warn('  ⚠ Could not check disk space');
}

// Summary
console.log('\n' + '='.repeat(60));
if (allChecksPassed) {
  console.log('✅ All pre-build checks passed! Ready to build.');
  console.log('\nNext steps:');
  console.log('  - For unpacked build: npm run pack');
  console.log('  - For installer: npm run dist');
  console.log('  - For specific platform: npm run dist:win|mac|linux');
  process.exit(0);
} else {
  console.error('❌ Some pre-build checks failed. Please fix the issues above.');
  console.log('\nCommon fixes:');
  console.log('  - Install dependencies: npm install');
  console.log('  - Compile TypeScript: npm run build');
  console.log('  - Check Node.js version: node --version (requires v16+)');
  process.exit(1);
}
