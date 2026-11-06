import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';
import { NewGroupPage } from './new-group-page';

const GROUPS_URL = 'http://api.test/api/v1/groups';

@Component({ template: '<h1>Otra página</h1>' })
class Stub {}

const created = {
  id: 'g-1',
  name: 'Navidad',
  exchangeDate: '2026-12-24',
  members: [{ displayName: 'Ana', admin: true }],
};

describe('NewGroupPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    // Still the 1st of December in UTC, but already the 2nd in Madrid.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-01T23:30:00Z'));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'groups/new', component: NewGroupPage },
          { path: 'groups/:groupId', component: Stub },
          { path: 'home', component: Stub },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/groups/new');
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  const page = () => harness.routeNativeElement as HTMLElement;
  const field = (label: string) => {
    const labelElement = [...page().querySelectorAll('label')].find((l) =>
      l.textContent?.includes(label),
    );
    const input = page().querySelector<HTMLInputElement>(`#${labelElement?.htmlFor ?? 'missing'}`);
    if (!input) {
      throw new Error(`No field labelled "${label}"`);
    }
    return input;
  };
  const type = (label: string, value: string) => {
    const input = field(label);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submitButton = () => page().querySelector<HTMLButtonElement>('button[type="submit"]');
  const submit = async () => {
    submitButton()?.click();
    await harness.fixture.whenStable();
  };
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  };
  const errorFor = (label: string) => {
    const describedBy = field(label).getAttribute('aria-describedby') ?? '';
    return describedBy
      .split(' ')
      .map((id) => page().querySelector(`#${id}`)?.textContent ?? '')
      .join(' ');
  };
  const alert = () => page().querySelector('[role="alert"]')?.textContent ?? '';
  const fill = (name: string, date: string, budget = '') => {
    type('Nombre', name);
    type('Fecha del intercambio', date);
    type('Presupuesto', budget);
  };

  it('labels the fields, offers dates from tomorrow in Madrid and links back', () => {
    expect(page().querySelector('h1')?.textContent).toContain('Nuevo grupo');
    expect(field('Fecha del intercambio').type).toBe('date');
    expect(field('Fecha del intercambio').min).toBe('2026-12-03');
    expect(field('Presupuesto').inputMode).toBe('decimal');
    const backLinks = [...page().querySelectorAll('a[href="/home"]')];
    expect(backLinks.some((link) => link.textContent?.includes('Volver a mis grupos'))).toBe(true);
  });

  it('shows what is missing next to each field and sends nothing', async () => {
    await submit();

    expect(errorFor('Nombre')).toContain('Escribe un nombre');
    expect(errorFor('Fecha del intercambio')).toContain('Elige la fecha');
    expect(errorFor('Presupuesto')).not.toContain('cantidad');
    http.expectNone(GROUPS_URL);
  });

  it('refuses an Exchange Date that is today in Madrid', async () => {
    fill('Navidad', '2026-12-02');
    await submit();

    expect(errorFor('Fecha del intercambio')).toContain('a partir de mañana');
    http.expectNone(GROUPS_URL);
  });

  it.each(['-5', 'treinta', '10,555', '1000000'])('refuses a budget of "%s"', async (budget) => {
    fill('Navidad', '2026-12-24', budget);
    await submit();

    expect(errorFor('Presupuesto')).toContain('Escribe una cantidad en euros');
    http.expectNone(GROUPS_URL);
  });

  it('creates the Group and opens its page', async () => {
    fill('  Navidad  ', '2026-12-24', '25,50');
    await submit();

    const request = http.expectOne({ method: 'POST', url: GROUPS_URL });
    expect(request.request.body).toEqual({
      name: 'Navidad',
      exchangeDate: '2026-12-24',
      budget: 25.5,
    });
    expect(submitButton()?.disabled).toBe(true);
    request.flush(created, { status: 201, statusText: 'Created' });
    await settle();

    expect(TestBed.inject(Router).url).toBe('/groups/g-1');
  });

  it('leaves the budget out when it is empty', async () => {
    fill('Navidad', '2026-12-24', '  ');
    await submit();

    expect(http.expectOne(GROUPS_URL).request.body).toEqual({
      name: 'Navidad',
      exchangeDate: '2026-12-24',
    });
  });

  it.each([
    [
      { type: 'urn:secretmatch:problem:exchange-date-not-in-future', status: 422 },
      { status: 422, statusText: 'Unprocessable Content' },
      'La fecha del intercambio tiene que ser a partir de mañana',
    ],
    [null, { status: 500, statusText: 'Server Error' }, 'No hemos podido crear el grupo'],
  ])('explains a refusal (%o)', async (body, status, message) => {
    fill('Navidad', '2026-12-24');
    await submit();
    http.expectOne(GROUPS_URL).flush(body, status);
    await settle();

    expect(alert()).toContain(message);
    expect(submitButton()?.disabled).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/groups/new');
  });
});
