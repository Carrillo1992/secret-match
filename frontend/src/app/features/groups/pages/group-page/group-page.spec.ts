import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';
import { GroupPage } from './group-page';

const GROUP_URL = 'http://api.test/api/v1/groups/g-1';

@Component({ template: '<h1>Otra página</h1>' })
class Stub {}

const navidad = {
  id: 'g-1',
  name: 'Navidad en casa',
  exchangeDate: '2026-12-24',
  budget: 30,
  members: [
    { displayName: 'Abuela Carmen', admin: true },
    { displayName: 'Luis', admin: false },
  ],
};

describe('GroupPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'groups/:groupId', component: GroupPage },
          { path: 'home', component: Stub },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/groups/g-1');
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  /** Spaces normalised: currency amounts are formatted with a no-break space before the €. */
  const text = (element: Element | null | undefined) =>
    (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  };
  const members = () => [...page().querySelectorAll('ul[aria-label="Miembros"] > li')];
  const backLink = () =>
    [...page().querySelectorAll('a[href="/home"]')].find((link) =>
      link.textContent?.includes('Mis grupos'),
    );

  it('shows the Group, its details and its Members with the Admin marked', async () => {
    expect(page().querySelector('[role="status"]')?.textContent).toContain('Cargando');
    http.expectOne(GROUP_URL).flush(navidad);
    await settle();

    expect(text(page().querySelector('h1'))).toBe('Navidad en casa');
    expect(text(page())).toContain('jueves, 24 de diciembre de 2026');
    expect(text(page())).toContain('30 € por regalo');
    expect(text(page())).toContain('Miembros (2)');
    const [carmen, luis] = members().map(text);
    expect(members()).toHaveLength(2);
    expect(carmen).toContain('Abuela Carmen');
    expect(carmen).toContain('Admin');
    expect(luis).toContain('Luis');
    expect(luis).not.toContain('Admin');
    expect(backLink()).toBeDefined();
  });

  it('says when the Group has no budget', async () => {
    http.expectOne(GROUP_URL).flush({ ...navidad, budget: undefined });
    await settle();

    expect(text(page())).toContain('Sin presupuesto');
  });

  it('says the Group cannot be found, without telling whether it exists', async () => {
    http
      .expectOne(GROUP_URL)
      .flush(
        { type: 'urn:secretmatch:problem:group-not-found', status: 404 },
        { status: 404, statusText: 'Not Found' },
      );
    await settle();

    expect(text(page().querySelector('h1'))).toBe('No encontramos este grupo');
    expect(backLink()).toBeDefined();
  });

  it('offers a retry when the Group cannot be loaded', async () => {
    http.expectOne(GROUP_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();
    expect(page().querySelector('[role="alert"]')?.textContent).toContain('No hemos podido cargar');

    [...page().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Reintentar'))
      ?.click();
    await settle();
    http.expectOne(GROUP_URL).flush(navidad);
    await settle();

    expect(text(page().querySelector('h1'))).toBe('Navidad en casa');
  });
});
