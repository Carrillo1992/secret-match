import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NewLinkStatus } from '../../data-access/new-verification-link';

/** Asks for a new verification link and says how that went. */
@Component({
  selector: 'app-new-link-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      <button
        type="button"
        class="inline-flex h-12 items-center justify-center rounded-full border-2 border-primary px-6 font-display font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-on-primary focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        [disabled]="status() === 'sending'"
        (click)="requested.emit()"
      >
        {{ status() === 'sending' ? 'Enviando…' : 'Enviar otro enlace' }}
      </button>
      <div role="status" aria-live="polite" class="text-sm">
        @switch (status()) {
          @case ('sent') {
            <p class="font-semibold text-success">
              Te hemos enviado un enlace nuevo; el anterior ya no sirve. Si tampoco llega, puede que
              ese correo ya tenga una cuenta.
            </p>
          }
          @case ('failed') {
            <p class="font-semibold text-danger">
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
