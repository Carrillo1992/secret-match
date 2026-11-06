import { computed, inject, Injectable, signal } from '@angular/core';
import { Api } from '../api/generated/api';
import { refresh, signIn, signOut } from '../api/generated/functions';
import { problemCode } from '../api/problem';

export type SignInOutcome = 'signed-in' | 'invalid-credentials' | 'email-not-verified' | 'failed';

/**
 * The signed-in User's session (docs/architecture.md §2.4). The access token lives only in memory;
 * the refresh token lives in an `HttpOnly` cookie the SPA never sees, so after a reload the session
 * comes back through {@link refresh}.
 */
@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly api = inject(Api);
  private readonly token = signal<string | null>(null);
  private refreshing: Promise<boolean> | null = null;

  /** The access token to send as `Authorization: Bearer`, or `null` when signed out. */
  readonly accessToken = this.token.asReadonly();
  readonly isSignedIn = computed(() => this.token() !== null);

  async signIn(email: string, password: string): Promise<SignInOutcome> {
    try {
      const { accessToken } = await this.api.invoke(signIn, { body: { email, password } });
      this.token.set(accessToken);
      return 'signed-in';
    } catch (error) {
      const code = problemCode(error);
      return code === 'invalid-credentials' || code === 'email-not-verified' ? code : 'failed';
    }
  }

  /**
   * Swaps the refresh cookie for a new access token. Calls made while one is in flight share it:
   * the API rotates the cookie on every refresh, and a second refresh with the old cookie would
   * count as a reuse and end the session.
   *
   * @returns whether the User is signed in afterwards
   */
  refresh(): Promise<boolean> {
    this.refreshing ??= this.requestRefresh().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  /** Ends the session in the API. The SPA forgets it either way. */
  async signOut(): Promise<void> {
    this.token.set(null);
    try {
      await this.api.invoke(signOut);
    } catch {
      // The access token is gone already; an unreachable API only leaves the cookie to expire.
    }
  }

  private async requestRefresh(): Promise<boolean> {
    try {
      const { accessToken } = await this.api.invoke(refresh);
      this.token.set(accessToken);
      return true;
    } catch {
      this.token.set(null);
      return false;
    }
  }
}
