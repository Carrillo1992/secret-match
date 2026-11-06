import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** The API's limits for a sign-up (see `SignUpRequest` in the generated client). */
export const SIGN_UP_RULES = {
  emailMaxLength: 254,
  displayNameMaxLength: 50,
  passwordMinLength: 8,
  /** BCrypt reads at most 72 bytes, so the limit is in UTF-8 bytes, not characters. */
  passwordMaxBytes: 72,
} as const;

/** Like `Validators.required`, but spaces alone do not count. */
export const notBlank: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null =>
  control.value.trim() === '' ? { required: true } : null;

export function maxUtf8Bytes(max: number): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    new TextEncoder().encode(control.value).length > max ? { maxBytes: { max } } : null;
}
