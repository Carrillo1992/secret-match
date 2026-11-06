import { Directive } from '@angular/core';

/**
 * The neutral chip recipe from DESIGN.md: a short fact as a pill (a role, a count, an amount). It
 * is a label, not a control, so put it on a `<span>` or `<li>`.
 */
@Directive({
  selector: '[appChip]',
  host: {
    class:
      'inline-flex items-center gap-1 rounded-full bg-subtle px-3 py-1 text-sm font-semibold text-ink',
  },
})
export class Chip {}
