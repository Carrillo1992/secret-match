import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/** The fill of a band: bands alternate between the two, so each selling point reads as its own. */
export type BandTone = 'surface' | 'canvas';

/**
 * One selling point of the landing as a full-bleed band (#115, DESIGN.md "Feature band"): an icon
 * badge, the heading in big Outfit and a lead on one side, a live mini-demo (the content) on the
 * other. Phones stack them, text first. `reverse` puts the text on the right from `md`, so the
 * bands zigzag. Decoration shapes come in with `bandDecoration`, a note under the lead with
 * `bandNote`, and the 20 px icon with `bandIcon`.
 */
@Component({
  selector: 'app-feature-band',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClasses()' },
  template: `
    <ng-content select="[bandDecoration]" />
    <div class="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
      <div [class]="reverse() ? 'md:order-2' : ''">
        <span class="grid size-10 place-items-center rounded-full bg-subtle">
          <ng-content select="[bandIcon]" />
        </span>
        <h2 class="mt-4 font-display text-3xl font-bold tracking-tight md:text-5xl">
          {{ heading() }}
        </h2>
        <p class="mt-3 text-lg text-ink-muted">{{ lead() }}</p>
        <ng-content select="[bandNote]" />
      </div>
      <div>
        <ng-content />
      </div>
    </div>
  `,
})
export class FeatureBand {
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
  readonly tone = input<BandTone>('canvas');
  readonly reverse = input(false, { transform: booleanAttribute });

  protected readonly hostClasses = computed(
    () =>
      `relative block overflow-hidden px-6 py-16 md:px-10 ${this.tone() === 'surface' ? 'bg-surface' : 'bg-canvas'}`,
  );
}
