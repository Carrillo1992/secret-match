import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';
import { AuthSession } from '../../../../core/auth/auth-session';
import { HomePage } from './home-page';

const ME_URL = 'http://api.test/api/v1/users/me';
const SIGN_OUT_URL = 'http://api.test/api/v1/sessions/current';

@Component({ template: '<h1>Inicia sesión</h1>' })
class SignInStub {}

describe('HomePage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'home', component: HomePage },
          { path: 'sign-in', component: SignInStub },
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
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  };
  const button = (text: string) =>
    [...page().querySelectorAll('button')].find((b) => b.textContent?.includes(text));

  it('greets the signed-in User by their display name', async () => {
    await harness.navigateByUrl('/home');
    expect(page().querySelector('[role="status"]')?.textContent).toContain('Cargando');

    http.expectOne(ME_URL).flush({ email: 'ana@example.com', displayName: 'Ana' });
    await settle();

    expect(page().querySelector('h1')?.textContent).toContain('Hola, Ana');
    expect(page().textContent).toContain('Tus grupos');
  });

  it('offers a retry when the User cannot be loaded', async () => {
    await harness.navigateByUrl('/home');
    http.expectOne(ME_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();
    expect(page().querySelector('[role="alert"]')?.textContent).toContain('No hemos podido cargar');

    button('Reintentar')?.click();
    await settle();
    http.expectOne(ME_URL).flush({ email: 'ana@example.com', displayName: 'Ana' });
    await settle();

    expect(page().querySelector('h1')?.textContent).toContain('Hola, Ana');
  });

  it('signs out and goes to the sign-in page', async () => {
    const session = TestBed.inject(AuthSession);
    await harness.navigateByUrl('/home');
    http.expectOne(ME_URL).flush({ email: 'ana@example.com', displayName: 'Ana' });
    await settle();

    button('Cerrar sesión')?.click();
    http.expectOne(SIGN_OUT_URL).flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(session.isSignedIn()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/sign-in');
  });
});
