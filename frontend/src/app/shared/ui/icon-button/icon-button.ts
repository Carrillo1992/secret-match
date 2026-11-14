import { computed, Directive, input } from '@angular/core';

/** `flat`: on a bar (the default). `raised`: on its own `surface` disc, to read over an illustration. */
export type IconButtonVariant = 'flat' | 'raised';

const BASE =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors duration-200 hover:bg-subtle focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary';

const VARIANTS: Record<IconButtonVariant, string> = {
  flat: '',
  raised: 'bg-surface shadow-card',
};

/**
 * The icon button recipe from DESIGN.md on a native `<button>`: 44 px, round, an `ink` icon that
 * gets a `subtle` fill on hover. Icon-only, so the button needs an `aria-label`. `raised` puts it on
 * a `surface` disc for a header over the gift illustration. Add only placement classes.
 */
@Directive({
  selector: 'button[appIconButton]',
  host: { '[class]': 'classes()' },
})
export class IconButton {
  readonly appIconButton = input<IconButtonVariant, IconButtonVariant | ''>('flat', {
    transform: (variant) => variant || 'flat',
  });

  protected readonly classes = computed(() => `${BASE} ${VARIANTS[this.appIconButton()]}`.trim());
}
