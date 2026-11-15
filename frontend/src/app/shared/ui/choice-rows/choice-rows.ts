import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  LucideCheck,
  LucideDynamicIcon,
  LucideIconInput,
  LucideLoaderCircle,
} from '@lucide/angular';

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
  imports: [LucideCheck, LucideDynamicIcon, LucideLoaderCircle],
  host: { class: 'block' },
  template: `
    <p [id]="labelId" class="font-display text-sm font-semibold text-ink-muted">{{ label() }}</p>
    @if (hint(); as hint) {
      <p [id]="hintId" class="mt-1 text-sm text-ink-muted">{{ hint }}</p>
    }
    <div
      role="radiogroup"
      [attr.aria-labelledby]="labelId"
      [attr.aria-describedby]="hint() ? hintId : null"
      [attr.aria-busy]="pending() !== null || null"
      class="mt-2 divide-y divide-line/30 overflow-hidden rounded-field bg-canvas"
    >
      @for (option of options(); track option.value) {
        @let checked = option.value === selected();
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="checked"
          [tabIndex]="checked ? 0 : -1"
          [disabled]="disabled()"
          class="flex min-h-13 w-full items-center gap-3 px-4 text-left font-semibold text-ink transition-colors duration-200 enabled:hover:bg-subtle disabled:cursor-not-allowed focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-primary"
          [class.bg-surface]="checked"
          [class.opacity-60]="disabled() && option.value !== pending()"
          (click)="choose(option.value)"
          (keydown)="moveFocus($event)"
        >
          @if (option.icon; as icon) {
            <svg [lucideIcon]="icon" [size]="20"></svg>
          }
          <span class="flex-1" [attr.lang]="option.lang ?? null">{{ option.label }}</span>
          @if (option.value === pending()) {
            <span class="inline-flex items-center gap-1.5 text-sm text-ink-muted">
              <svg lucideLoaderCircle [size]="16" class="motion-safe:animate-spin"></svg>
              <ng-container i18n>Guardando…</ng-container>
            </span>
          } @else if (checked) {
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
  /** A line under the label that says more about the choice; it describes the group. */
  readonly hint = input<string>();
  /** The value of a row whose choice is being saved: it reads "Guardando…" with a spinner. */
  readonly pending = input<T | null>(null);
  /** Rows that cannot be chosen for now, e.g. while a choice is being saved. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** A row other than the selected one was clicked, or Enter or Space was pressed on it. */
  readonly chosen = output<T>();

  private readonly id = nextId++;
  protected readonly labelId = `choice-rows-label-${this.id}`;
  protected readonly hintId = `choice-rows-hint-${this.id}`;

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
