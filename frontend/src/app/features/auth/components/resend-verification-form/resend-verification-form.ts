import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResendStatus } from '../../data-access/resend-verification';
import { SIGN_UP_RULES } from '../../data-access/sign-up-rules';

/** Asks for a new verification link for an email. */
@Component({
  selector: 'app-resend-verification-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './resend-verification-form.html',
})
export class ResendVerificationForm {
  readonly initialEmail = input('');
  readonly status = input<ResendStatus>('idle');
  readonly requested = output<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(SIGN_UP_RULES.emailMaxLength)],
    ],
  });
  protected readonly email = this.form.controls.email;
  protected readonly submitted = signal(false);

  constructor() {
    effect(() => this.email.setValue(this.initialEmail()));
  }

  protected showsError(): boolean {
    return this.email.invalid && (this.email.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.email.valid && this.status() !== 'sending') {
      this.requested.emit(this.email.value.trim());
    }
  }
}
