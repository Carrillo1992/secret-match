import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { forgetReturnPath, rememberReturnPath } from '../../../../core/auth/return-path';
import { VerifyEmailPage } from './verify-email-page';

const VERIFY_URL = 'http://api.test/api/v1/email-verifications';
const NEW_LINK_URL = 'http://api.test/api/v1/verification-emails';

const problem = (code: string) =>
  JSON.stringify({ type: `urn:secretmatch:problem:${code}`, status: 422 });
const rejectWith = (code: string) => ({ status: 422, statusText: code });

describe('VerifyEmailPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'verify-email', component: VerifyEmailPage }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  const heading = () => page().querySelector('h1')?.textContent ?? '';
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  };
  const answerVerification = async (code: string) => {
    http.expectOne(VERIFY_URL).flush(problem(code), rejectWith(code));
    await settle();
  };

  it('confirms the email with the token from the link', async () => {
    await harness.navigateByUrl('/verify-email?token=tok-123');
    expect(heading()).toContain('Confirmando');

    const request = http.expectOne(VERIFY_URL);
    expect(request.request.body).toEqual({ token: 'tok-123' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(heading()).toContain('¡Correo confirmado!');
    expect(page().querySelector('a[href="/sign-in"]')?.textContent).toContain('Iniciar sesión');
  });

  it('signs in towards where the User was going when they signed up, such as an Invite Link', async () => {
    rememberReturnPath('/join/q8Xf3kL0');
    await harness.navigateByUrl('/verify-email?token=tok-123');
    http.expectOne(VERIFY_URL).flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(
      page().querySelector('a[href="/sign-in?next=%2Fjoin%2Fq8Xf3kL0"]')?.textContent,
    ).toContain('Iniciar sesión');
    forgetReturnPath();
  });

  it('takes the token out of the address bar', async () => {
    await harness.navigateByUrl('/verify-email?token=tok-123');
    await settle();

    expect(TestBed.inject(Router).url).toBe('/verify-email');
    http.expectOne(VERIFY_URL);
  });

  it('sends a new link in place of an expired one', async () => {
    await harness.navigateByUrl('/verify-email?token=tok-123');
    await answerVerification('verification-link-expired');
    expect(heading()).toContain('ha caducado');
    expect(page().textContent).toContain('Si tu cuenta sigue pendiente');

    page().querySelector('button')?.click();
    const request = http.expectOne(NEW_LINK_URL);
    expect(request.request.body).toEqual({ token: 'tok-123' });
    request.flush(null, { status: 202, statusText: 'Accepted' });
    await settle();

    expect(page().querySelector('[role="status"]')?.textContent).toContain('enlace nuevo');
  });

  it('tells a used link apart: the account is already there', async () => {
    await harness.navigateByUrl('/verify-email?token=tok-123');
    await answerVerification('verification-link-used');

    expect(heading()).toContain('ya se ha usado');
    expect(page().textContent).toContain('Tu correo ya está confirmado');
  });

  it('sends the visitor back to the sign-up from an invalid link', async () => {
    await harness.navigateByUrl('/verify-email?token=tok-123');
    await answerVerification('verification-link-invalid');

    expect(heading()).toContain('no es válido');
    expect(page().textContent).toContain('abre el del último correo');
    expect(page().querySelector('a[href="/sign-up"]')).not.toBeNull();
  });

  it('treats a link without a token as invalid, without calling the API', async () => {
    await harness.navigateByUrl('/verify-email');
    await settle();

    expect(heading()).toContain('no es válido');
    http.expectNone(VERIFY_URL);
  });

  it('lets the user retry when the API cannot be reached', async () => {
    await harness.navigateByUrl('/verify-email?token=tok-123');
    http.expectOne(VERIFY_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();
    expect(heading()).toContain('No hemos podido confirmar');

    page().querySelector('button')?.click();
    http.expectOne(VERIFY_URL).flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(heading()).toContain('¡Correo confirmado!');
  });
});
