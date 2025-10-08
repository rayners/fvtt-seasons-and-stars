/**
 * Tests for ApplicationV2 template part rendering requirements
 * Verifies that all template parts always render a single root HTML element
 */

import { describe, it, expect } from 'vitest';
import { CalendarWidget } from '../src/ui/calendar-widget';
import { CalendarMiniWidget } from '../src/ui/calendar-mini-widget';
import { CalendarGridWidget } from '../src/ui/calendar-grid-widget';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ApplicationV2 Template Part Requirements', () => {
  describe('Sidebar template always renders single root element', () => {
    it('should render a single root div element when sidebarButtons is empty', () => {
      const templatePath = join(__dirname, '../templates/calendar-widget-sidebar.hbs');
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(templateSource);

      const html = template({ sidebarButtons: [] });

      const trimmedHtml = html.trim();
      expect(trimmedHtml).toMatch(/^<div[^>]*>/);
      expect(trimmedHtml).toMatch(/<\/div>$/);

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const bodyChildren = Array.from(doc.body.children);

      expect(bodyChildren.length).toBe(1);
      expect(bodyChildren[0].tagName).toBe('DIV');
      expect(bodyChildren[0].classList.contains('sidebar-buttons')).toBe(true);
    });

    it('should render a single root div element when sidebarButtons is undefined', () => {
      const templatePath = join(__dirname, '../templates/calendar-widget-sidebar.hbs');
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(templateSource);

      const html = template({});

      const trimmedHtml = html.trim();
      expect(trimmedHtml).toMatch(/^<div[^>]*>/);
      expect(trimmedHtml).toMatch(/<\/div>$/);

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const bodyChildren = Array.from(doc.body.children);

      expect(bodyChildren.length).toBe(1);
      expect(bodyChildren[0].tagName).toBe('DIV');
    });

    it('should render a single root div element when sidebarButtons has items', () => {
      const templatePath = join(__dirname, '../templates/calendar-widget-sidebar.hbs');
      const templateSource = readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(templateSource);

      const html = template({
        sidebarButtons: [
          {
            name: 'test-button',
            icon: 'fas fa-cog',
            tooltip: 'Test Button',
          },
        ],
      });

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const bodyChildren = Array.from(doc.body.children);

      expect(bodyChildren.length).toBe(1);
      expect(bodyChildren[0].tagName).toBe('DIV');
      expect(bodyChildren[0].classList.contains('sidebar-buttons')).toBe(true);

      const buttons = bodyChildren[0].querySelectorAll('button');
      expect(buttons.length).toBe(1);
    });
  });

  describe('ApplicationV2 template part contract', () => {
    it('should verify CalendarWidget parts are defined with proper structure', () => {
      expect(CalendarWidget.PARTS).toBeDefined();
      expect(CalendarWidget.PARTS.main).toBeDefined();
      expect(CalendarWidget.PARTS.sidebar).toBeDefined();

      expect(CalendarWidget.PARTS.main.template).toBeDefined();
      expect(CalendarWidget.PARTS.sidebar.template).toBeDefined();

      expect(typeof CalendarWidget.PARTS.main.template).toBe('string');
      expect(typeof CalendarWidget.PARTS.sidebar.template).toBe('string');
    });

    it('should verify all widgets have properly configured parts', () => {
      expect(CalendarWidget.PARTS).toBeDefined();
      expect(CalendarMiniWidget.PARTS).toBeDefined();
      expect(CalendarGridWidget.PARTS).toBeDefined();
    });
  });
});
