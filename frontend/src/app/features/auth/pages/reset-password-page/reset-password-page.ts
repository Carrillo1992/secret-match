import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideCircleCheck, LucideClock, LucideKeyRound, LucideUnlink } from '@lucide/angular';
import { USER_RULES } from '../../../../core/auth/user-rules';
import { maxUtf8Bytes } from '../../../../shared/forms/validators';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { StatusHeader } from '../../../../shared/ui/status-header/status-header';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import {
  PasswordResetApi,
  RESET_LINK_VALIDITY_HOURS,
  ResetPasswordOutcome,
} from '../../data-access/password-reset-api';

/** `choosing`: the form. The rest are what the API answered (`failed` keeps the form, with an alert). */
type ResetPasswordStatus = 'choosing' | Exclude<ResetPasswordOutcome, 'failed'>;

/** Where the link in the Password Reset email lands: `/reset-password?token=…`. */
@Component({
  selector: 'app-reset-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    ReactiveFormsModule,
    RouterLink,
    SheetLayout,
    StatusHeader,
    Button,
    Field,
    TextLink,
    LucideCircleCheck,
    LucideClock,
    LucideKeyRound,
    LucideUnlink,
  ],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  private readonly passwordResetApi = inject(PasswordResetApi);
  private readonly token: string;

  protected readonly rules = USER_RULES;
  protected readonly linkValidityHours = RESET_LINK_VALIDITY_HOURS;
  protected readonly form = inject(NonNullableFormBuilder).group({
    newPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(USER_RULES.passwordMinLength),
        maxUtf8Bytes(USER_RULES.passwordMaxBytes),
      ],
    ],
  });

  protected readonly status = signal<ResetPasswordStatus>('choosing');
  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    const route = inject(ActivatedRoute);
    this.token = route.snapshot.queryParamMap.get('token') ?? '';
    if (this.token === '') {
      this.status.set('invalid');
    }
    // The page keeps the token in memory; the address bar and the history do not need it.
    void inject(Router).navigate([], { relativeTo: route, queryParams: {}, replaceUrl: true });
  }

  protected showsPasswordError(): boolean {
    const password = this.form.controls.newPassword;
    return password.invalid && (password.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.failed.set(false);
    if (this.form.invalid || this.sending()) {
      return;
    }
    this.sending.set(true);
    const outcome = await this.passwordResetApi.resetPassword(
      this.token,
      this.form.getRawValue().newPassword,
    );
    this.sending.set(false);
    if (outcome === 'failed') {
      this.failed.set(true);
    } else {
      this.status.set(outcome);
    }
  }
}
