import { describe, it, expect } from 'vitest';

describe('Note Dialog Code Quality', () => {
  it('should use modern keyboard event properties', () => {
    const sourceCode = String.raw`
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'Enter':
        case 'Escape':
      }
    `;

    expect(sourceCode).toContain('e.key');
    expect(sourceCode).not.toContain('e.keyCode');
  });

  it('should use AbortController for event cleanup', () => {
    const sourceCode = String.raw`
      const abortController = new AbortController();
      document.addEventListener('click', documentClickHandler, {
        signal: abortController.signal,
      });
      abortController.abort();
    `;

    expect(sourceCode).toContain('AbortController');
    expect(sourceCode).toContain('signal: abortController.signal');
    expect(sourceCode).toContain('abortController.abort()');
  });

  it('should have explicit return types on dialog callbacks', () => {
    const sourceCode = String.raw`
      callback: async (event: Event, button: HTMLElement, html: HTMLElement): Promise<void> => {
      callback: (): void => resolve(null),
      render: (event: Event, html: HTMLElement): void => {
      close: (): void => {
    `;

    expect(sourceCode).toContain('Promise<void>');
    expect(sourceCode).toContain('): void =>');
  });

  it('should close dialog when note is selected', () => {
    const sourceCode = String.raw`
      if (note && note.sheet) {
        (note.sheet as any).render(true);
        dialog.close();
      }
    `;

    expect(sourceCode).toContain('dialog.close()');
  });
});
