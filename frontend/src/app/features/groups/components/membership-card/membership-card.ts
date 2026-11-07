import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { LucideLogOut } from '@lucide/angular';
import { ConfirmPanel } from '../../../../shared/ui/confirm-panel/confirm-panel';
import { Button } from '../../../../shared/ui/button/button';
import { Alert } from '../../../../shared/ui/alert/alert';

/** Where the Member's request to leave stands, as the page tells it. */
export type LeaveStatus = 'idle' | 'leaving' | 'failed';

/**
 * The Member's own place in the Group: a regular Member can leave it, behind an inline
 * confirmation. The Admin cannot, so they are pointed to deleting the Group instead.
 */
@Component({
  selector: 'app-membership-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, ConfirmPanel, LucideLogOut],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-membership" class="rounded-card bg-surface p-5 shadow-card">
      <h2 id="group-membership" class="font-display text-lg font-semibold">Tu participación</h2>

      @if (admin()) {
        <p class="mt-1.5 text-ink-muted">
          Como administrador no puedes salir del grupo. Si ya no quieres seguir con él, podrás
          borrarlo.
        </p>
      } @else {
        <p class="mt-1.5 text-ink-muted">Si sales, dejarás de ver este grupo.</p>

        @if (status() === 'failed') {
          <p appAlert class="mt-4">No hemos podido sacarte del grupo. Inténtalo de nuevo.</p>
        }

        @if (confirming()) {
          <app-confirm-panel
            class="mt-4"
            question="¿Salir del grupo?"
            confirmLabel="Sí, salir"
            returnFocusTo="leave-group"
            (confirmed)="confirm()"
            (cancelled)="confirming.set(false)"
          >
            Dejarás de ver el grupo y a sus miembros.
          </app-confirm-panel>
        } @else {
          <button
            id="leave-group"
            type="button"
            appButton="secondary"
            class="mt-4 w-full"
            [disabled]="status() === 'leaving'"
            (click)="confirming.set(true)"
          >
            <svg lucideLogOut [size]="18"></svg>
            {{ status() === 'leaving' ? 'Saliendo…' : 'Salir del grupo' }}
          </button>
        }
      }
    </section>
  `,
})
export class MembershipCard {
  /** Whether the Member looking is the Admin, who cannot leave. */
  readonly admin = input.required<boolean>();
  readonly status = input<LeaveStatus>('idle');
  /** The Member confirmed: the page asks the API to take them out. */
  readonly leave = output();

  protected readonly confirming = signal(false);

  protected confirm(): void {
    this.confirming.set(false);
    this.leave.emit();
  }
}
