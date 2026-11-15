import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationExtras, NavigationStart, Router, RouterEvent } from '@angular/router';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppUpdates } from './app-updates';

describe('AppUpdates', () => {
  let versionUpdates: Subject<VersionEvent>;
  let unrecoverable: Subject<UnrecoverableStateEvent>;
  let routerEvents: Subject<RouterEvent>;
  let swUpdate: {
    isEnabled: boolean;
    checkForUpdate: ReturnType<typeof vi.fn>;
    versionUpdates: Subject<VersionEvent>;
    unrecoverable: Subject<UnrecoverableStateEvent>;
  };
  let location: { assign: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn> };
  let visibility: DocumentVisibilityState;
  let page: EventTarget;
  let extras: NavigationExtras;

  beforeEach(() => {
    versionUpdates = new Subject();
    unrecoverable = new Subject();
    routerEvents = new Subject();
    extras = {};
    swUpdate = {
      isEnabled: true,
      checkForUpdate: vi.fn(async () => false),
      versionUpdates,
      unrecoverable,
    };
    location = { assign: vi.fn(), reload: vi.fn() };
    visibility = 'visible';
    // A stand-in for the page's document: a real reload would end the test run.
    page = Object.defineProperties(new EventTarget(), {
      location: { value: location },
      visibilityState: { get: () => visibility },
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: swUpdate },
        {
          provide: Router,
          useValue: { events: routerEvents, currentNavigation: () => ({ extras }) },
        },
        { provide: DOCUMENT, useValue: page },
      ],
    });
  });

  const start = () => TestBed.inject(AppUpdates).start();
  const versionReady = () =>
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    });
  const navigateTo = (url: string) => routerEvents.next(new NavigationStart(1, url));
  const comeBackToTheApp = (state: DocumentVisibilityState) => {
    visibility = state;
    page.dispatchEvent(new Event('visibilitychange'));
  };

  it('keeps navigating inside the app while no new version is ready', () => {
    start();

    navigateTo('/groups');

    expect(location.assign).not.toHaveBeenCalled();
  });

  it('loads the next page from the new version once it is ready', () => {
    start();
    versionReady();

    navigateTo('/groups/7');

    expect(location.assign).toHaveBeenCalledWith('/groups/7');
  });

  it('reloads in place when the User goes back or forward, so history keeps one entry', () => {
    start();
    versionReady();

    // On back/forward the browser has already moved to the URL being navigated to.
    routerEvents.next(new NavigationStart(2, '/groups', 'popstate'));

    expect(location.reload).toHaveBeenCalled();
    expect(location.assign).not.toHaveBeenCalled();
  });

  it.each<NavigationExtras>([{ replaceUrl: true }, { skipLocationChange: true }])(
    'waits for a later navigation when this one must not leave a history entry: %j',
    (options) => {
      start();
      versionReady();

      // e.g. a page stripping a one-time token from the address bar as it opens.
      extras = options;
      navigateTo('/reset-password');
      expect(location.assign).not.toHaveBeenCalled();
      expect(location.reload).not.toHaveBeenCalled();

      extras = {};
      navigateTo('/groups');
      expect(location.assign).toHaveBeenCalledWith('/groups');
    },
  );

  it('does not reload the page the User is on when a new version arrives', () => {
    start();

    versionReady();

    expect(location.assign).not.toHaveBeenCalled();
    expect(location.reload).not.toHaveBeenCalled();
  });

  it('ignores version events other than a ready one', () => {
    start();
    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'new' } });

    navigateTo('/groups');

    expect(location.assign).not.toHaveBeenCalled();
  });

  it('reloads when the service worker can no longer serve this version', () => {
    start();

    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'missing chunk' });

    expect(location.reload).toHaveBeenCalled();
  });

  it('looks for a new version whenever the installed app comes back to the foreground', () => {
    start();

    comeBackToTheApp('hidden');
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();

    comeBackToTheApp('visible');
    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('stops listening once the app is torn down', () => {
    start();
    TestBed.resetTestingModule();

    comeBackToTheApp('visible');

    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
  });

  it('keeps looking after a failed check (offline, for example)', async () => {
    swUpdate.checkForUpdate.mockRejectedValueOnce(new Error('offline'));
    start();

    comeBackToTheApp('visible');
    await Promise.resolve();
    comeBackToTheApp('hidden');
    comeBackToTheApp('visible');

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('does nothing without a service worker (dev server, unsupported browser)', () => {
    swUpdate.isEnabled = false;
    start();
    versionReady();

    navigateTo('/groups');
    comeBackToTheApp('visible');

    expect(location.assign).not.toHaveBeenCalled();
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
  });
});
