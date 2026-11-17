// PROTOTYPE (#119), throwaway: three variants of the "notifications on this device" invitation.
// Not production code: no i18n, no tests. Lives on the prototype branch once a variant wins.
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  LucideBell,
  LucideBellOff,
  LucideBellRing,
  LucideLoaderCircle,
  LucideX,
} from '@lucide/angular';
import { Alert } from '../../../shared/ui/alert/alert';
import { Button } from '../../../shared/ui/button/button';
import { IconButton } from '../../../shared/ui/icon-button/icon-button';
import { TextLink } from '../../../shared/ui/text-link/text-link';

export type InviteState = 'visible' | 'working' | 'done' | 'denied' | 'failed' | 'hidden';
export type InviteContext = 'draw' | 'mailbox';

const SENTENCES: Record<InviteContext, string> = {
  draw: 'Avísame aquí cuando se haga el sorteo',
  mailbox: 'Avísame aquí cuando te escriban',
};

const DONE = 'Te avisaremos en este dispositivo.';
const DENIED =
  'Has bloqueado los avisos en este navegador. Puedes activarlos en los ajustes del sitio.';
const FAILED = 'No hemos podido activar los avisos. Inténtalo de nuevo.';

/** A: a footer row inside the card it is about, under a `line/30` divider. */
@Component({
  selector: 'app-push-invite-a',
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
        @case ('hidden') {}
        @case ('done') {
          <p
            class="mt-5 flex items-center gap-3 border-t border-line/30 pt-4 text-sm font-semibold text-success"
          >
            <svg lucideBellRing [size]="20" class="shrink-0"></svg>
            {{ done }}
          </p>
        }
        @case ('denied') {
          <p
            class="mt-5 flex items-start gap-3 border-t border-line/30 pt-4 text-sm text-ink-muted"
          >
            <svg lucideBellOff [size]="20" class="mt-0.5 shrink-0"></svg>
            {{ denied }}
          </p>
        }
        @default {
          <div class="mt-5 flex flex-col border-t border-line/30 pt-3">
            <div class="flex items-center gap-3">
              <svg lucideBell [size]="20" class="shrink-0 text-primary"></svg>
              <p class="min-w-0 flex-1 font-semibold">{{ sentence() }}</p>
              <button type="button" appIconButton aria-label="Ahora no" (click)="dismiss.emit()">
                <svg lucideX [size]="20"></svg>
              </button>
            </div>
            @if (state() === 'failed') {
              <p appAlert class="mt-2">{{ failed }}</p>
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
                Activando…
              } @else {
                Activar avisos
              }
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class VariantA {
  readonly context = input.required<InviteContext>();
  readonly state = input.required<InviteState>();
  readonly turnOn = output();
  readonly dismiss = output();
  protected readonly sentence = computed(() => SENTENCES[this.context()]);
  protected readonly done = DONE;
  protected readonly denied = DENIED;
  protected readonly failed = FAILED;
}

/** B: its own small card under the card it is about, in the Notice look. */
@Component({
  selector: 'app-push-invite-b',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, TextLink, LucideBell, LucideBellOff, LucideBellRing, LucideLoaderCircle],
  host: { class: 'block' },
  template: `
    <div aria-live="polite">
      @switch (state()) {
        @case ('hidden') {}
        @case ('done') {
          <p
            class="mt-6 flex items-center gap-3 rounded-card bg-surface p-5 text-sm font-semibold text-success shadow-card"
          >
            <svg lucideBellRing [size]="20" class="shrink-0"></svg>
            {{ done }}
          </p>
        }
        @case ('denied') {
          <p
            class="mt-6 flex items-start gap-3 rounded-card bg-surface p-5 text-sm text-ink-muted shadow-card"
          >
            <svg lucideBellOff [size]="20" class="mt-0.5 shrink-0"></svg>
            {{ denied }}
          </p>
        }
        @default {
          <section
            aria-labelledby="push-invite-b"
            class="mt-6 rounded-card bg-surface p-5 shadow-card"
          >
            <div class="flex gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
              >
                <svg lucideBell [size]="20"></svg>
              </div>
              <div class="min-w-0">
                <h2 id="push-invite-b" class="font-display text-lg font-semibold">
                  {{ sentence() }}
                </h2>
                <p class="mt-1 text-ink-muted">
                  Solo en este dispositivo. Puedes quitarlos en Preferencias.
                </p>
              </div>
            </div>
            @if (state() === 'failed') {
              <p appAlert class="mt-4">{{ failed }}</p>
            }
            <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                appButton="secondary"
                [disabled]="state() === 'working'"
                (click)="turnOn.emit()"
              >
                @if (state() === 'working') {
                  <svg lucideLoaderCircle [size]="18" class="motion-safe:animate-spin"></svg>
                  Activando…
                } @else {
                  Activar avisos
                }
              </button>
              <button type="button" appLink standalone (click)="dismiss.emit()">Ahora no</button>
            </div>
          </section>
        }
      }
    </div>
  `,
})
export class VariantB {
  readonly context = input.required<InviteContext>();
  readonly state = input.required<InviteState>();
  readonly turnOn = output();
  readonly dismiss = output();
  protected readonly sentence = computed(() => SENTENCES[this.context()]);
  protected readonly done = DONE;
  protected readonly denied = DENIED;
  protected readonly failed = FAILED;
}

/** C: one quiet standalone link with a leading Bell; tapping it turns notifications on. */
@Component({
  selector: 'app-push-invite-c',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    IconButton,
    TextLink,
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
        @case ('hidden') {}
        @case ('done') {
          <p class="mt-4 flex items-center gap-2 text-sm font-semibold text-success">
            <svg lucideBellRing [size]="18" class="shrink-0"></svg>
            {{ done }}
          </p>
        }
        @case ('denied') {
          <p class="mt-4 flex items-start gap-2 text-sm text-ink-muted">
            <svg lucideBellOff [size]="18" class="mt-0.5 shrink-0"></svg>
            {{ denied }}
          </p>
        }
        @default {
          @if (state() === 'failed') {
            <p appAlert class="mt-4">{{ failed }}</p>
          }
          <div class="mt-3 flex items-center gap-1">
            <button
              type="button"
              appLink
              standalone
              class="gap-2 text-left"
              [disabled]="state() === 'working'"
              (click)="turnOn.emit()"
            >
              @if (state() === 'working') {
                <svg lucideLoaderCircle [size]="18" class="shrink-0 motion-safe:animate-spin"></svg>
                Activando…
              } @else {
                <svg lucideBell [size]="18" class="shrink-0"></svg>
                {{ sentence() }}
              }
            </button>
            <button type="button" appIconButton aria-label="Ahora no" (click)="dismiss.emit()">
              <svg lucideX [size]="18"></svg>
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class VariantC {
  readonly context = input.required<InviteContext>();
  readonly state = input.required<InviteState>();
  readonly turnOn = output();
  readonly dismiss = output();
  protected readonly sentence = computed(() => SENTENCES[this.context()]);
  protected readonly done = DONE;
  protected readonly denied = DENIED;
  protected readonly failed = FAILED;
}
