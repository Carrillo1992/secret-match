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
  inviteCode: 'q8Xf3kL0',
  admin: false,
};
const REGENERATE_URL = 'http://api.test/api/v1/groups/g-1/invite-link';

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

  it('treats a malformed Group link like a Group that cannot be found', async () => {
    http
      .expectOne(GROUP_URL)
      .flush({ status: 400, title: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(text(page().querySelector('h1'))).toBe('No encontramos este grupo');
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

  describe('Invite Link', () => {
    const inviteCard = () => page().querySelector('section[aria-labelledby="group-invite"]');
    const button = (label: string) =>
      [...page().querySelectorAll('button')].find((b) => b.textContent?.includes(label));
    const shownLink = () =>
      inviteCard()?.querySelector<HTMLInputElement>('input[readonly]')?.value ?? '';

    it('shows every Member the link to share, and lets them copy it', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      http.expectOne(GROUP_URL).flush(navidad);
      await settle();

      expect(text(inviteCard())).toContain('Invita a tu gente');
      expect(shownLink()).toBe(`${location.origin}/join/q8Xf3kL0`);
      button('Copiar enlace')?.click();
      await settle();

      expect(writeText).toHaveBeenCalledWith(`${location.origin}/join/q8Xf3kL0`);
      expect(text(inviteCard()?.querySelector('[role="status"]'))).toBe('¡Enlace copiado!');
    });

    it('does not offer a regular Member to regenerate the link', async () => {
      http.expectOne(GROUP_URL).flush(navidad);
      await settle();

      expect(button('Generar uno nuevo')).toBeUndefined();
    });

    it('lets the Admin regenerate the link after confirming that the current one stops working', async () => {
      http.expectOne(GROUP_URL).flush({ ...navidad, admin: true });
      await settle();

      button('Generar uno nuevo')?.click();
      await settle();
      expect(text(inviteCard())).toContain('El enlace actual dejará de funcionar');
      http.expectNone(REGENERATE_URL);
      button('Sí, generar uno nuevo')?.click();
      await settle();

      const regenerate = http.expectOne(REGENERATE_URL);
      expect(regenerate.request.method).toBe('POST');
      regenerate.flush({ ...navidad, admin: true, inviteCode: 'Zz9-new' });
      await settle();

      expect(shownLink()).toBe(`${location.origin}/join/Zz9-new`);
      expect(text(inviteCard()?.querySelector('[role="status"]'))).toBe(
        'Enlace nuevo listo. El anterior ya no funciona.',
      );
      expect(button('Sí, generar uno nuevo')).toBeUndefined();
    });

    it('keeps the current link when the Admin cancels', async () => {
      http.expectOne(GROUP_URL).flush({ ...navidad, admin: true });
      await settle();

      button('Generar uno nuevo')?.click();
      await settle();
      button('Cancelar')?.click();
      await settle();

      http.expectNone(REGENERATE_URL);
      expect(button('Sí, generar uno nuevo')).toBeUndefined();
      expect(shownLink()).toBe(`${location.origin}/join/q8Xf3kL0`);
    });

    it('says so when the link could not be regenerated, and keeps the current one', async () => {
      http.expectOne(GROUP_URL).flush({ ...navidad, admin: true });
      await settle();

      button('Generar uno nuevo')?.click();
      await settle();
      button('Sí, generar uno nuevo')?.click();
      await settle();
      http.expectOne(REGENERATE_URL).error(new ProgressEvent('error'), { status: 0 });
      await settle();

      expect(text(inviteCard()?.querySelector('[role="alert"]'))).toContain(
        'No hemos podido generar un enlace nuevo',
      );
      expect(shownLink()).toBe(`${location.origin}/join/q8Xf3kL0`);
    });
  });
});
