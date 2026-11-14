/*
 * PROTOTYPE (#87), throwaway. Variant A (recommended): an anchored popover card with two segmented
 * controls (native radios styled as pills): Tema · Sistema/Claro/Oscuro, Idioma · Español/English.
 */
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, viewChild } from '@angular/core';
import {
  LucideLoaderCircle,
  LucideMonitor,
  LucideMoon,
  LucideSun,
} from '@lucide/angular';
import { Alert } from '../../../shared/ui/alert/alert';
import { LANG_NAMES, Lang, PrefsStore, Theme } from './prefs-store';
import { PrefsTrigger } from './prefs-trigger';

@Component({
  selector: 'app-prefs-variant-a',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, PrefsTrigger, LucideLoaderCircle, LucideMonitor, LucideMoon, LucideSun],
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
      controls="prefs-a"
      (toggle)="toggle()"
    />
    @if (store.open()) {
      <div
        id="prefs-a"
        role="group"
        [attr.aria-label]="t().prefs"
        class="proto-pop absolute top-full right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-card bg-surface p-4 text-left text-ink shadow-card"
      >
        <fieldset>
          <legend class="px-1 font-display text-sm font-semibold text-ink-muted">{{ t().theme }}</legend>
          <div class="mt-2 flex gap-1 rounded-full bg-canvas p-1">
            @for (option of themes; track option) {
              <label [class]="segment">
                <input
                  type="radio"
                  name="a-theme"
                  class="sr-only"
                  [value]="option"
                  [checked]="store.theme() === option"
                  (change)="store.chooseTheme(option)"
                />
                @switch (option) {
                  @case ('system') {
                    <svg lucideMonitor [size]="16" aria-hidden="true"></svg>
                  }
                  @case ('light') {
                    <svg lucideSun [size]="16" aria-hidden="true"></svg>
                  }
                  @case ('dark') {
                    <svg lucideMoon [size]="16" aria-hidden="true"></svg>
                  }
                }
                {{ t()[option] }}
              </label>
            }
          </div>
        </fieldset>

        <fieldset class="mt-4" [attr.aria-describedby]="store.signedIn() ? 'prefs-a-note' : null">
          <legend class="px-1 font-display text-sm font-semibold text-ink-muted">
            {{ t().language }}
          </legend>
          <div class="mt-2 flex gap-1 rounded-full bg-canvas p-1">
            @for (lang of langs; track lang) {
              <label
                [class]="segment"
                [class.cursor-not-allowed]="store.languageBusy()"
                [class.opacity-60]="store.languageBusy() && store.saving() !== lang"
              >
                <input
                  type="radio"
                  name="a-lang"
                  class="sr-only"
                  [value]="lang"
                  [attr.lang]="lang"
                  [checked]="store.shownLang() === lang"
                  [disabled]="store.languageBusy()"
                  (change)="store.chooseLanguage(lang)"
                />
                @if (store.saving() === lang) {
                  <svg lucideLoaderCircle [size]="16" class="animate-spin" aria-hidden="true"></svg>
                  <span aria-live="polite">{{ t().saving }}</span>
                } @else {
                  <span [attr.lang]="lang">{{ names[lang] }}</span>
                }
              </label>
            }
          </div>
          @if (store.signedIn()) {
            <p id="prefs-a-note" class="mt-2 px-1 text-sm text-ink-muted">{{ t().emailNote }}</p>
          }
        </fieldset>

        @if (store.saveFailed()) {
          <p appAlert class="mt-4">{{ t().saveFailed }}</p>
        }
      </div>
    }
  `,
})
export class VariantA {
  readonly onIllustration = input(false);
  protected readonly store = inject(PrefsStore);
  protected readonly t = this.store.t;
  protected readonly themes: Theme[] = ['system', 'light', 'dark'];
  protected readonly langs: Lang[] = ['es', 'en'];
  protected readonly names = LANG_NAMES;
  protected readonly segment =
    'flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold text-ink-muted transition-colors duration-200 hover:text-ink has-[:checked]:bg-surface has-[:checked]:text-primary has-[:checked]:shadow-card has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-primary';

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required(PrefsTrigger);

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
