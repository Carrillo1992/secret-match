import { Directive } from '@angular/core';

/**
 * The text-input recipe from DESIGN.md on a native `<input>` or `<select>`. The screen still owns
 * the label above it, the hint or error below, and the `aria-invalid` / `aria-describedby` wiring;
 * the border turns to danger on its own when `aria-invalid` is set.
 */
@Directive({
  selector: 'input[appField], select[appField]',
  host: {
    class:
      'h-13 rounded-field border border-line bg-field px-4 text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-2 aria-invalid:border-danger',
  },
})
export class Field {}
