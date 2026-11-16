// PROTOTYPE (#118), throwaway: a copy of app-preferences-menu's sheet (Tema, Idioma, Ko-fi) with
// the "Instalar la app" entry added per variant. The real menu is untouched.
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import {
  LucideChevronRight,
  LucideLanguages,
  LucideMonitor,
  LucideMoon,
  LucideSmartphone,
  LucideSun,
} from '@lucide/angular';
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet';
import { ChoiceOption, ChoiceRows } from '../../../shared/ui/choice-rows/choice-rows';
import { KoFiLink } from '../../../shared/ui/ko-fi-link/ko-fi-link';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { focusSoon, InstallPrototypeState, ProtoTheme, Variant } from './install-prototype-state';
import { ProtoGuideWell } from './proto-guide-well';

const THEMES: readonly ChoiceOption<ProtoTheme>[] = [
  { value: 'system', label: 'Sistema', icon: LucideMonitor },
  { value: 'light', label: 'Claro', icon: LucideSun },
  { value: 'dark', label: 'Oscuro', icon: LucideMoon },
];

const LANGUAGES: readonly ChoiceOption<'es' | 'en'>[] = [
  { value: 'es', label: 'Español', icon: LucideLanguages, lang: 'es' },
  { value: 'en', label: 'English', icon: LucideLanguages, lang: 'en' },
];

@Component({
  selector: 'app-proto-preferences-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BottomSheet,
    ChoiceRows,
    KoFiLink,
    LucideChevronRight,
    LucideSmartphone,
    ProtoGuideWell,
    TextLink,
  ],
  template: `
    <app-bottom-sheet heading="Preferencias" [open]="state.prefsOpen()" (closed)="close()">
      <app-choice-rows
        class="mt-5"
        label="Tema"
        [options]="themes"
        [selected]="state.theme()"
        (chosen)="state.theme.set($event)"
      />
      <app-choice-rows
        class="mt-5"
        label="Idioma"
        hint="También se usa en tus emails."
        [options]="languages"
        [selected]="language()"
        (chosen)="language.set($event)"
      />

      @if (state.entryVisible()) {
        @if (variant() === 'B') {
          <p class="mt-5 font-display text-sm font-semibold text-ink-muted" id="proto-app-label">
            App
          </p>
          <div class="mt-2 overflow-hidden rounded-field bg-canvas">
            <button
              id="proto-entry"
              type="button"
              aria-describedby="proto-app-label"
              class="flex min-h-13 w-full items-center gap-3 px-4 text-left font-semibold text-ink transition-colors duration-200 hover:bg-subtle focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-primary"
              (click)="install()"
            >
              <svg lucideSmartphone [size]="20"></svg>
              <span class="flex-1">Instalar la app</span>
              <svg lucideChevronRight [size]="20" class="text-ink-muted"></svg>
            </button>
          </div>
        } @else {
          <p class="mt-5">
            <button
              id="proto-entry"
              type="button"
              appLink
              standalone
              class="gap-1.5"
              [attr.aria-expanded]="
                variant() === 'A' && state.platform() === 'ios'
                  ? state.inlineGuide() === 'entry'
                  : null
              "
              (click)="install()"
            >
              <svg lucideSmartphone [size]="18" class="shrink-0"></svg>
              Instalar la app
            </button>
          </p>
          @if (variant() === 'A' && state.inlineGuide() === 'entry') {
            <app-proto-guide-well
              class="mt-2"
              headingId="proto-guide-entry"
              (done)="collapseGuide()"
            />
          }
        }
      }

      <p [class]="state.entryVisible() && variant() !== 'B' ? 'mt-1' : 'mt-5'">
        <app-ko-fi-link standalone>Invítame a un café</app-ko-fi-link>
      </p>
    </app-bottom-sheet>
  `,
})
export class ProtoPreferencesSheet {
  readonly variant = input.required<Variant>();

  protected readonly state = inject(InstallPrototypeState);
  protected readonly themes = THEMES;
  protected readonly languages = LANGUAGES;
  protected readonly language = signal<'es' | 'en'>('es');

  protected close(): void {
    this.state.prefsOpen.set(false);
    this.state.inlineGuide.set(null);
    focusSoon('proto-prefs');
  }

  protected install(): void {
    if (this.state.platform() === 'chromium-prompt') {
      this.state.openNative('entry');
      return;
    }
    // iOS: A expands the guide in place; B and C swap this sheet for the guide sheet.
    if (this.variant() === 'A') {
      this.state.inlineGuide.update((open) => (open === 'entry' ? null : 'entry'));
      this.state.lastEvent.set('guía iOS en línea (Preferencias)');
    } else {
      this.state.prefsOpen.set(false);
      this.state.guideSheetFrom.set('entry');
      this.state.lastEvent.set('guía iOS en hoja (desde Preferencias)');
    }
  }

  protected collapseGuide(): void {
    this.state.inlineGuide.set(null);
    focusSoon('proto-entry');
  }
}
