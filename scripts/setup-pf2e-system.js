#!/usr/bin/env node

/**
 * Setup Script for Game System Integration Testing
 *
 * This script clones official game system repositories to enable authentic
 * integration testing with real system code. Currently supports PF2e with
 * extensible design for additional systems.
 *
 * The cloned code is used only for testing and is not included in distributions.
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pf2eSystemPath = join(projectRoot, 'test', 'fixtures', 'pf2e-system');

console.log('🔄 Setting up PF2e system for integration testing...');

try {
  // Create test/fixtures directory if it doesn't exist
  const fixturesDir = join(projectRoot, 'test', 'fixtures');
  if (!existsSync(fixturesDir)) {
    mkdirSync(fixturesDir, { recursive: true });
    console.log('📁 Created test/fixtures directory');
  }

  // Remove existing PF2e system if present
  if (existsSync(pf2eSystemPath)) {
    console.log('🗑️  Removing existing PF2e system...');
    rmSync(pf2eSystemPath, { recursive: true, force: true });
  }

  // Shallow clone the PF2e system repository
  console.log('📥 Cloning PF2e system repository (shallow)...');
  execSync(`git clone --depth 1 https://github.com/foundryvtt/pf2e.git "${pf2eSystemPath}"`, {
    stdio: 'inherit',
    cwd: projectRoot,
  });

  // Find world-clock related files in the repository
  console.log('🔍 Searching for world-clock related files...');
  let worldClockFiles = [];

  try {
    const allFiles = execSync('find . -name "*.ts" -type f | grep -i -E "(world|clock|time)"', {
      cwd: pf2eSystemPath,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(f => f);

    worldClockFiles = allFiles;

    if (worldClockFiles.length > 0) {
      console.log('✅ Found PF2e time/clock related files:');
      worldClockFiles.forEach(file => console.log(`   📄 ${file}`));
    } else {
      // Fallback: look for any system files
      console.log('⚠️  No world-clock files found, listing all system files...');
      const systemFiles = execSync('find . -path "*/system/*" -name "*.ts" -type f', {
        cwd: pf2eSystemPath,
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .filter(f => f);

      console.log('📋 Available system files:');
      systemFiles.forEach(file => console.log(`   📄 ${file}`));
    }
  } catch {
    console.warn('⚠️  Could not find specific world-clock files, but clone succeeded');
  }

  console.log('🎉 PF2e system setup complete!');
  console.log('');
  console.log(
    'ℹ️  Note: This code is used only for testing and is excluded from distribution via .gitignore'
  );
} catch (error) {
  console.error('❌ Failed to setup PF2e system:', error.message);
  console.log('');
  console.log('💡 This might be due to:');
  console.log('   - Network connectivity issues');
  console.log('   - Git not being available');
  console.log('   - GitHub rate limiting');
  console.log('');
  console.log('🔄 You can retry by running: npm run setup-pf2e-system');
  process.exit(1);
}
