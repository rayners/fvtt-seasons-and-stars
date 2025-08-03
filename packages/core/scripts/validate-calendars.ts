#!/usr/bin/env tsx

/**
 * Calendar Validation Script
 *
 * Validates all built-in calendar JSON files using the existing CalendarValidator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CalendarValidator } from '../src/core/calendar-validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate calendars in a specific directory
 */
async function validateCalendarsInDirectory(
  calendarsDir: string,
  dirName: string
): Promise<{ valid: number; invalid: number; total: number }> {
  let totalCalendars = 0;
  let validCalendars = 0;
  let invalidCalendars = 0;

  console.log(`📂 Validating calendars in ${dirName}...`);

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
        const calendarData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const result = await CalendarValidator.validate(calendarData);

        if (result.isValid) {
          console.log(`   ✅ ${file}`);
          if (result.warnings.length > 0) {
            result.warnings.forEach(warning => {
              console.log(`      ⚠️  ${warning}`);
            });
          }
          validCalendars++;
        } else {
          console.log(`   ❌ ${file}`);
          result.errors.forEach(error => {
            console.log(`      ❌ ${error}`);
          });
          if (result.warnings.length > 0) {
            result.warnings.forEach(warning => {
              console.log(`      ⚠️  ${warning}`);
            });
          }
          invalidCalendars++;
        }
      } catch (parseError: any) {
        console.log(`   ❌ ${file}: JSON PARSE ERROR`);
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
 * Main validation function
 */
async function validateAllCalendars(): Promise<void> {
  const rootDir = path.join(__dirname, '..', '..', '..');

  console.log('🗓️  Validating all calendars in core and packs using CalendarValidator...\n');

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
      const result = await validateCalendarsInDirectory(dir.path, dir.name);
      totalCalendars += result.total;
      validCalendars += result.valid;
      invalidCalendars += result.invalid;
    } else {
      console.log(`   ⚠️  Directory ${dir.name} does not exist: ${dir.path}`);
    }
  }

  console.log();

  // Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total calendars: ${totalCalendars}`);
  console.log(`Valid calendars: ${validCalendars}`);
  console.log(`Invalid calendars: ${invalidCalendars}`);
  console.log(`Success rate: ${Math.round((validCalendars / totalCalendars) * 100)}%`);

  if (invalidCalendars > 0) {
    console.log('\n❌ Calendar validation failed');
    process.exit(1);
  } else {
    console.log('\n✅ All calendars are valid!');
    process.exit(0);
  }
}

// Run the validation
validateAllCalendars().catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
