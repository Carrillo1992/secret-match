import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { DontListEntry } from '../../data-access/wishlist-api';
import { DontListCard } from './dont-list-card';

const DONT_LIST_URL = 'http://api.test/api/v1/groups/g-1/dont-list';

const chocolate = { id: 'd-1', text: 'Nada de chocolate' };
const velas = { id: 'd-2', text: 'Velas' };

describe('DontListCard', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<DontListCard>;
  let emitted: (readonly DontListEntry[])[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    fixture.nativeElement.remove();
  });

  /** The card as `owner` (or the Giver) sees it; entries come back through `entriesChange`. */
  async function show(entries: readonly DontListEntry[], owner: boolean): Promise<void> {
    fixture = TestBed.createComponent(DontListCard);
    // Attached, so that focus can land on its elements.
    document.body.appendChild(fixture.nativeElement);
    fixture.componentRef.setInput('groupId', 'g-1');
    fixture.componentRef.setInput('entries', entries);
    fixture.componentRef.setInput('owner', owner);
    fixture.componentRef.setInput('ownerName', 'Luis');
    emitted = [];
    fixture.componentInstance.entriesChange.subscribe((next) => {
      emitted.push(next);
      fixture.componentRef.setInput('entries', next);
    });
    await fixture.whenStable();
  }

  const card = () => fixture.nativeElement as HTMLElement;
  const text = (element: Element | null | undefined) =>
    (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  const rows = () => [...card().querySelectorAll('ul > li')].map(text);
  const button = (label: string) =>
    [...card().querySelectorAll('button')].find(
      (b) => text(b) === label || b.getAttribute('aria-label') === label,
    );
  const input = () => card().querySelector('input');
  const type = (value: string) => {
    const control = input();
    if (!control) throw new Error('the form is not open');
    control.value = value;
    control.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    card().querySelector('form')?.dispatchEvent(new Event('submit'));
    await settle();
  };
  const statusLine = () => text(card().querySelector('[role="status"]'));
  const alert = () => text(card().querySelector('[role="alert"]'));

  async function openForm(): Promise<void> {
    button('Añadir')?.click();
    await settle();
  }

  it('shows the owner their entries, oldest first, each with a way to remove it', async () => {
    await show([chocolate, velas], true);

    expect(text(card().querySelector('h2'))).toBe('Nada de…');
    expect(rows()).toEqual(['Nada de chocolate', 'Velas']);
    expect(button('Quitar «Nada de chocolate»')).toBeDefined();
    expect(button('Quitar «Velas»')).toBeDefined();
    expect(button('Añadir')).toBeDefined();
  });

  it('invites the owner to write their first entry', async () => {
    await show([], true);

    expect(text(card())).toContain(
      'Apunta lo que no quieres recibir, para que nadie te lo regale.',
    );
    expect(rows()).toEqual([]);
  });

  it('shows the Giver the entries with no way to change them', async () => {
    await show([chocolate, velas], false);

    expect(rows()).toEqual(['Nada de chocolate', 'Velas']);
    expect(card().querySelectorAll('button')).toHaveLength(0);
    expect(card().querySelector('form')).toBeNull();
  });

  it('shows the Giver nothing when the Don’t List is empty', async () => {
    await show([], false);

    expect(card().querySelector('section')).toBeNull();
    expect(text(card())).toBe('');
  });

  it('lets the owner add an entry at the end, then closes the form and says so', async () => {
    await show([chocolate], true);

    await openForm();
    expect(document.activeElement).toBe(input());
    type('  Velas ');
    await submit();
    expect(button('Añadiendo…')?.disabled).toBe(true);

    const request = http.expectOne((r) => r.url === DONT_LIST_URL && r.method === 'POST');
    expect(request.request.body).toEqual({ text: 'Velas' });
    request.flush(velas, { status: 201, statusText: 'Created' });
    await settle();

    expect(emitted).toEqual([[chocolate, velas]]);
    expect(rows()).toEqual(['Nada de chocolate', 'Velas']);
    expect(card().querySelector('form')).toBeNull();
    expect(statusLine()).toBe('Añadido «Velas».');
    expect(document.activeElement?.id).toBe('add-dont-list-entry');
  });

  it('gives focus back to "Añadir" when the form is cancelled', async () => {
    await show([], true);
    await openForm();

    button('Cancelar')?.click();
    await settle();

    expect(card().querySelector('form')).toBeNull();
    expect(document.activeElement?.id).toBe('add-dont-list-entry');
  });

  it('refuses a blank entry before asking the API', async () => {
    await show([], true);
    await openForm();

    type('   ');
    await submit();

    http.expectNone(DONT_LIST_URL);
    expect(input()?.getAttribute('aria-invalid')).toBe('true');
    expect(text(card())).toContain('Escribe qué no quieres recibir.');
    expect(emitted).toEqual([]);
  });

  it('refuses an entry longer than 100 characters before asking the API', async () => {
    await show([], true);
    await openForm();

    type('a'.repeat(101));
    await submit();

    http.expectNone(DONT_LIST_URL);
    expect(input()?.getAttribute('aria-invalid')).toBe('true');
    expect(input()?.getAttribute('aria-describedby')).toBe('dont-list-entry-error');
    expect(text(card())).toContain('Como mucho 100 caracteres.');
  });

  it('accepts exactly 100 characters', async () => {
    await show([], true);
    await openForm();

    type('a'.repeat(100));
    await submit();

    http.expectOne(DONT_LIST_URL).flush({ id: 'd-3', text: 'a'.repeat(100) });
    await settle();
  });

  it('points at the length when the API refuses the entry, keeping what was typed', async () => {
    await show([], true);
    await openForm();
    type('Velas');
    await submit();

    http
      .expectOne(DONT_LIST_URL)
      .flush(
        { type: 'urn:secretmatch:problem:invalid-dont-list-entry', status: 422 },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await settle();

    expect(input()?.value).toBe('Velas');
    expect(input()?.getAttribute('aria-invalid')).toBe('true');
    expect(text(card())).toContain('Como mucho 100 caracteres.');
    expect(emitted).toEqual([]);
  });

  it('says when the entry could not be added, keeping what was typed', async () => {
    await show([], true);
    await openForm();
    type('Velas');
    await submit();

    http.expectOne(DONT_LIST_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(alert()).toBe('No hemos podido añadirlo. Inténtalo de nuevo.');
    expect(input()?.value).toBe('Velas');
    expect(button('Añadir')?.disabled).toBe(false);
    expect(emitted).toEqual([]);
  });

  it('removes an entry at once, then says so and moves focus to the next one', async () => {
    await show([chocolate, velas], true);

    button('Quitar «Nada de chocolate»')?.click();
    await settle();
    expect(button('Quitar «Nada de chocolate»')?.disabled).toBe(true);

    const request = http.expectOne(`${DONT_LIST_URL}/d-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(emitted).toEqual([[velas]]);
    expect(rows()).toEqual(['Velas']);
    expect(statusLine()).toBe('Quitado «Nada de chocolate».');
    expect(document.activeElement).toBe(button('Quitar «Velas»'));
  });

  it('moves focus to "Añadir" once the last entry is removed', async () => {
    await show([velas], true);

    button('Quitar «Velas»')?.click();
    await settle();
    http.expectOne(`${DONT_LIST_URL}/d-2`).flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(emitted).toEqual([[]]);
    expect(text(card())).toContain('Apunta lo que no quieres recibir');
    expect(document.activeElement?.id).toBe('add-dont-list-entry');
  });

  it('keeps the entry and says so when it could not be removed', async () => {
    await show([chocolate, velas], true);

    button('Quitar «Velas»')?.click();
    await settle();
    http.expectOne(`${DONT_LIST_URL}/d-2`).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(emitted).toEqual([]);
    expect(rows()).toEqual(['Nada de chocolate', 'Velas']);
    expect(alert()).toBe('No hemos podido quitar «Velas». Inténtalo de nuevo.');
    expect(button('Quitar «Velas»')?.disabled).toBe(false);
    expect(statusLine()).toBe('');
  });
});
