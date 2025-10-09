/**
 * Tests for calendar-widget-sidebar.hbs template
 * Verifies that the sidebar template always renders a single HTML element
 * as required by Foundry ApplicationV2
 */

import { describe, it, expect } from 'vitest';
import Handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';

describe('calendar-widget-sidebar template', () => {
  let template: Handlebars.TemplateDelegate;

  // Load and compile the sidebar template
  const templatePath = path.join(__dirname, '../templates/calendar-widget-sidebar.hbs');
  const source = fs.readFileSync(templatePath, 'utf8');
  template = Handlebars.compile(source);

  it('renders a single root element when sidebarButtons is empty', () => {
    const context = {
      sidebarButtons: [],
    };

    const html = template(context);
    const trimmed = html.trim();

    // Should start with opening div and end with closing div
    expect(trimmed).toMatch(/^<div class="sidebar-buttons">/);
    expect(trimmed).toMatch(/<\/div>$/);

    // Parse to verify it's valid HTML with single root
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const rootElements = doc.body.children;

    // Must have exactly one root element
    expect(rootElements.length).toBe(1);
    expect(rootElements[0].tagName).toBe('DIV');
    expect(rootElements[0].className).toBe('sidebar-buttons');
  });

  it('renders a single root element when sidebarButtons is undefined', () => {
    const context = {};

    const html = template(context);
    const trimmed = html.trim();

    // Should render the div wrapper even with no data
    expect(trimmed).toMatch(/^<div class="sidebar-buttons">/);
    expect(trimmed).toMatch(/<\/div>$/);

    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const rootElements = doc.body.children;

    expect(rootElements.length).toBe(1);
    expect(rootElements[0].tagName).toBe('DIV');
  });

  it('renders a single root element with buttons when sidebarButtons has items', () => {
    const context = {
      sidebarButtons: [
        { name: 'test1', icon: 'fas fa-test', tooltip: 'Test 1' },
        { name: 'test2', icon: 'fas fa-test2', tooltip: 'Test 2' },
      ],
    };

    const html = template(context);
    const trimmed = html.trim();

    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const rootElements = doc.body.children;

    // Must have exactly one root element
    expect(rootElements.length).toBe(1);
    expect(rootElements[0].tagName).toBe('DIV');
    expect(rootElements[0].className).toBe('sidebar-buttons');

    // Should contain the buttons as children
    const buttons = rootElements[0].querySelectorAll('button.sidebar-button');
    expect(buttons.length).toBe(2);
  });

  it('renders button elements with correct data attributes', () => {
    const context = {
      sidebarButtons: [{ name: 'openNotes', icon: 'fas fa-book', tooltip: 'Open Notes' }],
    };

    const html = template(context);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const button = doc.querySelector('button.sidebar-button');
    expect(button).toBeTruthy();
    expect(button?.getAttribute('data-action')).toBe('clickSidebarButton');
    expect(button?.getAttribute('data-button-name')).toBe('openNotes');
    expect(button?.getAttribute('title')).toBe('Open Notes');
  });

  it('never renders zero elements (regression test for #344)', () => {
    // This is the specific bug that was fixed:
    // When sidebarButtons was empty/undefined, the old template with
    // {{#if sidebarButtons.length}} would render nothing, causing
    // ApplicationV2 to throw: "Template part 'sidebar' must render a single HTML element"

    const testCases = [
      { sidebarButtons: [] },
      { sidebarButtons: undefined },
      {},
      { sidebarButtons: null },
    ];

    testCases.forEach((context, index) => {
      const html = template(context as any);
      const parser = new DOMParser();
      const doc = parser.parseFromString(html.trim(), 'text/html');
      const rootElements = doc.body.children;

      expect(rootElements.length, `Test case ${index} should render exactly 1 element`).toBe(1);
    });
  });
});
