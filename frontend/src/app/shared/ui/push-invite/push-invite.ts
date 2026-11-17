import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import {
  LucideBell,
  LucideBellOff,
  LucideBellRing,
  LucideLoaderCircle,
  LucideX,
} from '@lucide/angular';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';
import { IconButton } from '../icon-button/icon-button';

/**
 * Where the invitation stands:
 * - `visible`: offering to turn notifications on.
 * - `working`: the browser's permission dialog is open, or the device is being subscribed.
 * - `done`: turned on; a polite line says so until the page is left.
 * - `denied`: blocked in the dialog; a quiet line says where to undo that.
 * - `failed`: could not turn them on; the offer stands, with an alert.
 */
export type PushInviteState = 'visible' | 'working' | 'done' | 'denied' | 'failed';

/**
 * Invites to turn notifications on for this device (#119), as a footer row inside the card it is
 * about, under a divider: the sentence, an "Ahora no" icon button and a secondary "Activar avisos".
 * Never a primary button: it must not compete with the card's own action. After "Ahora no" focus
 * moves to the element whose id is `returnFocusTo`, the card's heading.
 */
@Component({
  selector: 'app-push-invite',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    Button,
    IconButton,
    LucideBell,
    LucideBellOff,
    LucideBellRing,
    LucideLoaderCircle,
    LucideX,
  ],
  host: { class: 'block' },
  template: `
    <div aria-live="polite">
      @switch (state()) {
        @case ('done') {
          <p
            class="mt-5 flex items-center gap-3 border-t border-line/30 pt-4 text-sm font-semibold text-success"
          >
            <svg lucideBellRing [size]="20" class="shrink-0"></svg>
            <ng-container i18n>Te avisaremos en este dispositivo.</ng-container>
          </p>
        }
        @case ('denied') {
          <p
            class="mt-5 flex items-start gap-3 border-t border-line/30 pt-4 text-sm text-ink-muted"
          >
            <svg lucideBellOff [size]="20" class="mt-0.5 shrink-0"></svg>
            <ng-container i18n
              >Has bloqueado los avisos en este navegador. Puedes activarlos en los ajustes del
              sitio.</ng-container
            >
          </p>
        }
        @default {
          <div class="mt-5 flex flex-col border-t border-line/30 pt-3">
            <div class="flex items-center gap-3">
              <svg lucideBell [size]="20" class="shrink-0 text-primary"></svg>
              <p class="min-w-0 flex-1 font-semibold">
                @if (about() === 'draw') {
                  <ng-container i18n>Avísame aquí cuando se haga el sorteo</ng-container>
                } @else {
                  <ng-container i18n>Avísame aquí cuando te escriban</ng-container>
                }
              </p>
              <button
                type="button"
                appIconButton
                aria-label="Ahora no"
                i18n-aria-label
                (click)="notNow()"
              >
                <svg lucideX [size]="20"></svg>
              </button>
            </div>
            @if (state() === 'failed') {
              <p appAlert class="mt-2" i18n>
                No hemos podido activar los avisos. Inténtalo de nuevo.
              </p>
            }
            <button
              type="button"
              appButton="secondary"
              class="mt-3 self-start"
              [disabled]="state() === 'working'"
              (click)="turnOn.emit()"
            >
              @if (state() === 'working') {
                <svg lucideLoaderCircle [size]="18" class="motion-safe:animate-spin"></svg>
                <ng-container i18n>Activando…</ng-container>
              } @else {
                <ng-container i18n>Activar avisos</ng-container>
              }
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class PushInvite {
  /** What the notifications would be about: the Draw being made, or a new Message. */
  readonly about = input.required<'draw' | 'mailbox'>();
  readonly state = input.required<PushInviteState>();
  /** The id of the card's heading, where focus goes after "Ahora no". */
  readonly returnFocusTo = input.required<string>();
  readonly turnOn = output();
  readonly dismiss = output();

  private readonly document = inject(DOCUMENT);

  protected notNow(): void {
    this.dismiss.emit();
    this.document.getElementById(this.returnFocusTo())?.focus();
  }
}
