import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { PreferencesCard } from './preferences-card';

const PREFERENCES_URL = 'http://api.test/api/v1/groups/g-1/preferences';

describe('PreferencesCard', () => {
  let fixture: ComponentFixture<PreferencesCard>;
  let http: HttpTestingController;
  let card: HTMLElement;

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

  afterEach(() => http.verify());

  async function render(inputs: { preferences?: string; owner: boolean }): Promise<void> {
    fixture = TestBed.createComponent(PreferencesCard);
    fixture.componentRef.setInput('groupId', 'g-1');
    fixture.componentRef.setInput('preferences', inputs.preferences);
    fixture.componentRef.setInput('owner', inputs.owner);
    fixture.componentRef.setInput('ownerName', 'Luis');
    card = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  const text = (element: Element | null | undefined) =>
    (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const button = (label: string) =>
    [...card.querySelectorAll('button')].find((b) => text(b) === label);
  const textarea = () => card.querySelector('textarea');
  const counter = () => card.querySelector('[data-counter]');
  /** The card's own status line, where a saved change is announced. */
  const status = () => text(card.querySelector('p[role="status"]'));
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  const open = async (label: string) => {
    button(label)?.click();
    await settle();
  };
  const type = async (value: string) => {
    const control = textarea();
    if (!control) throw new Error('the editor is not open');
    control.value = value;
    control.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const save = async () => {
    card.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  it("shows the Giver their Receiver's Preferences, with no way to change them", async () => {
    await render({ preferences: 'Talla M.\nMe encanta el café.', owner: false });

    expect(text(card.querySelector('h2'))).toBe('Sus gustos');
    expect(text(card)).toContain('Talla M. Me encanta el café.');
    expect(card.querySelector('button')).toBeNull();
  });

  it('shows the Giver nothing when their Receiver has no Preferences', async () => {
    await render({ preferences: undefined, owner: false });

    expect(text(card)).toBe('');
    expect(card.querySelector('section')).toBeNull();
  });

  it('shows the owner their Preferences with a way to edit them', async () => {
    await render({ preferences: 'Talla M.', owner: true });

    expect(text(card.querySelector('h2'))).toBe('Tus gustos');
    expect(text(card)).toContain('Talla M.');
    expect(button('Editar')).toBeDefined();
  });

  it('invites the owner to write their Preferences when there are none', async () => {
    await render({ preferences: undefined, owner: true });

    expect(text(card)).toContain(
      'Cuenta tus tallas, gustos y aficiones para orientar a quien te regale.',
    );
    expect(button('Escribir mis gustos')).toBeDefined();
  });

  it('lets the owner edit their Preferences, starting from what they say', async () => {
    await render({ preferences: 'Talla M.', owner: true });
    const changes: (string | undefined)[] = [];
    fixture.componentInstance.preferencesChange.subscribe((value) => {
      changes.push(value);
      fixture.componentRef.setInput('preferences', value);
    });

    await open('Editar');
    expect(document.activeElement).toBe(textarea());
    expect(textarea()?.value).toBe('Talla M.');
    expect(text(counter())).toBe('8 / 2000');
    await type('Talla M, pie 42.\nMe encanta el café.');
    expect(text(counter())).toBe('36 / 2000');
    await save();

    const request = http.expectOne(PREFERENCES_URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ preferences: 'Talla M, pie 42.\nMe encanta el café.' });
    expect(text(button('Guardando…'))).toBe('Guardando…');
    expect(button('Guardando…')?.disabled).toBe(true);
    request.flush({ preferences: 'Talla M, pie 42.\nMe encanta el café.' });
    await settle();

    expect(changes).toEqual(['Talla M, pie 42.\nMe encanta el café.']);
    expect(textarea()).toBeNull();
    expect(text(card)).toContain('Talla M, pie 42. Me encanta el café.');
    expect(status()).toBe('Gustos guardados.');
    expect(document.activeElement?.id).toBe('edit-preferences');
  });

  it('lets the owner write their first Preferences', async () => {
    await render({ preferences: undefined, owner: true });

    await open('Escribir mis gustos');
    expect(textarea()?.value).toBe('');
    expect(textarea()?.getAttribute('placeholder')).toContain('Tallas, colores, aficiones');
    await type('Talla M.');
    await save();

    http.expectOne(PREFERENCES_URL).flush({ preferences: 'Talla M.' });
    await settle();
    expect(status()).toBe('Gustos guardados.');
  });

  it('clears the Preferences when saved blank', async () => {
    await render({ preferences: 'Talla M.', owner: true });
    const changes: (string | undefined)[] = [];
    fixture.componentInstance.preferencesChange.subscribe((value) => changes.push(value));

    await open('Editar');
    await type('   ');
    await save();

    const request = http.expectOne(PREFERENCES_URL);
    expect(request.request.body).toEqual({ preferences: '   ' });
    request.flush({});
    await settle();

    expect(changes).toEqual([undefined]);
    expect(status()).toBe('Gustos borrados.');
  });

  it('refuses more than 2000 characters before asking the API', async () => {
    await render({ preferences: undefined, owner: true });
    await open('Escribir mis gustos');

    await type('a'.repeat(2001));
    expect(text(counter())).toBe('2001 / 2000');
    expect(counter()?.classList).toContain('text-danger');
    await save();

    http.expectNone(PREFERENCES_URL);
    expect(textarea()?.getAttribute('aria-invalid')).toBe('true');
    expect(text(card)).toContain('Como mucho 2000 caracteres.');
    expect(textarea()?.getAttribute('aria-describedby')).toContain(counter()?.id);
  });

  it('points at the text when the API refuses its length', async () => {
    await render({ preferences: undefined, owner: true });
    await open('Escribir mis gustos');
    await type('Talla M.');
    await save();

    http
      .expectOne(PREFERENCES_URL)
      .flush(
        { type: 'urn:secretmatch:problem:invalid-preferences', status: 422 },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await settle();

    expect(textarea()?.getAttribute('aria-invalid')).toBe('true');
    expect(text(card)).toContain('Como mucho 2000 caracteres.');
  });

  it('says when the Preferences could not be saved, and keeps what was typed', async () => {
    await render({ preferences: undefined, owner: true });
    await open('Escribir mis gustos');
    await type('Talla M.');
    await save();

    http.expectOne(PREFERENCES_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(text(card.querySelector('[role="alert"]'))).toBe(
      'No hemos podido guardar tus gustos. Inténtalo de nuevo.',
    );
    expect(textarea()?.value).toBe('Talla M.');
    expect(status()).toBe('');
  });

  it('closes the editor without saving when cancelled', async () => {
    await render({ preferences: 'Talla M.', owner: true });
    await open('Editar');
    await type('Otra cosa');

    button('Cancelar')?.click();
    await settle();

    http.expectNone(PREFERENCES_URL);
    expect(textarea()).toBeNull();
    expect(text(card)).toContain('Talla M.');
    expect(document.activeElement?.id).toBe('edit-preferences');
  });
});
