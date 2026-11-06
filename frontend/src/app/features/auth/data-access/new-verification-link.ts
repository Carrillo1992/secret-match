import { inject, Injectable, signal } from '@angular/core';
import { SignUpApi } from './sign-up-api';

export type NewLinkStatus = 'idle' | 'sending' | 'sent' | 'failed';

/** Asking for a new verification link, as a status a page can show. Provide it at that page. */
@Injectable()
export class NewVerificationLink {
  private readonly signUpApi = inject(SignUpApi);
  private readonly state = signal<NewLinkStatus>('idle');

  readonly status = this.state.asReadonly();

  forSignUp(signUpId: string): Promise<void> {
    return this.send(() => this.signUpApi.newLinkForSignUp(signUpId));
  }

  inPlaceOf(token: string): Promise<void> {
    return this.send(() => this.signUpApi.newLinkInPlaceOf(token));
  }

  private async send(request: () => Promise<boolean>): Promise<void> {
    if (this.state() === 'sending') {
      return;
    }
    this.state.set('sending');
    this.state.set((await request()) ? 'sent' : 'failed');
  }
}
