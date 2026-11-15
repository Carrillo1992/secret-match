import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { Envelope, EnvelopeState } from '../../../../shared/ui/envelope/envelope';

/** How long the opening plays before the example name shows: the seal, the flap, the letter. */
const OPENING_MS = 1200;

/**
 * The landing's playable Reveal (#115): the flat envelope with an example Receiver inside, opened
 * and closed again by a button. A demo, not the Reveal itself, so it keeps nothing and moves no
 * focus; the name is announced through a polite live region. With reduced motion it opens still.
 */
@Component({
  selector: 'app-envelope-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Envelope],
  host: { class: 'flex flex-col items-center gap-4' },
  template: `
    <app-envelope class="w-56" [state]="state()" />
    <div aria-live="polite" class="min-h-24 text-center">
      @if (state() === 'open') {
        <p class="motion-safe:animate-reveal-name">
          <span class="text-ink-muted" i18n>Te toca regalar a</span>{{ ' '
          }}<span class="block font-display text-3xl font-bold tracking-tight">Marta</span>
        </p>
        <p class="mt-1 motion-safe:animate-reveal-rest" i18n>¡Ya tienes a tu persona secreta! 🤫</p>
      }
    </div>
    <button type="button" appButton="secondary" (click)="toggle()">
      @if (state() === 'closed') {
        <ng-container i18n>Abrir el sobre</ng-container>
      } @else {
        <ng-container i18n>Volver a cerrarlo</ng-container>
      }
    </button>
  `,
})
export class EnvelopeDemo {
  protected readonly state = signal<EnvelopeState>('closed');
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected toggle(): void {
    clearTimeout(this.timer);
    if (this.state() !== 'closed') {
      this.state.set('closed');
    } else if (prefersReducedMotion()) {
      this.state.set('open');
    } else {
      this.state.set('opening');
      this.timer = setTimeout(() => this.state.set('open'), OPENING_MS);
    }
  }
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
