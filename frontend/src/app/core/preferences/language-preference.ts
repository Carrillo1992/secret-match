import {
  DOCUMENT,
  effect,
  inject,
  Injectable,
  InjectionToken,
  Injector,
  signal,
  untracked,
} from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { Api } from '../api/generated/api';
import { changeLanguage, currentUser } from '../api/generated/functions';
import { AuthSession } from '../auth/auth-session';
import { currentLanguage, Language, saveLanguage } from '../language';

/** Reloads the page; a token so specs can watch it instead of reloading the test runner. */
export const PAGE_RELOAD = new InjectionToken<() => void>('PAGE_RELOAD', {
  providedIn: 'root',
  factory: () => {
    const location = inject(DOCUMENT).location;
    return () => location.reload();
  },
});

/**
 * The Language the app speaks (ADR 0005). It is resolved once before bootstrap, so choosing
 * another one saves it on this device and reloads the page in it: no screen swaps copy at runtime.
 */
@Injectable({ providedIn: 'root' })
export class LanguagePreference {
  private readonly reload = inject(PAGE_RELOAD);
  private readonly injector = inject(Injector);

  /** The Language this page runs in. */
  readonly language: Language = currentLanguage();

  /** The Language being saved to the signed-in User, before the page reloads in it. */
  readonly saving = signal<Language | null>(null);
  /** The last Language chosen could not be saved to the User, so the page kept this one. */
  readonly saveFailed = signal(false);

  /**
   * Switches to another Language. Signed in, it is saved to the User first, since their emails use
   * it too (#91); if that fails the page stays as it is, so the screen and the User never disagree.
   */
  async choose(language: Language): Promise<void> {
    if (language === this.language || this.saving() !== null) {
      return;
    }
    this.saveFailed.set(false);
    if (this.injector.get(AuthSession).isSignedIn()) {
      this.saving.set(language);
      try {
        await this.injector.get(Api).invoke(changeLanguage, { body: { language } });
      } catch {
        this.saving.set(null);
        this.saveFailed.set(true);
        return;
      }
    }
    // `saving` stays on while the page reloads.
    saveLanguage(language);
    this.reload();
  }

  /**
   * From now on, whenever a User signs in or their Session comes back, their Language wins over
   * this device's (#91): if the screen speaks another one, it is kept here and the page reloads in
   * it, once the navigation under way (e.g. from the sign-in page to where the User was going) has
   * finished. The app calls this once at start.
   */
  followTheUser(): void {
    const session = this.injector.get(AuthSession);
    effect(
      () => {
        if (session.isSignedIn()) {
          untracked(() => void this.adoptUserLanguage());
        }
      },
      { injector: this.injector },
    );
  }

  private async adoptUserLanguage(): Promise<void> {
    let language: Language;
    try {
      ({ language } = await this.injector.get(Api).invoke(currentUser));
    } catch {
      // The screen keeps its Language; the next sign-in or reload tries again.
      return;
    }
    if (language === this.language) {
      return;
    }
    saveLanguage(language);
    if (currentLanguage() !== language) {
      // This device cannot keep a Language: a reload would come back in this one, again and again.
      return;
    }
    this.reloadOnceSettled();
  }

  private reloadOnceSettled(): void {
    const router = this.injector.get(Router);
    if (router.currentNavigation() === null) {
      this.reload();
      return;
    }
    router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
        take(1),
      )
      .subscribe(() => this.reload());
  }
}
