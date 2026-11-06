import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, Observable, switchMap, throwError } from 'rxjs';
import { ApiConfiguration } from '../api/generated/api-configuration';
import { AuthSession } from './auth-session';

/** The endpoints that open, refresh and end a session: the only ones the refresh cookie goes to. */
const SESSIONS_PATH = '/api/v1/sessions';

/**
 * Sends the access token to the API, and the refresh cookie to the session endpoints. When the API
 * answers 401, it refreshes the session once and retries; if that fails, it sends the User to sign
 * in.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiRoot = inject(ApiConfiguration).rootUrl;
  if (!request.url.startsWith(`${apiRoot}/`)) {
    return next(request);
  }
  if (request.url.startsWith(`${apiRoot}${SESSIONS_PATH}`)) {
    return next(request.clone({ withCredentials: true }));
  }

  const session = inject(AuthSession);
  const router = inject(Router);
  return next(withAccessToken(request, session.accessToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return retryAfterRefresh(request, next, session, router, error);
    }),
  );
};

function retryAfterRefresh(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  session: AuthSession,
  router: Router,
  unauthorized: HttpErrorResponse,
): Observable<HttpEvent<unknown>> {
  return from(session.refresh()).pipe(
    switchMap((signedIn) => {
      if (!signedIn) {
        void router.navigateByUrl('/sign-in');
        return throwError(() => unauthorized);
      }
      return next(withAccessToken(request, session.accessToken()));
    }),
  );
}

function withAccessToken(
  request: HttpRequest<unknown>,
  token: string | null,
): HttpRequest<unknown> {
  return token === null
    ? request
    : request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
