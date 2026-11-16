import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';
import { AppInstall, InstallOutcome } from '../../../../core/install/app-install';
import { JUST_JOINED } from '../../data-access/just-joined';
import { GroupPage } from './group-page';

const GROUP_URL = 'http://api.test/api/v1/groups/g-1';
const DRAW_URL = 'http://api.test/api/v1/groups/g-1/draw';
const NOT_DRAWN = {
  body: { type: 'urn:secretmatch:problem:draw-not-found', status: 404 },
  init: { status: 404, statusText: 'Not Found' },
};
const navidad = {
  id: 'g-1',
  name: 'Navidad en casa',
  exchangeDate: '2026-12-24',
  budget: 30,
  currency: 'EUR',
  timeZone: 'Europe/Madrid',
  members: [
    { id: 'u-carmen', displayName: 'Abuela Carmen', admin: true, you: false },
    { id: 'u-luis', displayName: 'Luis', admin: false, you: true },
  ],
  inviteCode: 'q8Xf3kL0',
  admin: false,
  finished: false,
  drawn: false,
};

/** Stands in for AppInstall: its rules are tested in its own spec, here only how the page uses it. */
function fakeAppInstall(outcome: InstallOutcome) {
  const visible = signal(false);
  return {
    way: signal(null).asReadonly(),
    suggestionVisible: visible.asReadonly(),
    considerSuggestion: vi.fn(
      ({ justJoined, finished }: { justJoined: boolean; finished: boolean }) =>
        visible.set(justJoined && !finished),
    ),
    dismissSuggestion: vi.fn(() => visible.set(false)),
    install: vi.fn(async () => outcome),
  };
}

describe('GroupPage install suggestion', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let appInstall: ReturnType<typeof fakeAppInstall>;

  beforeAll(() => import('@lucide/angular'), 90_000);

  async function open({
    justJoined = false,
    group = navidad,
    outcome = 'guide' as InstallOutcome,
  } = {}): Promise<void> {
    appInstall = fakeAppInstall(outcome);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'groups/:groupId', component: GroupPage }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
        { provide: AppInstall, useValue: appInstall },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    // A modal <dialog> opens only inside the document.
    document.body.appendChild(harness.fixture.nativeElement);
    await TestBed.inject(Router).navigate(
      ['/groups', 'g-1'],
      justJoined ? { state: JUST_JOINED } : {},
    );
    harness.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    http.expectOne(GROUP_URL).flush(group);
    await settle();
  }

  afterEach(() => {
    http
      .match((request) => request.url === DRAW_URL)
      .forEach((request) => request.flush(NOT_DRAWN.body, NOT_DRAWN.init));
    http.verify();
    document.body.innerHTML = '';
  });

  const page = () => harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  };
  const bar = () => page().querySelector('app-install-bar');
  const barButton = (name: string) =>
    [...(bar()?.querySelectorAll('button') ?? [])].find(
      (button) => (button.getAttribute('aria-label') ?? button.textContent?.trim()) === name,
    );
  /** The page's own guide: the Preferences menu in the header carries another. */
  const guide = () =>
    page().querySelector<HTMLDialogElement>('main app-install-guide dialog') as HTMLDialogElement;

  it('suggests installing right after joining or creating the Group', async () => {
    await open({ justJoined: true });

    expect(appInstall.considerSuggestion).toHaveBeenCalledWith({
      justJoined: true,
      finished: false,
    });
    expect(bar()?.textContent).toContain('Instala SecretMatch y entra con un toque');
    expect(bar()?.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      'install-bar-title',
    );
  });

  it('tells AppInstall about a later visit, which decides on its own', async () => {
    await open();

    expect(appInstall.considerSuggestion).toHaveBeenCalledWith({
      justJoined: false,
      finished: false,
    });
    expect(bar()).toBeNull();
  });

  it('tells AppInstall when the Group is finished', async () => {
    await open({ justJoined: true, group: { ...navidad, finished: true } });

    expect(appInstall.considerSuggestion).toHaveBeenCalledWith({
      justJoined: true,
      finished: true,
    });
    expect(bar()).toBeNull();
  });

  it('never takes focus when it appears', async () => {
    await open({ justJoined: true });

    expect(bar()?.contains(document.activeElement)).toBe(false);
  });

  it('on "Ahora no" goes away and puts focus on the Group name', async () => {
    await open({ justJoined: true });

    barButton('Ahora no')?.click();
    await settle();

    expect(appInstall.dismissSuggestion).toHaveBeenCalledOnce();
    expect(bar()).toBeNull();
    expect(document.activeElement).toBe(page().querySelector('h1'));
  });

  it('opens the guide on iOS', async () => {
    await open({ justJoined: true, outcome: 'guide' });
    expect(guide().open).toBe(false);

    barButton('Instalar')?.click();
    await settle();

    expect(appInstall.install).toHaveBeenCalledOnce();
    expect(guide().open).toBe(true);
    expect(guide().textContent).toContain('Añadir a pantalla de inicio');
  });

  it('opens no guide where the browser installs it', async () => {
    await open({ justJoined: true, outcome: 'installed' });

    barButton('Instalar')?.click();
    await settle();

    expect(appInstall.install).toHaveBeenCalledOnce();
    expect(guide().open).toBe(false);
  });
});
