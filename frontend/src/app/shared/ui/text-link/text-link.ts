import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * The inline-link recipe from DESIGN.md on a native `<a>`, or on a `<button>` for a quiet action
 * next to a real button. Add `standalone` when it stands on its own line rather than inside a
 * sentence, so it gets a 44 px touch target. `tone="danger"` is for a link on a warning card's
 * `danger-soft`, where `primary` text falls below AA.
 */
@Directive({
  selector: 'a[appLink], button[appLink]',
  host: {
    class:
      'font-semibold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
    '[class.text-primary]': 'tone() === "primary"',
    '[class.hover:text-primary-hover]': 'tone() === "primary"',
    '[class.focus-visible:outline-primary]': 'tone() === "primary"',
    '[class.text-danger]': 'tone() === "danger"',
    '[class.hover:decoration-2]': 'tone() === "danger"',
    '[class.focus-visible:outline-danger]': 'tone() === "danger"',
    '[class.inline-flex]': 'standalone()',
    '[class.min-h-11]': 'standalone()',
    '[class.items-center]': 'standalone()',
  },
})
export class TextLink {
  readonly standalone = input(false, { transform: booleanAttribute });
  readonly tone = input<'primary' | 'danger'>('primary');
}
