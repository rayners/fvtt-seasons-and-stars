#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Auto-generate calendar collection or module list from calendars directory
 * Usage: node scripts/generate-calendar-list.js <package-name>
 *
 * For collection packages (fantasy-pack, scifi-pack): generates calendars/index.json
 * For module packages (core, test-module): generates src/generated/calendar-list.ts
 */

const packageName = process.argv[2];
if (!packageName) {
  console.error('Usage: node scripts/generate-calendar-list.js <package-name>');
  process.exit(1);
}

const packageDir = path.join(__dirname, '../packages', packageName);
const calendarsDir = path.join(packageDir, 'calendars');

// Ensure the calendars directory exists
if (!fs.existsSync(calendarsDir)) {
  fs.mkdirSync(calendarsDir, { recursive: true });
}

// Scan the calendars directory for .json files (excluding index.json)
const calendarFiles = fs
  .readdirSync(calendarsDir)
  .filter(file => file.endsWith('.json') && file !== 'index.json')
  .sort();

console.log(`Found ${calendarFiles.length} calendar files in ${packageName}`);

if (packageName === 'fantasy-pack' || packageName === 'scifi-pack' || packageName === 'pf2e-pack') {
  // Generate collection index.json for calendar packs
  generateCollectionIndex();
} else {
  // Generate TypeScript calendar list for modules
  generateModuleCalendarList();
}

function generateCollectionIndex() {
  const indexFile = path.join(calendarsDir, 'index.json');

  // Read calendar files and extract metadata
  const calendars = calendarFiles.map(file => {
    const id = file.replace('.json', '');
    const filePath = path.join(calendarsDir, file);

    try {
      const calendarData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const enTranslation = calendarData.translations?.en || {};

      const packType =
        packageName === 'fantasy-pack'
          ? 'fantasy'
          : packageName === 'scifi-pack'
            ? 'sci-fi'
            : 'pathfinder';
      const packLabel =
        packageName === 'fantasy-pack'
          ? 'fantasy setting'
          : packageName === 'scifi-pack'
            ? 'sci-fi setting'
            : 'Pathfinder 2e';

      return {
        id: id,
        name: enTranslation.label || `${id} Calendar`,
        description: enTranslation.description || `${packType} calendar system for ${id}`,
        file: file,
        preview: `Sample format from ${enTranslation.setting || packLabel}`,
        tags: [
          packType === 'fantasy' ? 'fantasy' : packType === 'sci-fi' ? 'sci-fi' : 'pathfinder',
        ],
        author: 'David Raynes',
      };
    } catch (error) {
      console.warn(`Warning: Could not read calendar file ${file}:`, error.message);
      const packType = packageName === 'fantasy-pack' ? 'fantasy' : 'sci-fi';
      return {
        id: id,
        name: `${id} Calendar`,
        description: `${packType} calendar system for ${id}`,
        file: file,
        preview: 'Preview will be generated from calendar data',
        tags: [
          packType === 'fantasy' ? 'fantasy' : packType === 'sci-fi' ? 'sci-fi' : 'pathfinder',
        ],
        author: 'David Raynes',
      };
    }
  });

  const packName =
    packageName === 'fantasy-pack'
      ? 'Fantasy Calendar Pack'
      : packageName === 'scifi-pack'
        ? 'Sci-Fi Calendar Pack'
        : 'Pathfinder 2e Calendar Pack';
  const packDescription =
    packageName === 'fantasy-pack'
      ? 'Fantasy RPG calendar collection for D&D 5e, Pathfinder, Critical Role, and other fantasy settings'
      : packageName === 'scifi-pack'
        ? 'Science fiction calendar collection for Starfinder, Traveller, Star Trek, and other sci-fi settings'
        : 'Pathfinder 2e calendar and enhanced worldclock integration for Seasons & Stars';

  // Basic collection structure
  const collection = {
    $schema:
      'https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/schemas/calendar-collection-v1.0.0.json',
    name: packName,
    description: packDescription,
    version: '1.0.0',
    calendars: calendars,
  };

  // Write the collection index
  fs.writeFileSync(indexFile, JSON.stringify(collection, null, 2));
  console.log(`Generated collection index with ${calendarFiles.length} calendars`);
  console.log(`Written to: ${indexFile}`);
}

function generateModuleCalendarList() {
  const generatedDir = path.join(packageDir, 'src', 'generated');
  const outputFile = path.join(generatedDir, 'calendar-list.ts');

  // Ensure the generated directory exists
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  // Extract calendar IDs (filename without extension)
  const calendarIds = calendarFiles.map(file => file.replace('.json', ''));

  // Generate TypeScript content
  const content = `/**
 * Auto-generated calendar list
 * 
 * This file is automatically generated by scripts/generate-calendar-list.js
 * Do not edit manually - it will be overwritten on next build
 * 
 * Generated on: ${new Date().toISOString()}
 * Found ${calendarFiles.length} calendar(s): ${calendarIds.join(', ')}
 */

export const BUILT_IN_CALENDARS: string[] = [
${calendarIds.map(id => `  "${id}"`).join(',\n')}
];
`;

  fs.writeFileSync(outputFile, content);
  console.log(`Generated calendar list with ${calendarFiles.length} calendars:`);
  calendarIds.forEach(id => console.log(`  - ${id}`));
  console.log(`Written to: ${outputFile}`);
}
