import english from './messages.en.json';
import source from './messages.json';

/**
 * The messages of the source copy (Spanish, `messages.json`, written by `npm run extract-i18n`)
 * that have no English entry. A changed Spanish message gets a new id, so it counts as missing too.
 */
function missingTranslations(
  messages: Readonly<Record<string, string>>,
  translations: Readonly<Record<string, string>>,
): string[] {
  return Object.keys(messages).filter((id) => !translations[id]?.trim());
}

describe('English translations', () => {
  it('cover every message of the Spanish copy', () => {
    expect(missingTranslations(source.translations, english.translations)).toEqual([]);
  });

  it('count a message with no English entry, or an empty one, as missing', () => {
    const messages = { '1': 'Crear cuenta', '2': 'Iniciar sesión', '3': 'Cerrar' };

    expect(missingTranslations(messages, { '1': 'Create account', '3': ' ' })).toEqual(['2', '3']);
  });
});
