import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideLogIn } from '@lucide/angular';
import { AuthSession, SignInOutcome } from '../../../../core/auth/auth-session';
import { forgetReturnPath, HOME, safeReturnPath } from '../../../../core/auth/return-path';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { Alert } from '../../../../shared/ui/alert/alert';

type SubmitError = Exclude<SignInOutcome, 'signed-in'>;

@Component({
  selector: 'app-sign-in-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    ReactiveFormsModule,
    RouterLink,
    SheetLayout,
    Button,
    Field,
    TextLink,
    LucideLogIn,
  ],
  templateUrl: './sign-in-page.html',
})
export class SignInPage {
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  /** Where the User was going, if it is a page inside the SPA. */
  protected readonly next = safeReturnPath(
    inject(ActivatedRoute).snapshot.queryParamMap.get('next'),
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', Validators.required],
    password: ['', Validators.required],
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
    const { email, password } = this.form.getRawValue();
    const outcome = await this.session.signIn(email.trim(), password);
    this.sending.set(false);
    if (outcome === 'signed-in') {
      forgetReturnPath();
      await this.router.navigateByUrl(this.next ?? HOME);
    } else {
      this.submitError.set(outcome);
    }
  }
}
