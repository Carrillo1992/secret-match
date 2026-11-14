import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';
import { WishlistPage } from './wishlist-page';

const LUIS_WISHLIST_URL = 'http://api.test/api/v1/groups/g-1/members/u-luis/wishlist';
const WISHES_URL = 'http://api.test/api/v1/groups/g-1/wishes';

const auriculares = {
  id: 'w-1',
  title: 'Auriculares',
  link: 'https://tienda.example/auriculares',
  price: 49.9,
  notes: 'Inalámbricos, negros',
  priority: 'HIGH',
};
const libro = { id: 'w-2', title: 'Libro', priority: 'MEDIUM' };

/** Luis's Wishlist as Marta, another Member, sees it. */
const seenByMarta = {
  owner: { id: 'u-luis', displayName: 'Luis', you: false },
  wishes: [auriculares, libro],
};
/** Luis's own Wishlist, still empty. */
const ownEmpty = { owner: { id: 'u-luis', displayName: 'Luis', you: true }, wishes: [] };
const own = { ...ownEmpty, wishes: [auriculares, libro] };

describe('WishlistPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'groups/:groupId/members/:memberId/wishlist', component: WishlistPage },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/groups/g-1/members/u-luis/wishlist');
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
  const rows = () => [...page().querySelectorAll('ul[aria-label="Deseos"] > li')];
  const button = (label: string, within: ParentNode = page()) =>
    [...within.querySelectorAll('button')].find((b) => text(b) === label);
  const field = (label: string) => {
    const id = [...page().querySelectorAll('label')]
      .find((l) => text(l).startsWith(label))
      ?.getAttribute('for');
    return page().querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `[id="${id}"]`,
    );
  };
  const type = (label: string, value: string) => {
    const control = field(label);
    if (!control) throw new Error(`no field labelled ${label}`);
    control.value = value;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
    control.dispatchEvent(new Event('blur'));
  };
  const submit = async () => {
    page().querySelector('form')?.dispatchEvent(new Event('submit'));
    await settle();
  };
  const statusLine = () => text(page().querySelector('p[role="status"]'));

  async function open(wishlist: object): Promise<void> {
    http.expectOne(LUIS_WISHLIST_URL).flush(wishlist);
    await settle();
  }

  it("shows another Member's Wishes, high priority first, with no way to change them", async () => {
    expect(text(page().querySelector('[role="status"]'))).toContain('Cargando');
    await open(seenByMarta);

    expect(text(page().querySelector('h1'))).toBe('Deseos de Luis');
    const [first, second] = rows().map(text);
    expect(first).toContain('Auriculares');
    expect(first).toContain('Prioridad Alta');
    expect(first).toContain('Unos 49,90 €');
    expect(first).toContain('Inalámbricos, negros');
    expect(second).toContain('Libro');
    expect(second).toContain('Prioridad Media');
    expect(button('Añadir deseo')).toBeUndefined();
    expect(page().querySelectorAll('button[aria-label^="Editar"]')).toHaveLength(0);
    expect(page().querySelectorAll('button[aria-label^="Borrar"]')).toHaveLength(0);
    expect(page().querySelector('a[href="/groups/g-1"]')).not.toBeNull();
  });

  it('opens a link in a new tab without giving that page any hold on this one', async () => {
    await open(seenByMarta);

    const link = rows()[0].querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://tienda.example/auriculares');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(rows()[1].querySelector('a')).toBeNull();
  });

  it('says when another Member has not added any Wish yet', async () => {
    await open({ ...seenByMarta, wishes: [] });

    expect(text(page())).toContain('Luis aún no ha añadido deseos.');
    expect(rows()).toHaveLength(0);
  });

  it('lets the owner add a Wish with every field, then shows the list again', async () => {
    await open(ownEmpty);
    expect(text(page().querySelector('h1'))).toBe('Tus deseos');
    expect(text(page())).toContain('Aún no has añadido deseos.');

    button('Añadir deseo')?.click();
    await settle();
    expect(document.activeElement).toBe(field('Qué te gustaría'));
    type('Qué te gustaría', '  Auriculares ');
    type('Enlace', 'https://tienda.example/auriculares');
    type('Precio aproximado', '49,90');
    type('Prioridad', 'HIGH');
    type('Notas', 'Inalámbricos, negros');
    await submit();

    const request = http.expectOne((r) => r.url === WISHES_URL && r.method === 'POST');
    expect(request.request.body).toEqual({
      title: 'Auriculares',
      link: 'https://tienda.example/auriculares',
      price: 49.9,
      notes: 'Inalámbricos, negros',
      priority: 'HIGH',
    });
    request.flush(auriculares, { status: 201, statusText: 'Created' });
    await settle();
    http.expectOne(LUIS_WISHLIST_URL).flush({ ...ownEmpty, wishes: [auriculares] });
    await settle();

    expect(page().querySelector('form')).toBeNull();
    expect(rows().map(text)[0]).toContain('Auriculares');
    expect(statusLine()).toBe('«Auriculares» está en tu lista.');
    expect(document.activeElement?.id).toBe('add-wish');
  });

  it('sends only the title and priority when the optional fields are left empty', async () => {
    await open(ownEmpty);
    button('Añadir deseo')?.click();
    await settle();

    type('Qué te gustaría', 'Libro');
    await submit();

    const request = http.expectOne((r) => r.url === WISHES_URL && r.method === 'POST');
    expect(request.request.body).toEqual({ title: 'Libro', priority: 'MEDIUM' });
    request.flush(libro, { status: 201, statusText: 'Created' });
    await settle();
    http.expectOne(LUIS_WISHLIST_URL).flush({ ...ownEmpty, wishes: [libro] });
    await settle();
  });

  it('refuses a blank title, a javascript: link and a malformed price before asking the API', async () => {
    await open(ownEmpty);
    button('Añadir deseo')?.click();
    await settle();

    type('Qué te gustaría', '   ');
    type('Enlace', 'javascript:alert(1)');
    type('Precio aproximado', '-3');
    await submit();

    http.expectNone(WISHES_URL);
    expect(field('Qué te gustaría')?.getAttribute('aria-invalid')).toBe('true');
    expect(field('Enlace')?.getAttribute('aria-invalid')).toBe('true');
    expect(field('Precio aproximado')?.getAttribute('aria-invalid')).toBe('true');
    expect(text(page())).toContain('Escribe qué te gustaría.');
    expect(text(page())).toContain('Pega una dirección web que empiece por http:// o https://.');
  });

  it('points at the link when the API refuses it, and keeps what was typed', async () => {
    await open(ownEmpty);
    button('Añadir deseo')?.click();
    await settle();
    type('Qué te gustaría', 'Libro');
    type('Enlace', 'https://ejemplo.test/libro');
    await submit();

    http
      .expectOne((r) => r.url === WISHES_URL && r.method === 'POST')
      .flush(
        { type: 'urn:secretmatch:problem:invalid-wish-link', status: 422 },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await settle();

    expect(field('Enlace')?.getAttribute('aria-invalid')).toBe('true');
    expect(field('Qué te gustaría')?.value).toBe('Libro');
  });

  it('says when a Wish could not be saved, and keeps the form open', async () => {
    await open(ownEmpty);
    button('Añadir deseo')?.click();
    await settle();
    type('Qué te gustaría', 'Libro');
    await submit();

    http
      .expectOne((r) => r.url === WISHES_URL && r.method === 'POST')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(text(page().querySelector('[role="alert"]'))).toContain(
      'No hemos podido guardar el deseo',
    );
    expect(page().querySelector('form')).not.toBeNull();
  });

  it('lets the owner edit a Wish in place, starting from what it says', async () => {
    await open(own);

    button('Editar', rows()[0])?.click();
    await settle();
    expect(field('Qué te gustaría')?.value).toBe('Auriculares');
    expect(field('Precio aproximado')?.value).toBe('49,90');
    expect(field('Prioridad')?.value).toBe('HIGH');
    type('Qué te gustaría', 'Auriculares rojos');
    type('Precio aproximado', '');
    await submit();

    const request = http.expectOne(`${WISHES_URL}/w-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      title: 'Auriculares rojos',
      link: 'https://tienda.example/auriculares',
      notes: 'Inalámbricos, negros',
      priority: 'HIGH',
    });
    const edited = { ...auriculares, title: 'Auriculares rojos', price: undefined };
    request.flush(edited);
    await settle();
    http.expectOne(LUIS_WISHLIST_URL).flush({ ...own, wishes: [edited, libro] });
    await settle();

    expect(page().querySelector('form')).toBeNull();
    expect(text(rows()[0])).toContain('Auriculares rojos');
    expect(statusLine()).toBe('«Auriculares rojos» guardado.');
    expect(document.activeElement?.id).toBe('edit-w-1');
  });

  it('lets the owner delete a Wish after confirming', async () => {
    await open(own);

    button('Borrar', rows()[1])?.click();
    await settle();
    expect(text(rows()[1])).toContain('¿Borrar «Libro»?');
    button('Sí, borrar', rows()[1])?.click();
    await settle();

    const request = http.expectOne(`${WISHES_URL}/w-2`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    http.expectOne(LUIS_WISHLIST_URL).flush({ ...own, wishes: [auriculares] });
    await settle();

    expect(rows()).toHaveLength(1);
    expect(statusLine()).toBe('«Libro» ya no está en tu lista.');
  });

  it('keeps the Wish and says so when it could not be deleted', async () => {
    await open(own);
    button('Borrar', rows()[1])?.click();
    await settle();
    button('Sí, borrar', rows()[1])?.click();
    await settle();

    http.expectOne(`${WISHES_URL}/w-2`).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(rows()).toHaveLength(2);
    expect(text(page().querySelector('[role="alert"]'))).toContain(
      'No hemos podido borrar «Libro»',
    );
  });

  it('says the Wishlist cannot be found, without telling whether the Group exists', async () => {
    http
      .expectOne(LUIS_WISHLIST_URL)
      .flush(
        { type: 'urn:secretmatch:problem:group-not-found', status: 404 },
        { status: 404, statusText: 'Not Found' },
      );
    await settle();

    expect(text(page())).toContain('No encontramos esta lista');
  });

  it('offers to try again when the Wishlist fails to load', async () => {
    http.expectOne(LUIS_WISHLIST_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();
    expect(text(page().querySelector('[role="alert"]'))).toContain('No hemos podido cargar');

    button('Reintentar')?.click();
    await settle();
    await open(seenByMarta);

    expect(rows()).toHaveLength(2);
  });
});
