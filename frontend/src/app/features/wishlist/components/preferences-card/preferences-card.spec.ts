import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreferencesCard, PreferencesStatus } from './preferences-card';

describe('PreferencesCard', () => {
  let fixture: ComponentFixture<PreferencesCard>;
  let card: HTMLElement;
  let saved: string[];

  afterEach(() => fixture.nativeElement.remove());

  async function render(inputs: { preferences?: string; owner: boolean }): Promise<void> {
    fixture = TestBed.createComponent(PreferencesCard);
    // Attached, so that focus can land on its elements.
    document.body.appendChild(fixture.nativeElement);
    fixture.componentRef.setInput('preferences', inputs.preferences);
    fixture.componentRef.setInput('owner', inputs.owner);
    card = fixture.nativeElement as HTMLElement;
    saved = [];
    fixture.componentInstance.save.subscribe((value) => saved.push(value));
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
  const submit = async () => {
    card.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  /** What the page feeds back while it saves through the API. */
  const pageSays = async (status: PreferencesStatus, preferences?: string) => {
    if (status === 'saved') {
      fixture.componentRef.setInput('preferences', preferences);
    }
    fixture.componentRef.setInput('status', status);
    await settle();
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

    await open('Editar');
    expect(document.activeElement).toBe(textarea());
    expect(textarea()?.value).toBe('Talla M.');
    expect(text(counter())).toBe('8 / 2000');
    await type('Talla M, pie 42.\nMe encanta el café.');
    expect(text(counter())).toBe('36 / 2000');
    await submit();

    expect(saved).toEqual(['Talla M, pie 42.\nMe encanta el café.']);
  });

  it('sends the text trimmed', async () => {
    await render({ preferences: undefined, owner: true });
    await open('Escribir mis gustos');
    await type('  Talla M.\n ');
    await submit();

    expect(saved).toEqual(['Talla M.']);
  });

  it('shows the save in progress and sends nothing more meanwhile', async () => {
    await render({ preferences: undefined, owner: true });
    await open('Escribir mis gustos');
    await type('Talla M.');
    await submit();

    await pageSays('saving');
    expect(button('Guardando…')?.disabled).toBe(true);
    await submit();

    expect(saved).toEqual(['Talla M.']);
  });

  it('closes the editor once saved, says so and gives focus back to "Editar"', async () => {
    await render({ preferences: undefined, owner: true });
    await open('Escribir mis gustos');
    await type('Talla M.');
    await submit();
    await pageSays('saving');

    await pageSays('saved', 'Talla M.');

    expect(textarea()).toBeNull();
    expect(text(card)).toContain('Talla M.');
    expect(status()).toBe('Gustos guardados.');
    expect(document.activeElement?.id).toBe('edit-preferences');
  });

  it('says the Preferences were cleared when saved blank', async () => {
    await render({ preferences: 'Talla M.', owner: true });
    await open('Editar');
    await type('   ');
    await submit();
    expect(saved).toEqual(['']);
    await pageSays('saving');

    await pageSays('saved', undefined);

    expect(status()).toBe('Gustos borrados.');
  });

  it('counts and sends the text without the spaces around it, as the API checks it', async () => {
    await render({ preferences: undefined, owner: true });
    await open('Escribir mis gustos');

    await type(`  ${'a'.repeat(2000)}\n `);
    expect(text(counter())).toBe('2000 / 2000');
    await submit();

    expect(saved).toEqual(['a'.repeat(2000)]);
  });

  it('refuses more than 2000 characters without sending them', async () => {
    await render({ preferences: undefined, owner: true });
    await open('Escribir mis gustos');

    await type('a'.repeat(2001));
    expect(text(counter())).toBe('2001 / 2000');
    expect(counter()?.classList).toContain('text-danger');
    await submit();

    expect(saved).toEqual([]);
    expect(textarea()?.getAttribute('aria-invalid')).toBe('true');
    expect(text(card)).toContain('Como mucho 2000 caracteres.');
    expect(textarea()?.getAttribute('aria-describedby')).toContain(counter()?.id);
  });

  it('points at the text when the API refuses it', async () => {
    await render({ preferences: undefined, owner: true });
    await open('Escribir mis gustos');
    await type('Talla M.');
    await submit();

    await pageSays('saving');
    await pageSays('invalid');

    expect(textarea()?.getAttribute('aria-invalid')).toBe('true');
    expect(text(card)).toContain('Como mucho 2000 caracteres.');
  });

  it('says when the Preferences could not be saved, and keeps what was typed', async () => {
    await render({ preferences: undefined, owner: true });
    await open('Escribir mis gustos');
    await type('Talla M.');
    await submit();

    await pageSays('saving');
    await pageSays('failed');

    expect(text(card.querySelector('[role="alert"]'))).toBe(
      'No hemos podido guardar tus gustos. Inténtalo de nuevo.',
    );
    expect(textarea()?.value).toBe('Talla M.');
    expect(status()).toBe('');
  });

  it('does not show the last failure again when the editor is opened anew', async () => {
    await render({ preferences: 'Talla M.', owner: true });
    await open('Editar');
    await submit();
    await pageSays('saving');
    await pageSays('failed');

    button('Cancelar')?.click();
    await settle();
    await open('Editar');

    expect(card.querySelector('[role="alert"]')).toBeNull();
  });

  it('closes the editor without saving when cancelled', async () => {
    await render({ preferences: 'Talla M.', owner: true });
    await open('Editar');
    await type('Otra cosa');

    button('Cancelar')?.click();
    await settle();

    expect(saved).toEqual([]);
    expect(textarea()).toBeNull();
    expect(text(card)).toContain('Talla M.');
    expect(document.activeElement?.id).toBe('edit-preferences');
  });
});
