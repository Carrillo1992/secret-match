import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Button } from '../button/button';
import { TextLink } from '../text-link/text-link';

let nextId = 0;

/**
 * The confirmation dialog from DESIGN.md: a native modal `<dialog>` over a dimmed page, for the
 * gravest actions (deleting the account). Everyday confirmations stay inline (`ConfirmPanel`).
 *
 * The host owns whether it is `open` and closes it on `cancelled`. The explanation and any alert go
 * in as content, so an error can show inside the dialog while it stays open. While `busy`, the
 * confirm button shows `busyLabel` and nothing closes it. The browser keeps focus inside it, puts
 * it first on "Cancelar" (the safe choice), and gives it back to the opening button on close.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, TextLink],
  template: `
    <dialog
      #dialog
      [attr.aria-labelledby]="titleId"
      class="m-auto w-full max-w-md rounded-card bg-surface p-6 text-ink shadow-card backdrop:bg-scrim"
      (cancel)="cancel($event)"
    >
      <h2 [id]="titleId" class="font-display text-xl font-semibold break-words">
        {{ question() }}
      </h2>
      <div class="mt-2 flex flex-col gap-4 text-ink-muted"><ng-content /></div>
      <div class="mt-6 flex flex-col items-stretch gap-2 sm:flex-row-reverse sm:items-center">
        <button type="button" appButton [disabled]="busy()" (click)="confirmed.emit()">
          {{ busy() ? busyLabel() : confirmLabel() }}
        </button>
        <button
          type="button"
          appLink
          standalone
          class="self-center"
          autofocus
          [disabled]="busy()"
          (click)="cancelled.emit()"
        >
          Cancelar
        </button>
      </div>
    </dialog>
  `,
})
export class ConfirmDialog {
  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();
  /** What is being asked, e.g. "¿Borrar tu cuenta?". It names the dialog. */
  readonly question = input.required<string>();
  /** The label of the button that goes ahead, e.g. "Sí, borrar mi cuenta". */
  readonly confirmLabel = input.required<string>();
  /** The confirm button's label while the action runs, e.g. "Borrando…". */
  readonly busyLabel = input<string>('Un momento…');
  /** The action is running: both buttons are off and Escape does nothing. */
  readonly busy = input(false);
  readonly confirmed = output();
  /** "Cancelar" or Escape: the host closes the dialog. */
  readonly cancelled = output();

  protected readonly titleId = `confirm-dialog-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  /** Escape: the host decides, so the dialog never closes behind its back. */
  protected cancel(event: Event): void {
    event.preventDefault();
    if (!this.busy()) {
      this.cancelled.emit();
    }
  }
}
