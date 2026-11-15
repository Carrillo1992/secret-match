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

/**
 * An amount as a form field shows it to edit, in the shape the field reads back: no sign, no
 * grouping, the Language's decimal separator. `30` → "30", `25.5` → "25,50" / "25.50".
 */
export function editableEuros(amount: number): string {
  return new Intl.NumberFormat(intlLocale(), {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(amount);
}
