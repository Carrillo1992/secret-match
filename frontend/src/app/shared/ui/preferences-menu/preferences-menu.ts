import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideBell,
  LucideBellOff,
  LucideBellRing,
  LucideChevronRight,
  LucideLanguages,
  LucideLoaderCircle,
  LucideMonitor,
  LucideMoon,
  LucideSettings2,
  LucideSmartphone,
  LucideSun,
} from '@lucide/angular';
import { AuthSession } from '../../../core/auth/auth-session';
import { AppInstall } from '../../../core/install/app-install';
import { DevicePush } from '../../../core/push/device-push';
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

const APP_ROW =
  'flex min-h-13 w-full items-center gap-3 px-4 text-left font-semibold text-ink transition-colors duration-200 hover:bg-subtle focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-primary disabled:cursor-default disabled:hover:bg-canvas';

/**
 * The Preferences menu (#86): an icon button at the end of a header that opens a bottom sheet with
 * the Theme and the Language. A Theme applies as soon as it is chosen. `raised` puts the button on
 * its own disc, for a header over the gift illustration (`app-sheet-layout`).
 *
 * The Language rows show the Language the app speaks; choosing another reloads the page in it
 * (#89). Signed in, it is saved to the User first and the menu says emails use it too: the row
 * reads "Guardando…" meanwhile, and a failure keeps the page as it is with an alert (#91). Closing the sheet gives focus back to the button.
 *
 * Where this device can install SecretMatch, an "App" group offers "Instalar la app" (#118). Signed
 * in, where notifications are offered on this device, the same group has the "Avisos en este
 * dispositivo" switch (#119): turning it on may open the browser's permission dialog; blocked in the
 * browser, it is disabled and says where to undo that.
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
    LucideBell,
    LucideBellOff,
    LucideBellRing,
    LucideChevronRight,
    LucideLoaderCircle,
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
      @if (appInstall.way() || devicePush.available()) {
        <section class="mt-5" aria-labelledby="preferences-app">
          <h3 id="preferences-app" class="font-display text-sm font-semibold text-ink-muted" i18n>
            App
          </h3>
          <div class="mt-2 divide-y divide-line/30 overflow-hidden rounded-field bg-canvas">
            @if (appInstall.way()) {
              <button type="button" [class]="row" (click)="install()">
                <svg lucideSmartphone [size]="20" class="shrink-0"></svg>
                <span class="flex-1" i18n>Instalar la app</span>
                <svg lucideChevronRight [size]="20" class="shrink-0 text-ink-muted"></svg>
              </button>
            }
            @if (devicePush.available()) {
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="pushOn()"
                [attr.aria-describedby]="pushHint() ? 'preferences-push-hint' : null"
                [attr.aria-busy]="pushWorking() ? true : null"
                [disabled]="pushWorking() !== null || devicePush.status() === 'denied'"
                [class]="row"
                (click)="togglePush()"
              >
                @if (devicePush.status() === 'denied') {
                  <svg lucideBellOff [size]="20" class="shrink-0 text-ink-muted"></svg>
                } @else if (pushOn()) {
                  <svg lucideBellRing [size]="20" class="shrink-0"></svg>
                } @else {
                  <svg lucideBell [size]="20" class="shrink-0"></svg>
                }
                <span class="flex-1" [class.text-ink-muted]="devicePush.status() === 'denied'" i18n
                  >Avisos en este dispositivo</span
                >
                @if (pushWorking(); as working) {
                  <span class="inline-flex shrink-0 items-center gap-1.5 text-sm text-ink-muted">
                    <svg lucideLoaderCircle [size]="16" class="motion-safe:animate-spin"></svg>
                    @if (working === 'on') {
                      <ng-container i18n>Activando…</ng-container>
                    } @else {
                      <ng-container i18n>Desactivando…</ng-container>
                    }
                  </span>
                } @else {
                  <span
                    aria-hidden="true"
                    class="inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors duration-200"
                    [class]="pushOn() ? 'border-primary bg-primary' : 'border-line bg-subtle'"
                    [class.opacity-60]="devicePush.status() === 'denied'"
                  >
                    <span
                      class="size-5 rounded-full bg-surface shadow-card transition-transform duration-200"
                      [class]="pushOn() ? 'translate-x-5.5' : 'translate-x-0.5'"
                    ></span>
                  </span>
                }
              </button>
            }
          </div>
          @if (pushHint(); as hint) {
            <p id="preferences-push-hint" class="mt-2 text-sm text-ink-muted">
              @if (hint === 'on') {
                <ng-container i18n>Mensajes nuevos y el sorteo.</ng-container>
              } @else {
                <ng-container i18n
                  >Bloqueados en este navegador: actívalos en los ajustes del sitio.</ng-container
                >
              }
            </p>
          }
          @if (pushFailed()) {
            <p appAlert class="mt-4" i18n>
              No hemos podido cambiar los avisos. Inténtalo de nuevo.
            </p>
          }
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
  protected readonly devicePush = inject(DevicePush);
  /** A row in the "App" well, in the choice-row look. */
  protected readonly row = APP_ROW;
  /** Which way the notifications switch is being turned, while it is. */
  protected readonly pushWorking = signal<'on' | 'off' | null>(null);
  protected readonly pushFailed = signal(false);
  /** During a change the switch keeps showing the previous value. */
  protected readonly pushOn = computed(() => this.devicePush.status() === 'on');
  protected readonly pushHint = computed(() => {
    const status = this.devicePush.status();
    return status === 'on' || status === 'denied' ? status : null;
  });
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

  /** "Avisos en este dispositivo": turns notifications on or off for this device. */
  protected async togglePush(): Promise<void> {
    const turningOn = !this.pushOn();
    this.pushFailed.set(false);
    this.pushWorking.set(turningOn ? 'on' : 'off');
    const outcome = turningOn ? await this.devicePush.turnOn() : await this.devicePush.turnOff();
    this.pushWorking.set(null);
    this.pushFailed.set(outcome === 'failed');
  }

  /** The row that opened the guide is gone with its sheet, so focus goes back to the button. */
  protected closeGuide(): void {
    this.guideOpen.set(false);
    this.trigger().nativeElement.focus();
  }
}
