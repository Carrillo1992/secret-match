import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideChevronLeft, LucidePlus } from '@lucide/angular';
import { AppShell } from '../../../../shared/ui/app-shell/app-shell';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import {
  budgetAmount,
  CURRENCIES,
  currencySignOf,
  groupDetailsInput,
  NAME_MAX_LENGTH,
  notBefore,
} from '../../data-access/group-details-form';
import { notBlank } from '../../../../shared/forms/validators';
import { earliestExchangeDate } from '../../data-access/group-format';
import { GroupsApi } from '../../data-access/groups-api';
import { browserTimeZone, timeZoneRegions } from '../../data-access/time-zones';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Currency } from '../../../../shared/format/money';

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
  private readonly defaultTimeZone = browserTimeZone();
  protected readonly timeZoneRegions = timeZoneRegions([this.defaultTimeZone]);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(NAME_MAX_LENGTH)]],
    exchangeDate: ['', [Validators.required, notBefore(this.earliestDate)]],
    budget: ['', budgetAmount],
    currency: ['EUR' as Currency],
    timeZone: [this.defaultTimeZone, Validators.required],
  });

  protected readonly currencies = CURRENCIES;
  /** The budget field shows the sign of the Currency picked, as it changes. */
  protected readonly currencySign = currencySignOf(this.form.controls.currency);

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
    const outcome = await this.groupsApi.create(groupDetailsInput(this.form.getRawValue()));
    this.sending.set(false);
    if (outcome.status === 'created') {
      await this.router.navigate(['/groups', outcome.groupId]);
    } else {
      this.submitError.set(outcome.status);
    }
  }
}
