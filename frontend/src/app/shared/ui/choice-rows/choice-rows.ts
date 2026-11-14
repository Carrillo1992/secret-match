import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideCheck, LucideDynamicIcon, LucideIconInput } from '@lucide/angular';

/** One row: the value it stands for, its label and, optionally, a leading icon and its language. */
export interface ChoiceOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: LucideIconInput;
  /** The language the label is written in, when it differs from the page's (e.g. "English"). */
  readonly lang?: string;
}

let nextId = 0;

/**
 * The choice row list from DESIGN.md: full-width rows on a `canvas` well, one of them checked, as a
 * labelled radio group. The arrow keys (and Home/End) only move focus between rows; a row is chosen
 * by clicking it or pressing Enter or Space on it, so moving through the list never triggers what a
 * choice does (e.g. reloading the page in another Language). Choosing the selected row again does
 * nothing. The host owns `selected` and updates it on `chosen`.
 */
@Component({
  selector: 'app-choice-rows',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideCheck, LucideDynamicIcon],
  host: { class: 'block' },
  template: `
    <p [id]="labelId" class="font-display text-sm font-semibold text-ink-muted">{{ label() }}</p>
    <div
      role="radiogroup"
      [attr.aria-labelledby]="labelId"
      class="mt-2 divide-y divide-line/30 overflow-hidden rounded-field bg-canvas"
    >
      @for (option of options(); track option.value) {
        @let checked = option.value === selected();
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="checked"
          [tabIndex]="checked ? 0 : -1"
          class="flex min-h-13 w-full items-center gap-3 px-4 text-left font-semibold text-ink transition-colors duration-200 hover:bg-subtle focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-primary"
          [class.bg-surface]="checked"
          (click)="choose(option.value)"
          (keydown)="moveFocus($event)"
        >
          @if (option.icon; as icon) {
            <svg [lucideIcon]="icon" [size]="20"></svg>
          }
          <span class="flex-1" [attr.lang]="option.lang ?? null">{{ option.label }}</span>
          @if (checked) {
            <svg lucideCheck [size]="20" class="text-primary"></svg>
          }
        </button>
      }
    </div>
  `,
})
export class ChoiceRows<T extends string> {
  /** Names the group, e.g. "Tema". */
  readonly label = input.required<string>();
  readonly options = input.required<readonly ChoiceOption<T>[]>();
  /** The value of the checked row. */
  readonly selected = input.required<T>();
  /** A row other than the selected one was clicked, or Enter or Space was pressed on it. */
  readonly chosen = output<T>();

  protected readonly labelId = `choice-rows-label-${nextId++}`;

  protected choose(value: T): void {
    if (value !== this.selected()) {
      this.chosen.emit(value);
    }
  }

  /** Arrow keys move focus round the rows, Home and End to the ends; they never choose. */
  protected moveFocus(event: KeyboardEvent): void {
    const row = event.currentTarget as HTMLButtonElement;
    const rows = Array.from(
      row.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [],
    );
    const current = rows.indexOf(row);
    const last = rows.length - 1;
    const next = {
      ArrowDown: current === last ? 0 : current + 1,
      ArrowRight: current === last ? 0 : current + 1,
      ArrowUp: current === 0 ? last : current - 1,
      ArrowLeft: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next !== undefined) {
      event.preventDefault();
      rows[next].focus();
    }
  }
}
