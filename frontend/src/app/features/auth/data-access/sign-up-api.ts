import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import { problemCode } from '../../../core/api/problem';
import {
  sendNewLinkForSignUp,
  sendNewLinkInPlaceOf,
  signUp,
  verifyEmail,
} from '../../../core/api/generated/functions';
import { SignUpRequest } from '../../../core/api/generated/models';

/**
 * `accepted` also covers an email that already has an account: the API answers both the same, with a
 * `signUpId` that then matches nothing.
 */
export type SignUpOutcome =
  | { readonly status: 'accepted'; readonly signUpId: string }
  | { readonly status: 'invalid' }
  | { readonly status: 'failed' };

export type VerifyEmailOutcome = 'verified' | 'expired' | 'used' | 'invalid' | 'failed';

const VERIFICATION_PROBLEMS: Readonly<Record<string, VerifyEmailOutcome>> = {
  'verification-link-expired': 'expired',
  'verification-link-used': 'used',
  'verification-link-invalid': 'invalid',
};

/** Sign-up and email verification, with the API's errors turned into outcomes a page can show. */
@Injectable({ providedIn: 'root' })
export class SignUpApi {
  private readonly api = inject(Api);

  async signUp(details: SignUpRequest): Promise<SignUpOutcome> {
    try {
      const { signUpId } = await this.api.invoke(signUp, { body: details });
      return { status: 'accepted', signUpId };
    } catch (error) {
      return { status: isClientError(error) ? 'invalid' : 'failed' };
    }
  }

  async verifyEmail(token: string): Promise<VerifyEmailOutcome> {
    try {
      await this.api.invoke(verifyEmail, { body: { token } });
      return 'verified';
    } catch (error) {
      return VERIFICATION_PROBLEMS[problemCode(error)] ?? 'failed';
    }
  }

  /** Resolves `true` once the API has taken the request, whether or not it sends anything. */
  newLinkForSignUp(signUpId: string): Promise<boolean> {
    return this.accepted(this.api.invoke(sendNewLinkForSignUp, { signUpId }));
  }

  /** Resolves `true` once the API has taken the request, whether or not it sends anything. */
  newLinkInPlaceOf(token: string): Promise<boolean> {
    return this.accepted(this.api.invoke(sendNewLinkInPlaceOf, { body: { token } }));
  }

  private async accepted(request: Promise<void>): Promise<boolean> {
    try {
      await request;
      return true;
    } catch {
      return false;
    }
  }
}

function isClientError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 400 || error.status === 422);
}
