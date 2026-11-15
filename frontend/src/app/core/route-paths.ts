/**
 * The one place the sign-in and home routes are named. `app.routes` declares the segments; links,
 * guards and navigation use the absolute paths, so renaming a route is a single edit here.
 */
export const SIGN_IN_SEGMENT = 'sign-in';
export const HOME_SEGMENT = 'home';

/** The sign-in page, where a visitor without a session is sent. */
export const SIGN_IN = `/${SIGN_IN_SEGMENT}`;

/** A signed-in User's home page, and where they land when there is nowhere better to go. */
export const HOME = `/${HOME_SEGMENT}`;
