import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';

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
  return router.createUrlTree(['/sign-in'], { queryParams: { next: state.url } });
};
