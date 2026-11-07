import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { ForgotPasswordPage } from './forgot-password-page';

const RESET_EMAIL_URL = 'http://api.test/api/v1/password-reset-emails';

describe('ForgotPasswordPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'forgot-password', component: ForgotPasswordPage }]),
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
  const emailInput = () => page().querySelector<HTMLInputElement>('input[type="email"]');
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  };
  const typeEmail = (value: string) => {
    const input = emailInput();
    if (!input) throw new Error('no email field');
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    page().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await settle();
  };

  it('emails a reset link and says to check the inbox, without telling whether the email has an account', async () => {
    await harness.navigateByUrl('/forgot-password');
    typeEmail('  ana@example.com ');
    await submit();

    const request = http.expectOne(RESET_EMAIL_URL);
    expect(request.request.body).toEqual({ email: 'ana@example.com' });
    request.flush(null, { status: 202, statusText: 'Accepted' });
    await settle();

    expect(heading()).toContain('Revisa tu correo');
    expect(page().textContent).toContain('Si hay una cuenta con ana@example.com');
    expect(page().textContent).toContain('1 hora');
    expect(page().querySelector('a[href="/sign-in"]')).not.toBeNull();
  });

  it('starts with the email typed on the sign-in page', async () => {
    await TestBed.inject(Router).navigateByUrl('/forgot-password', {
      state: { email: 'ana@example.com' },
    });
    harness.detectChanges();

    expect(emailInput()?.value).toBe('ana@example.com');
  });

  it('asks for a valid email next to the field and sends nothing', async () => {
    await harness.navigateByUrl('/forgot-password');
    typeEmail('ana');
    await submit();

    expect(emailInput()?.getAttribute('aria-invalid')).toBe('true');
    expect(page().textContent).toContain('Esto no parece un correo electrónico.');
    http.expectNone(RESET_EMAIL_URL);
  });

  it('says so when the request fails, and keeps the form to try again', async () => {
    await harness.navigateByUrl('/forgot-password');
    typeEmail('ana@example.com');
    await submit();

    http.expectOne(RESET_EMAIL_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(page().querySelector('[role="alert"]')?.textContent).toContain(
      'No hemos podido enviar el enlace',
    );
    expect(emailInput()).not.toBeNull();
  });
});
