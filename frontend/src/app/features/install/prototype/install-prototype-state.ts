// PROTOTYPE (#118), throwaway: in-memory state for /prototype/install. No API, no storage.
import { computed, Injectable, signal } from '@angular/core';

export type Variant = 'A' | 'B' | 'C';
export type Platform = 'chromium-prompt' | 'ios' | 'installed' | 'unsupported';
export type SuggestionShow = 'hidden' | 'first' | 'second';
export type Opener = 'entry' | 'suggestion';
export type ProtoTheme = 'system' | 'light' | 'dark';

export const VARIANTS: readonly Variant[] = ['A', 'B', 'C'];
export const VARIANT_NAMES: Record<Variant, string> = {
  A: 'Tarjeta + guía en línea',
  B: 'Barra flotante + hoja',
  C: 'Franja bajo la barra + hoja',
};

/** What the real feature would keep in localStorage; here it only lives in memory. */
export interface StoredSuggestion {
  readonly shown: number;
  readonly dismissedAt: string | null;
  readonly never: boolean;
}

@Injectable()
export class InstallPrototypeState {
  readonly platform = signal<Platform>('chromium-prompt');
  readonly show = signal<SuggestionShow>('first');
  readonly theme = signal<ProtoTheme>(initialTheme());

  readonly prefsOpen = signal(false);
  /** Chromium's `prompt()` can only be used once per page load. */
  readonly promptUsed = signal(false);
  readonly suggestionGone = signal(false);
  /** The simulated native Chromium dialog, and what opened it. */
  readonly nativeDialog = signal<Opener | null>(null);
  /** B and C: the guide as its own bottom sheet. */
  readonly guideSheetFrom = signal<Opener | null>(null);
  /** A: the guide expanded in place, inside the suggestion card or the Preferences sheet. */
  readonly inlineGuide = signal<Opener | null>(null);

  readonly stored = signal<StoredSuggestion>(storedFor('first'));
  readonly lastEvent = signal('—');

  readonly canInstall = computed(
    () =>
      (this.platform() === 'chromium-prompt' && !this.promptUsed()) || this.platform() === 'ios',
  );
  readonly entryVisible = this.canInstall;
  readonly suggestionVisible = computed(
    () => this.show() !== 'hidden' && this.canInstall() && !this.suggestionGone(),
  );

  setPlatform(platform: Platform): void {
    this.platform.set(platform);
    this.resetRun();
    this.lastEvent.set(`plataforma → ${platform}`);
  }

  setShow(show: SuggestionShow): void {
    this.show.set(show);
    this.resetRun();
    if (show !== 'hidden') {
      this.stored.set(storedFor(show));
    }
    this.lastEvent.set(`sugerencia → ${show}`);
  }

  /** "Instalar" on Chromium: the browser's own dialog. On iOS the variant decides how the guide opens. */
  openNative(from: Opener): void {
    this.nativeDialog.set(from);
    this.lastEvent.set(`prompt() desde ${from === 'entry' ? 'Preferencias' : 'la sugerencia'}`);
  }

  /** "Instalar" on the suggestion: Chromium's dialog, or the iOS guide in the variant's shape. */
  installFromSuggestion(variant: Variant): void {
    if (this.platform() === 'chromium-prompt') {
      this.openNative('suggestion');
    } else if (variant === 'A') {
      this.inlineGuide.update((open) => (open === 'suggestion' ? null : 'suggestion'));
      this.lastEvent.set('guía iOS en línea (sugerencia)');
    } else {
      this.guideSheetFrom.set('suggestion');
      this.lastEvent.set('guía iOS en hoja (desde la sugerencia)');
    }
  }

  nativeResult(accepted: boolean): void {
    const from = this.nativeDialog();
    this.nativeDialog.set(null);
    this.promptUsed.set(true);
    if (from === 'suggestion') {
      this.suggestionGone.set(true);
      this.stored.update((s) => ({ ...s, never: true }));
    }
    this.lastEvent.set(
      accepted ? 'diálogo: aceptado (la app se instala)' : 'diálogo: cancelado (no definitivo)',
    );
  }

  notNow(): void {
    this.suggestionGone.set(true);
    this.inlineGuide.set(null);
    this.stored.update((s) =>
      this.show() === 'second' ? { ...s, never: true } : { ...s, dismissedAt: 'ahora' },
    );
    this.lastEvent.set(
      this.show() === 'second' ? '"Ahora no" (2ª): nunca más' : '"Ahora no" (1ª): vuelve en 3 días',
    );
  }

  private resetRun(): void {
    this.promptUsed.set(false);
    this.suggestionGone.set(false);
    this.nativeDialog.set(null);
    this.guideSheetFrom.set(null);
    this.inlineGuide.set(null);
  }
}

function storedFor(show: 'first' | 'second'): StoredSuggestion {
  return show === 'first'
    ? { shown: 1, dismissedAt: null, never: false }
    : { shown: 2, dismissedAt: 'hace 3 días', never: false };
}

function initialTheme(): ProtoTheme {
  const forced = document.documentElement.dataset['theme'];
  return forced === 'light' || forced === 'dark' ? forced : 'system';
}

/** Moves focus once Angular has rendered the change that removed or added the target. */
export function focusSoon(id: string): void {
  setTimeout(() => document.getElementById(id)?.focus());
}
