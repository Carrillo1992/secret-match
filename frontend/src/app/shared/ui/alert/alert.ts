import { Directive } from '@angular/core';

/**
 * The alert recipe from DESIGN.md: a problem the person must notice, in `danger` on its tinted
 * background, announced to screen readers as soon as it appears. Put it on a `<p>` or `<div>`
 * and add only placement classes (`mt-6`).
 */
@Directive({
  selector: '[appAlert]',
  host: {
    role: 'alert',
    class: 'block rounded-field bg-danger-soft px-4 py-3 text-sm font-semibold text-danger',
  },
})
export class Alert {}
