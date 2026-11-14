import { Directive, ElementRef, inject } from '@angular/core';

const BASE =
  'rounded-field border border-line bg-field px-4 text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-2 aria-invalid:border-danger';

/**
 * The text-input recipe from DESIGN.md on a native `<input>`, `<select>` or `<textarea>`. The screen
 * still owns the label above it, the hint or error below, and the `aria-invalid` / `aria-describedby`
 * wiring; the border turns to danger on its own when `aria-invalid` is set. A textarea keeps the look
 * but its height comes from its `rows`.
 */
@Directive({
  selector: 'input[appField], select[appField], textarea[appField]',
  host: { '[class]': 'classes' },
})
export class Field {
  protected readonly classes =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'TEXTAREA'
      ? `${BASE} block resize-none py-3`
      : `${BASE} h-13`;
}
