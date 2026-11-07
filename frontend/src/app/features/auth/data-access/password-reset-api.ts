import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import { resetPassword, sendResetLink } from '../../../core/api/generated/functions';
import { problemCode } from '../../../core/api/problem';

export type ResetPasswordOutcome = 'reset' | 'expired' | 'used' | 'invalid' | 'failed';

const RESET_PROBLEMS: Readonly<Record<string, ResetPasswordOutcome>> = {
  'reset-link-expired': 'expired',
  'reset-link-used': 'used',
  'reset-link-invalid': 'invalid',
};

/** How long a reset link works (`PasswordReset.VALIDITY` in the backend). */
export const RESET_LINK_VALIDITY_HOURS = 1;

/** Password Reset, with the API's errors turned into outcomes a page can show. */
@Injectable({ providedIn: 'root' })
export class PasswordResetApi {
  private readonly api = inject(Api);

  /** Resolves `true` once the API has taken the request, whether or not the email has a User. */
  async sendResetLink(email: string): Promise<boolean> {
    try {
      await this.api.invoke(sendResetLink, { body: { email } });
      return true;
    } catch {
      return false;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordOutcome> {
    try {
      await this.api.invoke(resetPassword, { body: { token, newPassword } });
      return 'reset';
    } catch (error) {
      return RESET_PROBLEMS[problemCode(error)] ?? 'failed';
    }
  }
}
