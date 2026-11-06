import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** How the outcome a status screen reports feels: good news, or neutral (waiting, a problem). */
export type StatusTone = 'good' | 'neutral';

/**
 * The top of a status screen: an icon badge and the page title. Project the icon with the
 * `statusIcon` attribute and the title text as content:
 * `<app-status-header tone="good"><svg lucideCircleCheck statusIcon [size]="30"></svg>¡Hecho!</app-status-header>`.
 * It renders no box of its own, so the parent's alignment (left or centred) applies.
 */
@Component({
  selector: 'app-status-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div
      class="flex size-16 items-center justify-center rounded-full text-ink"
      [class.bg-sage-soft]="tone() === 'good'"
      [class.bg-subtle]="tone() === 'neutral'"
    >
      <ng-content select="[statusIcon]" />
    </div>
    <h1 class="mt-4 font-display text-3xl font-bold tracking-tight"><ng-content /></h1>
  `,
})
export class StatusHeader {
  readonly tone = input<StatusTone>('neutral');
}
