import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideCheck, LucideShare, LucideSquarePlus } from '@lucide/angular';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';

/**
 * The install guide (#118): a bottom sheet "Instalar SecretMatch" with the three steps to add the
 * app to the home screen by hand, for iOS and iPadOS, where no browser can install it on its own.
 * Every iOS browser shares Safari's Share sheet; Safari on iOS 26 keeps Share behind its "···"
 * button, hence the hint. The steps are rows on a `canvas` well, each led by the icon to look for.
 *
 * The host owns `open` and closes it on `closed`, like any bottom sheet.
 */
@Component({
  selector: 'app-install-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BottomSheet, LucideCheck, LucideShare, LucideSquarePlus],
  template: `
    <app-bottom-sheet
      heading="Instalar SecretMatch"
      i18n-heading
      [open]="open()"
      (closed)="closed.emit()"
    >
      <p class="mt-1.5 text-ink-muted" i18n>
        Añádela a tu pantalla de inicio y se abrirá como una app.
      </p>
      <ol class="mt-5 divide-y divide-line/30 overflow-hidden rounded-field bg-canvas">
        <li class="flex min-h-13 items-center gap-3 px-4 py-3">
          <svg lucideShare [size]="20" class="shrink-0 text-primary"></svg>
          <span i18n
            >Pulsa <strong>Compartir</strong> en la barra del navegador (si no lo ves, pulsa antes
            <span aria-hidden="true">···</span
            ><span class="sr-only">el botón de los tres puntos</span>).</span
          >
        </li>
        <li class="flex min-h-13 items-center gap-3 px-4 py-3">
          <svg lucideSquarePlus [size]="20" class="shrink-0 text-primary"></svg>
          <span i18n>Elige <strong>«Añadir a pantalla de inicio»</strong>.</span>
        </li>
        <li class="flex min-h-13 items-center gap-3 px-4 py-3">
          <svg lucideCheck [size]="20" class="shrink-0 text-primary"></svg>
          <span i18n>Pulsa <strong>«Añadir»</strong>.</span>
        </li>
      </ol>
    </app-bottom-sheet>
  `,
})
export class InstallGuide {
  /** Whether the guide is showing. */
  readonly open = input.required<boolean>();
  /** Escape, the backdrop or "Cerrar": the host closes the guide. */
  readonly closed = output();
}
