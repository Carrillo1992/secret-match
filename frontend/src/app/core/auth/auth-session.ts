import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Api } from '../api/generated/api';
import { refresh, signIn, signInWithGoogle, signOut } from '../api/generated/functions';
import { isTooManyRequests, problemCode } from '../api/problem';
import { currentLanguage } from '../language';

export type SignInOutcome =
  'signed-in' | 'invalid-credentials' | 'email-not-verified' | 'throttled' | 'failed';

/** `rejected`: the API did not trust the Google ID token (forged, expired, unverified email…). */
export type GoogleSignInOutcome = 'signed-in' | 'rejected' | 'failed';

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
  private readonly endings = new Subject<void>();

  /** The access token to send as `Authorization: Bearer`, or `null` when signed out. */
  readonly accessToken = this.token.asReadonly();
  readonly isSignedIn = computed(() => this.token() !== null);

  /**
   * Emits when the session on this device is over: signed out, account deleted, or refused by the
   * API (expired, revoked). Not when the API cannot be reached, since the session may well survive.
   */
  readonly ended: Observable<void> = this.endings.asObservable();

  async signIn(email: string, password: string): Promise<SignInOutcome> {
    try {
      const { accessToken } = await this.api.invoke(signIn, { body: { email, password } });
      this.token.set(accessToken);
      return 'signed-in';
    } catch (error) {
      if (isTooManyRequests(error)) {
        return 'throttled';
      }
      const code = problemCode(error);
      return code === 'invalid-credentials' || code === 'email-not-verified' ? code : 'failed';
    }
  }

  /**
   * Opens a session with the ID token Google Identity Services gave the SPA. A new email gets a User;
   * an existing one is linked to the Google account. A new User gets the current Language.
   */
  async signInWithGoogle(idToken: string): Promise<GoogleSignInOutcome> {
    try {
      const { accessToken } = await this.api.invoke(signInWithGoogle, {
        body: { idToken, language: currentLanguage() },
      });
      this.token.set(accessToken);
      return 'signed-in';
    } catch (error) {
      return problemCode(error) === 'google-sign-in-rejected' ? 'rejected' : 'failed';
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

  /**
   * Ends the session in the API, then forgets the access token. If the API cannot be reached the
   * User stays signed in: the refresh cookie would bring the session back on the next reload anyway.
   *
   * @returns whether the session ended
   */
  async signOut(): Promise<boolean> {
    try {
      await this.api.invoke(signOut);
    } catch {
      return false;
    }
    this.token.set(null);
    this.endings.next();
    return true;
  }

  /**
   * Forgets the session of an account that was just deleted. Its Sessions already ended in the API;
   * signing out there too only clears the refresh cookie, so a failure there changes nothing.
   */
  async endDeletedSession(): Promise<void> {
    this.token.set(null);
    this.endings.next();
    try {
      await this.api.invoke(signOut);
    } catch {
      // The cookie left behind no longer works: its session was deleted with the account.
    }
  }

  private async requestRefresh(): Promise<boolean> {
    try {
      const { accessToken } = await this.api.invoke(refresh);
      this.token.set(accessToken);
      return true;
    } catch (error) {
      this.token.set(null);
      if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500) {
        this.endings.next();
      }
      return false;
    }
  }
}
