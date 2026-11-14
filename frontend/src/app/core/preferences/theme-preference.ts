import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

/** `system` follows the operating system (the default); `light` and `dark` force one theme. */
export type Theme = 'system' | 'light' | 'dark';

/**
 * Where the chosen Theme is kept. The inline script in `index.html` reads the same key to set
 * `data-theme` before Angular starts, so a forced theme never flashes the other one: keep them equal.
 */
const KEY = 'secretmatch.theme';

/**
 * The Theme chosen on this device (ADR 0005). A forced theme is a `data-theme` attribute on
 * `<html>`, which `styles.css` reads; System removes it and leaves `prefers-color-scheme` in charge.
 * The choice lives in `localStorage`; when storage is blocked it is System, and a choice still
 * applies for the rest of the visit.
 */
@Injectable({ providedIn: 'root' })
export class ThemePreference {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly current = signal<Theme>(readStoredTheme());

  /** The chosen Theme. */
  readonly theme = this.current.asReadonly();

  choose(theme: Theme): void {
    this.current.set(theme);
    if (theme === 'system') {
      delete this.root.dataset['theme'];
    } else {
      this.root.dataset['theme'] = theme;
    }
    storeTheme(theme);
  }
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    // Storage blocked (private mode, disabled site data): the OS decides.
    return 'system';
  }
}

function storeTheme(theme: Theme): void {
  try {
    if (theme === 'system') {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, theme);
    }
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
}
