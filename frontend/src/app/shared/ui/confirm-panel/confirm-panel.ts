import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  EnvironmentInjector,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Button } from '../button/button';
import { TextLink } from '../text-link/text-link';

/**
 * The inline confirmation from DESIGN.md: a quiet well that asks before an action that cannot be
 * taken back, with the confirm button and a "Cancelar" link. The explanation goes in as content.
 *
 * It owns keyboard focus. The button that opened it usually disappears while it is open, so focus
 * moves to its confirm button when it appears, and once it closes to the element with id
 * `returnFocusTo` (or `focusAfterConfirm` after confirming, e.g. when the row it was on is about
 * to go). The host shows it with `@if` and hides it on `confirmed` or `cancelled`.
 */
@Component({
  selector: 'app-confirm-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, TextLink],
  host: { class: 'block rounded-field bg-canvas p-4' },
  template: `
    <p class="font-bold break-words">{{ question() }}</p>
    <p class="mt-1.5 text-sm text-ink-muted"><ng-content /></p>
    <div class="mt-4 flex flex-wrap items-center gap-4">
      <button #confirmButton type="button" appButton="secondary" (click)="confirm()">
        {{ confirmLabel() }}
      </button>
      <button type="button" appLink standalone (click)="cancel()">Cancelar</button>
    </div>
  `,
})
export class ConfirmPanel {
  /** What is being asked, e.g. "¿Salir del grupo?". */
  readonly question = input.required<string>();
  /** The label of the button that goes ahead, e.g. "Sí, salir". */
  readonly confirmLabel = input.required<string>();
  /** The id of the element that gets focus once the panel closes, usually the one that opened it. */
  readonly returnFocusTo = input.required<string>();
  /** The id of the element that gets focus after confirming, when it is not `returnFocusTo`. */
  readonly focusAfterConfirm = input<string>();
  readonly confirmed = output();
  readonly cancelled = output();

  private readonly document = inject(DOCUMENT);
  /** Outlives the panel, so focus can move once the host has removed it. */
  private readonly environment = inject(EnvironmentInjector);
  private readonly confirmButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('confirmButton');

  constructor() {
    afterNextRender(() => this.confirmButton().nativeElement.focus());
  }

  protected confirm(): void {
    this.confirmed.emit();
    this.focusOnceClosed(this.focusAfterConfirm() ?? this.returnFocusTo());
  }

  protected cancel(): void {
    this.cancelled.emit();
    this.focusOnceClosed(this.returnFocusTo());
  }

  private focusOnceClosed(id: string): void {
    afterNextRender(() => this.document.getElementById(id)?.focus(), {
      injector: this.environment,
    });
  }
}
