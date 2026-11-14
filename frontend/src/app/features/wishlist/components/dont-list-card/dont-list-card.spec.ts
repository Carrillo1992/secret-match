import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DontListEntry } from '../../data-access/wishlist-api';
import { DontListAddition, DontListCard, DontListRemoval } from './dont-list-card';

const chocolate = { id: 'd-1', text: 'Nada de chocolate' };
const velas = { id: 'd-2', text: 'Velas' };

describe('DontListCard', () => {
  let fixture: ComponentFixture<DontListCard>;
  let added: string[];
  let removed: DontListEntry[];

  afterEach(() => fixture.nativeElement.remove());

  /** The card as `owner` (or the Giver) sees it. */
  async function show(entries: readonly DontListEntry[], owner: boolean): Promise<void> {
    fixture = TestBed.createComponent(DontListCard);
    // Attached, so that focus can land on its elements.
    document.body.appendChild(fixture.nativeElement);
    fixture.componentRef.setInput('entries', entries);
    fixture.componentRef.setInput('owner', owner);
    fixture.componentRef.setInput('ownerName', 'Luis');
    added = [];
    removed = [];
    fixture.componentInstance.add.subscribe((text) => added.push(text));
    fixture.componentInstance.remove.subscribe((entry) => removed.push(entry));
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
  /** What the page feeds back while it changes the Don't List through the API. */
  const pageSays = async (
    change: { addition?: DontListAddition; removal?: DontListRemoval },
    entries?: readonly DontListEntry[],
  ) => {
    if (entries) fixture.componentRef.setInput('entries', entries);
    if (change.addition) fixture.componentRef.setInput('addition', change.addition);
    if (change.removal) fixture.componentRef.setInput('removal', change.removal);
    await settle();
  };

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
    expect(card().querySelector('ul')?.getAttribute('aria-label')).toBe(
      'Lo que Luis no quiere recibir',
    );
    expect(card().querySelectorAll('button')).toHaveLength(0);
    expect(card().querySelector('form')).toBeNull();
  });

  it('shows the Giver nothing when the Don’t List is empty', async () => {
    await show([], false);

    expect(card().querySelector('section')).toBeNull();
    expect(text(card())).toBe('');
  });

  it('sends the entry the owner typed, trimmed', async () => {
    await show([chocolate], true);

    await openForm();
    expect(document.activeElement).toBe(input());
    type('  Velas ');
    await submit();

    expect(added).toEqual(['Velas']);
  });

  it('shows the entry being added and sends nothing more meanwhile', async () => {
    await show([], true);
    await openForm();
    type('Velas');
    await submit();

    await pageSays({ addition: { status: 'adding' } });
    expect(button('Añadiendo…')?.disabled).toBe(true);
    await submit();

    expect(added).toEqual(['Velas']);
  });

  it('closes the form once the entry is added, says so and gives focus back to "Añadir"', async () => {
    await show([chocolate], true);
    await openForm();
    type('Velas');
    await submit();
    await pageSays({ addition: { status: 'adding' } });

    await pageSays({ addition: { status: 'added', entry: velas } }, [chocolate, velas]);

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

  it('refuses a blank entry without sending it', async () => {
    await show([], true);
    await openForm();

    type('   ');
    await submit();

    expect(added).toEqual([]);
    expect(input()?.getAttribute('aria-invalid')).toBe('true');
    expect(text(card())).toContain('Escribe qué no quieres recibir.');
  });

  it('refuses an entry longer than 100 characters without sending it', async () => {
    await show([], true);
    await openForm();

    type('a'.repeat(101));
    await submit();

    expect(added).toEqual([]);
    expect(input()?.getAttribute('aria-invalid')).toBe('true');
    expect(input()?.getAttribute('aria-describedby')).toBe('dont-list-entry-error');
    expect(text(card())).toContain('Como mucho 100 caracteres.');
  });

  it('accepts exactly 100 characters, counted without the spaces around them', async () => {
    await show([], true);
    await openForm();

    type(` ${'a'.repeat(100)} `);
    await submit();

    expect(added).toEqual(['a'.repeat(100)]);
  });

  it('points at the length when the API refuses the entry, keeping what was typed', async () => {
    await show([], true);
    await openForm();
    type('Velas');
    await submit();

    await pageSays({ addition: { status: 'adding' } });
    await pageSays({ addition: { status: 'invalid' } });

    expect(input()?.value).toBe('Velas');
    expect(input()?.getAttribute('aria-invalid')).toBe('true');
    expect(text(card())).toContain('Como mucho 100 caracteres.');
  });

  it('says when the entry could not be added, keeping what was typed', async () => {
    await show([], true);
    await openForm();
    type('Velas');
    await submit();

    await pageSays({ addition: { status: 'adding' } });
    await pageSays({ addition: { status: 'failed' } });

    expect(alert()).toBe('No hemos podido añadirlo. Inténtalo de nuevo.');
    expect(input()?.value).toBe('Velas');
    expect(button('Añadir')?.disabled).toBe(false);
  });

  it('asks to remove an entry at once, and shows it being removed', async () => {
    await show([chocolate, velas], true);

    button('Quitar «Nada de chocolate»')?.click();
    await settle();
    expect(removed).toEqual([chocolate]);

    await pageSays({ removal: { entry: chocolate, status: 'removing' } });
    expect(button('Quitar «Nada de chocolate»')?.disabled).toBe(true);
    expect(button('Quitar «Velas»')?.disabled).toBe(false);
  });

  it('says an entry was removed and moves focus to the one that takes its place', async () => {
    await show([chocolate, velas], true);
    button('Quitar «Nada de chocolate»')?.click();
    await pageSays({ removal: { entry: chocolate, status: 'removing' } });

    await pageSays({ removal: { entry: chocolate, status: 'removed' } }, [velas]);

    expect(rows()).toEqual(['Velas']);
    expect(statusLine()).toBe('Quitado «Nada de chocolate».');
    expect(document.activeElement).toBe(button('Quitar «Velas»'));
  });

  it('moves focus to the entry before once the last one is removed', async () => {
    await show([chocolate, velas], true);
    button('Quitar «Velas»')?.click();
    await pageSays({ removal: { entry: velas, status: 'removing' } });

    await pageSays({ removal: { entry: velas, status: 'removed' } }, [chocolate]);

    expect(document.activeElement).toBe(button('Quitar «Nada de chocolate»'));
  });

  it('moves focus to "Añadir" once the only entry is removed', async () => {
    await show([velas], true);
    button('Quitar «Velas»')?.click();
    await pageSays({ removal: { entry: velas, status: 'removing' } });

    await pageSays({ removal: { entry: velas, status: 'removed' } }, []);

    expect(text(card())).toContain('Apunta lo que no quieres recibir');
    expect(document.activeElement?.id).toBe('add-dont-list-entry');
  });

  it('moves focus to the heading once the only entry is removed while the form is open', async () => {
    await show([velas], true);
    await openForm();
    button('Quitar «Velas»')?.click();
    await pageSays({ removal: { entry: velas, status: 'removing' } });

    await pageSays({ removal: { entry: velas, status: 'removed' } }, []);

    expect(document.activeElement?.id).toBe('dont-list-heading');
  });

  it('keeps the entry, says so and gives its button focus back when it could not be removed', async () => {
    await show([chocolate, velas], true);
    button('Quitar «Velas»')?.click();
    await pageSays({ removal: { entry: velas, status: 'removing' } });

    await pageSays({ removal: { entry: velas, status: 'failed' } });

    expect(rows()).toEqual(['Nada de chocolate', 'Velas']);
    expect(alert()).toBe('No hemos podido quitar «Velas». Inténtalo de nuevo.');
    expect(button('Quitar «Velas»')?.disabled).toBe(false);
    expect(document.activeElement).toBe(button('Quitar «Velas»'));
    expect(statusLine()).toBe('');
  });

  it('draws the focus ring of its ✕ buttons in danger, as the warning card asks', async () => {
    await show([chocolate], true);

    const remove = button('Quitar «Nada de chocolate»');
    expect(remove?.classList).toContain('focus-visible:outline-danger');
    expect(remove?.classList).not.toContain('focus-visible:outline-primary');
  });
});
