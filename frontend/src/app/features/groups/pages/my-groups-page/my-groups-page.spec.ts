import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';
import { AuthSession } from '../../../../core/auth/auth-session';
import { MyGroupsPage } from './my-groups-page';

const ME_URL = 'http://api.test/api/v1/users/me';
const GROUPS_URL = 'http://api.test/api/v1/groups';
const SIGN_OUT_URL = 'http://api.test/api/v1/sessions/current';

const ana = { email: 'ana@example.com', displayName: 'Ana' };
const navidad = {
  id: 'g-1',
  name: 'Navidad en casa',
  exchangeDate: '2026-12-24',
  budget: 30,
  memberCount: 3,
  admin: true,
  finished: false,
};
const reyes = {
  id: 'g-2',
  name: 'Reyes',
  exchangeDate: '2027-01-06',
  memberCount: 1,
  admin: false,
  finished: false,
};

@Component({ template: '<h1>Otra página</h1>' })
class Stub {}

describe('MyGroupsPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'home', component: MyGroupsPage },
          { path: 'sign-in', component: Stub },
          { path: 'groups/new', component: Stub },
          { path: 'groups/:groupId', component: Stub },
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
  const link = (text: string) =>
    [...page().querySelectorAll('a')].find((a) => a.textContent?.includes(text));
  /** Spaces normalised: currency amounts are formatted with a no-break space before the €. */
  const groupCards = () =>
    [...page().querySelectorAll('ul[aria-label="Tus grupos"] > li')].map((card) => ({
      text: (card.textContent ?? '').replace(/\s+/g, ' '),
      querySelector: (selector: string) => card.querySelector(selector),
    }));
  const open = async (groups: unknown[]) => {
    await harness.navigateByUrl('/home');
    http.expectOne(ME_URL).flush(ana);
    http.expectOne(GROUPS_URL).flush(groups);
    await settle();
  };

  it('greets the User and lists their Groups, each linking to its page', async () => {
    await harness.navigateByUrl('/home');
    expect(page().querySelector('[role="status"]')?.textContent).toContain('Cargando');
    http.expectOne(ME_URL).flush(ana);
    http.expectOne(GROUPS_URL).flush([navidad, reyes]);
    await settle();

    expect(page().querySelector('h1')?.textContent).toContain('Mis grupos');
    expect(page().textContent).toContain('Hola, Ana');
    const cards = groupCards();
    expect(cards.map((card) => card.querySelector('h2')?.textContent?.trim())).toEqual([
      'Navidad en casa',
      'Reyes',
    ]);
    expect(cards[0].text).toContain('24 dic 2026');
    expect(cards[0].text).toContain('Admin');
    expect(cards[0].text).toContain('3 miembros');
    expect(cards[0].text).toContain('30 €');
    expect(cards[1].text).toContain('1 miembro');
    expect(cards[1].text).not.toContain('Admin');
    expect(cards[1].text).not.toContain('€');
    expect(cards[0].querySelector('a')?.getAttribute('href')).toBe('/groups/g-1');
  });

  it('marks a finished Group as such', async () => {
    await open([
      { ...navidad, finished: true },
      { ...reyes, finished: false },
    ]);

    const [finished, open_] = groupCards();
    expect(finished.text).toContain('Finalizado');
    expect(open_.text).not.toContain('Finalizado');
  });

  it('offers to create a Group', async () => {
    await open([navidad]);

    link('Crear grupo')?.click();
    await settle();

    expect(TestBed.inject(Router).url).toBe('/groups/new');
  });

  it('invites the User to create their first Group when they have none', async () => {
    await open([]);

    expect(groupCards()).toEqual([]);
    expect(page().textContent).toContain('Aún no tienes grupos');
    expect(link('Crear grupo')?.getAttribute('href')).toBe('/groups/new');
  });

  it('offers a retry when the Groups cannot be loaded', async () => {
    await harness.navigateByUrl('/home');
    http.expectOne(ME_URL).flush(ana);
    http.expectOne(GROUPS_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();
    expect(page().querySelector('[role="alert"]')?.textContent).toContain('No hemos podido cargar');

    button('Reintentar')?.click();
    await settle();
    http.expectOne(ME_URL).flush(ana);
    http.expectOne(GROUPS_URL).flush([reyes]);
    await settle();

    expect(groupCards()[0].querySelector('h2')?.textContent).toContain('Reyes');
  });

  it('signs out and goes to the sign-in page', async () => {
    const session = TestBed.inject(AuthSession);
    await open([]);

    button('Cerrar sesión')?.click();
    http.expectOne(SIGN_OUT_URL).flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(session.isSignedIn()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/sign-in');
  });

  it('stays on the page and says so when the session cannot be ended', async () => {
    await open([]);

    button('Cerrar sesión')?.click();
    http.expectOne(SIGN_OUT_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();

    expect(TestBed.inject(Router).url).toBe('/home');
    expect(page().querySelector('[role="alert"]')?.textContent).toContain(
      'No hemos podido cerrar la sesión',
    );
  });
});
