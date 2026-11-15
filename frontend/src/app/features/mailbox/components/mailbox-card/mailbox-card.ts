import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LucideMail } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Mailbox, MailboxesOutcome } from '../../data-access/mailbox-api';
import { MailboxComposer, SendStatus } from '../mailbox-composer/mailbox-composer';
import { MailboxThread, ThreadState } from '../mailbox-thread/mailbox-thread';

/** What the Member wrote, and in which of their Mailboxes. */
export interface MessageToSend {
  readonly mailboxId: string;
  readonly text: string;
}

const LOADING: ThreadState = { status: 'loading' };

/**
 * The Group's anonymous Mailbox, right after the Draw card (#36, option B): one tab per Mailbox,
 * "Con <Receiver>" (or "Tu Receiver" until the envelope is opened) and "Tu Giver" (never a name,
 * initials or avatar), each with a hint of who is on
 * the other side, the conversation and the composer. It renders nothing while there are no
 * Mailboxes, as before the Draw. Once the Group is finished (#38) the conversations stay and the
 * composer gives way to one sentence saying they are only read now.
 */
@Component({
  selector: 'app-mailbox-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, MailboxComposer, MailboxThread, LucideMail],
  host: { class: 'block' },
  template: `
    @if (mailboxes().status === 'failed' || list().length > 0) {
      <section aria-labelledby="group-mailbox" class="rounded-card bg-surface p-5 shadow-card">
        <div class="flex items-center gap-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
          >
            <svg lucideMail [size]="20"></svg>
          </div>
          <h2 id="group-mailbox" class="font-display text-lg font-semibold" i18n>Buzón</h2>
        </div>

        @if (mailboxes().status === 'failed') {
          <p appAlert class="mt-4" i18n>No hemos podido cargar el buzón. Inténtalo de nuevo.</p>
          <button
            type="button"
            appButton="secondary"
            class="mt-4 w-full"
            (click)="retryMailboxes.emit()"
            i18n
          >
            Reintentar
          </button>
        } @else {
          <div
            role="tablist"
            aria-label="Buzones"
            i18n-aria-label
            class="mt-4 flex gap-1 border-b border-line"
          >
            @for (mailbox of list(); track mailbox.id; let index = $index) {
              <button
                type="button"
                role="tab"
                [id]="'mailbox-tab-' + mailbox.id"
                [attr.aria-selected]="mailbox.id === current()"
                [attr.aria-controls]="'mailbox-panel-' + mailbox.id"
                [tabIndex]="mailbox.id === current() ? 0 : -1"
                class="-mb-px min-h-11 flex-1 border-b-3 px-3 font-display font-semibold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-primary"
                [class]="
                  mailbox.id === current()
                    ? 'border-primary text-primary'
                    : 'border-transparent text-ink-muted'
                "
                (click)="choose.emit(mailbox.id)"
                (keydown)="move($event, index)"
              >
                {{ title(mailbox) }}
              </button>
            }
          </div>

          @for (mailbox of list(); track mailbox.id) {
            <div
              role="tabpanel"
              [id]="'mailbox-panel-' + mailbox.id"
              [attr.aria-labelledby]="'mailbox-tab-' + mailbox.id"
              [hidden]="mailbox.id !== current()"
              class="mt-4"
            >
              <p class="mb-3 text-sm text-ink-muted">
                @if (mailbox.side === 'GIVER') {
                  <ng-container i18n>Le regalas tú. No sabrá quién eres.</ng-container>
                } @else {
                  <ng-container i18n>Quien te regala. Nunca sabrás quién es.</ng-container>
                }
              </p>
              <app-mailbox-thread
                [state]="thread(mailbox)"
                [side]="mailbox.side"
                [author]="title(mailbox)"
                [finished]="finished()"
                (retry)="retryMessages.emit(mailbox.id)"
              />
              @if (finished()) {
                @if (sends()[mailbox.id] === 'finished') {
                  <p role="status" class="mt-4 text-sm text-ink-muted" i18n>
                    No se ha enviado: el grupo acaba de finalizar y ya solo se pueden leer los
                    mensajes.
                  </p>
                } @else {
                  <p class="mt-4 text-sm text-ink-muted" i18n>
                    El grupo ha finalizado: ya solo se pueden leer los mensajes.
                  </p>
                }
              } @else if (thread(mailbox).status === 'loaded') {
                <app-mailbox-composer
                  class="mt-4"
                  [id]="'mailbox-message-' + mailbox.id"
                  [status]="sends()[mailbox.id] ?? 'idle'"
                  (send)="send.emit({ mailboxId: mailbox.id, text: $event })"
                />
              }
            </div>
          }
        }
      </section>
    }
  `,
})
export class MailboxCard {
  readonly mailboxes = input.required<MailboxesOutcome>();
  /** The open Mailbox's id; the first one when none is chosen yet. */
  readonly selected = input<string | null>(null);
  /** Each Mailbox's conversation, by id; one not there yet is loading. */
  readonly threads = input<Readonly<Record<string, ThreadState>>>({});
  /** Whether the Group is finished, which makes every Mailbox read-only. */
  readonly finished = input(false);
  /** Whether the Giver opened their envelope: until then their Receiver is not named here. */
  readonly receiverRevealed = input(false);
  /** Where each Mailbox's last send stands, by id. */
  readonly sends = input<Readonly<Record<string, SendStatus>>>({});
  /** A tab was chosen: the page opens that Mailbox, loading its Messages if needed. */
  readonly choose = output<string>();
  readonly retryMailboxes = output();
  readonly retryMessages = output<string>();
  readonly send = output<MessageToSend>();

  private readonly document = inject(DOCUMENT);

  protected readonly list = computed(() => {
    const mailboxes = this.mailboxes();
    return mailboxes.status === 'loaded' ? mailboxes.mailboxes : [];
  });
  protected readonly current = computed(() => {
    const selected = this.selected();
    const list = this.list();
    return list.some((mailbox) => mailbox.id === selected) ? selected : (list[0]?.id ?? null);
  });

  /**
   * The Giver is never named: their tab is only "Tu Giver". The Receiver is named only once the
   * envelope is opened, so the Mailbox does not spoil the Reveal.
   */
  protected title(mailbox: Mailbox): string {
    if (mailbox.side === 'RECEIVER') {
      return $localize`Tu Giver`;
    }
    return this.receiverRevealed() && mailbox.receiverDisplayName
      ? $localize`Con ${mailbox.receiverDisplayName}:name:`
      : $localize`Tu Receiver`;
  }

  protected thread(mailbox: Mailbox): ThreadState {
    return this.threads()[mailbox.id] ?? LOADING;
  }

  /** The tablist's keyboard: the arrows move (wrapping round), Home and End go to the ends. */
  protected move(event: KeyboardEvent, index: number): void {
    const list = this.list();
    const last = list.length - 1;
    const targets: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = targets[event.key];
    if (target === undefined) {
      return;
    }
    event.preventDefault();
    const id = list[target].id;
    this.choose.emit(id);
    this.document.getElementById(`mailbox-tab-${id}`)?.focus();
  }
}
