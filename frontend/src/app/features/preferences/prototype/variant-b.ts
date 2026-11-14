/*
 * PROTOTYPE (#87), throwaway. Variant B: a native modal <dialog>; a bottom sheet on phones, a centred
 * card from `sm`. Heading "Preferencias", two lists of full-width choice rows with a check on the
 * selected one, and a "Cerrar" link at the bottom.
 * Note: while the modal is open the rest of the page (floating bar included) is inert by design;
 * close it with Escape, the backdrop or "Cerrar".
 */
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  LucideCheck,
  LucideLanguages,
  LucideLoaderCircle,
  LucideMonitor,
  LucideMoon,
  LucideSun,
} from '@lucide/angular';
import { Alert } from '../../../shared/ui/alert/alert';
import { LANG_NAMES, Lang, PrefsStore, Theme } from './prefs-store';
import { PrefsTrigger } from './prefs-trigger';

@Component({
  selector: 'app-prefs-variant-b',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    PrefsTrigger,
    LucideCheck,
    LucideLanguages,
    LucideLoaderCircle,
    LucideMonitor,
    LucideMoon,
    LucideSun,
  ],
  host: { class: 'inline-flex' },
  template: `
    <app-prefs-trigger
      [label]="t().prefs"
      [expanded]="store.open()"
      [onIllustration]="onIllustration()"
      haspopup="dialog"
      controls="prefs-b"
      (toggle)="store.open.set(true)"
    />
    <dialog
      #dialog
      id="prefs-b"
      aria-labelledby="prefs-b-title"
      class="proto-sheet m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-sheet bg-surface p-0 text-left text-ink shadow-sheet backdrop:bg-scrim sm:m-auto sm:max-w-sm sm:rounded-card sm:shadow-card"
      (close)="store.open.set(false)"
      (click)="onDialogClick($event)"
    >
      <div class="px-6 pt-6 pb-8">
      <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-subtle sm:hidden" aria-hidden="true"></div>
      <h2 id="prefs-b-title" class="font-display text-xl font-semibold">{{ t().prefs }}</h2>

      <fieldset class="mt-5">
        <legend class="font-display text-sm font-semibold text-ink-muted">{{ t().theme }}</legend>
        <div class="mt-2 divide-y divide-line/30 overflow-hidden rounded-field bg-canvas">
          @for (option of themes; track option) {
            <label [class]="row">
              <input
                type="radio"
                name="b-theme"
                class="peer sr-only"
                [value]="option"
                [checked]="store.theme() === option"
                (change)="store.chooseTheme(option)"
              />
              @switch (option) {
                @case ('system') {
                  <svg lucideMonitor [size]="20" aria-hidden="true"></svg>
                }
                @case ('light') {
                  <svg lucideSun [size]="20" aria-hidden="true"></svg>
                }
                @case ('dark') {
                  <svg lucideMoon [size]="20" aria-hidden="true"></svg>
                }
              }
              <span class="flex-1">{{ t()[option] }}</span>
              @if (store.theme() === option) {
                <svg lucideCheck [size]="20" class="text-primary" aria-hidden="true"></svg>
              }
            </label>
          }
        </div>
      </fieldset>

      <fieldset class="mt-5" [attr.aria-describedby]="store.signedIn() ? 'prefs-b-note' : null">
        <legend class="font-display text-sm font-semibold text-ink-muted">{{ t().language }}</legend>
        @if (store.signedIn()) {
          <p id="prefs-b-note" class="mt-1 text-sm text-ink-muted">{{ t().emailNote }}</p>
        }
        <div class="mt-2 divide-y divide-line/30 overflow-hidden rounded-field bg-canvas">
          @for (lang of langs; track lang) {
            <label
              [class]="row"
              [class.cursor-not-allowed]="store.languageBusy()"
              [class.opacity-60]="store.languageBusy() && store.saving() !== lang"
            >
              <input
                type="radio"
                name="b-lang"
                class="sr-only"
                [value]="lang"
                [checked]="store.shownLang() === lang"
                [disabled]="store.languageBusy()"
                (change)="store.chooseLanguage(lang)"
              />
              <svg lucideLanguages [size]="20" aria-hidden="true"></svg>
              <span class="flex-1" [attr.lang]="lang">{{ names[lang] }}</span>
              @if (store.saving() === lang) {
                <span class="inline-flex items-center gap-1.5 text-sm text-ink-muted" aria-live="polite">
                  <svg lucideLoaderCircle [size]="16" class="animate-spin" aria-hidden="true"></svg>
                  {{ t().saving }}
                </span>
              } @else if (store.shownLang() === lang) {
                <svg lucideCheck [size]="20" class="text-primary" aria-hidden="true"></svg>
              }
            </label>
          }
        </div>
      </fieldset>

      @if (store.saveFailed()) {
        <p appAlert class="mt-4">{{ t().saveFailed }}</p>
      }

      <div class="mt-6 text-center">
        <button
          type="button"
          class="min-h-11 px-3 font-display font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
          (click)="store.open.set(false)"
        >
          {{ t().close }}
        </button>
      </div>
      </div>
    </dialog>
  `,
})
export class VariantB {
  readonly onIllustration = input(false);
  protected readonly store = inject(PrefsStore);
  protected readonly t = this.store.t;
  protected readonly themes: Theme[] = ['system', 'light', 'dark'];
  protected readonly langs: Lang[] = ['es', 'en'];
  protected readonly names = LANG_NAMES;
  protected readonly row =
    'flex min-h-13 cursor-pointer items-center gap-3 px-4 font-semibold transition-colors duration-200 hover:bg-subtle has-[:checked]:bg-surface has-[:focus-visible]:outline-3 has-[:focus-visible]:-outline-offset-3 has-[:focus-visible]:outline-primary';

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.store.open() && !dialog.open) dialog.showModal();
      if (!this.store.open() && dialog.open) dialog.close();
    });
  }

  /** A click on the dialog box itself (not its content) is a click on the backdrop. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.store.open.set(false);
  }
}
