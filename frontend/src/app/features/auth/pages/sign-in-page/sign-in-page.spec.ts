import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';
import { rememberedReturnPath, rememberReturnPath } from '../../../../core/auth/return-path';
import { GoogleIdentity } from '../../../../core/auth/google-identity';
import { SignInPage } from './sign-in-page';

const SIGN_IN_URL = 'http://api.test/api/v1/sessions';

@Component({ template: '<h1>Destino</h1>' })
class Destination {}

const problem = (code: string) => ({ type: `urn:secretmatch:problem:${code}`, status: 422 });
const unprocessable = { status: 422, statusText: 'Unprocessable Content' };
const signedIn = { accessToken: 'access-1', expiresAt: '2026-12-01T10:15:00Z' };

describe('SignInPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'sign-in', component: SignInPage },
          { path: 'home', component: Destination },
          { path: 'groups/1', component: Destination },
          { path: 'forgot-password', component: Destination },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  const field = (label: string) => {
    const labelElement = [...page().querySelectorAll('label')].find((l) =>
      l.textContent?.includes(label),
    );
    const input = page().querySelector<HTMLInputElement>(`#${labelElement?.htmlFor ?? 'missing'}`);
    if (!input) {
      throw new Error(`No field labelled "${label}"`);
    }
    return input;
  };
  const type = (label: string, value: string) => {
    const input = field(label);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    page().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await harness.fixture.whenStable();
  };
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  };
  const errorFor = (label: string) => {
    const describedBy = field(label).getAttribute('aria-describedby');
    return describedBy ? (page().querySelector(`#${describedBy}`)?.textContent ?? '') : '';
  };
  const alert = () => page().querySelector('[role="alert"]')?.textContent ?? '';
  const fillAndSubmit = async () => {
    type('Correo electrónico', ' ana@example.com ');
    type('Contraseña', 'turrón-y-polvorones');
    await submit();
  };

  it('labels both fields and links to the sign-up', async () => {
    await harness.navigateByUrl('/sign-in');

    expect(field('Correo electrónico').type).toBe('email');
    expect(field('Contraseña').type).toBe('password');
    expect(field('Contraseña').autocomplete).toBe('current-password');
    expect(page().querySelector('a[href="/sign-up"]')?.textContent).toContain('Crea una');
  });

  it('shows what is missing next to each field and sends nothing', async () => {
    await harness.navigateByUrl('/sign-in');
    await submit();

    expect(errorFor('Correo electrónico')).toContain('Escribe tu correo');
    expect(errorFor('Contraseña')).toContain('Escribe tu contraseña');
    http.expectNone(SIGN_IN_URL);
  });

  it('signs in and goes to the home page', async () => {
    await harness.navigateByUrl('/sign-in');
    await fillAndSubmit();

    const request = http.expectOne(SIGN_IN_URL);
    expect(request.request.body).toEqual({
      email: 'ana@example.com',
      password: 'turrón-y-polvorones',
    });
    request.flush(signedIn);
    await settle();

    expect(TestBed.inject(Router).url).toBe('/home');
  });

  it('goes back to the page the User was trying to open', async () => {
    await harness.navigateByUrl('/sign-in?next=%2Fgroups%2F1');
    await fillAndSubmit();
    http.expectOne(SIGN_IN_URL).flush(signedIn);
    await settle();

    expect(TestBed.inject(Router).url).toBe('/groups/1');
  });

  it('keeps where the User was going when they go to create an account instead', async () => {
    await harness.navigateByUrl('/sign-in?next=%2Fjoin%2Fq8Xf3kL0');

    expect(
      [...page().querySelectorAll('a')]
        .find((a) => a.textContent?.includes('Crea una'))
        ?.getAttribute('href'),
    ).toBe('/sign-up?next=%2Fjoin%2Fq8Xf3kL0');
  });

  it('forgets a destination remembered at sign-up once the User is signed in', async () => {
    rememberReturnPath('/join/q8Xf3kL0');
    await harness.navigateByUrl('/sign-in?next=%2Fgroups%2F1');
    await fillAndSubmit();
    http.expectOne(SIGN_IN_URL).flush(signedIn);
    await settle();

    expect(rememberedReturnPath()).toBeNull();
  });

  it('ignores a "next" that points outside the app', async () => {
    await harness.navigateByUrl('/sign-in?next=%2F%2Fevil.test');
    await fillAndSubmit();
    http.expectOne(SIGN_IN_URL).flush(signedIn);
    await settle();

    expect(TestBed.inject(Router).url).toBe('/home');
  });

  it('disables the button while signing in', async () => {
    await harness.navigateByUrl('/sign-in');
    await fillAndSubmit();

    const button = page().querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Entrando');
    http.expectOne(SIGN_IN_URL).flush(signedIn);
    await settle();
  });

  it.each([
    ['invalid-credentials', 'El correo o la contraseña no son correctos'],
    ['email-not-verified', 'Aún no has confirmado tu correo'],
  ])('explains a %s refusal', async (code, message) => {
    await harness.navigateByUrl('/sign-in');
    await fillAndSubmit();
    http.expectOne(SIGN_IN_URL).flush(problem(code), unprocessable);
    await settle();

    expect(alert()).toContain(message);
    expect(TestBed.inject(Router).url).toBe('/sign-in');
  });

  it('asks to try again when the API cannot be reached', async () => {
    await harness.navigateByUrl('/sign-in');
    await fillAndSubmit();
    http.expectOne(SIGN_IN_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();

    expect(alert()).toContain('Inténtalo de nuevo');
    expect(page().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });

  it('offers a reset for a forgotten password, handing over the typed email outside the URL', async () => {
    await harness.navigateByUrl('/sign-in');
    type('Correo electrónico', ' ana@example.com ');
    harness.detectChanges();

    const link = page().querySelector<HTMLAnchorElement>('a[href="/forgot-password"]');
    expect(link?.textContent).toContain('¿Olvidaste tu contraseña?');
    link?.click();
    await settle();

    const router = TestBed.inject(Router);
    expect(router.url).toBe('/forgot-password');
    expect(router.lastSuccessfulNavigation()?.extras.state).toEqual({ email: 'ana@example.com' });
  });
});

