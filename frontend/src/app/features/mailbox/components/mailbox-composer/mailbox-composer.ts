import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideSend } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { MESSAGE_MAX_LENGTH, messageLength, messageProblem } from '../../data-access/message-rules';

/** Where the last Message written here stands, as the page tells it. */
/** `invalid`: the API refused the text, which the composer's own check should have caught. */
export type SendStatus = 'idle' | 'sending' | 'sent' | 'failed' | 'invalid' | 'not-found';

/**
 * Writes a Message in the Mailbox card (#36, option B): a textarea whose hint counts the characters
 * and becomes the error, and a secondary "Enviar" button. The text stays after a failed send and is
 * cleared once the page reports it `sent`.
 */
@Component({
  selector: 'app-mailbox-composer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, Field, ReactiveFormsModule, LucideSend],
  host: { class: 'block' },
  template: `
    <form novalidate (submit)="$event.preventDefault(); submit()">
      @if (status() === 'failed') {
        <p appAlert class="mb-3">No se ha enviado. Tu texto sigue aquí: inténtalo otra vez.</p>
      } @else if (status() === 'invalid') {
        <p appAlert class="mb-3">
          No se ha enviado: el mensaje no puede estar vacío ni pasar de {{ max }} caracteres.
        </p>
      } @else if (status() === 'not-found') {
        <p appAlert class="mb-3">
          Este buzón ya no existe, así que no se ha enviado. Recarga la página.
        </p>
      }
      <label [for]="id()" class="sr-only">Mensaje</label>
      <textarea
        [id]="id()"
        appField
        rows="3"
        class="w-full"
        placeholder="Escribe un mensaje…"
        [formControl]="text"
        [readOnly]="sending()"
        [attr.aria-invalid]="problem() ? true : null"
        [attr.aria-describedby]="hintId()"
      ></textarea>
      <div class="mt-2 flex items-center justify-between gap-3">
        @if (problem(); as problem) {
          <p [id]="hintId()" class="text-sm font-semibold text-danger">{{ problem }}</p>
        } @else {
          <p [id]="hintId()" class="text-sm text-ink-muted">{{ length() }}/{{ max }}</p>
        }
        <button type="submit" appButton="secondary" class="shrink-0" [disabled]="sending()">
          <svg lucideSend [size]="18"></svg>
          {{ sending() ? 'Enviando…' : 'Enviar' }}
        </button>
      </div>
      <p aria-live="polite" class="sr-only">{{ status() === 'sent' ? 'Mensaje enviado.' : '' }}</p>
    </form>
  `,
})
export class MailboxComposer {
  /** The textarea's id, unique on the page; its hint is `<id>-hint`. */
  readonly id = input.required<string>();
  readonly status = input<SendStatus>('idle');
  /** The text to send, without surrounding spaces; the page posts it and reports the status. */
  readonly send = output<string>();

  protected readonly max = MESSAGE_MAX_LENGTH;
  protected readonly text = new FormControl('', { nonNullable: true });
  private readonly value = toSignal(this.text.valueChanges, { initialValue: '' });
  /** A blank text is pointed out only once the Member tries to send it. */
  private readonly attempted = signal(false);

  protected readonly hintId = computed(() => `${this.id()}-hint`);
  protected readonly sending = computed(() => this.status() === 'sending');
  protected readonly length = computed(() => messageLength(this.value()));
  protected readonly problem = computed(() => {
    const value = this.value();
    const tooLong = messageLength(value) > MESSAGE_MAX_LENGTH;
    return tooLong || this.attempted() ? messageProblem(value) : null;
  });

  constructor() {
    this.text.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.attempted.set(false));
    effect(() => {
      if (this.status() === 'sent') {
        untracked(() => this.text.setValue(''));
      }
    });
  }

  protected submit(): void {
    const value = this.text.value;
    if (this.sending()) {
      return;
    }
    if (messageProblem(value)) {
      this.attempted.set(true);
      return;
    }
    this.send.emit(value.trim());
  }
}
