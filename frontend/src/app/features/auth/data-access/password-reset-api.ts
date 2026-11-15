import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import { resetPassword, sendResetLink } from '../../../core/api/generated/functions';
import { isTooManyRequests, problemCode } from '../../../core/api/problem';
import { accepted, RequestOutcome } from './accepted';

export type ResetPasswordOutcome =
  'reset' | 'expired' | 'used' | 'invalid' | 'throttled' | 'failed';

const RESET_PROBLEMS: Readonly<Record<string, ResetPasswordOutcome>> = {
  'reset-link-expired': 'expired',
  'reset-link-used': 'used',
  'reset-link-invalid': 'invalid',
};

/** Password Reset, with the API's errors turned into outcomes a page can show. */
@Injectable({ providedIn: 'root' })
export class PasswordResetApi {
  private readonly api = inject(Api);

  /** Resolves `accepted` once the API has taken the request, whether or not the email has a User. */
  sendResetLink(email: string): Promise<RequestOutcome> {
    return accepted(this.api.invoke(sendResetLink, { body: { email } }));
  }

  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordOutcome> {
    try {
      await this.api.invoke(resetPassword, { body: { token, newPassword } });
      return 'reset';
    } catch (error) {
      if (isTooManyRequests(error)) {
        return 'throttled';
      }
      return RESET_PROBLEMS[problemCode(error)] ?? 'failed';
    }
  }
}
