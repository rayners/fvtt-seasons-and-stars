#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Auto-generate the calendar collection index from the calendars directory
 * This script scans calendars/ and creates/updates index.json
 */

const calendarsDir = path.join(__dirname, '../calendars');
const indexFile = path.join(calendarsDir, 'index.json');

// Ensure the calendars directory exists
if (!fs.existsSync(calendarsDir)) {
  fs.mkdirSync(calendarsDir, { recursive: true });
}

// Scan the calendars directory for .json files (excluding index.json)
const calendarFiles = fs
  .readdirSync(calendarsDir)
  .filter(file => file.endsWith('.json') && file !== 'index.json')
  .sort();

console.log(`Found ${calendarFiles.length} calendar files in sci-fi pack`);

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
      description: enTranslation.description || `Science fiction calendar system for ${id}`,
      file: file,
      preview: `Sample format from ${enTranslation.setting || 'sci-fi setting'}`,
      tags: ['sci-fi'],
      author: 'David Raynes',
    };
  } catch (error) {
    console.warn(`Warning: Could not read calendar file ${file}:`, error.message);
    return {
      id: id,
      name: `${id} Calendar`,
      description: `Science fiction calendar system for ${id}`,
      file: file,
      preview: 'Preview will be generated from calendar data',
      tags: ['sci-fi'],
      author: 'David Raynes',
    };
  }
});

// Basic collection structure for the sci-fi pack
const collection = {
  $schema:
    'https://raw.githubusercontent.com/rayners/fvtt-seasons-and-stars/main/schemas/calendar-collection-v1.0.0.json',
  name: 'Sci-Fi Calendar Pack',
  description:
    'Science fiction calendar collection for Starfinder, Traveller, Star Trek, and other sci-fi settings',
  version: '1.0.0',
  calendars: calendars,
};

// Write the collection index
fs.writeFileSync(indexFile, JSON.stringify(collection, null, 2));

console.log(`Generated collection index with ${calendarFiles.length} calendars`);
console.log(`Written to: ${indexFile}`);
