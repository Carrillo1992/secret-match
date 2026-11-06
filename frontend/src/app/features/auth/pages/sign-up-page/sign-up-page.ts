import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideGift } from '@lucide/angular';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { SignUpApi } from '../../data-access/sign-up-api';
import { emailShape, maxUtf8Bytes, notBlank, SIGN_UP_RULES } from '../../data-access/sign-up-rules';

type SubmitError = 'invalid' | 'failed';

@Component({
  selector: 'app-sign-up-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, SheetLayout, LucideGift],
  templateUrl: './sign-up-page.html',
})
export class SignUpPage {
  private readonly signUpApi = inject(SignUpApi);
  private readonly router = inject(Router);

  protected readonly rules = SIGN_UP_RULES;
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: [
      '',
      [Validators.required, emailShape, Validators.maxLength(SIGN_UP_RULES.emailMaxLength)],
    ],
    displayName: ['', [notBlank, Validators.maxLength(SIGN_UP_RULES.displayNameMaxLength)]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(SIGN_UP_RULES.passwordMinLength),
        maxUtf8Bytes(SIGN_UP_RULES.passwordMaxBytes),
      ],
    ],
  });

  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly submitError = signal<SubmitError | null>(null);

  protected showsError(control: FormControl<string>): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.submitError.set(null);
    if (this.form.invalid || this.sending()) {
      return;
    }
    this.sending.set(true);
    const { email, displayName, password } = this.form.getRawValue();
    const outcome = await this.signUpApi.signUp({
      email: email.trim(),
      displayName: displayName.trim(),
      password,
    });
    this.sending.set(false);
    if (outcome.status === 'accepted') {
      // The id may go in the URL: it only lets someone ask for a new link to the same inbox.
      // The email stays out of it, so it never lands in history or server logs.
      await this.router.navigate(['/check-email'], {
        queryParams: { signUp: outcome.signUpId },
        state: { email: email.trim() },
      });
    } else {
      this.submitError.set(outcome.status);
    }
  }
}
