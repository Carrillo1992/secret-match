import { computed, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { GroupEdit } from './groups-api';
import { Currency, currencySymbol, editableAmount } from '../../../shared/format/money';

/**
 * The rules and shapes shared by the forms that create and edit a Group. They mirror the API's
 * rules: the name's length and the budget's shape (to the cent, < 1 M), whatever its Currency.
 */

export const NAME_MAX_LENGTH = 80;
const BUDGET = /^\d{1,6}([.,]\d{1,2})?$/;

/**
 * ISO dates (`YYYY-MM-DD`) compare correctly as strings. `kept` is a date that is accepted even
 * when earlier: the Group's current Exchange Date, which the API does not check again.
 */
export function notBefore(earliest: string, kept?: string): ValidatorFn {
  return (control: AbstractControl<string>) =>
    control.value && control.value < earliest && control.value !== kept
      ? { notInFuture: true }
      : null;
}

export function budgetAmount(control: AbstractControl<string>): ValidationErrors | null {
  const amount = control.value.trim();
  return !amount || BUDGET.test(amount) ? null : { budget: true };
}

/**
 * The form's raw values as the API takes them, to create a Group or edit one (both take the same
 * shape): `25,50` → 25.5, an empty budget left out.
 */
export function groupDetailsInput(form: {
  name: string;
  exchangeDate: string;
  budget: string;
  currency: Currency;
  timeZone: string;
}): GroupEdit {
  const name = form.name.trim();
  const amount = form.budget.trim();
  const { exchangeDate, currency, timeZone } = form;
  return amount
    ? { name, exchangeDate, budget: Number(amount.replace(',', '.')), currency, timeZone }
    : { name, exchangeDate, currency, timeZone };
}

/**
 * A budget as the form shows it, with the decimal separator of the Language: `30` → "30",
 * `25.5` → "25,50" ("25.50" in English), none → "".
 */
export function budgetText(budget: number | undefined): string {
  return budget === undefined ? '' : editableAmount(budget);
}

/** The Currencies an Admin picks from, euro first: it is the one a new Group starts with. */
export const CURRENCIES: readonly { readonly code: Currency; readonly label: string }[] = [
  { code: 'EUR', label: $localize`Euro (€)` },
  { code: 'USD', label: $localize`Dólar estadounidense ($)` },
];

/**
 * The sign the budget field shows, following the Currency picked as it changes. Call it where
 * `inject()` works: in a field initialiser or the constructor.
 */
export function currencySignOf(control: FormControl<Currency>): Signal<string> {
  const currency = toSignal(control.valueChanges, { initialValue: control.value });
  return computed(() => currencySymbol(currency()));
}
