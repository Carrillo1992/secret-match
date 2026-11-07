import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { LucideLogOut, LucideTrash2 } from '@lucide/angular';
import { ConfirmPanel } from '../../../../shared/ui/confirm-panel/confirm-panel';
import { Button } from '../../../../shared/ui/button/button';
import { Alert } from '../../../../shared/ui/alert/alert';

/** Where the Member's request to leave stands, as the page tells it. */
export type LeaveStatus = 'idle' | 'leaving' | 'failed';

/** Where the Admin's request to delete the Group stands, as the page tells it. */
export type DeleteStatus = 'idle' | 'deleting' | 'failed';

/**
 * The Member's own place in the Group: a regular Member can leave it, behind an inline
 * confirmation. The Admin cannot; they can delete the Group instead, behind the same confirmation.
 * Nobody leaves a finished Group, but its Admin can still delete it (#25).
 */
@Component({
  selector: 'app-membership-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, ConfirmPanel, LucideLogOut, LucideTrash2],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-membership" class="rounded-card bg-surface p-5 shadow-card">
      <h2 id="group-membership" class="font-display text-lg font-semibold">Tu participación</h2>

      @if (admin()) {
        <p class="mt-1.5 text-ink-muted">
          Como administrador no puedes salir del grupo. Si ya no quieres seguir con él, puedes
          borrarlo.
        </p>

        @if (deleteStatus() === 'failed') {
          <p appAlert class="mt-4">No hemos podido borrar el grupo. Inténtalo de nuevo.</p>
        }

        @if (confirming()) {
          <app-confirm-panel
            class="mt-4"
            question="¿Borrar el grupo?"
            confirmLabel="Sí, borrar"
            returnFocusTo="delete-group"
            (confirmed)="confirmDelete()"
            (cancelled)="confirming.set(false)"
          >
            Se borrará para todos, con todo lo que hay en él, y no se puede deshacer. A los demás
            miembros les avisaremos por email.
          </app-confirm-panel>
        } @else {
          <button
            id="delete-group"
            type="button"
            appButton="secondary"
            class="mt-4 w-full"
            [disabled]="deleteStatus() === 'deleting'"
            (click)="confirming.set(true)"
          >
            <svg lucideTrash2 [size]="18"></svg>
            {{ deleteStatus() === 'deleting' ? 'Borrando…' : 'Borrar el grupo' }}
          </button>
        }
      } @else if (finished()) {
        <p class="mt-1.5 text-ink-muted">
          El grupo ha finalizado, así que ya no puedes salir de él.
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
  /** Whether the Member looking is the Admin, who cannot leave but can delete the Group. */
  readonly admin = input.required<boolean>();
  /** Whether the Group is finished: it is read-only, so a Member can no longer leave it. */
  readonly finished = input.required<boolean>();
  readonly status = input<LeaveStatus>('idle');
  /** The Member confirmed: the page asks the API to take them out. */
  readonly leave = output();
  readonly deleteStatus = input<DeleteStatus>('idle');
  /** The Admin confirmed: the page asks the API to delete the Group. */
  readonly deleteGroup = output();

  protected readonly confirming = signal(false);

  protected confirm(): void {
    this.confirming.set(false);
    this.leave.emit();
  }

  protected confirmDelete(): void {
    this.confirming.set(false);
    this.deleteGroup.emit();
  }
}
