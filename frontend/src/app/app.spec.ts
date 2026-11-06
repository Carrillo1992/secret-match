import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from './core/api/generated/api-configuration';
import { App } from './app';
import { routes } from './app.routes';

describe('App routes', () => {
  // The routed pages are lazy-loaded inside each test, and @lucide/angular ships every icon in
  // one large module that takes several seconds to load the first time under the test runner.
  // Load it once up front so that cost doesn't eat into a single test's timeout.
  beforeAll(() => import('@lucide/angular'), 30_000);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
  });

  afterEach(() => {
    // The landing page checks the API's health; these tests only care about routing.
    TestBed.inject(HttpTestingController).match(() => true);
  });

  it('renders the routed page inside the app shell', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    TestBed.tick();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain(
      'SecretMatch',
    );
    expect(document.title).toBe('SecretMatch');
  });

  it.each([
    ['/sign-up', 'Crear cuenta · SecretMatch', 'Crea tu cuenta'],
    ['/check-email', 'Revisa tu correo · SecretMatch', 'Revisa tu correo'],
    ['/verify-email', 'Confirmar correo · SecretMatch', 'no es válido'],
  ])('routes %s to its sign-up page', async (url, title, heading) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();

    expect(document.title).toBe(title);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(heading);
  });

  it('sends unknown URLs to the landing page', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/no-such-page');

    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('SecretMatch');
  });
});
