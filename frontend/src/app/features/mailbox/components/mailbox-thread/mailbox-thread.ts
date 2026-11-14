import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { MailboxSide, Message } from '../../data-access/mailbox-api';

/**
 * The open Mailbox's Messages as the page knows them. `fresh`: how many of the last ones were just
 * sent from this screen, which pop in; nothing arrives from the other side without a reload.
 */
export type ThreadState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | { readonly status: 'not-found' }
  | { readonly status: 'loaded'; readonly messages: readonly Message[]; readonly fresh: number };

interface Day {
  readonly sentOn: string;
  readonly label: string;
  readonly messages: readonly { readonly message: Message; readonly fresh: boolean }[];
}

/** "12 de diciembre": Messages carry the day only, in UTC. */
const DAY = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/**
 * One conversation of the Mailbox card (#36, option B): the Messages grouped by day, mine on the
 * right and theirs on the left, each with a screen-reader-only author; or an envelope inviting to
 * write that restates the anonymity when there are none.
 */
@Component({
  selector: 'app-mailbox-thread',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button],
  host: { class: 'block' },
  template: `
    @switch (state().status) {
      @case ('loading') {
        <p role="status" class="py-8 text-center text-ink-muted">Cargando mensajes…</p>
      }
      @case ('failed') {
        <p appAlert>No hemos podido cargar los mensajes. Inténtalo de nuevo.</p>
        <button type="button" appButton="secondary" class="mt-4 w-full" (click)="retry.emit()">
          Reintentar
        </button>
      }
      @case ('not-found') {
        <p class="text-ink-muted">
          Este buzón ya no existe. Recarga la página para ver cómo está el grupo.
        </p>
      }
      @default {
        @if (days().length === 0) {
          <div class="flex flex-col items-center py-6 text-center">
            <svg viewBox="0 0 120 90" class="h-20 w-28" aria-hidden="true">
              <circle cx="96" cy="22" r="16" class="fill-mustard" />
              <ellipse cx="18" cy="76" rx="26" ry="16" class="fill-sage" />
              <g class="motion-safe:animate-bob">
                <rect x="28" y="28" width="64" height="44" rx="8" class="fill-primary" />
                <path
                  d="M30 32 L60 54 L90 32"
                  class="fill-none stroke-on-primary"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>
            <p class="mt-3 font-display text-lg font-semibold">Aún no hay mensajes</p>
            <p class="mt-1.5 max-w-xs text-ink-muted">
              @if (side() === 'GIVER') {
                Pregúntale lo que quieras: no sabrá que eres tú. 🤫
              } @else {
                Escribe a quien te regala: lo leerá sin que sepas quién es.
              }
            </p>
          </div>
        } @else {
          <!-- Reversed, so it opens scrolled to the newest Message without any script. -->
          <div
            role="region"
            aria-label="Conversación"
            tabindex="0"
            class="flex max-h-96 flex-col-reverse overflow-y-auto rounded-field pr-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ol class="flex flex-col gap-2" aria-label="Mensajes">
              @for (day of days(); track day.sentOn) {
                <li class="my-2 flex items-center gap-3">
                  <span class="h-px flex-1 bg-line" aria-hidden="true"></span>
                  <span class="text-sm text-ink-muted">{{ day.label }}</span>
                  <span class="h-px flex-1 bg-line" aria-hidden="true"></span>
                </li>
                @for (item of day.messages; track $index) {
                  <li class="flex" [class.justify-end]="item.message.mine">
                    <p
                      data-message
                      class="max-w-5/6 rounded-card px-4 py-2.5 break-words whitespace-pre-line"
                      [class]="item.message.mine ? mine : theirs"
                      [class.motion-safe:animate-pop]="item.fresh"
                    >
                      <span class="sr-only">{{ item.message.mine ? 'Tú' : author() }}: </span
                      >{{ item.message.text }}
                    </p>
                  </li>
                }
              }
            </ol>
          </div>
        }
      }
    }
  `,
})
export class MailboxThread {
  readonly state = input.required<ThreadState>();
  /** The signed-in Member's side, which words the invitation to write. */
  readonly side = input.required<MailboxSide>();
  /** Who wrote the other side's Messages, for screen readers: "Con Lucía", or "Tu Giver". */
  readonly author = input.required<string>();
  /** The Messages could not be loaded: the page asks for them again. */
  readonly retry = output();

  protected readonly mine = 'bg-primary text-on-primary rounded-br-md';
  protected readonly theirs = 'bg-subtle text-ink rounded-bl-md';

  protected readonly days = computed<readonly Day[]>(() => {
    const state = this.state();
    if (state.status !== 'loaded') {
      return [];
    }
    const firstFresh = state.messages.length - state.fresh;
    const days: { sentOn: string; label: string; messages: Day['messages'][number][] }[] = [];
    state.messages.forEach((message, index) => {
      const item = { message, fresh: index >= firstFresh };
      const last = days.at(-1);
      if (last?.sentOn === message.sentOn) {
        last.messages.push(item);
      } else {
        days.push({ sentOn: message.sentOn, label: dayLabel(message.sentOn), messages: [item] });
      }
    });
    return days;
  });
}

function dayLabel(sentOn: string): string {
  return DAY.format(new Date(`${sentOn}T00:00:00Z`));
}
