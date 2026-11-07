import { computed, Directive, input } from '@angular/core';

/** `danger`: a problem the person must notice. `success`: confirmation that something was saved. */
export type AlertTone = 'danger' | 'success';

const BASE = 'block rounded-field px-4 py-3 text-sm font-semibold';

const TONES: Record<AlertTone, string> = {
  danger: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
};

/**
 * The alert recipe from DESIGN.md on a `<p>` or `<div>`: `appAlert` is a problem, in `danger` on its
 * tinted background, announced as soon as it appears (`role="alert"`); `appAlert="success"` confirms
 * that something was saved, announced politely (`role="status"`). Add only placement classes (`mt-6`).
 */
@Directive({
  selector: '[appAlert]',
  host: { '[attr.role]': 'role()', '[class]': 'classes()' },
})
export class Alert {
  readonly appAlert = input<AlertTone, AlertTone | ''>('danger', {
    transform: (tone) => tone || 'danger',
  });

  protected readonly role = computed(() => (this.appAlert() === 'danger' ? 'alert' : 'status'));
  protected readonly classes = computed(() => `${BASE} ${TONES[this.appAlert()]}`);
}
