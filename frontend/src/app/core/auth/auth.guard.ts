import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';
import { HOME, SIGN_IN } from '../route-paths';

/**
 * Lets only a signed-in User in. After a reload the access token is gone, so it first tries to
 * bring the session back from the refresh cookie; without one, it sends the visitor to sign in
 * and remembers where they were going.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AuthSession);
  const router = inject(Router);
  if (session.isSignedIn() || (await session.refresh())) {
    return true;
  }
  return router.createUrlTree([SIGN_IN], { queryParams: { next: state.url } });
};

/**
 * Sends a User whose session is alive from the landing to their home page (#124). The installed app
 * opens at `/`, so without this a User coming back to it would look signed out. Without a session,
 * or when the API cannot be reached, the landing shows.
 */
export const signedInToHomeGuard: CanActivateFn = async () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  if (session.isSignedIn() || (await session.refresh())) {
    return router.parseUrl(HOME);
  }
  return true;
};
