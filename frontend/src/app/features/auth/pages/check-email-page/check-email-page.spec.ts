import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { CheckEmailPage } from './check-email-page';

const RESEND_URL = 'http://api.test/api/v1/verification-emails';

describe('CheckEmailPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'check-email', component: CheckEmailPage }]),
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
  // What the sign-up page does once the API has accepted the sign-up.
  const arriveFromSignUp = async (email: string) => {
    await TestBed.inject(Router).navigate(['/check-email'], { state: { email } });
    harness.detectChanges();
  };

  it('says where the link was sent, as handed over by the sign-up', async () => {
    await arriveFromSignUp('ana@example.com');

    expect(page().querySelector('h1')?.textContent).toContain('Revisa tu correo');
    expect(page().textContent).toContain('ana@example.com');
    expect(page().querySelector<HTMLInputElement>('#resend-email')?.value).toBe('ana@example.com');
  });

  it('still explains itself when opened directly, without the email', async () => {
    await harness.navigateByUrl('/check-email');

    expect(page().textContent).toContain('Te hemos enviado un enlace para confirmar tu cuenta');
    expect(page().querySelector<HTMLInputElement>('#resend-email')?.value).toBe('');
  });

  it('asks for a new link and confirms it', async () => {
    await arriveFromSignUp('ana@example.com');

    page().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    const request = http.expectOne(RESEND_URL);
    expect(request.request.body).toEqual({ email: 'ana@example.com' });
    request.flush(null, { status: 202, statusText: 'Accepted' });
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();

    expect(page().querySelector('[role="status"]')?.textContent).toContain('te hemos enviado');
  });
});
