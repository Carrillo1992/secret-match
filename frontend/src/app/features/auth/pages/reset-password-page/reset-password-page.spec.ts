import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { ResetPasswordPage } from './reset-password-page';

const RESET_URL = 'http://api.test/api/v1/password-resets';

const problem = (code: string) =>
  JSON.stringify({ type: `urn:secretmatch:problem:${code}`, status: 422 });

describe('ResetPasswordPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'reset-password', component: ResetPasswordPage }]),
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
  const passwordInput = () => page().querySelector<HTMLInputElement>('input[type="password"]');
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  };
  const typePassword = (value: string) => {
    const input = passwordInput();
    if (!input) throw new Error('no password field');
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    page().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await settle();
  };
  const submitAndAnswer = async (code: string) => {
    await harness.navigateByUrl('/reset-password?token=tok-123');
    typePassword('mazapán-de-toledo');
    await submit();
    http.expectOne(RESET_URL).flush(problem(code), { status: 422, statusText: code });
    await settle();
  };

  it('sets the new password with the token from the link, then offers to sign in', async () => {
    await harness.navigateByUrl('/reset-password?token=tok-123');
    expect(page().textContent).toContain('todos tus dispositivos');
    typePassword('mazapán-de-toledo');
    await submit();

    const request = http.expectOne(RESET_URL);
    expect(request.request.body).toEqual({ token: 'tok-123', newPassword: 'mazapán-de-toledo' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(heading()).toContain('Contraseña cambiada');
    expect(page().querySelector('a[href="/sign-in"]')?.textContent).toContain('Iniciar sesión');
  });

  it('takes the token out of the address bar', async () => {
    await harness.navigateByUrl('/reset-password?token=tok-123');
    await settle();

    expect(TestBed.inject(Router).url).toBe('/reset-password');
  });

  it('asks for at least 8 characters next to the field and sends nothing', async () => {
    await harness.navigateByUrl('/reset-password?token=tok-123');
    typePassword('corta');
    await submit();

    expect(passwordInput()?.getAttribute('aria-invalid')).toBe('true');
    expect(page().textContent).toContain('al menos 8 caracteres');
    http.expectNone(RESET_URL);
  });

  it('explains an expired link and offers a new one', async () => {
    await submitAndAnswer('reset-link-expired');

    expect(heading()).toContain('Este enlace ha caducado');
    expect(page().querySelector('a[href="/forgot-password"]')?.textContent).toContain(
      'Pedir otro enlace',
    );
  });

  it('explains a link already used and offers a new one', async () => {
    await submitAndAnswer('reset-link-used');

    expect(heading()).toContain('Este enlace ya se ha usado');
    expect(page().querySelector('a[href="/forgot-password"]')).not.toBeNull();
  });

  it('explains an invalid link and offers a new one', async () => {
    await submitAndAnswer('reset-link-invalid');

    expect(heading()).toContain('Este enlace no es válido');
    expect(page().querySelector('a[href="/forgot-password"]')).not.toBeNull();
  });

  it('treats a link without a token as invalid, without asking the API', async () => {
    await harness.navigateByUrl('/reset-password');
    await settle();

    expect(heading()).toContain('Este enlace no es válido');
  });

  it('says so when saving fails, and keeps the form to try again', async () => {
    await harness.navigateByUrl('/reset-password?token=tok-123');
    typePassword('mazapán-de-toledo');
    await submit();
    http.expectOne(RESET_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(page().querySelector('[role="alert"]')?.textContent).toContain(
      'No hemos podido guardar',
    );
    expect(passwordInput()).not.toBeNull();
  });
});
