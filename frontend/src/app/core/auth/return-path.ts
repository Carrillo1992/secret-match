/** Where a signed-out User is sent when there is nowhere better to go after signing in. */
export const HOME = '/home';

/**
 * The path itself if it is a page inside the SPA, otherwise `null`: `//host`, `/\host` or
 * `https://…` would send the User off-site.
 */
export function safeReturnPath(path: string | null | undefined): string | null {
  return path?.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : null;
}

const KEY = 'secretmatch.returnPath';

/**
 * Remembers where a User signing up was going (e.g. an Invite Link) across the email
 * verification, which often opens in another tab. Only this browser remembers it; if storage is
 * unavailable the User simply lands on their home page and can open the link again.
 */
export function rememberReturnPath(path: string): void {
  const safe = safeReturnPath(path);
  if (safe === null) {
    return;
  }
  try {
    localStorage.setItem(KEY, safe);
  } catch {
    // Storage blocked (private mode, disabled site data): nothing to remember with.
  }
}

/** The path remembered at sign-up, if any and still safe. */
export function rememberedReturnPath(): string | null {
  try {
    return safeReturnPath(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function forgetReturnPath(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing was stored either.
  }
}
