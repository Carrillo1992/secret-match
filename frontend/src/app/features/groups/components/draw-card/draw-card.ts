import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucideGift, LucideShuffle, LucideUndo2 } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmPanel } from '../../../../shared/ui/confirm-panel/confirm-panel';
import { DrawOutcome } from '../../data-access/draw-api';
import { EnvelopeReveal } from '../envelope-reveal/envelope-reveal';

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
 * confirmation; once it is made, each Member opens an envelope to discover their own Receiver (the
 * Reveal, #30), with a link to the Receiver's Wishlist, which only their Giver can open (#32).
 * Until the Group is finished, the Admin can cancel the Draw behind the same confirmation (#31).
 */
@Component({
  selector: 'app-draw-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, ConfirmPanel, EnvelopeReveal, LucideGift, LucideShuffle, LucideUndo2],
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
          i18n
        >
          Sorteo
        </h2>
      </div>

      @switch (state().status) {
        @case ('loading') {
          <p role="status" class="mt-4 text-ink-muted" i18n>Cargando…</p>
        }
        @case ('failed') {
          <p appAlert class="mt-4" i18n>No hemos podido cargar el sorteo. Inténtalo de nuevo.</p>
          <button
            type="button"
            appButton="secondary"
            class="mt-4 w-full"
            (click)="retry.emit()"
            i18n
          >
            Reintentar
          </button>
        }
        @case ('drawn') {
          @if (drawnReceiver(); as receiver) {
            <app-envelope-reveal
              [receiver]="receiver"
              [alreadyOpened]="alreadyOpened()"
              (opened)="envelopeOpened.emit()"
            />
          }
          <p class="mt-4 text-sm text-ink-muted" i18n>
            Con el sorteo hecho, el grupo queda cerrado: ya no entra ni sale nadie.
          </p>

          @if (admin() && !finished()) {
            @if (cancelStatus() === 'failed') {
              <p appAlert class="mt-4" i18n>
                No hemos podido anular el sorteo. Inténtalo de nuevo.
              </p>
            }

            @if (confirmingCancel()) {
              <app-confirm-panel
                class="mt-4"
                question="¿Anular el sorteo?"
                i18n-question
                confirmLabel="Sí, anular"
                i18n-confirmLabel
                returnFocusTo="cancel-draw"
                focusAfterConfirm="group-draw"
                (confirmed)="confirmCancel()"
                (cancelled)="confirmingCancel.set(false)"
              >
                <ng-container i18n>
                  Nadie tendrá ya a quién regalar, aunque lo haya visto, y el grupo se volverá a
                  abrir: podrá entrar y salir gente y podrás cambiar las exclusiones antes de
                  sortear de nuevo. A todos les avisaremos por email.</ng-container
                >
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
                @if (cancelStatus() === 'cancelling') {
                  <ng-container i18n>Anulando…</ng-container>
                } @else {
                  <ng-container i18n>Anular el sorteo</ng-container>
                }
              </button>
            }
          }
        }
        @case ('not-drawn') {
          @if (finished()) {
            <p class="mt-4 text-ink-muted" i18n>El grupo finalizó sin sorteo.</p>
          } @else if (!admin()) {
            <p class="mt-4 text-ink-muted" i18n>
              El sorteo aún no está hecho. Te avisaremos por email cuando lo esté.
            </p>
          } @else {
            @if (enoughMembers()) {
              <p class="mt-4 text-ink-muted" i18n>
                Ya sois {{ memberCount() }}. Cuando estéis todos, haz el sorteo: a cada uno le
                avisaremos por email.
              </p>
            } @else {
              <p class="mt-4 text-ink-muted" i18n>
                Para sortear hacen falta al menos {{ minimum }} miembros, y de momento
                {memberCount(), plural, =1 {solo estás tú} other {sois {{ memberCount() }}}}.
                Comparte el enlace de invitación.
              </p>
            }

            @if (runStatus() === 'no-valid-draw') {
              <p appAlert class="mt-4" i18n>
                Con las exclusiones actuales no hay ningún sorteo posible. Quita alguna y vuelve a
                intentarlo.
              </p>
            } @else if (runStatus() === 'failed') {
              <p appAlert class="mt-4" i18n>No hemos podido hacer el sorteo. Inténtalo de nuevo.</p>
            }

            @if (confirming()) {
              <app-confirm-panel
                class="mt-4"
                question="¿Hacer el sorteo?"
                i18n-question
                confirmLabel="Sí, sortear"
                i18n-confirmLabel
                returnFocusTo="run-draw"
                (confirmed)="confirm()"
                (cancelled)="confirming.set(false)"
              >
                <ng-container i18n
                  >Asegúrate de que ya estáis todos: a cada uno le diremos a quién le
                  regala.</ng-container
                >
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
                @if (runStatus() === 'drawing') {
                  <ng-container i18n>Sorteando…</ng-container>
                } @else {
                  <ng-container i18n>Sortear</ng-container>
                }
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
  /** Whether this device already opened the Member's envelope: it then shows open. */
  readonly alreadyOpened = input(false);
  /** The Member opened their envelope: the page remembers it for their next visit. */
  readonly envelopeOpened = output();

  protected readonly minimum = MINIMUM_MEMBERS;
  protected readonly confirming = signal(false);
  protected readonly confirmingCancel = signal(false);
  protected readonly enoughMembers = computed(() => this.memberCount() >= MINIMUM_MEMBERS);
  protected readonly drawnReceiver = computed(() => {
    const state = this.state();
    return state.status === 'drawn' ? state.receiver : null;
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
