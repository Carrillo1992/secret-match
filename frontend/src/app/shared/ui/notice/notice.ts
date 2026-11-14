import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A Notice (DESIGN.md): a card at the top of an app-shell page explaining a state the whole page is
 * in, so the actions it no longer offers are not a mystery. Project the icon with `noticeIcon` and
 * the one `text-ink-muted` sentence of why as content; `heading` is the state.
 */
@Component({
  selector: 'app-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      [attr.aria-labelledby]="headingId()"
      class="flex gap-3 rounded-card bg-surface p-5 shadow-card"
    >
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
      >
        <ng-content select="[noticeIcon]" />
      </div>
      <div>
        <h2 [id]="headingId()" class="font-display text-lg font-semibold">{{ heading() }}</h2>
        <p class="mt-1.5 text-ink-muted"><ng-content /></p>
      </div>
    </section>
  `,
})
export class Notice {
  readonly heading = input.required<string>();
  readonly headingId = input.required<string>();
}
