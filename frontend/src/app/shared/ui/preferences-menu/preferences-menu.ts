import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideLanguages,
  LucideMonitor,
  LucideMoon,
  LucideSettings2,
  LucideSun,
} from '@lucide/angular';
import { AuthSession } from '../../../core/auth/auth-session';
import { Language } from '../../../core/language';
import { LanguagePreference } from '../../../core/preferences/language-preference';
import { Theme, ThemePreference } from '../../../core/preferences/theme-preference';
import { Alert } from '../alert/alert';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';
import { ChoiceOption, ChoiceRows } from '../choice-rows/choice-rows';
import { IconButton } from '../icon-button/icon-button';
import { KoFiLink } from '../ko-fi-link/ko-fi-link';

const THEMES: readonly ChoiceOption<Theme>[] = [
  { value: 'system', label: $localize`Sistema`, icon: LucideMonitor },
  { value: 'light', label: $localize`Claro`, icon: LucideSun },
  { value: 'dark', label: $localize`Oscuro`, icon: LucideMoon },
];

/** Always written in their own language, so each reader finds theirs. */
const LANGUAGES: readonly ChoiceOption<Language>[] = [
  { value: 'es', label: 'Español', icon: LucideLanguages, lang: 'es' },
  { value: 'en', label: 'English', icon: LucideLanguages, lang: 'en' },
];

/**
 * The Preferences menu (#86): an icon button at the end of a header that opens a bottom sheet with
 * the Theme and the Language. A Theme applies as soon as it is chosen. `raised` puts the button on
 * its own disc, for a header over the gift illustration (`app-sheet-layout`).
 *
 * The Language rows show the Language the app speaks; choosing another reloads the page in it
 * (#89). Signed in, it is saved to the User first and the menu says emails use it too: the row
 * reads "Guardando…" meanwhile, and a failure keeps the page as it is with an alert (#91). Closing the sheet gives focus back to the button.
 */
@Component({
  selector: 'app-preferences-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, BottomSheet, ChoiceRows, IconButton, KoFiLink, LucideSettings2],
  host: { class: 'inline-flex' },
  template: `
    <button
      #trigger
      type="button"
      [appIconButton]="raised() ? 'raised' : 'flat'"
      aria-label="Preferencias"
      i18n-aria-label
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      (click)="open.set(true)"
    >
      <svg lucideSettings2 [size]="22"></svg>
    </button>
    <app-bottom-sheet heading="Preferencias" i18n-heading [open]="open()" (closed)="close()">
      <app-choice-rows
        class="mt-5"
        label="Tema"
        i18n-label
        [options]="themes"
        [selected]="themePreference.theme()"
        (chosen)="themePreference.choose($event)"
      />
      <app-choice-rows
        class="mt-5"
        label="Idioma"
        i18n-label
        [hint]="session.isSignedIn() ? emailsNote : undefined"
        [options]="languages"
        [selected]="languagePreference.language"
        [pending]="languagePreference.saving()"
        [disabled]="languagePreference.saving() !== null"
        (chosen)="languagePreference.choose($event)"
      />
      @if (languagePreference.saveFailed()) {
        <p appAlert class="mt-4" i18n>No hemos podido cambiar el idioma. Inténtalo de nuevo.</p>
      }
      <p class="mt-5">
        <app-ko-fi-link standalone i18n>Invítame a un café</app-ko-fi-link>
      </p>
    </app-bottom-sheet>
  `,
})
export class PreferencesMenu {
  /** On its own `surface` disc, to read over an illustration. */
  readonly raised = input(false, { transform: booleanAttribute });

  protected readonly themePreference = inject(ThemePreference);
  protected readonly languagePreference = inject(LanguagePreference);
  protected readonly session = inject(AuthSession);
  protected readonly emailsNote = $localize`También se usa en tus emails.`;
  protected readonly themes = THEMES;
  protected readonly languages = LANGUAGES;
  protected readonly open = signal(false);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected close(): void {
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }
}
