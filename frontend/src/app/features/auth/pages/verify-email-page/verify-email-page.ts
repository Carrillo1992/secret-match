import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ResendVerificationForm } from '../../components/resend-verification-form/resend-verification-form';
import { ResendVerification } from '../../data-access/resend-verification';
import { SignUpApi, VerifyEmailOutcome } from '../../data-access/sign-up-api';

type VerifyEmailStatus = 'verifying' | VerifyEmailOutcome;

/** Where the link in the verification email lands: `/verify-email?token=…`. */
@Component({
  selector: 'app-verify-email-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResendVerificationForm, RouterLink],
  templateUrl: './verify-email-page.html',
  providers: [ResendVerification],
})
export class VerifyEmailPage {
  private readonly signUpApi = inject(SignUpApi);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  protected readonly resend = inject(ResendVerification);
  protected readonly status = signal<VerifyEmailStatus>('verifying');

  constructor() {
    void this.verify();
  }

  protected async verify(): Promise<void> {
    if (this.token === '') {
      this.status.set('invalid');
      return;
    }
    this.status.set('verifying');
    this.status.set(await this.signUpApi.verifyEmail(this.token));
  }
}
