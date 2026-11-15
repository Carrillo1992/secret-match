import { DOCUMENT, DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Keeps the installed app (PWA, #117) on the latest deploy. The service worker downloads a new
 * version in the background; once it is ready, the next navigation inside the app becomes a full
 * page load, which the service worker answers from the new version. Reloading there is safe: the
 * User is leaving the page anyway, so nothing typed is lost, and no prompt is needed.
 *
 * An installed app is resumed far more often than reopened, so a new version is also looked for
 * whenever it comes back to the foreground. Without a service worker (dev server, unsupported
 * browser) this does nothing.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdates {
  private readonly swUpdate = inject(SwUpdate);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  start(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }
    let newVersionReady = false;

    this.swUpdate.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => (newVersionReady = true));

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationStart =>
            event instanceof NavigationStart && newVersionReady && this.leavesTheCurrentPage(),
        ),
      )
      .subscribe((navigation) => {
        if (navigation.navigationTrigger === 'popstate') {
          // Back or forward: the browser is already on that URL, and assigning it again would
          // add a second history entry.
          this.document.location.reload();
        } else {
          this.document.location.assign(navigation.url);
        }
      });

    // The cached version can no longer be served (e.g. a chunk vanished from the cache): only a
    // fresh load from the network gets the User out of it.
    this.swUpdate.unrecoverable.subscribe(() => this.document.location.reload());

    const checkWhenVisible = () => {
      if (this.document.visibilityState === 'visible') {
        // Offline, or the check failed: the next foreground tries again.
        this.swUpdate.checkForUpdate().catch(() => undefined);
      }
    };
    this.document.addEventListener('visibilitychange', checkWhenVisible);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', checkWhenVisible),
    );
  }

  /**
   * A navigation that replaces the history entry or skips the address bar is the app tidying the
   * current page (e.g. stripping a one-time token from the URL as it opens), not the User leaving
   * it: a full page load there would bring the token back or drop it. The next one will do.
   */
  private leavesTheCurrentPage(): boolean {
    const extras = this.router.currentNavigation()?.extras;
    return !extras?.replaceUrl && !extras?.skipLocationChange;
  }
}
