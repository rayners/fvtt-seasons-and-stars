/**
 * Tests for sidebar-button-mixin
 * Mixin functions integrate widgets with the global button registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SidebarButtonRegistry } from '../src/ui/sidebar-button-registry';
import {
  addSidebarButton,
  removeSidebarButton,
  hasSidebarButton,
  loadButtonsFromRegistry,
} from '../src/ui/sidebar-button-mixin';
import type { SidebarButtonConfig } from '../src/ui/sidebar-button-registry';

describe('sidebar-button-mixin', () => {
  let mockWidget: any;
  let registry: SidebarButtonRegistry;
  let renderCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear singleton for clean tests
    (SidebarButtonRegistry as any).instance = null;
    registry = SidebarButtonRegistry.getInstance();

    // Create mock widget
    mockWidget = {
      element: document.createElement('div'),
      rendered: true,
    };

    // Create render callback spy
    renderCallback = vi.fn();
  });

  describe('addSidebarButton', () => {
    it('should register button in global registry', () => {
      const config: SidebarButtonConfig = {
        name: 'test-button',
        icon: 'fas fa-star',
        tooltip: 'Test',
        callback: vi.fn(),
      };

      addSidebarButton(mockWidget, 'main', config);

      expect(registry.has('test-button')).toBe(true);
    });

    it('should trigger widget render callback', () => {
      const config: SidebarButtonConfig = {
        name: 'callback-test',
        icon: 'fas fa-check',
        tooltip: 'Callback Test',
        callback: vi.fn(),
      };

      addSidebarButton(mockWidget, 'main', config, renderCallback);

      expect(renderCallback).toHaveBeenCalledTimes(1);
    });

    it('should not trigger callback when not provided', () => {
      const config: SidebarButtonConfig = {
        name: 'no-callback',
        icon: 'fas fa-ban',
        tooltip: 'No Callback',
        callback: vi.fn(),
      };

      expect(() => {
        addSidebarButton(mockWidget, 'main', config);
      }).not.toThrow();
    });

    it('should register button with widget type context', () => {
      const mainConfig: SidebarButtonConfig = {
        name: 'main-button',
        icon: 'fas fa-home',
        tooltip: 'Main Widget',
        callback: vi.fn(),
      };

      const miniConfig: SidebarButtonConfig = {
        name: 'mini-button',
        icon: 'fas fa-compress',
        tooltip: 'Mini Widget',
        callback: vi.fn(),
      };

      addSidebarButton(mockWidget, 'main', mainConfig);
      addSidebarButton(mockWidget, 'mini', miniConfig);

      expect(registry.has('main-button')).toBe(true);
      expect(registry.has('mini-button')).toBe(true);
    });

    it('should handle button with only filter', () => {
      const config: SidebarButtonConfig = {
        name: 'filtered-button',
        icon: 'fas fa-filter',
        tooltip: 'Filtered',
        callback: vi.fn(),
        only: ['main', 'grid'],
      };

      addSidebarButton(mockWidget, 'main', config, renderCallback);

      const buttons = registry.getForWidget('main');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].only).toEqual(['main', 'grid']);
    });

    it('should handle button with except filter', () => {
      const config: SidebarButtonConfig = {
        name: 'except-button',
        icon: 'fas fa-ban',
        tooltip: 'Except',
        callback: vi.fn(),
        except: ['mini'],
      };

      addSidebarButton(mockWidget, 'main', config, renderCallback);

      const buttons = registry.getForWidget('main');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].except).toEqual(['mini']);
    });
  });

  describe('removeSidebarButton', () => {
    beforeEach(() => {
      // Pre-register a button for removal tests
      registry.register({
        name: 'removable',
        icon: 'fas fa-trash',
        tooltip: 'Removable',
        callback: vi.fn(),
      });
    });

    it('should unregister button from global registry', () => {
      expect(registry.has('removable')).toBe(true);

      removeSidebarButton(mockWidget, 'main', 'removable');

      expect(registry.has('removable')).toBe(false);
    });

    it('should trigger widget render callback', () => {
      removeSidebarButton(mockWidget, 'main', 'removable', renderCallback);

      expect(renderCallback).toHaveBeenCalledTimes(1);
    });

    it('should not trigger callback when not provided', () => {
      expect(() => {
        removeSidebarButton(mockWidget, 'main', 'removable');
      }).not.toThrow();
    });

    it('should handle removing non-existent button', () => {
      expect(() => {
        removeSidebarButton(mockWidget, 'main', 'non-existent', renderCallback);
      }).not.toThrow();

      expect(renderCallback).toHaveBeenCalledTimes(1);
    });

    it('should work for different widget types', () => {
      removeSidebarButton(mockWidget, 'mini', 'removable', renderCallback);

      expect(registry.has('removable')).toBe(false);
      expect(renderCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasSidebarButton', () => {
    beforeEach(() => {
      registry.register({
        name: 'exists',
        icon: 'fas fa-check',
        tooltip: 'Exists',
        callback: vi.fn(),
      });
    });

    it('should check registry for button existence', () => {
      const exists = hasSidebarButton(mockWidget, 'main', 'exists');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent button', () => {
      const exists = hasSidebarButton(mockWidget, 'main', 'does-not-exist');
      expect(exists).toBe(false);
    });

    it('should work for all widget types', () => {
      expect(hasSidebarButton(mockWidget, 'main', 'exists')).toBe(true);
      expect(hasSidebarButton(mockWidget, 'mini', 'exists')).toBe(true);
      expect(hasSidebarButton(mockWidget, 'grid', 'exists')).toBe(true);
    });
  });

  describe('loadButtonsFromRegistry', () => {
    beforeEach(() => {
      // Register various buttons with different filters
      registry.register({
        name: 'global',
        icon: 'fas fa-globe',
        tooltip: 'Global',
        callback: vi.fn(),
      });

      registry.register({
        name: 'main-only',
        icon: 'fas fa-home',
        tooltip: 'Main Only',
        callback: vi.fn(),
        only: ['main'],
      });

      registry.register({
        name: 'except-mini',
        icon: 'fas fa-expand',
        tooltip: 'Not Mini',
        callback: vi.fn(),
        except: ['mini'],
      });

      registry.register({
        name: 'grid-only',
        icon: 'fas fa-th',
        tooltip: 'Grid Only',
        callback: vi.fn(),
        only: ['grid'],
      });
    });

    it('should load all applicable buttons for widget type', () => {
      const mainButtons = loadButtonsFromRegistry(mockWidget, 'main');

      expect(mainButtons).toHaveLength(3);
      const names = mainButtons.map(b => b.name);
      expect(names).toContain('global');
      expect(names).toContain('main-only');
      expect(names).toContain('except-mini');
    });

    it('should skip buttons with except filter', () => {
      const miniButtons = loadButtonsFromRegistry(mockWidget, 'mini');

      expect(miniButtons).toHaveLength(1);
      expect(miniButtons[0].name).toBe('global');
    });

    it('should include buttons with only filter', () => {
      const gridButtons = loadButtonsFromRegistry(mockWidget, 'grid');

      expect(gridButtons).toHaveLength(3);
      const names = gridButtons.map(b => b.name);
      expect(names).toContain('global');
      expect(names).toContain('except-mini');
      expect(names).toContain('grid-only');
    });

    it('should return filtered button list', () => {
      const mainButtons = loadButtonsFromRegistry(mockWidget, 'main');

      mainButtons.forEach(button => {
        expect(button).toHaveProperty('name');
        expect(button).toHaveProperty('icon');
        expect(button).toHaveProperty('tooltip');
        expect(button).toHaveProperty('callback');
      });
    });

    it('should return empty array when no buttons match', () => {
      (SidebarButtonRegistry as any).instance = null;
      const freshRegistry = SidebarButtonRegistry.getInstance();

      freshRegistry.register({
        name: 'main-exclusive',
        icon: 'fas fa-home',
        tooltip: 'Main Only',
        callback: vi.fn(),
        only: ['main'],
      });

      const miniButtons = loadButtonsFromRegistry(mockWidget, 'mini');
      expect(miniButtons).toEqual([]);
    });

    it('should load buttons for grid widget correctly', () => {
      const gridButtons = loadButtonsFromRegistry(mockWidget, 'grid');
      const names = gridButtons.map(b => b.name);

      expect(names).toContain('global');
      expect(names).toContain('except-mini');
      expect(names).toContain('grid-only');
      expect(names).not.toContain('main-only');
    });

    it('should preserve button callback functions', () => {
      const callback = vi.fn();
      (SidebarButtonRegistry as any).instance = null;
      const freshRegistry = SidebarButtonRegistry.getInstance();

      freshRegistry.register({
        name: 'callback-test',
        icon: 'fas fa-play',
        tooltip: 'Test Callback',
        callback,
      });

      const buttons = loadButtonsFromRegistry(mockWidget, 'main');
      expect(buttons[0].callback).toBe(callback);
    });

    it('should handle multiple buttons with complex filters', () => {
      (SidebarButtonRegistry as any).instance = null;
      const freshRegistry = SidebarButtonRegistry.getInstance();

      freshRegistry.register({
        name: 'btn1',
        icon: 'fas fa-one',
        tooltip: 'One',
        callback: vi.fn(),
        only: ['main', 'grid'],
      });

      freshRegistry.register({
        name: 'btn2',
        icon: 'fas fa-two',
        tooltip: 'Two',
        callback: vi.fn(),
        except: ['main'],
      });

      freshRegistry.register({
        name: 'btn3',
        icon: 'fas fa-three',
        tooltip: 'Three',
        callback: vi.fn(),
      });

      const mainButtons = loadButtonsFromRegistry(mockWidget, 'main');
      const miniButtons = loadButtonsFromRegistry(mockWidget, 'mini');
      const gridButtons = loadButtonsFromRegistry(mockWidget, 'grid');

      expect(mainButtons.map(b => b.name)).toEqual(['btn1', 'btn3']);
      expect(miniButtons.map(b => b.name)).toEqual(['btn2', 'btn3']);
      expect(gridButtons.map(b => b.name)).toEqual(['btn1', 'btn2', 'btn3']);
    });
  });
});
