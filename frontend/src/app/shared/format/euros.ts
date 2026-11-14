/** Amounts in euros as they read in Spanish, for Budgets and Wish prices alike. */

/** `30` → "30 €", `25.5` → "25,50 €". */
export function euros(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
