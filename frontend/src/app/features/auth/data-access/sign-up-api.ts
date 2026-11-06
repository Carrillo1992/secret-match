import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import { sendVerificationEmail, signUp, verifyEmail } from '../../../core/api/generated/functions';
import { SignUpRequest } from '../../../core/api/generated/models';

export type SignUpDetails = SignUpRequest;

/** `accepted` also covers an email that already has an account: the API answers both the same. */
export type SignUpOutcome = 'accepted' | 'invalid' | 'failed';

export type VerifyEmailOutcome = 'verified' | 'expired' | 'used' | 'invalid' | 'failed';

const PROBLEM_TYPE_PREFIX = 'urn:secretmatch:problem:';

const VERIFICATION_PROBLEMS: Readonly<Record<string, VerifyEmailOutcome>> = {
  'verification-link-expired': 'expired',
  'verification-link-used': 'used',
  'verification-link-invalid': 'invalid',
};

/** Sign-up and email verification, with the API's errors turned into outcomes a page can show. */
@Injectable({ providedIn: 'root' })
export class SignUpApi {
  private readonly api = inject(Api);

  async signUp(details: SignUpDetails): Promise<SignUpOutcome> {
    try {
      await this.api.invoke(signUp, { body: details });
      return 'accepted';
    } catch (error) {
      return isClientError(error) ? 'invalid' : 'failed';
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
  async sendVerificationEmail(email: string): Promise<boolean> {
    try {
      await this.api.invoke(sendVerificationEmail, { body: { email } });
      return true;
    } catch {
      return false;
    }
  }
}

function isClientError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 400 || error.status === 422);
}

function problemCode(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return '';
  }
  const type = problemBody(error.error)?.type;
  return typeof type === 'string' && type.startsWith(PROBLEM_TYPE_PREFIX)
    ? type.slice(PROBLEM_TYPE_PREFIX.length)
    : '';
}

/** Endpoints without a response body are read as text, so their problems arrive as JSON text. */
function problemBody(body: unknown): { type?: unknown } | null {
  if (typeof body !== 'string') {
    return typeof body === 'object' ? (body as { type?: unknown } | null) : null;
  }
  try {
    return JSON.parse(body) as { type?: unknown } | null;
  } catch {
    return null;
  }
}
