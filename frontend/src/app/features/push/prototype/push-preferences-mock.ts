// PROTOTYPE (#119), throwaway: a mock of the Preferences sheet with the two options (P1/P2) for the
// per-device notifications toggle. Built on the real bottom sheet and choice rows; nothing is saved
// except the Theme, which goes through the real ThemePreference.
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import {
  LucideBell,
  LucideBellOff,
  LucideBellRing,
  LucideChevronRight,
  LucideLanguages,
  LucideLoaderCircle,
  LucideMonitor,
  LucideMoon,
  LucideSmartphone,
  LucideSun,
} from '@lucide/angular';
import { Theme, ThemePreference } from '../../../core/preferences/theme-preference';
import { Alert } from '../../../shared/ui/alert/alert';
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet';
import { ChoiceOption, ChoiceRows } from '../../../shared/ui/choice-rows/choice-rows';
import { KoFiLink } from '../../../shared/ui/ko-fi-link/ko-fi-link';

export type ToggleState =
  'off' | 'on' | 'activating' | 'deactivating' | 'denied' | 'failed' | 'hidden';
export type PrefOption = 'P1' | 'P2';

const THEMES: readonly ChoiceOption<Theme>[] = [
  { value: 'system', label: 'Sistema', icon: LucideMonitor },
  { value: 'light', label: 'Claro', icon: LucideSun },
  { value: 'dark', label: 'Oscuro', icon: LucideMoon },
];
const LANGUAGES: readonly ChoiceOption<'es' | 'en'>[] = [
  { value: 'es', label: 'Español', icon: LucideLanguages, lang: 'es' },
  { value: 'en', label: 'English', icon: LucideLanguages, lang: 'en' },
];
const PUSH_OPTIONS: readonly ChoiceOption<'on' | 'off'>[] = [
  { value: 'on', label: 'Activados', icon: LucideBellRing },
  { value: 'off', label: 'Desactivados', icon: LucideBellOff },
];

const ROW =
  'flex min-h-13 w-full items-center gap-3 px-4 text-left font-semibold text-ink transition-colors duration-200 enabled:hover:bg-subtle disabled:cursor-not-allowed focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-primary';

@Component({
  selector: 'app-push-preferences-mock',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    BottomSheet,
    ChoiceRows,
    KoFiLink,
    LucideBell,
    LucideBellOff,
    LucideBellRing,
    LucideChevronRight,
    LucideLoaderCircle,
    LucideSmartphone,
  ],
  template: `
    <app-bottom-sheet heading="Preferencias" [open]="open()" (closed)="closed.emit()">
      <app-choice-rows
        class="mt-5"
        label="Tema"
        [options]="themes"
        [selected]="themePreference.theme()"
        (chosen)="themePreference.choose($event)"
      />
      <app-choice-rows
        class="mt-5"
        label="Idioma"
        hint="También se usa en tus emails."
        [options]="languages"
        selected="es"
      />

      @if (installRow() || (pref() === 'P1' && shown())) {
        <section class="mt-5" aria-labelledby="proto-preferences-app">
          <h3 id="proto-preferences-app" class="font-display text-sm font-semibold text-ink-muted">
            App
          </h3>
          <div class="mt-2 divide-y divide-line/30 overflow-hidden rounded-field bg-canvas">
            @if (installRow()) {
              <button type="button" [class]="row">
                <svg lucideSmartphone [size]="20" class="shrink-0"></svg>
                <span class="flex-1">Instalar la app</span>
                <svg lucideChevronRight [size]="20" class="shrink-0 text-ink-muted"></svg>
              </button>
            }
            @if (pref() === 'P1' && shown()) {
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="switchOn()"
                [attr.aria-describedby]="hint() ? 'proto-push-hint' : null"
                [attr.aria-busy]="working() || null"
                [disabled]="working() || state() === 'denied'"
                [class]="row"
                (click)="toggle.emit()"
              >
                @if (state() === 'denied') {
                  <svg lucideBellOff [size]="20" class="shrink-0 text-ink-muted"></svg>
                } @else if (switchOn()) {
                  <svg lucideBellRing [size]="20" class="shrink-0"></svg>
                } @else {
                  <svg lucideBell [size]="20" class="shrink-0"></svg>
                }
                <span class="flex-1" [class.text-ink-muted]="state() === 'denied'"
                  >Avisos en este dispositivo</span
                >
                @if (working()) {
                  <span class="inline-flex shrink-0 items-center gap-1.5 text-sm text-ink-muted">
                    <svg lucideLoaderCircle [size]="16" class="motion-safe:animate-spin"></svg>
                    {{ state() === 'activating' ? 'Activando…' : 'Desactivando…' }}
                  </span>
                } @else {
                  <span
                    aria-hidden="true"
                    class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors duration-200"
                    [class]="switchOn() ? 'border-primary bg-primary' : 'border-line bg-subtle'"
                    [class.opacity-60]="state() === 'denied'"
                  >
                    <span
                      class="size-5 rounded-full bg-surface shadow-card transition-transform duration-200"
                      [class]="switchOn() ? 'translate-x-5.5' : 'translate-x-0.5'"
                    ></span>
                  </span>
                }
              </button>
            }
          </div>
          @if (pref() === 'P1' && hint(); as hint) {
            <p id="proto-push-hint" class="mt-2 text-sm text-ink-muted">{{ hint }}</p>
          }
        </section>
      }

      @if (pref() === 'P2' && shown()) {
        <app-choice-rows
          class="mt-5"
          label="Avisos en este dispositivo"
          [hint]="hint()"
          [options]="pushOptions"
          [selected]="switchOn() ? 'on' : 'off'"
          [pending]="pending()"
          [disabled]="working() || state() === 'denied'"
          (chosen)="toggle.emit()"
        />
      }

      @if (state() === 'failed') {
        <p appAlert class="mt-4">No hemos podido cambiar los avisos. Inténtalo de nuevo.</p>
      }

      <p class="mt-5">
        <app-ko-fi-link standalone>Invítame a un café</app-ko-fi-link>
      </p>
    </app-bottom-sheet>
  `,
})
export class PushPreferencesMock {
  readonly open = input.required<boolean>();
  readonly pref = input.required<PrefOption>();
  readonly state = input.required<ToggleState>();
  /** Whether the device can install SecretMatch, so "Instalar la app" shows too. */
  readonly installRow = input.required<boolean>();
  readonly closed = output();
  /** The switch, or the other choice row: the page simulates the round trip. */
  readonly toggle = output();

  protected readonly themePreference = inject(ThemePreference);
  protected readonly themes = THEMES;
  protected readonly languages = LANGUAGES;
  protected readonly pushOptions = PUSH_OPTIONS;
  protected readonly row = ROW;

  protected readonly shown = computed(() => this.state() !== 'hidden');
  protected readonly working = computed(
    () => this.state() === 'activating' || this.state() === 'deactivating',
  );
  /** What the switch shows: during a change it stays on the previous value; a failure keeps it off. */
  protected readonly switchOn = computed(
    () => this.state() === 'on' || this.state() === 'deactivating',
  );
  protected readonly pending = computed<'on' | 'off' | null>(() =>
    this.state() === 'activating' ? 'on' : this.state() === 'deactivating' ? 'off' : null,
  );
  protected readonly hint = computed(() => {
    switch (this.state()) {
      case 'on':
        return 'Mensajes nuevos y el sorteo.';
      case 'denied':
        return 'Bloqueados en este navegador: actívalos en los ajustes del sitio.';
      default:
        return undefined;
    }
  });
}
