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
    { id: 'u-carmen', displayName: 'Abuela Carmen', admin: true, you: false },
    { id: 'u-luis', displayName: 'Luis', admin: false, you: true },
  ],
  inviteCode: 'q8Xf3kL0',
  admin: false,
  finished: false,
};
const REGENERATE_URL = 'http://api.test/api/v1/groups/g-1/invite-link';
const MEMBERS_URL = 'http://api.test/api/v1/groups/g-1/members';
const EXCLUSIONS_URL = 'http://api.test/api/v1/groups/g-1/exclusions';
const DRAW_URL = 'http://api.test/api/v1/groups/g-1/draw';
const NOT_DRAWN = {
  body: { type: 'urn:secretmatch:problem:draw-not-found', status: 404 },
  init: { status: 404, statusText: 'Not Found' },
};
/** The same Group as its Admin, Abuela Carmen, sees it, with Marta in it too. */
const asAdmin = {
  ...navidad,
  admin: true,
  members: [
    { id: 'u-carmen', displayName: 'Abuela Carmen', admin: true, you: true },
    { id: 'u-luis', displayName: 'Luis', admin: false, you: false },
    { id: 'u-marta', displayName: 'Marta', admin: false, you: false },
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

  afterEach(() => {
    // The Admin's page always loads the Exclusions; tests about something else answer with none.
    http.match(EXCLUSIONS_URL).forEach((request) => request.flush([]));
    // Every page asks for the Draw; tests about something else answer that it is not made yet.
    http
      .match((request) => request.url === DRAW_URL && request.method === 'GET')
      .forEach((request) => request.flush(NOT_DRAWN.body, NOT_DRAWN.init));
    http.verify();
  });

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

  it("links every Member to their Wishlist, yours as 'Tus deseos'", async () => {
    http.expectOne(GROUP_URL).flush(navidad);
    await settle();

    const [carmen, luis] = members().map((member) => member.querySelector('a'));
    expect(carmen?.getAttribute('href')).toBe('/groups/g-1/members/u-carmen/wishlist');
    expect(carmen?.getAttribute('aria-label')).toBe('Deseos de Abuela Carmen');
    expect(luis?.getAttribute('href')).toBe('/groups/g-1/members/u-luis/wishlist');
    expect(luis?.getAttribute('aria-label')).toBe('Tus deseos');
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
      expect(document.activeElement).toBe(button('Sí, generar uno nuevo'));
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

      expect(document.activeElement).toBe(button('Generar uno nuevo'));
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

  describe('leaving', () => {
    const membership = () => page().querySelector('section[aria-labelledby="group-membership"]');
    const button = (label: string) =>
      [...page().querySelectorAll('button')].find((b) => b.textContent?.includes(label));

    it('lets a Member leave after confirming, and takes them back to their Groups', async () => {
      http.expectOne(GROUP_URL).flush(navidad);
      await settle();

      expect(text(membership())).toContain('Si sales, dejarás de ver este grupo');
      button('Salir del grupo')?.click();
      await settle();
      expect(document.activeElement).toBe(button('Sí, salir'));
      http.expectNone(`${MEMBERS_URL}/u-luis`);
      button('Sí, salir')?.click();
      await settle();

      const leave = http.expectOne(`${MEMBERS_URL}/u-luis`);
      expect(leave.request.method).toBe('DELETE');
      leave.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(text(page().querySelector('h1'))).toBe('Otra página');
    });

    it('keeps the Member in the Group when they cancel', async () => {
      http.expectOne(GROUP_URL).flush(navidad);
      await settle();

      button('Salir del grupo')?.click();
      await settle();
      button('Cancelar')?.click();
      await settle();

      http.expectNone(`${MEMBERS_URL}/u-luis`);
      expect(document.activeElement).toBe(button('Salir del grupo'));
    });

    it('says so when leaving fails, and stays on the Group', async () => {
      http.expectOne(GROUP_URL).flush(navidad);
      await settle();

      button('Salir del grupo')?.click();
      await settle();
      button('Sí, salir')?.click();
      await settle();
      http.expectOne(`${MEMBERS_URL}/u-luis`).error(new ProgressEvent('error'), { status: 0 });
      await settle();

      expect(text(membership()?.querySelector('[role="alert"]'))).toContain(
        'No hemos podido sacarte del grupo',
      );
      expect(text(page().querySelector('h1'))).toBe('Navidad en casa');
    });

    it('tells the Admin they cannot leave, and points them to deleting the Group', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      expect(button('Salir del grupo')).toBeUndefined();
      expect(text(membership())).toContain('Como administrador no puedes salir del grupo');
      expect(text(membership())).toContain('borrarlo');
    });
  });

  describe('deleting the Group', () => {
    const membership = () => page().querySelector('section[aria-labelledby="group-membership"]');
    const button = (label: string) =>
      [...page().querySelectorAll('button')].find((b) => b.textContent?.includes(label));
    const deletion = { url: GROUP_URL, method: 'DELETE' };

    it('lets the Admin delete the Group after confirming, and takes them back to their Groups', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      button('Borrar el grupo')?.click();
      await settle();
      expect(document.activeElement).toBe(button('Sí, borrar'));
      expect(text(membership())).toContain('avisaremos por email');
      http.expectNone(deletion);
      button('Sí, borrar')?.click();
      await settle();

      http.expectOne(deletion).flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(text(page().querySelector('h1'))).toBe('Otra página');
    });

    it('keeps the Group when the Admin cancels', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      button('Borrar el grupo')?.click();
      await settle();
      button('Cancelar')?.click();
      await settle();

      http.expectNone(deletion);
      expect(document.activeElement).toBe(button('Borrar el grupo'));
    });

    it('says so when deleting fails, and stays on the Group', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      button('Borrar el grupo')?.click();
      await settle();
      button('Sí, borrar')?.click();
      await settle();
      http.expectOne(deletion).error(new ProgressEvent('error'), { status: 0 });
      await settle();

      expect(text(membership()?.querySelector('[role="alert"]'))).toContain(
        'No hemos podido borrar el grupo',
      );
      expect(text(page().querySelector('h1'))).toBe('Navidad en casa');
    });

    it('does not offer a regular Member to delete the Group', async () => {
      http.expectOne(GROUP_URL).flush(navidad);
      await settle();

      expect(button('Borrar el grupo')).toBeUndefined();
    });
  });

  describe('removing Members', () => {
    const button = (label: string) =>
      [...page().querySelectorAll('button')].find((b) => b.textContent?.includes(label));
    const removeButtons = () =>
      [...page().querySelectorAll<HTMLButtonElement>('ul[aria-label="Miembros"] button')].filter(
        (b) => b.textContent?.includes('Quitar'),
      );

    it('does not offer a regular Member to remove anyone', async () => {
      http.expectOne(GROUP_URL).flush(navidad);
      await settle();

      expect(removeButtons()).toHaveLength(0);
    });

    it('lets the Admin remove another Member after confirming, and the Member disappears', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      expect(removeButtons().map((b) => b.getAttribute('aria-label'))).toEqual([
        'Quitar a Luis',
        'Quitar a Marta',
      ]);
      removeButtons()[1].click();
      await settle();
      expect(text(members()[2])).toContain('¿Quitar a Marta?');
      expect(text(members()[2])).toContain('Le avisaremos por email');
      expect(document.activeElement).toBe(button('Sí, quitar'));
      http.expectNone(`${MEMBERS_URL}/u-marta`);
      button('Sí, quitar')?.click();
      await settle();

      expect(document.activeElement).toBe(page().querySelector('#group-members'));
      const remove = http.expectOne(`${MEMBERS_URL}/u-marta`);
      expect(remove.request.method).toBe('DELETE');
      remove.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(members().map(text).join(' ')).not.toContain('Marta');
      expect(text(page())).toContain('Miembros (2)');
      expect(
        text(page().querySelector('section[aria-labelledby="group-members"] [role="status"]')),
      ).toBe('Marta ya no está en el grupo.');
    });

    it('keeps the Member when the Admin cancels', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      removeButtons()[0].click();
      await settle();
      button('Cancelar')?.click();
      await settle();

      http.expectNone(`${MEMBERS_URL}/u-luis`);
      expect(document.activeElement).toBe(removeButtons()[0]);
      expect(members()).toHaveLength(3);
    });

    it('says so when the Member could not be removed, and keeps them in the list', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      removeButtons()[0].click();
      await settle();
      button('Sí, quitar')?.click();
      await settle();
      http.expectOne(`${MEMBERS_URL}/u-luis`).error(new ProgressEvent('error'), { status: 0 });
      await settle();

      expect(
        text(page().querySelector('section[aria-labelledby="group-members"] [role="alert"]')),
      ).toContain('No hemos podido quitar a Luis');
      expect(members()).toHaveLength(3);
    });
  });

  describe('editing', () => {
    const details = () => page().querySelector('section[aria-labelledby="group-details"]');
    const button = (label: string) =>
      [...page().querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
    const field = (label: string) => {
      const id = [...page().querySelectorAll('label')]
        .find((l) => l.textContent?.includes(label))
        ?.getAttribute('for');
      return page().querySelector<HTMLInputElement>(`#${id}`);
    };
    const type = (input: HTMLInputElement | null, value: string) => {
      if (!input) throw new Error('no such field');
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-12-01T10:00:00Z'));
    });

    afterEach(() => vi.useRealTimers());

    it('does not offer a regular Member to edit the Group', async () => {
      http.expectOne(GROUP_URL).flush(navidad);
      await settle();

      expect(text(details())).toContain('Datos del grupo');
      expect(button('Editar')).toBeUndefined();
    });

    it('lets the Admin change the name, the Exchange Date and the budget', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      button('Editar')?.click();
      await settle();
      expect(field('Nombre')?.value).toBe('Navidad en casa');
      expect(field('Fecha del intercambio')?.value).toBe('2026-12-24');
      expect(field('Presupuesto')?.value).toBe('30');
      expect(document.activeElement).toBe(field('Nombre'));
      expect(text(details())).toContain('no les avisamos');

      type(field('Nombre'), '  Reyes en el pueblo ');
      type(field('Fecha del intercambio'), '2027-01-06');
      type(field('Presupuesto'), '');
      button('Guardar cambios')?.click();
      await settle();

      const edit = http.expectOne(GROUP_URL);
      expect(edit.request.method).toBe('PUT');
      expect(edit.request.body).toEqual({ name: 'Reyes en el pueblo', exchangeDate: '2027-01-06' });
      edit.flush({
        ...asAdmin,
        name: 'Reyes en el pueblo',
        exchangeDate: '2027-01-06',
        budget: undefined,
      });
      await settle();

      expect(text(page().querySelector('h1'))).toBe('Reyes en el pueblo');
      expect(text(details())).toContain('miércoles, 6 de enero de 2027');
      expect(text(details())).toContain('Sin presupuesto');
      expect(field('Nombre')).toBeNull();
      expect(document.activeElement).toBe(button('Editar'));
    });

    it('keeps the Group as it was when the Admin cancels', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      button('Editar')?.click();
      await settle();
      type(field('Nombre'), 'Otro nombre');
      button('Cancelar')?.click();
      await settle();

      expect(field('Nombre')).toBeNull();
      expect(text(page().querySelector('h1'))).toBe('Navidad en casa');
      expect(document.activeElement).toBe(button('Editar'));
      button('Editar')?.click();
      await settle();
      expect(field('Nombre')?.value).toBe('Navidad en casa');
    });

    it('explains next to each field what to fix, without sending anything', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      button('Editar')?.click();
      await settle();
      type(field('Nombre'), '   ');
      type(field('Fecha del intercambio'), '2026-12-01');
      type(field('Presupuesto'), '12,345');
      button('Guardar cambios')?.click();
      await settle();

      expect(text(details())).toContain('Escribe un nombre para el grupo.');
      expect(text(details())).toContain('Elige una fecha a partir de mañana.');
      expect(text(details())).toContain('Escribe una cantidad en euros');
      expect(field('Nombre')?.getAttribute('aria-invalid')).toBe('true');
    });

    it('says so when the API refuses the date or the change fails, and keeps the form', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      button('Editar')?.click();
      await settle();
      type(field('Fecha del intercambio'), '2026-12-02');
      button('Guardar cambios')?.click();
      await settle();
      http
        .expectOne(GROUP_URL)
        .flush(
          { type: 'urn:secretmatch:problem:exchange-date-not-in-future', status: 422 },
          { status: 422, statusText: 'Unprocessable Content' },
        );
      await settle();

      expect(text(details()?.querySelector('[role="alert"]'))).toContain(
        'La fecha del intercambio tiene que ser a partir de mañana',
      );
      button('Guardar cambios')?.click();
      await settle();
      http.expectOne(GROUP_URL).error(new ProgressEvent('error'), { status: 0 });
      await settle();

      expect(text(details()?.querySelector('[role="alert"]'))).toContain(
        'No hemos podido guardar los cambios',
      );
      expect(field('Fecha del intercambio')?.value).toBe('2026-12-02');
      expect(text(page().querySelector('h1'))).toBe('Navidad en casa');

      button('Cancelar')?.click();
      await settle();
      button('Editar')?.click();
      await settle();
      expect(details()?.querySelector('[role="alert"]')).toBeNull();
    });
  });
  describe('Finished Group', () => {
    const button = (label: string) =>
      [...page().querySelectorAll('button')].find((b) => b.textContent?.includes(label));
    const notice = () => page().querySelector('[aria-labelledby="group-finished"]');

    it('tells every Member the Group is finished, and offers nothing to change', async () => {
      http.expectOne(GROUP_URL).flush({ ...navidad, finished: true });
      await settle();

      expect(text(notice())).toContain('Finalizado');
      expect(text(notice())).toContain('El intercambio fue el jueves, 24 de diciembre de 2026');
      expect(text(notice())).toContain('El grupo ya solo se puede consultar');
      expect(page().querySelector('section[aria-labelledby="group-invite"]')).toBeNull();
      expect(button('Salir del grupo')).toBeUndefined();
      expect(text(page())).toContain('Abuela Carmen');
    });

    it('lets the Admin delete a finished Group, and nothing else', async () => {
      http.expectOne(GROUP_URL).flush({ ...asAdmin, finished: true });
      await settle();

      expect(text(notice())).toContain('Finalizado');
      expect(button('Editar')).toBeUndefined();
      expect(button('Generar uno nuevo')).toBeUndefined();
      expect(button('Quitar')).toBeUndefined();
      expect(button('Borrar el grupo')).toBeDefined();
    });

    it('shows no notice while the Group is not finished', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();

      expect(notice()).toBeNull();
      expect(button('Editar')).toBeDefined();
    });
  });

  describe('Exclusions', () => {
    const luisAndMarta = {
      id: 'x-1',
      members: [
        { id: 'u-luis', displayName: 'Luis' },
        { id: 'u-marta', displayName: 'Marta' },
      ],
    };
    const carmenAndLuis = {
      id: 'x-2',
      members: [
        { id: 'u-carmen', displayName: 'Abuela Carmen' },
        { id: 'u-luis', displayName: 'Luis' },
      ],
    };
    const section = () => page().querySelector('section[aria-labelledby="group-exclusions"]');
    const rows = () => [...page().querySelectorAll('ul[aria-label="Exclusiones"] > li')];
    const button = (label: string) =>
      [...(section()?.querySelectorAll('button') ?? [])].find((b) =>
        b.textContent?.includes(label),
      );
    const select = (label: string) => {
      const id = [...page().querySelectorAll('label')]
        .find((l) => l.textContent?.trim() === label)
        ?.getAttribute('for');
      return page().querySelector<HTMLSelectElement>(`select#${id}`);
    };
    const choose = (label: string, memberId: string) => {
      const control = select(label);
      if (!control) {
        throw new Error(`no select labelled ${label}`);
      }
      control.value = memberId;
      control.dispatchEvent(new Event('change'));
    };
    const statusLine = () => text(section()?.querySelector('[role="status"]'));

    async function openAsAdmin(group = asAdmin, exclusions: unknown[] = []): Promise<void> {
      http.expectOne(GROUP_URL).flush(group);
      await settle();
      http.expectOne(EXCLUSIONS_URL).flush(exclusions);
      await settle();
    }

    it('shows a regular Member nothing about Exclusions, and never asks for them', async () => {
      http.expectOne(GROUP_URL).flush(navidad);
      await settle();

      http.expectNone(EXCLUSIONS_URL);
      expect(section()).toBeNull();
      expect(text(page()).toLowerCase()).not.toContain('exclusi');
    });

    it('lists the Exclusions to the Admin, each with its two Members', async () => {
      await openAsAdmin(asAdmin, [luisAndMarta, carmenAndLuis]);

      expect(text(section())).toContain('Exclusiones (2)');
      expect(text(section())).toContain('Solo tú las ves');
      expect(rows().map(text)).toEqual([
        expect.stringContaining('Luis') as unknown as string,
        expect.stringContaining('Abuela Carmen') as unknown as string,
      ]);
      expect(text(rows()[0])).toContain('Marta');
    });

    it('says when there are none yet', async () => {
      await openAsAdmin();

      expect(text(section())).toContain('Aún no hay exclusiones.');
      expect(rows()).toHaveLength(0);
    });

    it('lets the Admin add an Exclusion between two Members, which then shows in the list', async () => {
      await openAsAdmin();

      button('Añadir exclusión')?.click();
      await settle();
      expect(document.activeElement).toBe(select('Una persona'));
      choose('Una persona', 'u-luis');
      choose('Y otra', 'u-marta');
      button('Añadir')?.click();
      await settle();

      const add = http.expectOne(EXCLUSIONS_URL);
      expect(add.request.method).toBe('POST');
      expect(add.request.body).toEqual({ memberIds: ['u-luis', 'u-marta'] });
      add.flush(luisAndMarta);
      await settle();

      expect(rows().map(text)).toEqual([expect.stringContaining('Marta') as unknown as string]);
      expect(select('Una persona')).toBeNull();
      expect(statusLine()).toBe('Luis y Marta nunca se tocarán en el sorteo.');
      expect(document.activeElement).toBe(button('Añadir exclusión'));
    });

    it('does not list twice an Exclusion the Group already had', async () => {
      await openAsAdmin(asAdmin, [luisAndMarta]);

      button('Añadir exclusión')?.click();
      await settle();
      choose('Una persona', 'u-marta');
      choose('Y otra', 'u-luis');
      button('Añadir')?.click();
      await settle();
      http.expectOne(EXCLUSIONS_URL).flush(luisAndMarta);
      await settle();

      expect(rows()).toHaveLength(1);
    });

    it('explains next to the field what to fix, without sending anything', async () => {
      await openAsAdmin();

      button('Añadir exclusión')?.click();
      await settle();
      button('Añadir')?.click();
      await settle();
      expect(text(section())).toContain('Elige a una persona.');
      expect(text(section())).toContain('Elige a otra persona.');

      choose('Una persona', 'u-luis');
      choose('Y otra', 'u-luis');
      await settle();
      expect(text(section())).toContain('Elige a alguien distinto de la primera persona.');
      expect(select('Y otra')?.getAttribute('aria-invalid')).toBe('true');
      http.expectNone(EXCLUSIONS_URL);
    });

    it('closes the form without sending anything when the Admin cancels', async () => {
      await openAsAdmin();

      button('Añadir exclusión')?.click();
      await settle();
      button('Cancelar')?.click();
      await settle();

      expect(select('Una persona')).toBeNull();
      expect(document.activeElement).toBe(button('Añadir exclusión'));
      http.expectNone(EXCLUSIONS_URL);
    });

    it('says so when the Exclusion could not be added, and keeps the form', async () => {
      await openAsAdmin();

      button('Añadir exclusión')?.click();
      await settle();
      choose('Una persona', 'u-luis');
      choose('Y otra', 'u-marta');
      button('Añadir')?.click();
      await settle();
      http
        .expectOne(EXCLUSIONS_URL)
        .flush(
          { type: 'urn:secretmatch:problem:exclusion-not-a-member', status: 422 },
          { status: 422, statusText: 'Unprocessable Content' },
        );
      await settle();

      expect(text(section()?.querySelector('[role="alert"]'))).toContain(
        'No hemos podido añadir la exclusión',
      );
      expect(select('Una persona')).not.toBeNull();
      expect(rows()).toHaveLength(0);
    });

    it('lets the Admin remove an Exclusion at once', async () => {
      await openAsAdmin(asAdmin, [luisAndMarta, carmenAndLuis]);

      const quitar = section()?.querySelector<HTMLButtonElement>(
        'button[aria-label="Quitar la exclusión entre Luis y Marta"]',
      );
      quitar?.click();
      await settle();
      const remove = http.expectOne(`${EXCLUSIONS_URL}/x-1`);
      expect(remove.request.method).toBe('DELETE');
      remove.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(rows()).toHaveLength(1);
      expect(text(rows()[0])).toContain('Abuela Carmen');
      expect(statusLine()).toBe('Ya no hay exclusión entre Luis y Marta.');
      expect(document.activeElement).toBe(page().querySelector('#group-exclusions'));
    });

    it('says so when the Exclusion could not be removed, and keeps it', async () => {
      await openAsAdmin(asAdmin, [luisAndMarta]);

      button('Quitar')?.click();
      await settle();
      http
        .expectOne(`${EXCLUSIONS_URL}/x-1`)
        .flush(null, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(text(section()?.querySelector('[role="alert"]'))).toContain(
        'No hemos podido quitar la exclusión entre Luis y Marta',
      );
      expect(rows()).toHaveLength(1);
    });

    it('offers a retry when the Exclusions cannot be loaded', async () => {
      http.expectOne(GROUP_URL).flush(asAdmin);
      await settle();
      http.expectOne(EXCLUSIONS_URL).error(new ProgressEvent('error'), { status: 0 });
      await settle();

      expect(text(section()?.querySelector('[role="alert"]'))).toContain(
        'No hemos podido cargar las exclusiones',
      );
      button('Reintentar')?.click();
      await settle();
      http.expectOne(EXCLUSIONS_URL).flush([luisAndMarta]);
      await settle();

      expect(rows()).toHaveLength(1);
    });

    it('offers nothing to add while the Admin is alone in the Group', async () => {
      await openAsAdmin({ ...asAdmin, members: [asAdmin.members[0]] });

      expect(button('Añadir exclusión')).toBeUndefined();
      expect(text(section())).toContain('Cuando haya al menos dos personas en el grupo');
    });

    it('drops a removed Member’s Exclusions from the list', async () => {
      await openAsAdmin(asAdmin, [luisAndMarta, carmenAndLuis]);

      page().querySelector<HTMLButtonElement>('button[aria-label="Quitar a Marta"]')?.click();
      await settle();
      [...page().querySelectorAll('button')]
        .find((b) => b.textContent?.includes('Sí, quitar'))
        ?.click();
      await settle();
      http
        .expectOne(`${MEMBERS_URL}/u-marta`)
        .flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(rows()).toHaveLength(1);
      expect(text(rows()[0])).toContain('Abuela Carmen');
    });

    it('shows a finished Group’s Exclusions to the Admin, with nothing to change', async () => {
      await openAsAdmin({ ...asAdmin, finished: true }, [luisAndMarta]);

      expect(rows()).toHaveLength(1);
      expect(button('Quitar')).toBeUndefined();
      expect(button('Añadir exclusión')).toBeUndefined();
    });
  });

  describe('the Draw', () => {
    /** Carmen's Group with four Members: enough for a Draw. */
    const withFour = {
      ...asAdmin,
      members: [
        ...asAdmin.members,
        { id: 'u-pedro', displayName: 'Pedro', admin: false, you: false },
      ],
    };
    const section = () => page().querySelector('section[aria-labelledby="group-draw"]');
    const button = (label: string) =>
      [...(section()?.querySelectorAll('button') ?? [])].find((b) =>
        b.textContent?.includes(label),
      );
    const open = async (group: object, draw: 'not-drawn' | object) => {
      http.expectOne(GROUP_URL).flush(group);
      await settle();
      const request = http.expectOne((r) => r.url === DRAW_URL && r.method === 'GET');
      if (draw === 'not-drawn') {
        request.flush(NOT_DRAWN.body, NOT_DRAWN.init);
      } else {
        request.flush(draw);
      }
      await settle();
    };
    const runDraw = async () => {
      button('Sortear')?.click();
      await settle();
      button('Sí, sortear')?.click();
      await settle();
      return http.expectOne((r) => r.url === DRAW_URL && r.method === 'POST');
    };

    it('tells a Member before the Draw that they will be emailed, with nothing to press', async () => {
      await open(navidad, 'not-drawn');

      expect(text(section())).toContain('El sorteo aún no está hecho');
      expect(button('Sortear')).toBeUndefined();
    });

    it('shows each Member their own Receiver once the Draw is made', async () => {
      await open(navidad, { myReceiver: { id: 'u-marta', displayName: 'Marta' } });

      expect(text(section())).toContain('Te toca regalar a Marta');
    });

    it('lets the Admin run the Draw after confirming, then shows their Receiver', async () => {
      await open(withFour, 'not-drawn');

      const request = await runDraw();
      request.flush(
        { myReceiver: { id: 'u-pedro', displayName: 'Pedro' } },
        { status: 201, statusText: 'Created' },
      );
      await settle();

      expect(text(section())).toContain('Te toca regalar a Pedro');
      expect(button('Sortear')).toBeUndefined();
    });

    it('does not draw when the Admin cancels the confirmation', async () => {
      await open(withFour, 'not-drawn');

      button('Sortear')?.click();
      await settle();
      button('Cancelar')?.click();
      await settle();

      http.expectNone((r) => r.url === DRAW_URL && r.method === 'POST');
      expect(button('Sortear')).toBeDefined();
    });

    it('explains to the Admin that a Draw needs at least 4 Members', async () => {
      await open(asAdmin, 'not-drawn');

      expect(text(section())).toContain('al menos 4 miembros');
      expect(button('Sortear')?.disabled).toBe(true);
    });

    it('tells the Admin, without naming anyone, when the Exclusions leave no Draw', async () => {
      await open(withFour, 'not-drawn');

      const request = await runDraw();
      request.flush(
        { type: 'urn:secretmatch:problem:no-valid-draw', status: 422 },
        { status: 422, statusText: 'Unprocessable Content' },
      );
      await settle();

      const alert = section()?.querySelector('[role="alert"]');
      expect(text(alert)).toContain('exclusiones');
      expect(text(alert)).not.toMatch(/Luis|Marta|Pedro|Carmen/);
      expect(button('Sortear')).toBeDefined();
    });

    it('offers a retry when the Draw cannot be loaded', async () => {
      http.expectOne(GROUP_URL).flush(navidad);
      await settle();
      http
        .expectOne((r) => r.url === DRAW_URL && r.method === 'GET')
        .error(new ProgressEvent('error'), { status: 0 });
      await settle();

      button('Reintentar')?.click();
      await settle();
      http
        .expectOne((r) => r.url === DRAW_URL && r.method === 'GET')
        .flush({ myReceiver: { id: 'u-marta', displayName: 'Marta' } });
      await settle();

      expect(text(section())).toContain('Te toca regalar a Marta');
    });
  });
});
