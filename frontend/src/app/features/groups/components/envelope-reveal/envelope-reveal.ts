import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight, LucideRotateCcw } from '@lucide/angular';
import { ReceiverResponse } from '../../../../core/api/generated/models';
import { Button } from '../../../../shared/ui/button/button';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { Envelope } from '../envelope/envelope';

type Phase = 'closed' | 'opening' | 'revealed';

/** How long the seal, flap and letter take together (the `animate-*` tokens in `styles.css`). */
const OPENING_MS = 1150;

/**
 * The Reveal (#30, option A): the Giver opens an envelope inside the draw card to discover their
 * Receiver. Until it is opened the Receiver's name is not in the page at all. The opening can be
 * skipped with the same button, so focus never jumps; with reduced motion it is skipped outright.
 * Once revealed, focus moves to the name and it is announced. An envelope opened before on this
 * device shows open, and can be opened again. Nothing here is ever about the Giver's own Giver.
 */
@Component({
  selector: 'app-envelope-reveal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Envelope, RouterLink, TextLink, LucideChevronRight, LucideRotateCcw],
  host: { class: 'block' },
  template: `
    <div aria-live="polite" class="sr-only">
      @if (phase() === 'revealed') {
        <ng-container i18n>Te toca regalar a {{ receiver().displayName }}</ng-container>
      }
    </div>

    @if (phase() !== 'revealed') {
      <div class="flex flex-col items-center pt-16 text-center">
        <app-envelope
          class="w-50"
          [class]="{ 'motion-safe:animate-bob': phase() === 'closed' }"
          [state]="phase() === 'opening' ? 'opening' : 'closed'"
        />
        <p class="mt-6 font-display text-lg font-semibold" i18n>Tienes un sobre cerrado</p>
        <p class="mt-1.5 text-ink-muted" i18n>Dentro está la persona a la que vas a regalar.</p>
        <button
          #openButton
          type="button"
          appButton
          class="mt-6 w-full"
          (click)="phase() === 'closed' ? open() : skip()"
        >
          @if (phase() === 'opening') {
            <ng-container i18n>Saltar animación</ng-container>
          } @else {
            <ng-container i18n>Abrir el sobre</ng-container>
          }
        </button>
      </div>
    } @else {
      <div class="mt-14 flex flex-col items-center text-center">
        <app-envelope
          class="w-30"
          [class]="{ 'motion-safe:animate-envelope-settle': entrance() }"
          state="open"
          [letter]="false"
        />
        <div
          class="relative -mt-10 w-full max-w-sm rounded-field bg-surface px-5 py-6 shadow-card"
          [class]="{ 'motion-safe:animate-letter-grow': entrance() }"
        >
          <p class="text-ink-muted" i18n>Te toca regalar a</p>
          <h3
            #name
            tabindex="-1"
            class="mt-1 font-display text-4xl font-bold tracking-tight break-words focus:outline-none"
            [class]="{ 'motion-safe:animate-reveal-name': entrance() }"
          >
            {{ receiver().displayName }}
          </h3>
        </div>
        <div class="w-full" [class]="{ 'motion-safe:animate-reveal-rest': entrance() }">
          <p class="mt-5 font-display text-lg font-semibold" i18n>
            ¡Ya tienes a tu persona secreta!
          </p>
          <p class="mt-1.5 text-ink-muted" i18n>Nadie más lo sabe. 🤫</p>
          <a appButton class="mt-6 w-full" [routerLink]="['members', receiver().id, 'wishlist']">
            <ng-container i18n>Ver sus deseos</ng-container>
            <svg lucideChevronRight [size]="20"></svg>
          </a>
          <button type="button" appLink standalone class="mt-2 gap-1.5" (click)="open()">
            <svg lucideRotateCcw [size]="16"></svg>
            <ng-container i18n>Volver a abrir el sobre</ng-container>
          </button>
        </div>
      </div>
    }
  `,
})
export class EnvelopeReveal {
  readonly receiver = input.required<ReceiverResponse>();
  /** Whether this device already opened this envelope: then it shows open from the start. */
  readonly alreadyOpened = input(false);
  /** The Giver opened the envelope: the page remembers it for their next visit. */
  readonly opened = output();

  protected readonly phase = linkedSignal<string, Phase>({
    source: () => `${this.receiver().id}|${this.alreadyOpened()}`,
    computation: () => (this.alreadyOpened() ? 'revealed' : 'closed'),
  });
  /** Whether the revealed view plays its entrance: only right after an opening that ran its course. */
  protected readonly entrance = signal(false);

  private readonly openButton = viewChild<ElementRef<HTMLButtonElement>>('openButton');
  private readonly name = viewChild<ElementRef<HTMLElement>>('name');
  private readonly injector = inject(Injector);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected open(): void {
    const replay = this.phase() === 'revealed';
    this.opened.emit();
    if (prefersReducedMotion()) {
      this.reveal(false);
      return;
    }
    this.phase.set('opening');
    this.timer = setTimeout(() => this.reveal(true), OPENING_MS);
    if (replay) {
      afterNextRender(() => this.openButton()?.nativeElement.focus(), { injector: this.injector });
    }
  }

  protected skip(): void {
    this.reveal(false);
  }

  private reveal(entrance: boolean): void {
    clearTimeout(this.timer);
    this.entrance.set(entrance);
    this.phase.set('revealed');
    afterNextRender(() => this.name()?.nativeElement.focus(), { injector: this.injector });
  }
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
