import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { NewLinkStatus } from '../../data-access/new-verification-link';

/** Asks for a new verification link and says how that went. */
@Component({
  selector: 'app-new-link-button',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <button
        type="button"
        appButton="secondary"
        [disabled]="status() === 'sending'"
        (click)="requested.emit()"
      >
        @if (status() === 'sending') {
          <ng-container i18n>Enviando…</ng-container>
        } @else {
          <ng-container i18n>Enviar otro enlace</ng-container>
        }
      </button>
      <div role="status" aria-live="polite" class="text-sm">
        @switch (status()) {
          @case ('sent') {
            <p class="font-semibold text-success" i18n>
              Te hemos enviado un enlace nuevo; el anterior ya no sirve. Si tampoco llega, puede que
              ese correo ya tenga una cuenta.
            </p>
          }
          @case ('throttled') {
            <p class="font-semibold text-danger" i18n>
              Demasiados intentos. Inténtalo de nuevo más tarde.
            </p>
          }
          @case ('failed') {
            <p class="font-semibold text-danger" i18n>
              No hemos podido enviar el enlace. Inténtalo de nuevo.
            </p>
          }
        }
      </div>
    </div>
  `,
})
export class NewLinkButton {
  readonly status = input<NewLinkStatus>('idle');
  readonly requested = output();
}
