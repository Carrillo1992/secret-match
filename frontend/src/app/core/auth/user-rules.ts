/** The API's limits for a User's details (the identity domain in the backend). */
export const USER_RULES = {
  emailMaxLength: 254,
  displayNameMaxLength: 50,
  passwordMinLength: 8,
  /** BCrypt reads at most 72 bytes, so the limit is in UTF-8 bytes, not characters. */
  passwordMaxBytes: 72,
} as const;
