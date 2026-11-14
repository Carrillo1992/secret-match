import { CurrentUserResponse } from './api/generated/models';

/** A Language SecretMatch speaks (GLOSSARY.md), as the API names it. */
export type Language = CurrentUserResponse['language'];

/**
 * The browser's Language: the first Spanish or English in its preferred languages, English when it
 * has neither.
 */
export function browserLanguage(languages: readonly string[] = navigator.languages): Language {
  for (const tag of languages) {
    const primary = tag.split('-')[0].toLowerCase();
    if (primary === 'es' || primary === 'en') {
      return primary;
    }
  }
  return 'en';
}
