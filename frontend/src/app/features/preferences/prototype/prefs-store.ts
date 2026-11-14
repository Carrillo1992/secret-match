/*
 * PROTOTYPE (#87), throwaway: in-memory stand-in for the Preferences state, the localStorage values and
 * the stubbed `PUT /api/v1/users/me/language`. No API calls, nothing persisted.
 */
import { computed, Injectable, signal } from '@angular/core';

export type Theme = 'system' | 'light' | 'dark';
export type Lang = 'es' | 'en';
export type Outcome = 'success' | 'failure' | 'slow';
export type ForcedState = 'idle' | 'saving' | 'failed' | 'reloading';

/** Language names are always written in their own language. */
export const LANG_NAMES: Record<Lang, string> = { es: 'Español', en: 'English' };

const COPY = {
  es: {
    prefs: 'Preferencias',
    theme: 'Tema',
    language: 'Idioma',
    system: 'Sistema',
    light: 'Claro',
    dark: 'Oscuro',
    emailNote: 'También se usa en tus emails.',
    saving: 'Guardando…',
    saveFailed: 'No hemos podido cambiar el idioma. Inténtalo de nuevo.',
    switching: 'Cambiando a',
    close: 'Cerrar',
    profile: 'Perfil',
    signOut: 'Cerrar sesión',
    myGroups: 'Mis grupos',
  },
  en: {
    prefs: 'Preferences',
    theme: 'Theme',
    language: 'Language',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    emailNote: 'Also used in your emails.',
    saving: 'Saving…',
    saveFailed: "We couldn't change the language. Please try again.",
    switching: 'Switching to',
    close: 'Close',
    profile: 'Profile',
    signOut: 'Sign out',
    myGroups: 'My groups',
  },
} satisfies Record<Lang, Record<string, string>>;

@Injectable()
export class PrefsStore {
  readonly theme = signal<Theme>('system');
  readonly language = signal<Lang>('es');
  readonly signedIn = signal(false);
  readonly open = signal(false);
  readonly saving = signal<Lang | null>(null);
  readonly saveFailed = signal(false);
  readonly reloadingTo = signal<Lang | null>(null);
  readonly outcome = signal<Outcome>('success');
  readonly storageBlocked = signal(false);

  readonly t = computed(() => COPY[this.language()]);
  readonly other = computed<Lang>(() => (this.language() === 'es' ? 'en' : 'es'));
  /** The Language shown as selected: the one being saved or loaded, else the current one. */
  readonly shownLang = computed<Lang>(() => this.saving() ?? this.reloadingTo() ?? this.language());
  readonly languageBusy = computed(() => this.saving() !== null || this.reloadingTo() !== null);

  private timer?: ReturnType<typeof setTimeout>;

  chooseTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  chooseLanguage(lang: Lang): void {
    if (lang === this.language() || this.languageBusy()) return;
    this.saveFailed.set(false);
    if (!this.signedIn()) {
      this.reload(lang);
      return;
    }
    this.saving.set(lang);
    const outcome = this.outcome();
    this.later(outcome === 'slow' ? 4000 : 900, () => {
      this.saving.set(null);
      if (outcome === 'failure') this.saveFailed.set(true);
      else this.reload(lang);
    });
  }

  /** Floating-bar shortcut: jump straight into a state and hold it (no timers). */
  force(state: ForcedState): void {
    clearTimeout(this.timer);
    this.saving.set(null);
    this.saveFailed.set(false);
    this.reloadingTo.set(null);
    if (state === 'saving') {
      this.signedIn.set(true);
      this.open.set(true);
      this.saving.set(this.other());
    } else if (state === 'failed') {
      this.signedIn.set(true);
      this.open.set(true);
      this.saveFailed.set(true);
    } else if (state === 'reloading') {
      this.reloadingTo.set(this.other());
    }
  }

  /** A fresh visit with storage blocked: defaults to System and the browser Language. */
  setStorageBlocked(blocked: boolean): void {
    this.storageBlocked.set(blocked);
    if (blocked) {
      this.theme.set('system');
      this.language.set(navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es');
    }
  }

  forcedState(): ForcedState {
    if (this.reloadingTo()) return 'reloading';
    if (this.saving()) return 'saving';
    if (this.saveFailed()) return 'failed';
    return 'idle';
  }

  private reload(lang: Lang): void {
    this.reloadingTo.set(lang);
    this.later(1500, () => {
      this.language.set(lang);
      this.reloadingTo.set(null);
      this.open.set(false);
    });
  }

  private later(ms: number, fn: () => void): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(fn, ms);
  }
}
