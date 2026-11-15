import { ChangeDetectionStrategy, Component } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../core/auth/auth.interceptor';
import { AuthSession } from '../../../core/auth/auth-session';
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
  let http: HttpTestingController;

  beforeAll(() => import('@lucide/angular'), 90_000);

  beforeEach(async () => {
    reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
        { provide: PAGE_RELOAD, useValue: reload },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Host);
    page = fixture.nativeElement as HTMLElement;
    document.body.appendChild(page);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
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

  it('offers a quiet link to buy SecretMatch a coffee on Ko-fi', async () => {
    await openMenu();

    const link = dialog().querySelector<HTMLAnchorElement>('a[href="https://ko-fi.com/daniel92"]');
    expect(link?.textContent).toContain('Invítame a un café');
    expect(link?.target).toBe('_blank');
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

  it('says nothing about emails while nobody is signed in', async () => {
    await openMenu();

    expect(dialog().textContent).not.toContain('emails');
  });

  describe('signed in', () => {
    const LANGUAGE_URL = 'http://api.test/api/v1/users/me/language';

    beforeEach(async () => {
      const restored = TestBed.inject(AuthSession).refresh();
      http
        .expectOne('http://api.test/api/v1/sessions/refresh')
        .flush({ accessToken: 'access-1', expiresAt: '2026-12-01T10:15:00Z' });
      await restored;
      await openMenu();
    });

    const chooseEnglish = async () => {
      row('English')?.click();
      await fixture.whenStable();
      return http.expectOne(LANGUAGE_URL);
    };
    /** Lets the awaited save resume, then renders. */
    const settle = async () => {
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
    };
    const languageRows = () =>
      Array.from(groupNamed('Idioma')?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []);

    it('says the Language is used for emails too', () => {
      const note = dialog().querySelector(
        '#' + groupNamed('Idioma')?.getAttribute('aria-describedby'),
      );

      expect(note?.textContent).toContain('También se usa en tus emails.');
    });

    it('saves the Language to the User before reloading the page in it', async () => {
      const request = await chooseEnglish();

      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ language: 'en' });
      expect(reload).not.toHaveBeenCalled();
      expect(localStorage.getItem('secretmatch.language')).toBeNull();

      request.flush({
        displayName: 'Ana',
        email: 'ana@example.com',
        hasPassword: true,
        language: 'en',
      });
      await settle();

      expect(localStorage.getItem('secretmatch.language')).toBe('en');
      expect(reload).toHaveBeenCalledOnce();
    });

    it('shows the chosen Language saving, and holds the Language rows still, while Theme still works', async () => {
      await chooseEnglish();

      expect(row('English')?.textContent).toContain('Guardando…');
      expect(languageRows().every((r) => r.disabled)).toBe(true);
      expect(row('Español')?.getAttribute('aria-checked')).toBe('true');

      row('Oscuro')?.click();
      await fixture.whenStable();
      expect(row('Oscuro')?.getAttribute('aria-checked')).toBe('true');
    });

    it('stays in the current Language and says so when the User Language cannot be saved', async () => {
      const request = await chooseEnglish();
      request.flush(null, { status: 500, statusText: 'Internal Server Error' });
      await settle();

      expect(reload).not.toHaveBeenCalled();
      expect(localStorage.getItem('secretmatch.language')).toBeNull();
      expect(row('Español')?.getAttribute('aria-checked')).toBe('true');
      expect(row('English')?.textContent).not.toContain('Guardando…');
      expect(languageRows().some((r) => r.disabled)).toBe(false);
      expect(dialog().querySelector('[role="alert"]')?.textContent).toContain(
        'No hemos podido cambiar el idioma. Inténtalo de nuevo.',
      );
    });
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
