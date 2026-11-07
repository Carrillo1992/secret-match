import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * The rules and shapes shared by the forms that create and edit a Group. They mirror the API's
 * rules: the name's length and the budget's shape (euros, to the cent, < 1 M).
 */

export const NAME_MAX_LENGTH = 80;
const BUDGET = /^\d{1,6}([.,]\d{1,2})?$/;

/** A Group's details as they go to the API: a budget left empty is left out. */
export interface GroupDetailsInput {
  readonly name: string;
  readonly exchangeDate: string;
  readonly budget?: number;
}

export function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}

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

export function budgetInEuros(control: AbstractControl<string>): ValidationErrors | null {
  const amount = control.value.trim();
  return !amount || BUDGET.test(amount) ? null : { budget: true };
}

/** The form's raw values as the API takes them: `25,50` → 25.5, an empty budget left out. */
export function groupDetailsInput(form: {
  name: string;
  exchangeDate: string;
  budget: string;
}): GroupDetailsInput {
  const name = form.name.trim();
  const amount = form.budget.trim();
  return amount
    ? { name, exchangeDate: form.exchangeDate, budget: Number(amount.replace(',', '.')) }
    : { name, exchangeDate: form.exchangeDate };
}

/** A budget as the form shows it: `30` → "30", `25.5` → "25,50", none → "". */
export function budgetText(budget: number | undefined): string {
  if (budget === undefined) {
    return '';
  }
  return Number.isInteger(budget) ? String(budget) : budget.toFixed(2).replace('.', ',');
}
