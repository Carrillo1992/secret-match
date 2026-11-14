import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideApiConfiguration } from '../api/generated/api-configuration';
import { authInterceptor } from '../auth/auth.interceptor';
import { AuthSession } from '../auth/auth-session';
import { LanguagePreference, PAGE_RELOAD } from './language-preference';

const API = 'http://api.test/api/v1';
const REFRESH_URL = `${API}/sessions/refresh`;
const SIGN_IN_URL = `${API}/sessions`;
const ME_URL = `${API}/users/me`;

const tokenResponse = { accessToken: 'access-1', expiresAt: '2026-12-01T10:15:00Z' };
const user = (language: 'es' | 'en') => ({
  displayName: 'Ana',
  email: 'ana@example.com',
  hasPassword: true,
  language,
});

@Component({ template: '' })
class Blank {}

describe('LanguagePreference following the User', () => {
  let http: HttpTestingController;
  let session: AuthSession;
  let reload: ReturnType<typeof vi.fn>;
  /** Holds the way into /home until a test lets it through, as a guard or a lazy page would. */
  let letIntoHome: (allowed: boolean) => void;

  beforeEach(() => {
    reload = vi.fn();
    const intoHome = new Promise<boolean>((resolve) => (letIntoHome = resolve));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'sign-in', component: Blank },
          { path: 'home', component: Blank, canActivate: [() => intoHome] },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
        { provide: PAGE_RELOAD, useValue: reload },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSession);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  /** As the app does at start, with the page running in the Language resolved then. */
  const follow = () => {
    TestBed.inject(LanguagePreference).followTheUser();
    TestBed.tick();
  };
  const restoreSession = async () => {
    const restored = session.refresh();
    http.expectOne(REFRESH_URL).flush(tokenResponse);
    await restored;
    TestBed.tick();
  };
  // Lets the awaited request resume.
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  it('switches an English screen to Spanish when a Spanish User comes back', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-GB']);
    follow();

    await restoreSession();
    http.expectOne(ME_URL).flush(user('es'));
    await settle();

    expect(localStorage.getItem('secretmatch.language')).toBe('es');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('leaves the screen alone when it already speaks the User Language', async () => {
    follow();

    await restoreSession();
    http.expectOne(ME_URL).flush(user('es'));
    await settle();

    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads only once signing in has taken the User where they were going', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/sign-in');
    follow();

    const signedIn = session.signIn('ana@example.com', 'turrón-y-polvorones');
    http.expectOne(SIGN_IN_URL).flush(tokenResponse);
    await signedIn;
    TestBed.tick();
    const entering = router.navigateByUrl('/home');
    http.expectOne(ME_URL).flush(user('en'));
    await settle();
    expect(reload).not.toHaveBeenCalled();

    letIntoHome(true);
    await entering;

    expect(router.url).toBe('/home');
    expect(localStorage.getItem('secretmatch.language')).toBe('en');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload over and over when this device cannot keep a Language', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    follow();

    await restoreSession();
    http.expectOne(ME_URL).flush(user('en'));
    await settle();

    expect(reload).not.toHaveBeenCalled();
  });

  it('keeps the screen Language when the User cannot be loaded', async () => {
    follow();

    await restoreSession();
    http.expectOne(ME_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();

    expect(reload).not.toHaveBeenCalled();
  });

  it('asks nothing while nobody is signed in', () => {
    follow();

    http.expectNone(ME_URL);
  });
});
