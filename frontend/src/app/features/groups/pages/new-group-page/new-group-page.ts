import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideChevronLeft, LucidePlus } from '@lucide/angular';
import { AppShell } from '../../../../shared/ui/app-shell/app-shell';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { earliestExchangeDate } from '../../data-access/group-format';
import { GroupsApi, NewGroup } from '../../data-access/groups-api';
import { Alert } from '../../../../shared/ui/alert/alert';

/** Mirrors the API's rules: the name's length and the budget's shape (euros, to the cent, < 1 M). */
const NAME_MAX_LENGTH = 80;
const BUDGET = /^\d{1,6}([.,]\d{1,2})?$/;

type SubmitError = 'exchange-date-not-in-future' | 'failed';

@Component({
  selector: 'app-new-group-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    ReactiveFormsModule,
    RouterLink,
    AppShell,
    Button,
    Field,
    TextLink,
    LucideChevronLeft,
    LucidePlus,
  ],
  templateUrl: './new-group-page.html',
})
export class NewGroupPage {
  private readonly groupsApi = inject(GroupsApi);
  private readonly router = inject(Router);

  protected readonly earliestDate = earliestExchangeDate();
  protected readonly nameMaxLength = NAME_MAX_LENGTH;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(NAME_MAX_LENGTH)]],
    exchangeDate: ['', [Validators.required, notBefore(this.earliestDate)]],
    budget: ['', budgetInEuros],
  });

  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly submitError = signal<SubmitError | null>(null);

  protected showsError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.submitError.set(null);
    if (this.form.invalid || this.sending()) {
      return;
    }
    this.sending.set(true);
    const outcome = await this.groupsApi.create(this.newGroup());
    this.sending.set(false);
    if (outcome.status === 'created') {
      await this.router.navigate(['/groups', outcome.groupId]);
    } else {
      this.submitError.set(outcome.status);
    }
  }

  private newGroup(): NewGroup {
    const { name, exchangeDate, budget } = this.form.getRawValue();
    const amount = budget.trim();
    return amount
      ? { name: name.trim(), exchangeDate, budget: Number(amount.replace(',', '.')) }
      : { name: name.trim(), exchangeDate };
  }
}

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}

/** ISO dates (`YYYY-MM-DD`) compare correctly as strings. */
function notBefore(earliest: string): ValidatorFn {
  return (control: AbstractControl<string>) =>
    control.value && control.value < earliest ? { notInFuture: true } : null;
}

function budgetInEuros(control: AbstractControl<string>): ValidationErrors | null {
  const amount = control.value.trim();
  return !amount || BUDGET.test(amount) ? null : { budget: true };
}
