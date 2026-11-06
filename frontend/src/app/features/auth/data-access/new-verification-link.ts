import { inject, Injectable, signal } from '@angular/core';
import { SignUpApi } from './sign-up-api';

export type ResendStatus = 'idle' | 'sending' | 'sent' | 'failed';

/** Asking for a new verification link, as a status a page can show. Provide it at that page. */
@Injectable()
export class ResendVerification {
  private readonly signUpApi = inject(SignUpApi);
  private readonly state = signal<ResendStatus>('idle');

  readonly status = this.state.asReadonly();

  async send(email: string): Promise<void> {
    if (this.state() === 'sending') {
      return;
    }
    this.state.set('sending');
    this.state.set((await this.signUpApi.sendVerificationEmail(email)) ? 'sent' : 'failed');
  }
}
