import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { CheckEmailPage } from './check-email-page';

const NEW_LINK_URL = 'http://api.test/api/v1/sign-ups/id-1/verification-emails';

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
  const arriveFromSignUp = async () => {
    await TestBed.inject(Router).navigate(['/check-email'], {
      queryParams: { signUp: 'id-1' },
      state: { email: 'ana@example.com' },
    });
    harness.detectChanges();
  };

  it('says where the link was sent and how long it lasts', async () => {
    await arriveFromSignUp();

    expect(page().querySelector('h1')?.textContent).toContain('Revisa tu correo');
    expect(page().textContent).toContain('ana@example.com');
    expect(page().textContent).toContain('Caduca en 24 horas');
  });

  it('asks for a new link for this sign-up and confirms it', async () => {
    await arriveFromSignUp();

    page().querySelector('button')?.click();
    const request = http.expectOne(NEW_LINK_URL);
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 202, statusText: 'Accepted' });
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();

    expect(page().querySelector('[role="status"]')?.textContent).toContain('enlace nuevo');
  });

  it('keeps the new-link button after a reload, without the email', async () => {
    await harness.navigateByUrl('/check-email?signUp=id-1');

    expect(page().textContent).toContain('Te hemos enviado un enlace para confirmar tu cuenta');
    expect(page().textContent).not.toContain('@');
    expect(page().querySelector('button')).not.toBeNull();
  });

  it('sends the visitor back to the sign-up when it knows no sign-up', async () => {
    await harness.navigateByUrl('/check-email');

    expect(page().querySelector('button')).toBeNull();
    expect(page().querySelector('a[href="/sign-up"]')?.textContent).toContain(
      'vuelve a registrarte',
    );
  });
});
