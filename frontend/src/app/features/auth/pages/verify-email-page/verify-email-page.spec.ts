import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { VerifyEmailPage } from './verify-email-page';

const VERIFY_URL = 'http://api.test/api/v1/email-verifications';
const RESEND_URL = 'http://api.test/api/v1/verification-emails';

const problem = (code: string) =>
  JSON.stringify({ type: `urn:secretmatch:problem:${code}`, status: 422 });

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
  const open = (url: string) => harness.navigateByUrl(url);

  it('confirms the email with the token from the link', async () => {
    await open('/verify-email?token=tok-123');
    expect(heading()).toContain('Confirmando');

    const request = http.expectOne(VERIFY_URL);
    expect(request.request.body).toEqual({ token: 'tok-123' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(heading()).toContain('¡Correo confirmado!');
    expect(page().querySelector('#resend-email')).toBeNull();
  });

  it.each([
    ['verification-link-expired', 'ha caducado'],
    ['verification-link-used', 'ya se ha usado'],
    ['verification-link-invalid', 'no es válido'],
  ])('explains a %s link and offers a new one', async (code, message) => {
    await open('/verify-email?token=tok-123');
    http
      .expectOne(VERIFY_URL)
      .flush(problem(code), { status: 422, statusText: 'Unprocessable Content' });
    await settle();

    expect(heading()).toContain(message);
    expect(page().querySelector('#resend-email')).not.toBeNull();
  });

  it('treats a link without a token as invalid, without calling the API', async () => {
    await open('/verify-email');
    await settle();

    expect(heading()).toContain('no es válido');
    http.expectNone(VERIFY_URL);
  });

  it('sends a new link from an expired one', async () => {
    await open('/verify-email?token=tok-123');
    http.expectOne(VERIFY_URL).flush(problem('verification-link-expired'), {
      status: 422,
      statusText: 'Unprocessable Content',
    });
    await settle();

    const input = page().querySelector<HTMLInputElement>('#resend-email');
    if (input) {
      input.value = 'ana@example.com';
      input.dispatchEvent(new Event('input'));
    }
    page().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    http.expectOne(RESEND_URL).flush(null, { status: 202, statusText: 'Accepted' });
    await settle();

    expect(page().querySelector('[role="status"]')?.textContent).toContain('te hemos enviado');
  });

  it('lets the user retry when the API cannot be reached', async () => {
    await open('/verify-email?token=tok-123');
    http.expectOne(VERIFY_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();
    expect(heading()).toContain('No hemos podido confirmar');

    page().querySelector<HTMLButtonElement>('button')?.click();
    http.expectOne(VERIFY_URL).flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(heading()).toContain('¡Correo confirmado!');
  });
});
