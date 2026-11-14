import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';
import { currentLanguage, Language, saveLanguage } from '../language';

/** Reloads the page; a token so specs can watch it instead of reloading the test runner. */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => {
    const location = inject(DOCUMENT).location;
    return () => location.reload();
  },
});

/**
 * The Language the app speaks (ADR 0005). It is resolved once before bootstrap, so choosing
 * another one saves it on this device and reloads the page in it: no screen swaps copy at runtime.
 */
@Injectable({ providedIn: 'root' })
export class LanguagePreference {
  private readonly reload = inject(PAGE_RELOAD);

  /** The Language this page runs in. */
  readonly language: Language = currentLanguage();

  choose(language: Language): void {
    if (language === this.language) {
      return;
    }
    saveLanguage(language);
    this.reload();
  }
}
