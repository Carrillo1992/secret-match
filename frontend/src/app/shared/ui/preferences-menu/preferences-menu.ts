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
  LucideChevronRight,
  LucideLanguages,
  LucideMonitor,
  LucideMoon,
  LucideSettings2,
  LucideSmartphone,
  LucideSun,
} from '@lucide/angular';
import { AuthSession } from '../../../core/auth/auth-session';
import { AppInstall } from '../../../core/install/app-install';
import { Language } from '../../../core/language';
import { LanguagePreference } from '../../../core/preferences/language-preference';
import { Theme, ThemePreference } from '../../../core/preferences/theme-preference';
import { Alert } from '../alert/alert';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';
import { ChoiceOption, ChoiceRows } from '../choice-rows/choice-rows';
import { IconButton } from '../icon-button/icon-button';
import { InstallGuide } from '../install-guide/install-guide';
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
 *
 * Where this device can install SecretMatch, an "App" group offers "Instalar la app" (#118).
 */
@Component({
  selector: 'app-preferences-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    BottomSheet,
    ChoiceRows,
    IconButton,
    InstallGuide,
    KoFiLink,
    LucideChevronRight,
    LucideSettings2,
    LucideSmartphone,
  ],
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
      @if (appInstall.way()) {
        <section class="mt-5" aria-labelledby="preferences-app">
          <h3 id="preferences-app" class="font-display text-sm font-semibold text-ink-muted" i18n>
            App
          </h3>
          <button
            type="button"
            class="mt-2 flex min-h-13 w-full items-center gap-3 rounded-field bg-canvas px-4 text-left font-semibold text-ink transition-colors duration-200 hover:bg-subtle focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-primary"
            (click)="install()"
          >
            <svg lucideSmartphone [size]="20" class="shrink-0"></svg>
            <span class="flex-1" i18n>Instalar la app</span>
            <svg lucideChevronRight [size]="20" class="shrink-0 text-ink-muted"></svg>
          </button>
        </section>
      }
      <p class="mt-5">
        <app-ko-fi-link standalone i18n>Invítame a un café</app-ko-fi-link>
      </p>
    </app-bottom-sheet>
    <app-install-guide [open]="guideOpen()" (closed)="closeGuide()" />
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
  protected readonly appInstall = inject(AppInstall);
  protected readonly open = signal(false);
  protected readonly guideOpen = signal(false);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected close(): void {
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }

  /**
   * "Instalar la app": the browser's dialog opens over the sheet, and the row goes once it is used.
   * On iOS the sheet gives way to the guide, never one sheet over another.
   */
  protected async install(): Promise<void> {
    if ((await this.appInstall.install()) === 'guide') {
      this.open.set(false);
      this.guideOpen.set(true);
    }
  }

  /** The row that opened the guide is gone with its sheet, so focus goes back to the button. */
  protected closeGuide(): void {
    this.guideOpen.set(false);
    this.trigger().nativeElement.focus();
  }
}
