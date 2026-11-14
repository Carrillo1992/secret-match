/*
 * PROTOTYPE (#87), throwaway. Variant C: the same anchored popover card as A, but each setting is a
 * labelled native <select appField>; the email note is the Language field's hint and the save error
 * is its error text.
 */
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, viewChild } from '@angular/core';
import { LucideLoaderCircle } from '@lucide/angular';
import { Alert } from '../../../shared/ui/alert/alert';
import { Field } from '../../../shared/ui/field/field';
import { LANG_NAMES, Lang, PrefsStore, Theme } from './prefs-store';
import { PrefsTrigger } from './prefs-trigger';

@Component({
  selector: 'app-prefs-variant-c',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Field, PrefsTrigger, LucideLoaderCircle],
  host: {
    class: 'relative inline-flex',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
  template: `
    <app-prefs-trigger
      [label]="t().prefs"
      [expanded]="store.open()"
      [onIllustration]="onIllustration()"
      controls="prefs-c"
      (toggle)="toggle()"
    />
    @if (store.open()) {
      <div
        id="prefs-c"
        role="group"
        [attr.aria-label]="t().prefs"
        class="proto-pop absolute top-full right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-card bg-surface p-4 text-left text-ink shadow-card"
      >
        <label for="prefs-c-theme" class="block font-display text-sm font-semibold">{{ t().theme }}</label>
        <select
          id="prefs-c-theme"
          appField
          class="mt-1.5 w-full"
          (change)="store.chooseTheme(asTheme($event))"
        >
          @for (option of themes; track option) {
            <option [value]="option" [selected]="store.theme() === option">{{ t()[option] }}</option>
          }
        </select>

        <div class="mt-4 flex items-center justify-between">
          <label for="prefs-c-lang" class="block font-display text-sm font-semibold">{{ t().language }}</label>
          @if (store.saving()) {
            <span class="inline-flex items-center gap-1.5 text-sm text-ink-muted" aria-live="polite">
              <svg lucideLoaderCircle [size]="14" class="animate-spin" aria-hidden="true"></svg>
              {{ t().saving }}
            </span>
          }
        </div>
        <select
          id="prefs-c-lang"
          appField
          class="mt-1.5 w-full"
          [disabled]="store.languageBusy()"
          [attr.aria-invalid]="store.saveFailed() || null"
          [attr.aria-describedby]="describedBy()"
          (change)="store.chooseLanguage(asLang($event))"
        >
          @for (lang of langs; track lang) {
            <option [value]="lang" [attr.lang]="lang" [selected]="store.shownLang() === lang">
              {{ names[lang] }}
            </option>
          }
        </select>
        @if (store.saveFailed()) {
          <p id="prefs-c-error" appAlert class="mt-2">{{ t().saveFailed }}</p>
        }
        @if (store.signedIn()) {
          <p id="prefs-c-hint" class="mt-1.5 text-sm text-ink-muted">{{ t().emailNote }}</p>
        }
      </div>
    }
  `,
})
export class VariantC {
  readonly onIllustration = input(false);
  protected readonly store = inject(PrefsStore);
  protected readonly t = this.store.t;
  protected readonly themes: Theme[] = ['system', 'light', 'dark'];
  protected readonly langs: Lang[] = ['es', 'en'];
  protected readonly names = LANG_NAMES;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required(PrefsTrigger);

  protected describedBy(): string | null {
    const ids = [
      this.store.saveFailed() ? 'prefs-c-error' : '',
      this.store.signedIn() ? 'prefs-c-hint' : '',
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  protected asTheme(event: Event): Theme {
    return (event.target as HTMLSelectElement).value as Theme;
  }

  protected asLang(event: Event): Lang {
    return (event.target as HTMLSelectElement).value as Lang;
  }

  protected toggle(): void {
    this.store.open.update((open) => !open);
    this.trigger().focus();
  }

  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.store.open() || this.host.nativeElement.contains(target)) return;
    if (target.closest('[data-proto-bar]')) return;
    this.store.open.set(false);
  }

  protected onEscape(): void {
    if (!this.store.open()) return;
    this.store.open.set(false);
    this.trigger().focus();
  }
}
