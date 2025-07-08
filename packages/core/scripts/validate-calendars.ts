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
 * Main validation function
 */
async function validateAllCalendars(): Promise<void> {
  const calendarsDir = path.join(__dirname, '..', 'calendars');

  console.log('🗓️  Validating all built-in calendars using CalendarValidator...\n');

  let totalCalendars = 0;
  let validCalendars = 0;
  let invalidCalendars = 0;

  try {
    const files = fs.readdirSync(calendarsDir).filter(file => file.endsWith('.json'));

    if (files.length === 0) {
      console.log('❌ No calendar files found in calendars directory');
      process.exit(1);
    }

    for (const file of files) {
      totalCalendars++;
      const filePath = path.join(calendarsDir, file);

      try {
        const calendarData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const result = await CalendarValidator.validate(calendarData);

        if (result.isValid) {
          console.log(`✅ ${file}`);
          if (result.warnings.length > 0) {
            result.warnings.forEach(warning => {
              console.log(`   ⚠️  ${warning}`);
            });
          }
          validCalendars++;
        } else {
          console.log(`❌ ${file}`);
          result.errors.forEach(error => {
            console.log(`   ❌ ${error}`);
          });
          if (result.warnings.length > 0) {
            result.warnings.forEach(warning => {
              console.log(`   ⚠️  ${warning}`);
            });
          }
          invalidCalendars++;
        }
      } catch (parseError: any) {
        console.log(`❌ ${file}: JSON PARSE ERROR`);
        console.log(`   ❌ ${parseError.message}`);
        invalidCalendars++;
      }
    }
  } catch (error: any) {
    console.error(`❌ Error reading calendars directory: ${error.message}`);
    process.exit(1);
  }

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
