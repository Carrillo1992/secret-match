import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { provideApiConfiguration } from '../api/generated/api-configuration';
import { authGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { AuthSession } from './auth-session';

const API = 'http://api.test/api/v1';
const SIGN_IN_URL = `${API}/sessions`;
const REFRESH_URL = `${API}/sessions/refresh`;
const SIGN_OUT_URL = `${API}/sessions/current`;
const ME_URL = `${API}/users/me`;

const tokenResponse = (accessToken: string) => ({
  accessToken,
  expiresAt: '2026-12-01T10:15:00Z',
});
const problem = (code: string) => ({ type: `urn:secretmatch:problem:${code}`, status: 422 });
const unprocessable = { status: 422, statusText: 'Unprocessable Content' };
const unauthorized = { status: 401, statusText: 'Unauthorized' };

describe('AuthSession', () => {
  let session: AuthSession;
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    session = TestBed.inject(AuthSession);
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => http.verify());

  const signedIn = async (accessToken = 'access-1') => {
    const done = session.signIn('ana@example.com', 'turrón-y-polvorones');
    http.expectOne(SIGN_IN_URL).flush(tokenResponse(accessToken));
    await done;
  };
  // Lets an awaited request inside the interceptor resume.
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  describe('signing in', () => {
    it('posts the credentials with the cookie allowed, and keeps the access token in memory only', async () => {
      const done = session.signIn('ana@example.com', 'turrón-y-polvorones');

      const request = http.expectOne(SIGN_IN_URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        email: 'ana@example.com',
        password: 'turrón-y-polvorones',
      });
      expect(request.request.withCredentials).toBe(true);
      request.flush(tokenResponse('access-1'));

      await expect(done).resolves.toBe('signed-in');
      expect(session.isSignedIn()).toBe(true);
      expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('access-1');
    });

    it.each([
      ['invalid-credentials', 'invalid-credentials'],
      ['email-not-verified', 'email-not-verified'],
    ])('tells a %s refusal apart', async (code, outcome) => {
      const done = session.signIn('ana@example.com', 'wrong');
      http.expectOne(SIGN_IN_URL).flush(problem(code), unprocessable);

      await expect(done).resolves.toBe(outcome);
      expect(session.isSignedIn()).toBe(false);
    });

    it('reports a failure when the API cannot be reached', async () => {
      const done = session.signIn('ana@example.com', 'turrón-y-polvorones');
      http.expectOne(SIGN_IN_URL).error(new ProgressEvent('error'), { status: 0 });

      await expect(done).resolves.toBe('failed');
    });
  });

  describe('signing in with Google', () => {
    const GOOGLE_URL = `${API}/sessions/google`;

    it('posts the Google ID token with the cookie allowed, and keeps the access token', async () => {
      const done = session.signInWithGoogle('google-id-token');

      const request = http.expectOne(GOOGLE_URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ idToken: 'google-id-token' });
      expect(request.request.withCredentials).toBe(true);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush(tokenResponse('access-g'));

      await expect(done).resolves.toBe('signed-in');
      expect(session.accessToken()).toBe('access-g');
    });

    it('tells a rejected Google sign-in apart from a failure', async () => {
      const rejected = session.signInWithGoogle('forged');
      http.expectOne(GOOGLE_URL).flush(problem('google-sign-in-rejected'), unprocessable);
      await expect(rejected).resolves.toBe('rejected');

      const failed = session.signInWithGoogle('google-id-token');
      http.expectOne(GOOGLE_URL).error(new ProgressEvent('error'), { status: 0 });
      await expect(failed).resolves.toBe('failed');
      expect(session.isSignedIn()).toBe(false);
    });
  });

  describe('the interceptor', () => {
    it('sends the access token to the API, and no token to the session endpoints', async () => {
      await signedIn('access-1');

      void firstValueFrom(client.get(ME_URL));
      expect(http.expectOne(ME_URL).request.headers.get('Authorization')).toBe('Bearer access-1');

      void session.refresh();
      const refresh = http.expectOne(REFRESH_URL);
      expect(refresh.request.headers.has('Authorization')).toBe(false);
      expect(refresh.request.withCredentials).toBe(true);
      refresh.flush(tokenResponse('access-2'));
    });

    it('never sends the access token to another origin', async () => {
      await signedIn();

      void firstValueFrom(client.get('https://elsewhere.test/data'));

      expect(
        http.expectOne('https://elsewhere.test/data').request.headers.has('Authorization'),
      ).toBe(false);
    });

    it('refreshes an expired access token once and retries the request with the new one', async () => {
      await signedIn('access-1');
      const response = firstValueFrom(client.get<{ displayName: string }>(ME_URL));

      http.expectOne(ME_URL).flush(null, unauthorized);
      http.expectOne(REFRESH_URL).flush(tokenResponse('access-2'));
      await settle();
      const retry = http.expectOne(ME_URL);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
      retry.flush({ displayName: 'Ana' });

      await expect(response).resolves.toEqual({ displayName: 'Ana' });
    });

    it('sends the User to the sign-in page when the session cannot be refreshed', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      await signedIn();
      const response = firstValueFrom(client.get(ME_URL));

      http.expectOne(ME_URL).flush(null, unauthorized);
      http.expectOne(REFRESH_URL).flush(problem('session-expired'), unprocessable);

      await expect(response).rejects.toMatchObject({ status: 401 });
      expect(session.isSignedIn()).toBe(false);
      expect(navigate).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('refreshing', () => {
    it('asks the API only once when several requests need a fresh token at the same time', async () => {
      const first = session.refresh();
      const second = session.refresh();

      http.expectOne(REFRESH_URL).flush(tokenResponse('access-1'));

      await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
      expect(session.isSignedIn()).toBe(true);
    });

    it('ends up signed out when the cookie is gone', async () => {
      const done = session.refresh();
      http.expectOne(REFRESH_URL).flush(problem('session-expired'), unprocessable);

      await expect(done).resolves.toBe(false);
      expect(session.isSignedIn()).toBe(false);
    });
  });

  describe('signing out', () => {
    it('ends the session in the API and forgets the access token', async () => {
      await signedIn();

      const done = session.signOut();
      const request = http.expectOne(SIGN_OUT_URL);
      expect(request.request.method).toBe('DELETE');
      expect(request.request.withCredentials).toBe(true);
      request.flush(null, { status: 204, statusText: 'No Content' });

      await expect(done).resolves.toBe(true);
      expect(session.isSignedIn()).toBe(false);
    });

    it('stays signed in and says so when the API cannot end the session', async () => {
      await signedIn();

      const done = session.signOut();
      http.expectOne(SIGN_OUT_URL).error(new ProgressEvent('error'), { status: 0 });

      // The cookie would still bring the session back on the next reload.
      await expect(done).resolves.toBe(false);
      expect(session.isSignedIn()).toBe(true);
    });
  });

  describe('the guard', () => {
    const guard = (url: string) =>
      TestBed.runInInjectionContext(() => authGuard({} as never, { url } as never)) as Promise<
        boolean | UrlTree
      >;

    it('lets a signed-in User through without calling the API', async () => {
      await signedIn();

      await expect(guard('/home')).resolves.toBe(true);
    });

    it('silently recovers the session after a reload', async () => {
      const allowed = guard('/home');
      http.expectOne(REFRESH_URL).flush(tokenResponse('access-1'));

      await expect(allowed).resolves.toBe(true);
    });

    it('sends a visitor without a session to sign in, remembering where they were going', async () => {
      const allowed = guard('/home?tab=1');
      http.expectOne(REFRESH_URL).flush(problem('session-expired'), unprocessable);

      const redirect = await allowed;
      expect(TestBed.inject(Router).serializeUrl(redirect as UrlTree)).toBe(
        '/sign-in?next=%2Fhome%3Ftab%3D1',
      );
    });
  });
});
