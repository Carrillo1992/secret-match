import { euros } from './euros';

describe('euros', () => {
  afterEach(() => localStorage.clear());

  it('reads as in Spain in Spanish', () => {
    localStorage.setItem('secretmatch.language', 'es');

    expect(euros(30)).toBe('30 €');
    expect(euros(25.5)).toBe('25,50 €');
  });

  it('puts the sign first in English', () => {
    localStorage.setItem('secretmatch.language', 'en');

    expect(euros(30)).toBe('€30');
    expect(euros(25.5)).toBe('€25.50');
  });
});
