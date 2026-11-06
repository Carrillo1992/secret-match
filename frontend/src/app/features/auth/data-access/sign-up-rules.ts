import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** The API's limits for a sign-up (`SignUpRequest` and the identity domain in the backend). */
export const SIGN_UP_RULES = {
  emailMaxLength: 254,
  displayNameMaxLength: 50,
  passwordMinLength: 8,
  /** BCrypt reads at most 72 bytes, so the limit is in UTF-8 bytes, not characters. */
  passwordMaxBytes: 72,
  /** How long a verification link works (`SignUpVerification.VALIDITY`). */
  linkValidityHours: 24,
} as const;

/** The API's email shape (`EmailAddress.SHAPE`): something, an `@`, and a domain with a dot. */
export const emailShape: ValidatorFn = Validators.pattern(/^\s*[^@\s]+@[^@\s]+\.[^@\s]+\s*$/);

/** Like `Validators.required`, but spaces alone do not count. */
export const notBlank: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null =>
  control.value.trim() === '' ? { required: true } : null;

export function maxUtf8Bytes(max: number): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    new TextEncoder().encode(control.value).length > max ? { maxBytes: { max } } : null;
}
