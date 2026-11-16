// PROTOTYPE (#118), throwaway: the floating control bar. Not part of the design being judged.
import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import {
  InstallPrototypeState,
  Platform,
  SuggestionShow,
  Variant,
  VARIANT_NAMES,
} from './install-prototype-state';

const PLATFORMS: readonly Platform[] = ['chromium-prompt', 'ios', 'installed', 'unsupported'];
const SHOWS: readonly { value: SuggestionShow; label: string }[] = [
  { value: 'hidden', label: 'oculta' },
  { value: 'first', label: '1ª vez' },
  { value: 'second', label: '2ª vez' },
];

@Component({
  selector: 'app-prototype-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonPipe],
  template: `
    @if (collapsed()) {
      <button
        type="button"
        class="fixed top-1/2 right-0 z-50 -translate-y-1/2 rounded-l-field bg-ink px-2 py-3 font-mono text-xs font-bold text-canvas shadow-card"
        (click)="collapsed.set(false)"
      >
        {{ variant() }}<br />◂
      </button>
    } @else {
      <div
        class="fixed bottom-3 left-1/2 z-50 flex w-max max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-col gap-1.5 rounded-field bg-ink p-2 font-mono text-xs text-canvas shadow-card"
      >
        <div class="flex items-center gap-2">
          <button
            type="button"
            [class]="chip(false)"
            aria-label="Variante anterior"
            (click)="step.emit(-1)"
          >
            ←
          </button>
          <span class="flex-1 text-center font-bold">{{ variant() }} · {{ names[variant()] }}</span>
          <button
            type="button"
            [class]="chip(false)"
            aria-label="Variante siguiente"
            (click)="step.emit(1)"
          >
            →
          </button>
          <button
            type="button"
            [class]="chip(false)"
            title="Ocultar la barra"
            (click)="collapsed.set(true)"
          >
            ▸
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-1">
          <span class="opacity-70">plataforma</span>
          @for (p of platforms; track p) {
            <button
              type="button"
              [class]="chip(state.platform() === p)"
              (click)="state.setPlatform(p)"
            >
              {{ p }}
            </button>
          }
        </div>
        <div class="flex flex-wrap items-center gap-1">
          <span class="opacity-70">sugerencia</span>
          @for (s of shows; track s.value) {
            <button
              type="button"
              [class]="chip(state.show() === s.value)"
              (click)="state.setShow(s.value)"
            >
              {{ s.label }}
            </button>
          }
          <span class="mx-1 opacity-40">|</span>
          <button
            type="button"
            [class]="chip(state.prefsOpen())"
            (click)="state.prefsOpen.set(true)"
          >
            abrir Preferencias
          </button>
          <span class="mx-1 opacity-40">|</span>
          <button
            type="button"
            [class]="chip(state.theme() === 'light')"
            (click)="state.theme.set('light')"
          >
            claro
          </button>
          <button
            type="button"
            [class]="chip(state.theme() === 'dark')"
            (click)="state.theme.set('dark')"
          >
            oscuro
          </button>
        </div>
        <div class="opacity-80">
          localStorage {{ state.stored() | json }} · entrada:
          {{ state.entryVisible() ? 'sí' : 'no' }} · sugerencia:
          {{ state.suggestionVisible() ? 'visible' : 'no' }} · {{ state.lastEvent() }}
        </div>
      </div>
    }
  `,
})
export class PrototypeBar {
  readonly variant = input.required<Variant>();
  /** -1 / +1: the page moves to the previous / next variant. */
  readonly step = output<number>();

  protected readonly state = inject(InstallPrototypeState);
  protected readonly names = VARIANT_NAMES;
  protected readonly platforms = PLATFORMS;
  protected readonly shows = SHOWS;
  protected readonly collapsed = signal(false);

  protected chip(on: boolean): string {
    return `rounded-full px-2 py-1 ${on ? 'bg-canvas text-ink font-bold' : 'hover:bg-ink-muted'}`;
  }
}
