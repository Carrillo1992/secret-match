import { longExchangeDate, shortExchangeDate } from './group-format';

describe('Exchange Date formats', () => {
  afterEach(() => localStorage.clear());

  it('read in Spanish', () => {
    localStorage.setItem('secretmatch.language', 'es');

    expect(shortExchangeDate('2026-12-24')).toBe('24 dic 2026');
    expect(longExchangeDate('2026-12-24')).toBe('jueves, 24 de diciembre de 2026');
  });

  it('read in English', () => {
    localStorage.setItem('secretmatch.language', 'en');

    expect(shortExchangeDate('2026-12-24')).toBe('Dec 24, 2026');
    expect(longExchangeDate('2026-12-24')).toBe('Thursday, December 24, 2026');
  });
});
