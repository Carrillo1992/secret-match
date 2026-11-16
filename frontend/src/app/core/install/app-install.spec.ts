import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppInstall, NOW, catchEarlyInstallOffer } from './app-install';

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const DESKTOP_FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0';

const KEY = 'secretmatch.install-suggestion';

/** A memory-backed `localStorage`, or one that throws like a blocked one. */
function fakeStorage(blocked = false): Storage {
  const items = new Map<string, string>();
  const guard = () => {
    if (blocked) {
      throw new DOMException('blocked', 'SecurityError');
    }
  };
  return {
    getItem: (key: string) => (guard(), items.get(key) ?? null),
    setItem: (key: string, value: string) => (guard(), void items.set(key, value)),
    removeItem: (key: string) => (guard(), void items.delete(key)),
    clear: () => items.clear(),
    key: () => null,
    get length() {
      return items.size;
    },
  };
}

describe('AppInstall', () => {
  let browser: EventTarget & { localStorage: Storage };
  let now: Date;

  function setUp({
    userAgent = ANDROID_CHROME,
    maxTouchPoints = 5,
    standalone = false,
    storage = fakeStorage(),
    beforeStart = () => undefined,
  }: {
    userAgent?: string;
    maxTouchPoints?: number;
    standalone?: boolean;
    storage?: Storage;
    beforeStart?: () => void;
  } = {}): AppInstall {
    browser = Object.defineProperties(new EventTarget(), {
      navigator: { value: { userAgent, maxTouchPoints } },
      matchMedia: {
        value: (query: string) => ({ matches: standalone && query.includes('standalone') }),
      },
      localStorage: { value: storage },
    }) as EventTarget & { localStorage: Storage };
    now = new Date('2026-11-16T10:00:00Z');
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: { defaultView: browser } },
        { provide: NOW, useValue: () => now },
      ],
    });
    catchEarlyInstallOffer(browser as unknown as Window);
    beforeStart();
    const install = TestBed.inject(AppInstall);
    install.start();
    return install;
  }

  /** Chromium offering its install dialog; `choice` is what the person answers in it. */
  function browserOffersInstall(choice: 'accepted' | 'dismissed' = 'accepted') {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(async () => undefined),
      userChoice: Promise.resolve({ outcome: choice }),
    });
    browser.dispatchEvent(event);
    return event;
  }

  const remembered = () => JSON.parse(browser.localStorage.getItem(KEY) ?? 'null');
  const daysLater = (days: number) => (now = new Date(now.getTime() + days * 86_400_000));

  describe('how this device can install', () => {
    it('cannot install in Chromium until the browser offers it', () => {
      const install = setUp();

      expect(install.way()).toBeNull();
    });

    it('opens the browser dialog once Chromium offers it, holding back its own infobar', () => {
      const install = setUp();

      const event = browserOffersInstall();

      expect(install.way()).toBe('prompt');
      expect(event.defaultPrevented).toBe(true);
    });

    it('keeps an offer that came before the app started', () => {
      const install = setUp({ beforeStart: () => browserOffersInstall() });

      expect(install.way()).toBe('prompt');
    });

    it('shows the guide on an iPhone', () => {
      expect(setUp({ userAgent: IPHONE_SAFARI }).way()).toBe('guide');
    });

    it('shows the guide on an iPad, which says it is a Mac', () => {
      expect(setUp({ userAgent: IPAD_AS_MAC, maxTouchPoints: 5 }).way()).toBe('guide');
    });

    it('cannot install on a Mac, which has no touch screen', () => {
      expect(setUp({ userAgent: IPAD_AS_MAC, maxTouchPoints: 0 }).way()).toBeNull();
    });

    it('cannot install in a browser that can do neither', () => {
      expect(setUp({ userAgent: DESKTOP_FIREFOX, maxTouchPoints: 0 }).way()).toBeNull();
    });

    it('offers nothing when already running installed', () => {
      const install = setUp({ userAgent: IPHONE_SAFARI, standalone: true });

      expect(install.way()).toBeNull();
    });

    it('offers nothing once the app is installed', () => {
      const install = setUp();
      browserOffersInstall();

      browser.dispatchEvent(new Event('appinstalled'));

      expect(install.way()).toBeNull();
    });
  });

  describe('installing', () => {
    it('opens the browser dialog and reports an install', async () => {
      const install = setUp();
      const event = browserOffersInstall('accepted');

      expect(await install.install()).toBe('installed');
      expect(event.prompt).toHaveBeenCalledOnce();
    });

    it('reports a declined dialog', async () => {
      const install = setUp();
      browserOffersInstall('dismissed');

      expect(await install.install()).toBe('declined');
    });

    it('can open the dialog only once, until the browser offers it again', async () => {
      const install = setUp();
      browserOffersInstall('dismissed');

      await install.install();
      expect(install.way()).toBeNull();

      browserOffersInstall();
      expect(install.way()).toBe('prompt');
    });

    it('answers with the guide on iOS', async () => {
      expect(await setUp({ userAgent: IPHONE_SAFARI }).install()).toBe('guide');
    });
  });

  describe('the install suggestion', () => {
    it('shows right after joining or creating a Group', () => {
      const install = setUp({ userAgent: IPHONE_SAFARI });

      install.considerSuggestion({ justJoined: true, finished: false });

      expect(install.suggestionVisible()).toBe(true);
    });

    it('does not show on a later visit before any "Ahora no"', () => {
      const install = setUp({ userAgent: IPHONE_SAFARI });

      install.considerSuggestion({ justJoined: false, finished: false });

      expect(install.suggestionVisible()).toBe(false);
    });

    it('does not show where the app cannot be installed', () => {
      const install = setUp({ userAgent: DESKTOP_FIREFOX, maxTouchPoints: 0 });

      install.considerSuggestion({ justJoined: true, finished: false });

      expect(install.suggestionVisible()).toBe(false);
    });

    it('shows once Chromium offers the install, even if that comes after the page', () => {
      const install = setUp();
      install.considerSuggestion({ justJoined: true, finished: false });
      expect(install.suggestionVisible()).toBe(false);

      browserOffersInstall();

      expect(install.suggestionVisible()).toBe(true);
    });

    it('does not show on a finished Group', () => {
      const install = setUp({ userAgent: IPHONE_SAFARI });

      install.considerSuggestion({ justJoined: true, finished: true });

      expect(install.suggestionVisible()).toBe(false);
    });

    it('hides on "Ahora no" and comes back once on a Group page 3 days later', () => {
      const install = setUp({ userAgent: IPHONE_SAFARI });
      install.considerSuggestion({ justJoined: true, finished: false });

      install.dismissSuggestion();
      expect(install.suggestionVisible()).toBe(false);
      expect(remembered()).toEqual({ dismissedAt: '2026-11-16T10:00:00.000Z' });

      daysLater(2.9);
      install.considerSuggestion({ justJoined: true, finished: false });
      expect(install.suggestionVisible()).toBe(false);

      daysLater(0.1);
      install.considerSuggestion({ justJoined: false, finished: false });
      expect(install.suggestionVisible()).toBe(true);
    });

    it('never shows again after a second "Ahora no"', () => {
      const install = setUp({ userAgent: IPHONE_SAFARI });
      install.considerSuggestion({ justJoined: true, finished: false });
      install.dismissSuggestion();
      daysLater(3);
      install.considerSuggestion({ justJoined: false, finished: false });

      install.dismissSuggestion();
      daysLater(30);
      install.considerSuggestion({ justJoined: true, finished: false });

      expect(install.suggestionVisible()).toBe(false);
      expect(remembered().never).toBe(true);
    });

    it('shows again on the next join when it was left without an answer', () => {
      const install = setUp({ userAgent: IPHONE_SAFARI });
      install.considerSuggestion({ justJoined: true, finished: false });

      install.considerSuggestion({ justJoined: true, finished: false });

      expect(install.suggestionVisible()).toBe(true);
      expect(remembered()).toBeNull();
    });

    it('never shows again once the browser dialog was declined', async () => {
      const install = setUp();
      browserOffersInstall('dismissed');
      install.considerSuggestion({ justJoined: true, finished: false });

      await install.install();
      browserOffersInstall();
      install.considerSuggestion({ justJoined: true, finished: false });

      expect(install.suggestionVisible()).toBe(false);
    });

    it('never shows again once the app is installed', () => {
      setUp();
      browserOffersInstall();

      browser.dispatchEvent(new Event('appinstalled'));

      expect(remembered()).toEqual({ never: true });
    });

    it('never shows while storage is blocked, since it could not avoid repeating itself', () => {
      const install = setUp({ userAgent: IPHONE_SAFARI, storage: fakeStorage(true) });

      install.considerSuggestion({ justJoined: true, finished: false });

      expect(install.suggestionVisible()).toBe(false);
    });

    it('is not ended by the iOS guide, which installs nothing by itself', async () => {
      const install = setUp({ userAgent: IPHONE_SAFARI });
      install.considerSuggestion({ justJoined: true, finished: false });

      await install.install();

      expect(install.suggestionVisible()).toBe(true);
      expect(remembered()).toBeNull();
    });
  });
});
