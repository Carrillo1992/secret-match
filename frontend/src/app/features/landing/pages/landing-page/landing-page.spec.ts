import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { LandingPage } from './landing-page';

const HEALTH_URL = 'http://api.test/actuator/health';

describe('LandingPage', () => {
  let fixture: ComponentFixture<LandingPage>;
  let api: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    api = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LandingPage);
    // Not whenStable(): it would wait for the in-flight health request.
    TestBed.tick();
  });

  afterEach(() => api.verify());

  const page = () => fixture.nativeElement as HTMLElement;
  const statusText = () => page().querySelector('[data-testid="api-status"]')?.textContent ?? '';
  const retryButton = () =>
    page().querySelector<HTMLButtonElement>('[data-testid="api-status"] button');

  it('links to the sign-up page', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/sign-up"]');
    expect(link?.textContent).toContain('Crear cuenta');
    api.expectOne(HEALTH_URL);
  });

  it('repeats the sign-up and sign-in links at the end of the page', () => {
    expect(page().querySelectorAll('main a[href="/sign-up"]')).toHaveLength(2);
    expect(page().querySelectorAll('main a[href="/sign-in"]')).toHaveLength(2);
    api.expectOne(HEALTH_URL);
  });

  it('tells what SecretMatch offers, one selling point per section', () => {
    const headings = [...page().querySelectorAll('main h2')].map((h) => h.textContent?.trim());
    expect(headings).toEqual([
      'Un sobre que abres tú',
      'Pregunta sin delatarte',
      'Sabes qué regalar (y qué no)',
      'Las parejas, por separado',
      'Cómo funciona',
      '¿Organizamos el vuestro?',
    ]);
    expect(page().querySelectorAll('main ol > li')).toHaveLength(3);
    expect(page().textContent).toContain('Gratis y sin anuncios');
    api.expectOne(HEALTH_URL);
  });

  it('invites to buy SecretMatch a coffee on Ko-fi, in a new tab', () => {
    const link = page().querySelector('[data-testid="ko-fi"] a');
    expect(link?.getAttribute('href')).toBe('https://ko-fi.com/daniel92');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.textContent).toContain('Invítame a un café');
    api.expectOne(HEALTH_URL);
  });

  it('states the anonymity guarantee plainly', () => {
    expect(page().textContent).toContain(
      'Quien recibe el regalo nunca puede saber quién se lo hace.',
    );
    api.expectOne(HEALTH_URL);
  });

  it('links to the sign-in page', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/sign-in"]');
    expect(link?.textContent).toContain('Iniciar sesión');
    api.expectOne(HEALTH_URL);
  });

  it('shows nothing while the health request is in flight', () => {
    expect(statusText().trim()).toBe('');
    api.expectOne(HEALTH_URL);
  });

  it('shows nothing when the API reports itself up', async () => {
    api.expectOne(HEALTH_URL).flush({ status: 'UP' });
    await fixture.whenStable();

    expect(statusText().trim()).toBe('');
    expect(retryButton()).toBeNull();
  });

  it('shows the error state when the API cannot be reached', async () => {
    api.expectOne(HEALTH_URL).error(new ProgressEvent('error'), { status: 0 });
    await fixture.whenStable();

    expect(statusText()).toContain('No podemos conectar con el servidor');
    expect(retryButton()).not.toBeNull();
  });

  it('shows the error state when the API reports itself down', async () => {
    api
      .expectOne(HEALTH_URL)
      .flush({ status: 'DOWN' }, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(statusText()).toContain('No podemos conectar con el servidor');
  });

  it('checks again when the user retries after an error', async () => {
    api.expectOne(HEALTH_URL).error(new ProgressEvent('error'), { status: 0 });
    await fixture.whenStable();

    retryButton()?.click();
    TestBed.tick();
    api.expectOne(HEALTH_URL).flush({ status: 'UP' });
    await fixture.whenStable();

    expect(statusText().trim()).toBe('');
    expect(retryButton()).toBeNull();
  });

  describe('after the User deleted their account', () => {
    it('says the account is gone, and only when arriving from that deletion', async () => {
      api.expectOne(HEALTH_URL);
      const router = TestBed.inject(Router);
      router.resetConfig([
        { path: '', component: LandingPage },
        { path: 'other', children: [] },
      ]);
      const harness = await RouterTestingHarness.create();
      const arrive = async (state?: Record<string, unknown>) => {
        await router.navigateByUrl('/other');
        await router.navigateByUrl('/', { state });
        harness.detectChanges();
        api.match(HEALTH_URL);
        return (harness.routeNativeElement as HTMLElement).querySelector(
          '[data-testid="account-deleted"]',
        );
      };

      expect((await arrive({ accountDeleted: true }))?.textContent).toContain(
        'Tu cuenta se ha borrado',
      );
      expect(await arrive()).toBeNull();
    });
  });
});

describe('LandingPage sticky call to action', () => {
  type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
  let observed: { callback: Callback; targets: Element[] };

  class FakeIntersectionObserver {
    constructor(callback: Callback) {
      observed = { callback, targets: [] };
    }
    observe(target: Element) {
      observed.targets.push(target);
    }
    disconnect() {
      observed.targets = [];
    }
  }

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  const render = async () => {
    const fixture = TestBed.createComponent(LandingPage);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne(HEALTH_URL).flush({ status: 'UP' });
    await fixture.whenStable();
    const [hero, closing] = observed.targets;
    const report = (heroTop: number, heroVisible: boolean, closingVisible: boolean) => {
      observed.callback([
        {
          target: hero,
          isIntersecting: heroVisible,
          boundingClientRect: { top: heroTop } as DOMRect,
        },
        { target: closing, isIntersecting: closingVisible },
      ]);
      fixture.detectChanges();
    };
    const sticky = () =>
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="sticky-cta"]');
    return { report, sticky };
  };

  it('stays away while the hero call to action is on screen', async () => {
    const { report, sticky } = await render();

    expect(sticky()).toBeNull();
    report(200, true, false);
    expect(sticky()).toBeNull();
  });

  it('rises once the hero call to action has scrolled away above', async () => {
    const { report, sticky } = await render();

    report(-120, false, false);

    expect(sticky()?.querySelector('a[href="/sign-up"]')?.textContent).toContain('Crear cuenta');
  });

  it('leaves again when the closing call to action comes into view', async () => {
    const { report, sticky } = await render();

    report(-120, false, false);
    report(-2000, false, true);

    expect(sticky()).toBeNull();
  });
});
