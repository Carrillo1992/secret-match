import { loadTranslations } from '@angular/localize';
import { LOCALE_ID, Provider } from '@angular/core';
import english from '../locale/messages.en.json';

/**
 * Runs a spec file in English, as `main.ts` does for a reader who chose it. Copy written with
 * `$localize` at module level is translated as its module loads, and the bundler does not keep the
 * order of static imports, so the spec imports what it renders dynamically, once this has run
 * (`await import('./page')` in a `beforeAll`). Spec files run isolated (`angular.json`), so the
 * English copy stays inside the file that imports this.
 */
loadTranslations(english.translations);
localStorage.setItem('secretmatch.language', 'en');

/** Formats dates and numbers as the running app does in English. */
export const englishLocale: Provider = { provide: LOCALE_ID, useValue: 'en' };

/**
 * Spanish words that only appear in Spanish copy, to tell a screen still speaking Spanish from one
 * in English. Checked as whole words, case-insensitively.
 */
const SPANISH_WORDS = new Set(
  (
    'el la los las del de un una que tu tus mis sus para con por hola nada ver sobre ' +
    'grupo grupos sorteo sortear cuenta contraseña iniciar crear guardar cancelar borrar cerrar ' +
    'enviar salir volver cargando reintentar quitar editar sesión correo enlace invitación nombre ' +
    'fecha presupuesto zona miembro miembros exclusiones perfil regalo deseos gustos mensaje ' +
    'mensajes buzón lista'
  ).split(' '),
);

/**
 * The Spanish words left in `element`: in its text and in its `aria-label`, `placeholder`, `title`
 * and `alt` attributes. Text marked as another language (`lang="es"`, the Language names) is skipped.
 */
export function spanishLeftIn(element: Element): string[] {
  const texts: string[] = [];
  const walk = (node: Node): void => {
    if (node instanceof Element) {
      const lang = node.getAttribute('lang');
      if (lang && lang !== 'en') {
        return;
      }
      for (const attr of ['aria-label', 'placeholder', 'title', 'alt']) {
        texts.push(node.getAttribute(attr) ?? '');
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      texts.push(node.textContent ?? '');
    }
    node.childNodes.forEach(walk);
  };
  walk(element);
  const words = texts
    .join(' ')
    .toLowerCase()
    .split(/[^\p{L}]+/u);
  return [...new Set(words.filter((word) => SPANISH_WORDS.has(word) || /[ñ¿¡áéíóú]/.test(word)))];
}
