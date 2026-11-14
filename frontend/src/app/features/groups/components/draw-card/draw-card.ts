import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight, LucideGift, LucideShuffle, LucideUndo2 } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmPanel } from '../../../../shared/ui/confirm-panel/confirm-panel';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { DrawOutcome } from '../../data-access/draw-api';

/** A Draw needs at least 4 Members (ADR 0001); the API refuses fewer too. */
const MINIMUM_MEMBERS = 4;

/** The Group's Draw as the page knows it. */
export type DrawState = { readonly status: 'loading' } | DrawOutcome;

/** Where the Admin's request to run the Draw stands, as the page tells it. */
export type RunStatus = 'idle' | 'drawing' | 'no-valid-draw' | 'failed';

/** Where the Admin's request to cancel the Draw stands, as the page tells it. */
export type CancelStatus = 'idle' | 'cancelling' | 'failed';

/**
 * The Group's Draw, at the top of its page (#28, option A): the Admin runs it behind an inline
 * confirmation; once it is made, each Member sees their own Receiver, with a link to the Receiver's
 * Wishlist, which only their Giver can open (#32). A plain view until the envelope Reveal (#30).
 * Until the Group is finished, the Admin can cancel the Draw behind the same confirmation (#31).
 */
@Component({
  selector: 'app-draw-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    Button,
    ConfirmPanel,
    RouterLink,
    TextLink,
    LucideChevronRight,
    LucideGift,
    LucideShuffle,
    LucideUndo2,
  ],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-draw" class="rounded-card bg-surface p-5 shadow-card">
      <div class="flex items-center gap-3">
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
        >
          <svg lucideGift [size]="20"></svg>
        </div>
        <h2
          id="group-draw"
          tabindex="-1"
          class="font-display text-lg font-semibold focus:outline-none"
        >
          Sorteo
        </h2>
      </div>

      @switch (state().status) {
        @case ('loading') {
          <p role="status" class="mt-4 text-ink-muted">Cargando…</p>
        }
        @case ('failed') {
          <p appAlert class="mt-4">No hemos podido cargar el sorteo. Inténtalo de nuevo.</p>
          <button type="button" appButton="secondary" class="mt-4 w-full" (click)="retry.emit()">
            Reintentar
          </button>
        }
        @case ('drawn') {
          <p class="mt-4 text-ink-muted">
            Te toca regalar a
            <strong
              class="mt-1 block font-display text-3xl font-bold tracking-tight break-words text-ink"
            >
              {{ receiver() }}
            </strong>
          </p>
          <p class="mt-2 text-ink-muted">Nadie más lo sabe. 🤫</p>
          <a
            [routerLink]="['members', receiverId(), 'wishlist']"
            appLink
            standalone
            class="mt-2 gap-0.5"
          >
            Ver sus deseos
            <svg lucideChevronRight [size]="18"></svg>
          </a>
          <p class="mt-4 text-sm text-ink-muted">
            Con el sorteo hecho, el grupo queda cerrado: ya no entra ni sale nadie.
          </p>

          @if (admin() && !finished()) {
            @if (cancelStatus() === 'failed') {
              <p appAlert class="mt-4">No hemos podido anular el sorteo. Inténtalo de nuevo.</p>
            }

            @if (confirmingCancel()) {
              <app-confirm-panel
                class="mt-4"
                question="¿Anular el sorteo?"
                confirmLabel="Sí, anular"
                returnFocusTo="cancel-draw"
                focusAfterConfirm="group-draw"
                (confirmed)="confirmCancel()"
                (cancelled)="confirmingCancel.set(false)"
              >
                Nadie tendrá ya a quién regalar, aunque lo haya visto, y el grupo se volverá a
                abrir: podrá entrar y salir gente y podrás cambiar las exclusiones antes de sortear
                de nuevo. A todos les avisaremos por email.
              </app-confirm-panel>
            } @else {
              <button
                id="cancel-draw"
                type="button"
                appButton="secondary"
                class="mt-4 w-full"
                [disabled]="cancelStatus() === 'cancelling'"
                (click)="confirmingCancel.set(true)"
              >
                <svg lucideUndo2 [size]="18"></svg>
                {{ cancelStatus() === 'cancelling' ? 'Anulando…' : 'Anular el sorteo' }}
              </button>
            }
          }
        }
        @case ('not-drawn') {
          @if (finished()) {
            <p class="mt-4 text-ink-muted">El grupo finalizó sin sorteo.</p>
          } @else if (!admin()) {
            <p class="mt-4 text-ink-muted">
              El sorteo aún no está hecho. Te avisaremos por email cuando lo esté.
            </p>
          } @else {
            @if (enoughMembers()) {
              <p class="mt-4 text-ink-muted">
                Ya sois {{ memberCount() }}. Cuando estéis todos, haz el sorteo: a cada uno le
                avisaremos por email.
              </p>
            } @else {
              <p class="mt-4 text-ink-muted">
                Para sortear hacen falta al menos {{ minimum }} miembros, y de momento sois
                {{ memberCount() }}. Comparte el enlace de invitación.
              </p>
            }

            @if (runStatus() === 'no-valid-draw') {
              <p appAlert class="mt-4">
                Con las exclusiones actuales no hay ningún sorteo posible. Quita alguna y vuelve a
                intentarlo.
              </p>
            } @else if (runStatus() === 'failed') {
              <p appAlert class="mt-4">No hemos podido hacer el sorteo. Inténtalo de nuevo.</p>
            }

            @if (confirming()) {
              <app-confirm-panel
                class="mt-4"
                question="¿Hacer el sorteo?"
                confirmLabel="Sí, sortear"
                returnFocusTo="run-draw"
                (confirmed)="confirm()"
                (cancelled)="confirming.set(false)"
              >
                Asegúrate de que ya estáis todos: a cada uno le diremos a quién le regala.
              </app-confirm-panel>
            } @else {
              <button
                id="run-draw"
                type="button"
                appButton
                class="mt-4 w-full"
                [disabled]="!enoughMembers() || runStatus() === 'drawing'"
                (click)="confirming.set(true)"
              >
                <svg lucideShuffle [size]="20"></svg>
                {{ runStatus() === 'drawing' ? 'Sorteando…' : 'Sortear' }}
              </button>
            }
          }
        }
      }
    </section>
  `,
})
export class DrawCard {
  readonly state = input.required<DrawState>();
  /** Whether the Member looking is the Admin, the only one who runs the Draw. */
  readonly admin = input.required<boolean>();
  readonly memberCount = input.required<number>();
  /** Whether the Group is finished: it is read-only, so it is no longer drawn. */
  readonly finished = input.required<boolean>();
  readonly runStatus = input<RunStatus>('idle');
  /** The Admin confirmed: the page asks the API to draw the Group. */
  readonly run = output();
  readonly cancelStatus = input<CancelStatus>('idle');
  /** The Admin confirmed: the page asks the API to cancel the Draw. */
  readonly cancelDraw = output();
  /** The Draw could not be loaded: the page asks for it again. */
  readonly retry = output();

  protected readonly minimum = MINIMUM_MEMBERS;
  protected readonly confirming = signal(false);
  protected readonly confirmingCancel = signal(false);
  protected readonly enoughMembers = computed(() => this.memberCount() >= MINIMUM_MEMBERS);
  protected readonly receiverId = computed(() => {
    const state = this.state();
    return state.status === 'drawn' ? state.receiver.id : '';
  });
  protected readonly receiver = computed(() => {
    const state = this.state();
    return state.status === 'drawn' ? state.receiver.displayName : '';
  });

  protected confirm(): void {
    this.confirming.set(false);
    this.run.emit();
  }

  protected confirmCancel(): void {
    this.confirmingCancel.set(false);
    this.cancelDraw.emit();
  }
}
