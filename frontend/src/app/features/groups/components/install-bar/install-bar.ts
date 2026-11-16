import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { LucideSmartphone, LucideX } from '@lucide/angular';
import { Button } from '../../../../shared/ui/button/button';
import { IconButton } from '../../../../shared/ui/icon-button/icon-button';

/**
 * The install bar (#118): suggests installing SecretMatch, without getting in the way. On phones it
 * is fixed to the bottom edge, in the sticky call to action's shape; from `sm` a small card at the
 * bottom right. It is not a dialog and never takes focus when it appears. The page decides when it
 * shows, and leaves room under its content so the bar never covers the last card.
 */
@Component({
  selector: 'app-install-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, IconButton, LucideSmartphone, LucideX],
  template: `
    <section
      aria-labelledby="install-bar-title"
      class="fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 bg-surface px-4 py-3 shadow-sheet motion-safe:animate-sheet-rise sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-md sm:rounded-card sm:py-4 sm:pl-5 sm:shadow-card"
    >
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
      >
        <svg lucideSmartphone [size]="20"></svg>
      </div>
      <h2 id="install-bar-title" class="min-w-0 flex-1 font-semibold" i18n>
        Instala SecretMatch y entra con un toque
      </h2>
      <button type="button" appButton="secondary" class="shrink-0" (click)="install.emit()" i18n>
        Instalar
      </button>
      <button
        type="button"
        appIconButton
        aria-label="Ahora no"
        i18n-aria-label
        (click)="dismiss.emit()"
      >
        <svg lucideX [size]="20"></svg>
      </button>
    </section>
  `,
})
export class InstallBar {
  /** "Instalar": the browser's install dialog, or the guide on iOS. */
  readonly install = output();
  /** "Ahora no". */
  readonly dismiss = output();
}
