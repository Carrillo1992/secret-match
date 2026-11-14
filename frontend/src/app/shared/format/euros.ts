import { intlLocale } from '../../core/language';

/** Amounts in euros as they read in the current Language, for Budgets and Wish prices alike. */

/** `30` → "30 €" / "€30", `25.5` → "25,50 €" / "€25.50". */
export function euros(amount: number): string {
  return new Intl.NumberFormat(intlLocale(), {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
