import { DOCUMENT, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';

/**
 * How SecretMatch can be installed on this device, if at all:
 * - `prompt`: a Chromium browser offered its install dialog (`beforeinstallprompt`).
 * - `guide`: iOS or iPadOS, where there is no install API and the person adds it to the home screen
 *   by hand, so we show how.
 * - `null`: already running installed, or a browser that can do neither.
 */
export type InstallWay = 'prompt' | 'guide' | null;

/** What happened when the person asked to install. */
export type InstallOutcome = 'installed' | 'declined' | 'guide';

/** The current time. A dependency, so the 3-day wait can be tested. */
export const NOW = new InjectionToken<() => Date>('NOW', { factory: () => () => new Date() });

/** Chromium's `beforeinstallprompt` event, not in TypeScript's DOM types. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** What the install suggestion remembers on this device. */
interface SuggestionMemory {
  /** When "Ahora no" was first chosen, as an ISO instant. */
  dismissedAt?: string;
  /** Never suggest again: dismissed twice, installed, or the browser's dialog was declined. */
  never?: boolean;
}

const KEY = 'secretmatch.install-suggestion';

/** An install offer that came before the app started, kept by `catchEarlyInstallOffer`. */
let earlyOffer: BeforeInstallPromptEvent | null = null;

function keepEarlyOffer(event: Event): void {
  event.preventDefault();
  earlyOffer = event as BeforeInstallPromptEvent;
}

/**
 * Chromium may offer installing while the app is still loading its translations and config, before
 * `AppInstall` listens: `main.ts` calls this first thing, so that offer is not lost.
 */
export function catchEarlyInstallOffer(window: Window): void {
  window.addEventListener('beforeinstallprompt', keepEarlyOffer);
}
const SECOND_CHANCE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Installing the app (PWA, #118): whether and how this device can install SecretMatch, the
 * install itself, and the install suggestion on the Group page.
 *
 * Chromium fires `beforeinstallprompt` once per page load, when it decides to: the event is kept
 * (its own mini-infobar is held back) and is good for one dialog, so after it is used there is no
 * way to install until the browser fires it again. iOS has no such event; any iOS browser gets the
 * guide. In-app browsers are not singled out.
 *
 * The suggestion shows at most twice per device: on the Group page right after joining or creating a
 * Group, then once more on a Group page at least 3 days after "Ahora no". Installing, declining the
 * browser's dialog or a second "Ahora no" ends it for good. What it remembers lives in
 * `localStorage`, per device, since installing is per device; when storage is blocked it never
 * shows, because it could not keep from repeating itself.
 */
@Injectable({ providedIn: 'root' })
export class AppInstall {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly now = inject(NOW);
  private readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
  private readonly installed = signal(false);
  private readonly ios = isIos(this.window);
  private readonly suggestionWanted = signal(false);

  /** How this device can install the app now, or `null` when it can't (or already did). */
  readonly way = computed<InstallWay>(() => {
    if (this.installed()) {
      return null;
    }
    if (this.deferredPrompt()) {
      return 'prompt';
    }
    return this.ios ? 'guide' : null;
  });

  /** Whether the Group page shows the install suggestion. */
  readonly suggestionVisible = computed(() => this.suggestionWanted() && this.way() !== null);

  /** Listens for the browser's install events. Called once, as the app starts. */
  start(): void {
    const window = this.window;
    if (!window) {
      return;
    }
    window.removeEventListener('beforeinstallprompt', keepEarlyOffer);
    if (runsInstalled(window)) {
      this.installed.set(true);
      return;
    }
    this.deferredPrompt.set(earlyOffer);
    earlyOffer = null;
    window.addEventListener('beforeinstallprompt', (event) => {
      // Keep the browser's own mini-infobar from showing: the app offers installing itself.
      event.preventDefault();
      this.deferredPrompt.set(event as BeforeInstallPromptEvent);
    });
    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.deferredPrompt.set(null);
      this.remember({ never: true });
    });
  }

  /**
   * Installs the app: opens the browser's install dialog where there is one, or answers `guide`
   * for the caller to show how to install by hand. The dialog can be shown once; accepting or
   * declining it also ends the suggestion for good.
   */
  async install(): Promise<InstallOutcome> {
    const prompt = this.deferredPrompt();
    if (!prompt) {
      return 'guide';
    }
    this.deferredPrompt.set(null);
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    this.suggestionWanted.set(false);
    this.remember({ never: true });
    return outcome === 'accepted' ? 'installed' : 'declined';
  }

  /**
   * Decides whether a Group page shows the suggestion: `justJoined` when the person has just
   * joined or created this Group, `finished` when the Group is over (never suggested there).
   */
  considerSuggestion({ justJoined, finished }: { justJoined: boolean; finished: boolean }): void {
    const memory = this.read();
    if (!memory || memory.never || finished) {
      this.suggestionWanted.set(false);
      return;
    }
    if (memory.dismissedAt === undefined) {
      this.suggestionWanted.set(justJoined);
      return;
    }
    const waited = this.now().getTime() - new Date(memory.dismissedAt).getTime();
    this.suggestionWanted.set(waited >= SECOND_CHANCE_AFTER_MS);
  }

  /** "Ahora no": the first time leaves one more chance after 3 days, the second ends it. */
  dismissSuggestion(): void {
    this.suggestionWanted.set(false);
    const memory = this.read();
    if (!memory) {
      return;
    }
    this.remember(
      memory.dismissedAt === undefined
        ? { dismissedAt: this.now().toISOString() }
        : { ...memory, never: true },
    );
  }

  /** What the suggestion remembers, `{}` when nothing yet, or `null` when storage is blocked. */
  private read(): SuggestionMemory | null {
    try {
      const stored = this.window?.localStorage.getItem(KEY);
      if (stored === undefined) {
        return null;
      }
      return stored === null ? {} : (JSON.parse(stored) as SuggestionMemory);
    } catch {
      // Storage blocked, or something unreadable in it: treat it as no memory at all.
      return null;
    }
  }

  private remember(memory: SuggestionMemory): void {
    try {
      this.window?.localStorage.setItem(KEY, JSON.stringify(memory));
    } catch {
      // Storage blocked: the suggestion doesn't show without it, so there is nothing to keep.
    }
  }
}

/** Running from the home screen rather than in a browser tab. */
function runsInstalled(window: Window): boolean {
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

/** iPhone, iPod or iPad. iPadOS says it is a Mac, but a Mac has no touch screen. */
function isIos(window: Window | null): boolean {
  if (!window) {
    return false;
  }
  const { userAgent, maxTouchPoints } = window.navigator;
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}