describe('SignInPage with Google', () => {
  const GOOGLE_URL = 'http://api.test/api/v1/sessions/google';
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let googleSignsIn: (idToken: string) => void;

  /** Google's button as Google Identity Services would draw it, minus Google. */
  const fakeGoogle = (available: boolean) => ({
    renderButton: vi.fn(
      async (parent: HTMLElement, _width: number, onIdToken: (idToken: string) => void) => {
        if (available) {
          parent.innerHTML = '<button type="button">Continuar con Google</button>';
          googleSignsIn = onIdToken;
        }
        return available;
      },
    ),
  });

  const setUp = async (available: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'sign-in', component: SignInPage },
          { path: 'home', component: Destination },
          { path: 'groups/1', component: Destination },
          { path: 'forgot-password', component: Destination },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
        { provide: GoogleIdentity, useValue: fakeGoogle(available) },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  };

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  const googleSection = () => page().querySelector<HTMLElement>('app-google-sign-in > div');
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  };

  it('offers Google above the email form, with an "o con tu correo" divider', async () => {
    await setUp(true);
    await harness.navigateByUrl('/sign-in');
    await settle();

    expect(googleSection()?.hidden).toBe(false);
    expect(googleSection()?.textContent).toContain('Continuar con Google');
    expect(googleSection()?.textContent).toContain('o con tu correo');
    const form = page().querySelector('form');
    expect(form && googleSection()?.compareDocumentPosition(form)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('shows neither the button nor the divider when Google sign-in is unavailable', async () => {
    await setUp(false);
    await harness.navigateByUrl('/sign-in');
    await settle();

    expect(googleSection()?.hidden).toBe(true);
  });

  it('signs in with the ID token from Google and goes where the User was going', async () => {
    await setUp(true);
    await harness.navigateByUrl('/sign-in?next=%2Fgroups%2F1');
    await settle();

    googleSignsIn('google-id-token');
    const request = http.expectOne(GOOGLE_URL);
    expect(request.request.body).toEqual({ idToken: 'google-id-token' });
    request.flush(signedIn);
    await settle();

    expect(TestBed.inject(Router).url).toBe('/groups/1');
  });

  it.each([
    [problem('google-sign-in-rejected'), unprocessable, 'Google no ha podido confirmar quién eres'],
    [null, { status: 0, statusText: '' }, 'No hemos podido entrar con Google'],
  ])('explains a failed Google sign-in and stays on the page', async (body, status, message) => {
    await setUp(true);
    await harness.navigateByUrl('/sign-in');
    await settle();

    googleSignsIn('google-id-token');
    http.expectOne(GOOGLE_URL).flush(body, status);
    await settle();

    expect(googleSection()?.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(TestBed.inject(Router).url).toBe('/sign-in');
  });
});
