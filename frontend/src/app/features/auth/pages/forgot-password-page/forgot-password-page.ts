import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideMailCheck, LucideSend } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { StatusHeader } from '../../../../shared/ui/status-header/status-header';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { PasswordResetApi } from '../../data-access/password-reset-api';
import { PASSWORD_RESET_RULES } from '../../data-access/password-reset-rules';
import { emailShape } from '../../data-access/sign-up-rules';

/**
 * A signed-out User asks for a link to set a new password. The page answers the same whether or not the
 * email has a User, as the API does.
 */
@Component({
  selector: 'app-forgot-password-page',
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
    LucideMailCheck,
    LucideSend,
  ],
  templateUrl: './forgot-password-page.html',
})
export class ForgotPasswordPage {
  private readonly passwordResetApi = inject(PasswordResetApi);

  protected readonly rules = PASSWORD_RESET_RULES;
  protected readonly form = inject(NonNullableFormBuilder).group({
    // The sign-in page hands over what was typed there through the navigation state, never the URL.
    email: [
      emailFromSignIn(inject(Router).currentNavigation()?.extras.state),
      [Validators.required, emailShape, Validators.maxLength(PASSWORD_RESET_RULES.emailMaxLength)],
    ],
  });

  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly failed = signal(false);
  /** The email the link was asked for, once the API has taken the request. */
  protected readonly sentTo = signal<string | null>(null);

  protected showsEmailError(): boolean {
    const email = this.form.controls.email;
    return email.invalid && (email.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.failed.set(false);
    if (this.form.invalid || this.sending()) {
      return;
    }
    this.sending.set(true);
    const email = this.form.getRawValue().email.trim();
    const accepted = await this.passwordResetApi.sendResetLink(email);
    this.sending.set(false);
    if (accepted) {
      this.sentTo.set(email);
    } else {
      this.failed.set(true);
    }
  }
}

function emailFromSignIn(state: Record<string, unknown> | undefined): string {
  const email = state?.['email'];
  return typeof email === 'string' ? email : '';
}
