import { currencySymbol, editableAmount, money } from './money';

describe('money', () => {
  afterEach(() => localStorage.clear());

  it('reads as in Spain in Spanish, in euros and in dollars alike', () => {
    localStorage.setItem('secretmatch.language', 'es');

    expect(money(30, 'EUR')).toBe('30\u00a0€');
    expect(money(25.5, 'EUR')).toBe('25,50\u00a0€');
    expect(money(30, 'USD')).toBe('30\u00a0$');
    expect(money(25.5, 'USD')).toBe('25,50\u00a0$');
  });

  it('puts the sign first in English, and dollars read $, not US$', () => {
    localStorage.setItem('secretmatch.language', 'en');

    expect(money(30, 'EUR')).toBe('€30');
    expect(money(25.5, 'EUR')).toBe('€25.50');
    expect(money(30, 'USD')).toBe('$30');
    expect(money(25.5, 'USD')).toBe('$25.50');
  });
});

describe('currencySymbol', () => {
  it('is the sign an amount field shows next to the number', () => {
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('USD')).toBe('$');
  });
});

describe('editableAmount', () => {
  afterEach(() => localStorage.clear());

  it('writes an amount as a form field takes it back, with the Spanish decimal comma', () => {
    localStorage.setItem('secretmatch.language', 'es');

    expect(editableAmount(30)).toBe('30');
    expect(editableAmount(25.5)).toBe('25,50');
    expect(editableAmount(123456.78)).toBe('123456,78');
  });

  it('uses the decimal point in English, still without grouping', () => {
    localStorage.setItem('secretmatch.language', 'en');

    expect(editableAmount(30)).toBe('30');
    expect(editableAmount(25.5)).toBe('25.50');
    expect(editableAmount(123456.78)).toBe('123456.78');
  });
});
