import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PAGE_RELOAD } from '../../../core/preferences/language-preference';
import { PreferencesMenu } from './preferences-menu';

@Component({
  imports: [PreferencesMenu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-preferences-menu id="flat" />
    <app-preferences-menu id="raised" raised />
  `,
})
class Host {}

describe('PreferencesMenu', () => {
  let page: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let reload: ReturnType<typeof vi.fn>;

  beforeAll(() => import('@lucide/angular'), 90_000);

  beforeEach(async () => {
    reload = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: PAGE_RELOAD, useValue: reload }] });
    fixture = TestBed.createComponent(Host);
    page = fixture.nativeElement as HTMLElement;
    document.body.appendChild(page);
    await fixture.whenStable();
  });

  afterEach(() => {
    page.remove();
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  const menu = (root: HTMLElement) => root.querySelector('#flat') as HTMLElement;
  const trigger = () => menu(page).querySelector<HTMLButtonElement>('button[aria-haspopup]');
  const dialog = () => menu(page).querySelector('dialog') as HTMLDialogElement;
  const row = (label: string) =>
    Array.from(dialog().querySelectorAll<HTMLButtonElement>('[role="radio"]')).find((r) =>
      r.textContent?.includes(label),
    );
  const groupNamed = (name: string) =>
    Array.from(dialog().querySelectorAll('[role="radiogroup"]')).find(
      (group) =>
        document.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent === name,
    );
  const openMenu = async () => {
    trigger()?.click();
    await fixture.whenStable();
  };

  it('is an icon button named "Preferencias" that says it opens a dialog', () => {
    expect(trigger()?.getAttribute('aria-label')).toBe('Preferencias');
    expect(trigger()?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger()?.getAttribute('aria-expanded')).toBe('false');
    expect(dialog().open).toBe(false);
  });

  it('opens a sheet named "Preferencias" with the Theme and Language choices', async () => {
    await openMenu();

    expect(dialog().open).toBe(true);
    expect(trigger()?.getAttribute('aria-expanded')).toBe('true');
    expect(dialog().querySelector('h2')?.textContent).toContain('Preferencias');
    expect(groupNamed('Tema')?.textContent).toMatch(/Sistema.*Claro.*Oscuro/s);
    expect(groupNamed('Idioma')?.textContent).toMatch(/Español.*English/s);
  });

  it('shows System as the Theme on a first visit', async () => {
    await openMenu();

    expect(row('Sistema')?.getAttribute('aria-checked')).toBe('true');
  });

  it('applies a Theme as soon as it is chosen, and remembers it', async () => {
    await openMenu();

    row('Oscuro')?.click();
    await fixture.whenStable();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(row('Oscuro')?.getAttribute('aria-checked')).toBe('true');
    expect(localStorage.getItem('secretmatch.theme')).toBe('dark');
  });

  it('shows the Language the app speaks, each one written in its own language', async () => {
    await openMenu();

    expect(row('Español')?.getAttribute('aria-checked')).toBe('true');
    expect(row('English')?.querySelector('[lang="en"]')).not.toBeNull();
  });

  it('switches the Language by saving it and reloading the page in it', async () => {
    await openMenu();

    row('English')?.click();
    await fixture.whenStable();

    expect(localStorage.getItem('secretmatch.language')).toBe('en');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload when the Language chosen is the one the app already speaks', async () => {
    await openMenu();

    row('Español')?.click();
    await fixture.whenStable();

    expect(reload).not.toHaveBeenCalled();
  });

  it('closes on Escape and gives focus back to the button', async () => {
    await openMenu();

    dialog().dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();

    expect(dialog().open).toBe(false);
    expect(trigger()?.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger());
  });

  it('sits on its own disc when raised over an illustration', () => {
    const raised = page.querySelector('#raised button[aria-haspopup]');

    expect(raised?.classList).toContain('bg-surface');
    expect(trigger()?.classList).not.toContain('bg-surface');
  });
});
