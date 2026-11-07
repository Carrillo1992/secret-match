import { ValidatorFn, Validators } from '@angular/forms';
import { USER_RULES } from '../../../core/auth/user-rules';

/** The API's limits for a sign-up (`SignUpRequest` and the identity domain in the backend). */
export const SIGN_UP_RULES = {
  ...USER_RULES,
  emailMaxLength: 254,
  /** How long a verification link works (`SignUpVerification.VALIDITY`). */
  linkValidityHours: 24,
} as const;

/** The API's email shape (`EmailAddress.SHAPE`): something, an `@`, and a domain with a dot. */
export const emailShape: ValidatorFn = Validators.pattern(/^\s*[^@\s]+@[^@\s]+\.[^@\s]+\s*$/);
