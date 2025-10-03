/**
 * Tests for SidebarButtonRegistry
 * Registry manages global sidebar button configuration for all widgets
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SidebarButtonRegistry } from '../src/ui/sidebar-button-registry';
import type { SidebarButtonConfig } from '../src/ui/sidebar-button-registry';

describe('SidebarButtonRegistry', () => {
  let registry: SidebarButtonRegistry;

  beforeEach(() => {
    // Clear singleton instance for clean tests
    (SidebarButtonRegistry as any).instance = null;
    registry = SidebarButtonRegistry.getInstance();
  });

  describe('singleton initialization', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = SidebarButtonRegistry.getInstance();
      const instance2 = SidebarButtonRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should initialize with empty button map', () => {
      const buttons = registry.getForWidget('main');
      expect(buttons).toEqual([]);
    });
  });

  describe('register', () => {
    it('should register button with valid config', () => {
      const config: SidebarButtonConfig = {
        name: 'test-button',
        icon: 'fas fa-star',
        tooltip: 'Test Button',
        callback: vi.fn(),
      };

      registry.register(config);

      expect(registry.has('test-button')).toBe(true);
    });

    it('should prevent duplicate button names', () => {
      const config1: SidebarButtonConfig = {
        name: 'duplicate',
        icon: 'fas fa-star',
        tooltip: 'First',
        callback: vi.fn(),
      };

      const config2: SidebarButtonConfig = {
        name: 'duplicate',
        icon: 'fas fa-heart',
        tooltip: 'Second',
        callback: vi.fn(),
      };

      registry.register(config1);
      registry.register(config2);

      const buttons = registry.getForWidget('main');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].icon).toBe('fas fa-star'); // Should keep first registration
    });

    it('should store button with all properties', () => {
      const callback = vi.fn();
      const config: SidebarButtonConfig = {
        name: 'complete-button',
        icon: 'fas fa-cog',
        tooltip: 'Settings',
        callback,
        only: ['main', 'grid'],
      };

      registry.register(config);

      const buttons = registry.getForWidget('main');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toEqual({
        name: 'complete-button',
        icon: 'fas fa-cog',
        tooltip: 'Settings',
        callback,
        only: ['main', 'grid'],
      });
    });

    it('should store button with except filter', () => {
      const callback = vi.fn();
      const config: SidebarButtonConfig = {
        name: 'except-button',
        icon: 'fas fa-ban',
        tooltip: 'Excluded',
        callback,
        except: ['mini'],
      };

      registry.register(config);

      const buttons = registry.getForWidget('main');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].except).toEqual(['mini']);
    });
  });

  describe('getForWidget', () => {
    beforeEach(() => {
      // Register test buttons with different filters
      registry.register({
        name: 'global-button',
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
        name: 'main-grid-only',
        icon: 'fas fa-th',
        tooltip: 'Main and Grid',
        callback: vi.fn(),
        only: ['main', 'grid'],
      });

      registry.register({
        name: 'except-mini',
        icon: 'fas fa-expand',
        tooltip: 'Not Mini',
        callback: vi.fn(),
        except: ['mini'],
      });

      registry.register({
        name: 'except-main-mini',
        icon: 'fas fa-compress',
        tooltip: 'Grid Only',
        callback: vi.fn(),
        except: ['main', 'mini'],
      });
    });

    it('should return all buttons when no filter specified', () => {
      const globalConfig: SidebarButtonConfig = {
        name: 'unfiltered',
        icon: 'fas fa-star',
        tooltip: 'All Widgets',
        callback: vi.fn(),
      };

      (SidebarButtonRegistry as any).instance = null;
      const freshRegistry = SidebarButtonRegistry.getInstance();
      freshRegistry.register(globalConfig);

      const mainButtons = freshRegistry.getForWidget('main');
      const miniButtons = freshRegistry.getForWidget('mini');
      const gridButtons = freshRegistry.getForWidget('grid');

      expect(mainButtons).toHaveLength(1);
      expect(miniButtons).toHaveLength(1);
      expect(gridButtons).toHaveLength(1);
    });

    it('should return only buttons with matching only filter', () => {
      const mainButtons = registry.getForWidget('main');
      const mainNames = mainButtons.map(b => b.name);

      expect(mainNames).toContain('global-button');
      expect(mainNames).toContain('main-only');
      expect(mainNames).toContain('main-grid-only');
      expect(mainNames).toContain('except-mini');
    });

    it('should exclude buttons with matching except filter', () => {
      const miniButtons = registry.getForWidget('mini');
      const miniNames = miniButtons.map(b => b.name);

      expect(miniNames).toContain('global-button');
      expect(miniNames).not.toContain('except-mini');
      expect(miniNames).not.toContain('except-main-mini');
    });

    it('should handle only filter with multiple widget types', () => {
      const mainButtons = registry.getForWidget('main');
      const gridButtons = registry.getForWidget('grid');
      const miniButtons = registry.getForWidget('mini');

      const mainNames = mainButtons.map(b => b.name);
      const gridNames = gridButtons.map(b => b.name);
      const miniNames = miniButtons.map(b => b.name);

      // main-grid-only should appear in main and grid
      expect(mainNames).toContain('main-grid-only');
      expect(gridNames).toContain('main-grid-only');
      expect(miniNames).not.toContain('main-grid-only');
    });

    it('should handle except filter with multiple widget types', () => {
      const mainButtons = registry.getForWidget('main');
      const gridButtons = registry.getForWidget('grid');
      const miniButtons = registry.getForWidget('mini');

      const mainNames = mainButtons.map(b => b.name);
      const gridNames = gridButtons.map(b => b.name);
      const miniNames = miniButtons.map(b => b.name);

      // except-main-mini should only appear in grid
      expect(mainNames).not.toContain('except-main-mini');
      expect(miniNames).not.toContain('except-main-mini');
      expect(gridNames).toContain('except-main-mini');
    });

    it('should return empty array when no buttons match', () => {
      (SidebarButtonRegistry as any).instance = null;
      const freshRegistry = SidebarButtonRegistry.getInstance();

      freshRegistry.register({
        name: 'main-only-button',
        icon: 'fas fa-home',
        tooltip: 'Main Only',
        callback: vi.fn(),
        only: ['main'],
      });

      const miniButtons = freshRegistry.getForWidget('mini');
      expect(miniButtons).toEqual([]);
    });

    it('should correctly filter grid widget buttons', () => {
      const gridButtons = registry.getForWidget('grid');
      const gridNames = gridButtons.map(b => b.name);

      expect(gridNames).toContain('global-button');
      expect(gridNames).toContain('main-grid-only');
      expect(gridNames).toContain('except-mini');
      expect(gridNames).toContain('except-main-mini');
      expect(gridNames).not.toContain('main-only');
    });
  });

  describe('unregister', () => {
    it('should remove existing button', () => {
      const config: SidebarButtonConfig = {
        name: 'remove-me',
        icon: 'fas fa-trash',
        tooltip: 'Remove',
        callback: vi.fn(),
      };

      registry.register(config);
      expect(registry.has('remove-me')).toBe(true);

      registry.unregister('remove-me');
      expect(registry.has('remove-me')).toBe(false);
    });

    it('should handle removing non-existent button gracefully', () => {
      expect(() => {
        registry.unregister('non-existent');
      }).not.toThrow();

      expect(registry.has('non-existent')).toBe(false);
    });

    it('should only remove specified button', () => {
      registry.register({
        name: 'button1',
        icon: 'fas fa-one',
        tooltip: 'One',
        callback: vi.fn(),
      });

      registry.register({
        name: 'button2',
        icon: 'fas fa-two',
        tooltip: 'Two',
        callback: vi.fn(),
      });

      registry.unregister('button1');

      expect(registry.has('button1')).toBe(false);
      expect(registry.has('button2')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all buttons', () => {
      registry.register({
        name: 'button1',
        icon: 'fas fa-one',
        tooltip: 'One',
        callback: vi.fn(),
      });

      registry.register({
        name: 'button2',
        icon: 'fas fa-two',
        tooltip: 'Two',
        callback: vi.fn(),
      });

      expect(registry.getForWidget('main')).toHaveLength(2);

      registry.clear();

      expect(registry.getForWidget('main')).toEqual([]);
      expect(registry.has('button1')).toBe(false);
      expect(registry.has('button2')).toBe(false);
    });

    it('should allow registration after clear', () => {
      registry.register({
        name: 'first',
        icon: 'fas fa-one',
        tooltip: 'First',
        callback: vi.fn(),
      });

      registry.clear();

      registry.register({
        name: 'second',
        icon: 'fas fa-two',
        tooltip: 'Second',
        callback: vi.fn(),
      });

      expect(registry.has('second')).toBe(true);
      expect(registry.getForWidget('main')).toHaveLength(1);
    });
  });

  describe('has', () => {
    it('should return true for existing button', () => {
      registry.register({
        name: 'exists',
        icon: 'fas fa-check',
        tooltip: 'Exists',
        callback: vi.fn(),
      });

      expect(registry.has('exists')).toBe(true);
    });

    it('should return false for non-existent button', () => {
      expect(registry.has('does-not-exist')).toBe(false);
    });

    it('should return false after unregistration', () => {
      registry.register({
        name: 'temporary',
        icon: 'fas fa-clock',
        tooltip: 'Temporary',
        callback: vi.fn(),
      });

      expect(registry.has('temporary')).toBe(true);

      registry.unregister('temporary');

      expect(registry.has('temporary')).toBe(false);
    });
  });
});
