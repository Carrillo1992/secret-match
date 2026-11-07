import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Like `Validators.required`, but spaces alone do not count. */
export const notBlank: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null =>
  control.value.trim() === '' ? { required: true } : null;

/** At most `max` bytes once encoded as UTF-8 (BCrypt's limit for passwords is in bytes). */
export function maxUtf8Bytes(max: number): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    new TextEncoder().encode(control.value).length > max ? { maxBytes: { max } } : null;
}
