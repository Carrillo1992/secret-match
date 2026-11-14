import { Directive, ElementRef, inject } from '@angular/core';

/**
 * The text-input recipe from DESIGN.md on a native `<input>`, `<select>` or `<textarea>`. A
 * textarea keeps the look but takes its height from its `rows`. The screen still owns the label
 * above it, the hint or error below, and the `aria-invalid` / `aria-describedby` wiring; the border
 * turns to danger on its own when `aria-invalid` is set.
 */
@Directive({
  selector: 'input[appField], select[appField], textarea[appField]',
  host: {
    class:
      'rounded-field border border-line bg-field px-4 text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-2 aria-invalid:border-danger',
    '[class.h-13]': '!multiline',
    '[class.py-3]': 'multiline',
  },
})
export class Field {
  protected readonly multiline =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'TEXTAREA';
}
