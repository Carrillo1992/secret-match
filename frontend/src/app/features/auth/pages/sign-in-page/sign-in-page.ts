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
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { TextLink } from '../../../../shared/ui/text-link/text-link';

type SubmitError = Exclude<SignInOutcome, 'signed-in'>;

/** Where a signed-in User lands unless they were on their way somewhere else. */
const HOME = '/home';

@Component({
  selector: 'app-sign-in-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, SheetLayout, Button, Field, TextLink, LucideLogIn],
  templateUrl: './sign-in-page.html',
})
export class SignInPage {
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly next = inject(ActivatedRoute).snapshot.queryParamMap.get('next');

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
      await this.router.navigateByUrl(this.destination());
    } else {
      this.submitError.set(outcome);
    }
  }

  /** Only a path inside the SPA: `//host` or `https://…` would send the User off-site. */
  private destination(): string {
    const next = this.next ?? '';
    return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : HOME;
  }
}
