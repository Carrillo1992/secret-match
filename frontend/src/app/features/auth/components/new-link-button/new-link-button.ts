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
        class="rounded-md border border-slate-900 px-4 py-2 font-medium text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        [disabled]="status() === 'sending'"
        (click)="requested.emit()"
      >
        {{ status() === 'sending' ? 'Enviando…' : 'Enviar otro enlace' }}
      </button>
      <div role="status" aria-live="polite" class="text-sm">
        @switch (status()) {
          @case ('sent') {
            <p class="text-green-800">
              Te hemos enviado un enlace nuevo; el anterior ya no sirve. Si tampoco llega, puede que
              ese correo ya tenga una cuenta.
            </p>
          }
          @case ('failed') {
            <p class="text-red-800">No hemos podido enviar el enlace. Inténtalo de nuevo.</p>
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
