#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

console.log('🏗️  Building server with esbuild...');

(async () => {
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

    // Build server with esbuild
    console.log('📦 Building server with esbuild...');

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});

    // We want to bundle @api/systeme so it resolves the internal 'api/dist/core' import correctly
    // So we exclude it from the external list.
    // Note: 'api' package (dependency of @api/systeme) will also be bundled since it's not in root dependencies.
    const external = [...dependencies, ...devDependencies].filter(d => d !== '@api/systeme');
    console.log('External count:', external.length);

    const apiResolvePlugin = {
      name: 'api-resolve',
      setup(build) {
        build.onResolve({ filter: /^api\/dist\/core$/ }, args => {
          console.log('🔌 Plugin: Resolving api/dist/core');
          try {
            // Resolve to the actual file
            const resolved = require.resolve('api/dist/core');
            console.log('   ->', resolved);
            return { path: resolved };
          } catch (e) {
            console.error('   -> Failed to resolve:', e.message);
            return null; // Let esbuild handle it (or fail)
          }
        });
      },
    };

    await esbuild.build({
      entryPoints: ['server/index.ts'],
      platform: 'node',
      bundle: true,
      splitting: true,
      format: 'esm',
      outdir: 'dist',
      target: 'es2022',
      tsconfig: 'tsconfig.server.json',
      external: external,
      plugins: [apiResolvePlugin],
      banner: {
        js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
      logLevel: 'info',
    });

    // Create package.json for dist that explicitly sets module type
    console.log('📋 Creating package.json for dist...');

    // Create a new package.json that explicitly sets type to module for ESM
    const distPackage = {
      name: packageJson.name,
      version: packageJson.version,
      type: "module",
      main: "index.js",
      scripts: {
        start: "node index.js"
      },
      dependencies: packageJson.dependencies
    };

    fs.writeFileSync('dist/package.json', JSON.stringify(distPackage, null, 2));

    console.log('✅ Server build complete!');
    console.log('📁 Compiled files are in ./dist/');
    console.log('🚀 Run with: node dist/index.js');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
})();