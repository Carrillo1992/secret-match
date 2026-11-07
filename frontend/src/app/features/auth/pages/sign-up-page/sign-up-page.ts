import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideGift } from '@lucide/angular';
import {
  forgetReturnPath,
  HOME,
  rememberReturnPath,
  safeReturnPath,
} from '../../../../core/auth/return-path';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { SignUpApi } from '../../data-access/sign-up-api';
import { maxUtf8Bytes, notBlank } from '../../../../shared/forms/validators';
import { emailShape, SIGN_UP_RULES } from '../../data-access/sign-up-rules';
import { Alert } from '../../../../shared/ui/alert/alert';
import { GoogleSignIn } from '../../components/google-sign-in/google-sign-in';

type SubmitError = 'invalid' | 'failed';

@Component({
  selector: 'app-sign-up-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    GoogleSignIn,
    ReactiveFormsModule,
    RouterLink,
    SheetLayout,
    Button,
    Field,
    TextLink,
    LucideGift,
  ],
  templateUrl: './sign-up-page.html',
})
export class SignUpPage {
  private readonly signUpApi = inject(SignUpApi);
  private readonly router = inject(Router);
  /** Where the User was going, e.g. an Invite Link: they get there when they sign in. */
  protected readonly next = safeReturnPath(
    inject(ActivatedRoute).snapshot.queryParamMap.get('next'),
  );

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
      if (this.next) {
        rememberReturnPath(this.next);
      }
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

  /** Google verified the email already: the User goes straight where they were going, or home. */
  protected async enter(): Promise<void> {
    forgetReturnPath();
    await this.router.navigateByUrl(this.next ?? HOME);
  }
}
