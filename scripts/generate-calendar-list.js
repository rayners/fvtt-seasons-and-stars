#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Auto-generate calendar collection index.json from calendars directory
 * Usage: node scripts/generate-calendar-list.js <package-name>
 *
 * Reads calendar pack metadata from package.json and generates index.json
 */

const packageName = process.argv[2];
if (!packageName) {
  console.error('Usage: node scripts/generate-calendar-list.js <package-name>');
  process.exit(1);
}

const packageDir = path.join(__dirname, '../packages', packageName);
const packageJsonPath = path.join(packageDir, 'package.json');
const calendarsDir = path.join(packageDir, 'calendars');

// Read package metadata
if (!fs.existsSync(packageJsonPath)) {
  console.error(`Package.json not found: ${packageJsonPath}`);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const packMetadata = packageJson['calendar-pack'];

if (!packMetadata) {
  console.error(`No calendar-pack metadata found in ${packageName}/package.json`);
  process.exit(1);
}

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

// Generate collection index.json
generateCollectionIndex();

function generateCollectionIndex() {
  const indexFile = path.join(calendarsDir, 'index.json');

  // Read calendar files and extract metadata
  const calendars = calendarFiles.map(file => {
    const id = file.replace('.json', '');
    const filePath = path.join(calendarsDir, file);

    try {
      const calendarData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const enTranslation = calendarData.translations?.en || {};

      return {
        id: id,
        name: enTranslation.label || `${id} Calendar`,
        description: enTranslation.description || `${packMetadata.type} calendar system for ${id}`,
        file: file,
        preview: `Sample format from ${enTranslation.setting || packMetadata.name}`,
        tags: packMetadata.tags,
        author: 'David Raynes',
      };
    } catch (error) {
      console.warn(`Warning: Could not read calendar file ${file}:`, error.message);
      return {
        id: id,
        name: `${id} Calendar`,
        description: `${packMetadata.type} calendar system for ${id}`,
        file: file,
        preview: 'Preview will be generated from calendar data',
        tags: packMetadata.tags,
        author: 'David Raynes',
      };
    }
  });

  // Basic collection structure using package metadata
  const collection = {
    $schema:
      'https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/schemas/calendar-collection-v1.0.0.json',
    name: packMetadata.name,
    description: packMetadata.description,
    version: packageJson.version,
    calendars: calendars,
  };

  // Write the collection index
  fs.writeFileSync(indexFile, JSON.stringify(collection, null, 2));
  console.log(`Generated collection index with ${calendarFiles.length} calendars`);
  console.log(`Written to: ${indexFile}`);
}
