import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';
import { JoinPage } from './join-page';

const REFRESH_URL = 'http://api.test/api/v1/sessions/refresh';
const JOIN_URL = 'http://api.test/api/v1/memberships';
const signedIn = { accessToken: 'access-1', expiresAt: '2026-12-01T10:15:00Z' };

@Component({ template: '<h1>Página del grupo</h1>' })
class GroupStub {}

describe('JoinPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'join/:code', component: JoinPage },
          { path: 'groups/:groupId', component: GroupStub },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/join/q8Xf3kL0');
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  const text = (element: Element | null | undefined) =>
    (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const settle = async () => {
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve));
      await harness.fixture.whenStable();
    }
  };
  const link = (label: string) =>
    [...page().querySelectorAll('a')].find((a) => a.textContent?.includes(label));
  const signedInWith = async () => {
    http.expectOne(REFRESH_URL).flush(signedIn);
    await settle();
  };

  it('joins a signed-in User and takes them to the Group page', async () => {
    await signedInWith();

    const join = http.expectOne(JOIN_URL);
    expect(join.request.method).toBe('POST');
    expect(join.request.body).toEqual({ inviteCode: 'q8Xf3kL0' });
    expect(text(page())).toContain('Uniéndote al grupo');
    join.flush({ groupId: 'g-1' });
    await settle();

    expect(TestBed.inject(Router).url).toBe('/groups/g-1');
    expect(text(page().querySelector('h1'))).toBe('Página del grupo');
  });

  it('invites a signed-out visitor to sign up or sign in, and comes back to the link after', async () => {
    http
      .expectOne(REFRESH_URL)
      .flush(
        { type: 'urn:secretmatch:problem:session-expired', status: 422 },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await settle();

    expect(text(page().querySelector('h1'))).toBe('Te han invitado a un grupo');
    expect(link('Crear cuenta')?.getAttribute('href')).toBe('/sign-up?next=%2Fjoin%2Fq8Xf3kL0');
    expect(link('Inicia sesión')?.getAttribute('href')).toBe('/sign-in?next=%2Fjoin%2Fq8Xf3kL0');
    http.expectNone(JOIN_URL);
  });

  it('says a regenerated or unknown link does not work, without naming any Group', async () => {
    await signedInWith();
    http
      .expectOne(JOIN_URL)
      .flush(
        { type: 'urn:secretmatch:problem:invite-link-invalid', status: 404 },
        { status: 404, statusText: 'Not Found' },
      );
    await settle();

    expect(text(page().querySelector('h1'))).toBe('Este enlace de invitación no funciona');
    expect(text(page())).toContain('Pide a quien te lo envió el enlace nuevo');
    expect(link('Ir al inicio')?.getAttribute('href')).toBe('/home');
  });

  it('says a finished Group cannot be joined any more', async () => {
    await signedInWith();
    http
      .expectOne(JOIN_URL)
      .flush(
        { type: 'urn:secretmatch:problem:group-finished', status: 422 },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await settle();

    expect(text(page().querySelector('h1'))).toBe('Este grupo ya ha finalizado');
    expect(text(page())).toContain('Su intercambio ya pasó');
    expect(link('Ir al inicio')?.getAttribute('href')).toBe('/home');
    expect(page().querySelector('button')).toBeNull();
  });

  it('says a drawn Group cannot be joined any more, without naming it', async () => {
    await signedInWith();
    http
      .expectOne(JOIN_URL)
      .flush(
        { type: 'urn:secretmatch:problem:group-drawn', status: 422 },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await settle();

    expect(text(page().querySelector('h1'))).toBe('Este grupo ya ha hecho el sorteo');
    expect(text(page())).toContain('ya no se puede entrar en él');
    expect(link('Ir al inicio')?.getAttribute('href')).toBe('/home');
    expect(page().querySelector('button')).toBeNull();
  });

  it('offers a retry when the Group cannot be joined right now', async () => {
    await signedInWith();
    http.expectOne(JOIN_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();
    expect(text(page().querySelector('h1'))).toBe('No hemos podido unirte al grupo');

    [...page().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Reintentar'))
      ?.click();
    await settle();
    http.expectOne(JOIN_URL).flush({ groupId: 'g-1' });
    await settle();

    expect(TestBed.inject(Router).url).toBe('/groups/g-1');
  });
});
