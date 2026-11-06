import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * The inline-link recipe from DESIGN.md on a native `<a>`, or on a `<button>` for a quiet action
 * next to a real button. Add `standalone` when it stands on its own line rather than inside a
 * sentence, so it gets a 44 px touch target.
 */
@Directive({
  selector: 'a[appLink], button[appLink]',
  host: {
    class:
      'font-semibold text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60',
    '[class.inline-flex]': 'standalone()',
    '[class.min-h-11]': 'standalone()',
    '[class.items-center]': 'standalone()',
  },
})
export class TextLink {
  readonly standalone = input(false, { transform: booleanAttribute });
}
