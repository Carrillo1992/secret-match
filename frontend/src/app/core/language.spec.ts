import {
  browserLanguage,
  currentLanguage,
  intlLocale,
  resolveLanguage,
  saveLanguage,
} from './language';

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

describe('resolveLanguage', () => {
  it('is the Language chosen on this device, whatever the browser prefers', () => {
    expect(resolveLanguage('en', ['es-ES', 'es'])).toBe('en');
    expect(resolveLanguage('es', ['en-US'])).toBe('es');
  });

  it("is the browser's Language when nothing was chosen", () => {
    expect(resolveLanguage(null, ['fr-FR', 'es-MX'])).toBe('es');
    expect(resolveLanguage(null, ['en-GB', 'es'])).toBe('en');
  });

  it('is English when nothing was chosen and the browser has neither', () => {
    expect(resolveLanguage(null, ['fr', 'de'])).toBe('en');
  });

  it('ignores a stored value that is not a Language', () => {
    expect(resolveLanguage('fr', ['es'])).toBe('es');
    expect(resolveLanguage('', ['fr'])).toBe('en');
  });
});

describe('currentLanguage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('is the Language saved in localStorage', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-ES']);
    localStorage.setItem('secretmatch.language', 'en');

    expect(currentLanguage()).toBe('en');
  });

  it("falls back to the browser's when nothing is saved", () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-ES']);

    expect(currentLanguage()).toBe('es');
  });

  it("falls back to the browser's when storage is blocked", () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-ES']);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(currentLanguage()).toBe('es');
  });
});

describe('saveLanguage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('keeps the choice for the next visit', () => {
    saveLanguage('es');

    expect(localStorage.getItem('secretmatch.language')).toBe('es');
  });

  it('does not fail when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(() => saveLanguage('en')).not.toThrow();
  });
});

describe('intlLocale', () => {
  it('writes Spanish as in Spain and English as in the United States', () => {
    expect(intlLocale('es')).toBe('es-ES');
    expect(intlLocale('en')).toBe('en-US');
  });
});
