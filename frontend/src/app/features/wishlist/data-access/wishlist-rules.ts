import { AbstractControl, ValidationErrors } from '@angular/forms';
import { Wish, WishInput, WishPriority } from './wishlist-api';

/**
 * The rules of a Wishlist, mirroring the API's, which checks them too. A Wish: lengths, an http(s)
 * link, a price to the cent. Preferences and Don't List entries: lengths, counted on the trimmed
 * text, because the API strips it before checking.
 */

export const TITLE_MAX_LENGTH = 100;
export const LINK_MAX_LENGTH = 2000;
export const NOTES_MAX_LENGTH = 1000;
export const PREFERENCES_MAX_LENGTH = 2000;
export const DONT_LIST_ENTRY_MAX_LENGTH = 100;
const PRICE = /^\d{1,6}([.,]\d{1,2})?$/;
const HTTP_LINK = /^https?:\/\/[^\s/?#]+\S*$/i;

export const PRIORITY_LABELS: Readonly<Record<WishPriority, string>> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

/** Only http and https addresses: a `javascript:` link must never reach an `href`. */
export function httpLink(control: AbstractControl<string>): ValidationErrors | null {
  const link = control.value.trim();
  return !link || HTTP_LINK.test(link) ? null : { link: true };
}

export function priceInEuros(control: AbstractControl<string>): ValidationErrors | null {
  const amount = control.value.trim();
  return !amount || PRICE.test(amount) ? null : { price: true };
}

/** A Don't List entry as it will be sent, trimmed: not blank, and short. */
export function dontListEntry(control: AbstractControl<string>): ValidationErrors | null {
  const text = control.value.trim();
  if (text === '') {
    return { blank: true };
  }
  return text.length > DONT_LIST_ENTRY_MAX_LENGTH ? { tooLong: true } : null;
}

export interface WishFormValue {
  readonly title: string;
  readonly link: string;
  readonly price: string;
  readonly notes: string;
  readonly priority: WishPriority;
}

/** The form's raw values as the API takes them: `25,50` → 25.5, empty fields left out. */
export function wishInput(form: WishFormValue): WishInput {
  const link = form.link.trim();
  const price = form.price.trim();
  const notes = form.notes.trim();
  return {
    title: form.title.trim(),
    priority: form.priority,
    ...(link && { link }),
    ...(price && { price: Number(price.replace(',', '.')) }),
    ...(notes && { notes }),
  };
}

/** A Wish as the form shows it to edit; a new one starts empty, medium priority. */
export function wishFormValue(wish?: Wish): WishFormValue {
  return {
    title: wish?.title ?? '',
    link: wish?.link ?? '',
    price: wish?.price === undefined ? '' : priceText(wish.price),
    notes: wish?.notes ?? '',
    priority: wish?.priority ?? 'MEDIUM',
  };
}

function priceText(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2).replace('.', ',');
}
