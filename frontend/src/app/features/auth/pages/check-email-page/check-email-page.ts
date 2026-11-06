import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResendVerificationForm } from '../../components/resend-verification-form/resend-verification-form';
import { ResendVerification } from '../../data-access/resend-verification';

/** After a sign-up: "check your email", with a way to ask for the link again. */
@Component({
  selector: 'app-check-email-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResendVerificationForm, RouterLink],
  templateUrl: './check-email-page.html',
  providers: [ResendVerification],
})
export class CheckEmailPage {
  protected readonly resend = inject(ResendVerification);
  /** Handed over by the sign-up page; gone after a reload, when the page asks for it instead. */
  protected readonly email = emailFrom(inject(Location).getState());
}

function emailFrom(state: unknown): string {
  const email = (state as { email?: unknown } | null)?.email;
  return typeof email === 'string' ? email : '';
}
