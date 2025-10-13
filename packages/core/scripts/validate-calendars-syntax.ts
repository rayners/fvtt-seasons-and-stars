#!/usr/bin/env tsx

/**
 * Lightweight Calendar Syntax Validation Script for CI
 *
 * Performs basic JSON syntax validation without comprehensive content validation.
 * For full validation including source verification, use validate-calendars.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate JSON syntax in a specific directory
 */
function validateJsonSyntaxInDirectory(
  calendarsDir: string,
  dirName: string
): { valid: number; invalid: number; total: number } {
  let totalCalendars = 0;
  let validCalendars = 0;
  let invalidCalendars = 0;

  console.log(`📂 Checking JSON syntax in ${dirName}...`);

  try {
    const files = fs
      .readdirSync(calendarsDir)
      .filter(file => file.endsWith('.json') && file !== 'index.json');

    if (files.length === 0) {
      console.log(`   ℹ️  No calendar files found in ${dirName}`);
      return { valid: 0, invalid: 0, total: 0 };
    }

    for (const file of files) {
      totalCalendars++;
      const filePath = path.join(calendarsDir, file);

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        console.log(`   ✅ ${file}`);
        validCalendars++;
      } catch (parseError: any) {
        console.log(`   ❌ ${file}: JSON SYNTAX ERROR`);
        console.log(`      ❌ ${parseError.message}`);
        invalidCalendars++;
      }
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading ${dirName} directory: ${error.message}`);
    return { valid: 0, invalid: invalidCalendars, total: totalCalendars };
  }

  return { valid: validCalendars, invalid: invalidCalendars, total: totalCalendars };
}

/**
 * Main syntax validation function
 */
function validateAllCalendarsSyntax(): void {
  const rootDir = path.join(__dirname, '..', '..', '..');

  console.log('🗓️  Validating JSON syntax for all calendar files...\n');

  let totalCalendars = 0;
  let validCalendars = 0;
  let invalidCalendars = 0;

  // Define calendar directories to check
  const calendarDirs = [
    { path: path.join(rootDir, 'packages', 'core', 'calendars'), name: 'core' },
    { path: path.join(rootDir, 'packages', 'fantasy-pack', 'calendars'), name: 'fantasy-pack' },
    { path: path.join(rootDir, 'packages', 'scifi-pack', 'calendars'), name: 'scifi-pack' },
    { path: path.join(rootDir, 'packages', 'pf2e-pack', 'calendars'), name: 'pf2e-pack' },
  ];

  // Validate calendars in each directory
  for (const dir of calendarDirs) {
    if (fs.existsSync(dir.path)) {
      const result = validateJsonSyntaxInDirectory(dir.path, dir.name);
      totalCalendars += result.total;
      validCalendars += result.valid;
      invalidCalendars += result.invalid;
    } else {
      console.log(`   ⚠️  Directory ${dir.name} does not exist: ${dir.path}`);
    }
  }

  console.log();

  // Summary
  console.log('\n📊 SYNTAX VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total calendars: ${totalCalendars}`);
  console.log(`Valid JSON syntax: ${validCalendars}`);
  console.log(`Invalid JSON syntax: ${invalidCalendars}`);
  console.log(`Success rate: ${Math.round((validCalendars / totalCalendars) * 100)}%`);

  if (invalidCalendars > 0) {
    console.log('\n❌ Calendar JSON syntax validation failed');
    process.exit(1);
  } else {
    console.log('\n✅ All calendar JSON files have valid syntax!');
    process.exit(0);
  }
}

// Run the validation
try {
  validateAllCalendarsSyntax();
} catch (error) {
  console.error('❌ Syntax validation script failed:', error);
  process.exit(1);
}
