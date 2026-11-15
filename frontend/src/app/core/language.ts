import { CurrentUserResponse } from './api/generated/models';

/** A Language SecretMatch speaks (GLOSSARY.md), as the API names it. */
export type Language = CurrentUserResponse['language'];

/** Whether a code names a Language SecretMatch speaks. */
export function isLanguage(code: string | null): code is Language {
  return code === 'es' || code === 'en';
}

/** Where the Language chosen on this device is kept (ADR 0005). */
const KEY = 'secretmatch.language';

/**
 * The browser's Language: the first Spanish or English in its preferred languages, English when it
 * has neither.
 */
export function browserLanguage(languages: readonly string[] = navigator.languages): Language {
  for (const tag of languages) {
    const primary = tag.split('-')[0].toLowerCase();
    if (isLanguage(primary)) {
      return primary;
    }
  }
  return 'en';
}

/**
 * The Language the app runs in (ADR 0005): the one chosen on this device, else the browser's, else
 * English. `stored` is what was kept in `localStorage`, if anything.
 */
export function resolveLanguage(stored: string | null, languages: readonly string[]): Language {
  return isLanguage(stored) ? stored : browserLanguage(languages);
}

/**
 * The Language this page runs in. `main.ts` resolves it once before bootstrap, and a change
 * reloads the page, so reading it again anywhere gives the same answer.
 */
export function currentLanguage(): Language {
  return resolveLanguage(readStoredLanguage(), navigator.languages);
}

/** Keeps the choice for the next visit; with storage blocked it is simply not kept. */
export function saveLanguage(language: Language): void {
  try {
    localStorage.setItem(KEY, language);
  } catch {
    // Storage blocked (private mode, disabled site data): the browser's Language stays in charge.
  }
}

/**
 * The one place that decides how dates and numbers read for a Language, as an `Intl` locale:
 * Spanish as in Spain, English as in the United States.
 */
export function intlLocale(language: Language = currentLanguage()): 'es-ES' | 'en-US' {
  return language === 'es' ? 'es-ES' : 'en-US';
}

function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
