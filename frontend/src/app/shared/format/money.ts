import { GroupResponse } from '../../core/api/generated/models/group-response';
import { intlLocale } from '../../core/language';

/**
 * Amounts as they read in the current Language, for Budgets and Wish prices alike. The Language decides
 * the format; the Group decides the Currency (ADR 0005, #93).
 */

/** The money a Group's amounts are in, by its ISO 4217 code. */
export type Currency = GroupResponse['currency'];

/**
 * `30` → "30 €" / "€30", `25.5` in dollars → "25,50 $" / "$25.50". Dollars read `$`, not `US$`: a Group
 * has one Currency, so the plain sign is not ambiguous.
 */
export function money(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(intlLocale(), {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/** The sign an amount field shows next to the number: "€" or "$", in every Language. */
export function currencySymbol(currency: Currency): string {
  return (
    new Intl.NumberFormat(intlLocale(), {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? currency
  );
}

/**
 * An amount as a form field shows it to edit, in the shape the field reads back: no sign, no
 * grouping, the Language's decimal separator. `30` → "30", `25.5` → "25,50" / "25.50".
 */
export function editableAmount(amount: number): string {
  return new Intl.NumberFormat(intlLocale(), {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(amount);
}
