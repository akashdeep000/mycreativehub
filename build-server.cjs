#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building server with esbuild...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  
  // Ensure dist directory exists
  fs.mkdirSync('dist', { recursive: true });
  
  // Build frontend first
  console.log('📦 Building frontend...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Build server with esbuild but with different settings to avoid dynamic require issues
  console.log('📦 Building server with esbuild...');
  execSync(`esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --target=es2022 --tsconfig=tsconfig.server.json`, { stdio: 'inherit' });
  
  // Create package.json for dist that explicitly sets module type
  console.log('📋 Creating package.json for dist...');
  const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Create a new package.json that explicitly sets type to module for ESM
  const distPackage = {
    name: originalPackage.name,
    version: originalPackage.version,
    type: "module",
    main: "index.js",
    scripts: {
      start: "node index.js"
    },
    dependencies: originalPackage.dependencies
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(distPackage, null, 2));
  
  console.log('✅ Server build complete!');
  console.log('📁 Compiled files are in ./dist/');
  console.log('🚀 Run with: node dist/index.js');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}