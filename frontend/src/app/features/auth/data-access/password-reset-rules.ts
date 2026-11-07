import { USER_RULES } from '../../../core/auth/user-rules';

/** The API's limits for a Password Reset (`PasswordReset` and `PasswordResetRequest` in the backend). */
export const PASSWORD_RESET_RULES = {
  ...USER_RULES,
  /** How long a reset link works (`PasswordReset.VALIDITY`). */
  linkValidityHours: 1,
} as const;
