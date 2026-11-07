import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import { changeDisplayName, changePassword } from '../../../core/api/generated/functions';
import { CurrentUserResponse } from '../../../core/api/generated/models';
import { problemCode } from '../../../core/api/problem';

export type Me = CurrentUserResponse;

export type DisplayNameOutcome =
  { readonly status: 'saved'; readonly me: Me } | { readonly status: 'failed' };

export type PasswordOutcome =
  | { readonly status: 'changed' }
  | { readonly status: 'wrong-password' }
  | { readonly status: 'failed' };

/** The signed-in User's own profile, with the API's errors turned into outcomes a page can show. */
@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly api = inject(Api);

  async changeDisplayName(displayName: string): Promise<DisplayNameOutcome> {
    try {
      return {
        status: 'saved',
        me: await this.api.invoke(changeDisplayName, { body: { displayName } }),
      };
    } catch {
      return { status: 'failed' };
    }
  }

  /**
   * Changes the password, or sets a first one when `currentPassword` is left out (a User who only
   * signs in with Google). The API ends the User's Sessions on every other device.
   */
  async changePassword(newPassword: string, currentPassword?: string): Promise<PasswordOutcome> {
    try {
      await this.api.invoke(changePassword, { body: { currentPassword, newPassword } });
      return { status: 'changed' };
    } catch (error) {
      return { status: problemCode(error) === 'wrong-password' ? 'wrong-password' : 'failed' };
    }
  }
}
