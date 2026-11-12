import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucideGift, LucideShuffle } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmPanel } from '../../../../shared/ui/confirm-panel/confirm-panel';
import { Receiver } from '../../data-access/draw-api';

/** A Draw needs at least 4 Members (ADR 0001). */
export const MINIMUM_MEMBERS = 4;

/** The Group's Draw as the page knows it. */
export type DrawState =
  | { readonly status: 'loading' }
  | { readonly status: 'drawn'; readonly receiver: Receiver }
  | { readonly status: 'not-drawn' }
  | { readonly status: 'failed' };

/** Where the Admin's request to run the Draw stands, as the page tells it. */
export type RunStatus = 'idle' | 'drawing' | 'no-valid-draw' | 'failed';

/**
 * The Group's Draw, at the top of its page (#28, option A): the Admin runs it behind an inline
 * confirmation; once it is made, each Member sees their own Receiver. A plain view until the
 * envelope Reveal (#30).
 */
@Component({
  selector: 'app-draw-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, ConfirmPanel, LucideGift, LucideShuffle],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-draw" class="rounded-card bg-surface p-5 shadow-card">
      <div class="flex items-center gap-3">
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
        >
          <svg lucideGift [size]="20"></svg>
        </div>
        <h2 id="group-draw" class="font-display text-lg font-semibold">Sorteo</h2>
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
  /** The Draw could not be loaded: the page asks for it again. */
  readonly retry = output();

  protected readonly minimum = MINIMUM_MEMBERS;
  protected readonly confirming = signal(false);
  protected readonly enoughMembers = computed(() => this.memberCount() >= MINIMUM_MEMBERS);
  protected readonly receiver = computed(() => {
    const state = this.state();
    return state.status === 'drawn' ? state.receiver.displayName : '';
  });

  protected confirm(): void {
    this.confirming.set(false);
    this.run.emit();
  }
}
