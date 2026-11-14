import { browserLanguage } from './browser-language';

describe('browserLanguage', () => {
  it('is the first Spanish or English among the browser languages', () => {
    expect(browserLanguage(['fr-FR', 'es-MX', 'en-US'])).toBe('es');
    expect(browserLanguage(['de', 'en-GB', 'es'])).toBe('en');
    expect(browserLanguage(['ES'])).toBe('es');
  });

  it('is English when the browser has neither', () => {
    expect(browserLanguage(['fr', 'de'])).toBe('en');
    expect(browserLanguage([])).toBe('en');
  });

  it('does not take a language that only starts with the same letters', () => {
    expect(browserLanguage(['est', 'es'])).toBe('es');
    expect(browserLanguage(['esu', 'fr'])).toBe('en');
  });
});
