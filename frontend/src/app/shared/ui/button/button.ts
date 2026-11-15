import { computed, Directive, input } from '@angular/core';

/**
 * `primary`: the one main action of a screen. `secondary`: an outlined, quieter action.
 * `inverted`: the main action standing on a `primary` band, so it takes the surface instead.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'inverted';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 font-display font-semibold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'h-14 bg-primary text-lg text-on-primary hover:bg-primary-hover focus-visible:outline-primary',
  secondary:
    'h-12 border-2 border-primary text-primary hover:bg-primary hover:text-on-primary focus-visible:outline-primary',
  inverted: 'h-14 bg-surface text-lg text-primary hover:bg-canvas focus-visible:outline-surface',
};

/**
 * The button recipe from DESIGN.md on a native `<button>` or `<a>`: `<button appButton>` is the
 * primary button, `<a appButton="secondary">` the secondary one. The screen adds only placement
 * classes (`w-full`, `mt-6`), never colours or sizes.
 */
@Directive({
  selector: 'button[appButton], a[appButton]',
  host: { '[class]': 'classes()' },
})
export class Button {
  readonly appButton = input<ButtonVariant, ButtonVariant | ''>('primary', {
    transform: (variant) => variant || 'primary',
  });

  protected readonly classes = computed(() => `${BASE} ${VARIANTS[this.appButton()]}`);
}
