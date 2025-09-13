import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WidgetInstanceManager } from '../src/ui/base-widget-manager';

// Mock Hooks global
const mockHooks = { on: vi.fn() } as any;
(globalThis as any).Hooks = mockHooks;

class TestWidget extends WidgetInstanceManager {
  rendered = false;
  render = vi.fn((_force?: boolean) => {
    this.rendered = true;
  });
  bringToTop = vi.fn();
  close = vi.fn(() => {
    this.rendered = false;
  });
}

describe('WidgetInstanceManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (TestWidget as any).activeInstance = null;
  });

  it('show creates and renders widget instance', () => {
    TestWidget.show();
    const instance = TestWidget.getInstance() as any;
    expect(instance).not.toBeNull();
    expect(instance.render).toHaveBeenCalledWith(true);
    expect(instance.rendered).toBe(true);
  });

  it('hide closes the active widget', () => {
    TestWidget.show();
    const instance = TestWidget.getInstance() as any;
    TestWidget.hide();
    expect(instance.close).toHaveBeenCalled();
    expect(instance.rendered).toBe(false);
  });

  it('toggle switches visibility', () => {
    TestWidget.show();
    const instance = TestWidget.getInstance() as any;
    (instance.close as any).mockClear();
    (instance.render as any).mockClear();

    TestWidget.toggle();
    expect(instance.close).toHaveBeenCalledTimes(1);

    TestWidget.toggle();
    expect(instance.render).toHaveBeenCalledWith(true);
  });

  it('registerHooks re-renders active widget on events', () => {
    TestWidget.show();
    const instance = TestWidget.getInstance() as any;
    (instance.render as any).mockClear();

    TestWidget.registerHooks();

    const dateHandler = mockHooks.on.mock.calls.find(c => c[0] === 'seasons-stars:dateChanged')[1];
    dateHandler();
    expect(instance.render).toHaveBeenCalled();

    (instance.render as any).mockClear();
    const calHandler = mockHooks.on.mock.calls.find(
      c => c[0] === 'seasons-stars:calendarChanged'
    )[1];
    calHandler();
    expect(instance.render).toHaveBeenCalled();
  });
});
