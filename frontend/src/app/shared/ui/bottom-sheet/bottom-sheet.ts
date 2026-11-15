import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TextLink } from '../text-link/text-link';

let nextId = 0;

/**
 * The bottom sheet from DESIGN.md: a native modal `<dialog>` over a page dimmed with `scrim`. On
 * phones it rises from the bottom edge, full width, with a grab handle; from `sm` it is a centred
 * card. It starts with a heading that names it and ends with a "Cerrar" link.
 *
 * The host owns whether it is `open` and closes it on `closed`, which Escape, a click on the
 * backdrop or "Cerrar" emit. Opening it puts focus on the sheet itself; the browser keeps focus
 * inside it while it is open, and gives focus back to the element that opened it when it closes.
 */
@Component({
  selector: 'app-bottom-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextLink],
  // Clicks on the dialog bubble up here; Escape is the keyboard way to close it.
  host: { '(click)': 'clickOutside($event)' },
  template: `
    <dialog
      #dialog
      tabindex="-1"
      [attr.aria-labelledby]="titleId"
      class="m-0 mt-auto w-full max-w-none rounded-t-sheet bg-surface p-0 text-ink shadow-sheet outline-none backdrop:bg-scrim motion-safe:animate-sheet-rise sm:m-auto sm:max-w-sm sm:rounded-card sm:shadow-card sm:motion-safe:animate-pop"
      (cancel)="cancel($event)"
    >
      <div class="px-6 pt-4 pb-6 sm:pt-6">
        <div
          class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-subtle sm:hidden"
          aria-hidden="true"
        ></div>
        <h2 [id]="titleId" class="font-display text-xl font-semibold">{{ heading() }}</h2>
        <ng-content />
        <div class="mt-6 text-center">
          <button type="button" appLink standalone (click)="closed.emit()" i18n>Cerrar</button>
        </div>
      </div>
    </dialog>
  `,
})
export class BottomSheet {
  /** Whether the sheet is showing. */
  readonly open = input.required<boolean>();
  /** What the sheet is about, e.g. "Preferencias". It names the dialog. */
  readonly heading = input.required<string>();
  /** Escape, the backdrop or "Cerrar": the host closes the sheet. */
  readonly closed = output();

  protected readonly titleId = `bottom-sheet-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
        // Start on the sheet itself, so its name is read first and Tab reaches each group's
        // selected row (the browser would pick the first row, selected or not).
        dialog.focus();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  /** Escape: the host decides, so the sheet never closes behind its back. */
  protected cancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  /** The content fills the dialog box, so a click on the box itself is a click on the backdrop. */
  protected clickOutside(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.closed.emit();
    }
  }
}
