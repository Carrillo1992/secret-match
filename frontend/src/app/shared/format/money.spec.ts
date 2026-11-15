import { editableEuros, euros } from './euros';

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

describe('editableEuros', () => {
  afterEach(() => localStorage.clear());

  it('writes an amount as a form field takes it back, with the Spanish decimal comma', () => {
    localStorage.setItem('secretmatch.language', 'es');

    expect(editableEuros(30)).toBe('30');
    expect(editableEuros(25.5)).toBe('25,50');
    expect(editableEuros(123456.78)).toBe('123456,78');
  });

  it('uses the decimal point in English, still without grouping', () => {
    localStorage.setItem('secretmatch.language', 'en');

    expect(editableEuros(30)).toBe('30');
    expect(editableEuros(25.5)).toBe('25.50');
    expect(editableEuros(123456.78)).toBe('123456.78');
  });
});
