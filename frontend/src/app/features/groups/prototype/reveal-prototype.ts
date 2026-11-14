/**
 * PROTOTYPE — throwaway, never ships (#30). Three structurally different Reveals of the Receiver
 * ("open the envelope") on one dev-only route, switchable with `?variant=A|B|C` and the floating
 * bar at the bottom (← → too):
 *
 *   A · Sobre en la tarjeta   B · Escenario a pantalla completa   C · La tarjeta es el sobre
 *
 * Stub data in memory only; no API calls. The bar switches the Draw state, first vs returning
 * visit, Admin vs Member, finished Group, short vs long name, simulated reduced motion (the real
 * OS `prefers-reduced-motion` is honoured too) and light/dark. The live phase is shown in the bar.
 * Keyframes live in this file's styles; `styles.css` is untouched.
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideGift,
  LucideMoon,
  LucideRotateCcw,
  LucideShuffle,
  LucideSun,
  LucideUndo2,
} from '@lucide/angular';
import { AppShell } from '../../../shared/ui/app-shell/app-shell';
import { Alert } from '../../../shared/ui/alert/alert';
import { Button } from '../../../shared/ui/button/button';
import { ConfirmPanel } from '../../../shared/ui/confirm-panel/confirm-panel';
import { TextLink } from '../../../shared/ui/text-link/text-link';

// ─── Stub state ─────────────────────────────────────────────────────────────────────────────────

type DataState = 'loading' | 'failed' | 'not-drawn' | 'drawn';
type Phase = 'closed' | 'opening' | 'revealed';
type Visit = 'first' | 'returning';

const DATA_STATES: readonly DataState[] = ['loading', 'failed', 'not-drawn', 'drawn'];
const SHORT_NAME = 'Lucía';
const LONG_NAME = 'María de los Ángeles Fernández-Villaverde';

const osReducedQuery =
  typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

const store = {
  data: signal<DataState>('drawn'),
  /** Stands in for the per-device localStorage "already opened" flag; absent = first visit. */
  visit: signal<Visit>('first'),
  admin: signal(false),
  finished: signal(false),
  longName: signal(false),
  simReduced: signal(false),
  osReduced: signal(osReducedQuery?.matches ?? false),
  phase: signal<Phase>('closed'),
  /** Bumped to remount the variant (reset, visit change, variant change). */
  mount: signal(0),
};
osReducedQuery?.addEventListener('change', (e) => store.osReduced.set(e.matches));

const reduced = computed(() => store.simReduced() || store.osReduced());
const receiverName = computed(() => (store.longName() ? LONG_NAME : SHORT_NAME));

function focusById(id: string): void {
  setTimeout(() => document.getElementById(id)?.focus(), 0);
}

/** Shared phase handling: closed → opening (timed) → revealed, skippable, reduced-motion aware. */
abstract class RevealBase {
  protected readonly s = store;
  protected readonly name = receiverName;
  protected readonly phase = store.phase;
  /** Whether the revealed view plays its entrance (false on a returning visit or after a skip). */
  protected readonly animateIn = signal(false);
  protected abstract readonly openingMs: number;
  protected abstract readonly nameId: string;
  protected timer?: ReturnType<typeof setTimeout>;

  constructor() {
    store.phase.set(store.visit() === 'returning' ? 'revealed' : 'closed');
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected open(): void {
    clearTimeout(this.timer);
    this.animateIn.set(true);
    if (reduced()) {
      this.reveal();
      return;
    }
    this.phase.set('opening');
    this.timer = setTimeout(() => this.reveal(), this.openingMs);
  }

  protected skip(): void {
    clearTimeout(this.timer);
    this.animateIn.set(false);
    this.reveal();
  }

  protected reveal(): void {
    this.phase.set('revealed');
    focusById(this.nameId);
  }
}

// ─── Shared bits (decoration + unchanged parts of the card) ─────────────────────────────────────

/** Flat CSS envelope: back, letter, front pocket, flap (rotates in 3D) and a mustard wax seal. */
@Component({
  selector: 'proto-envelope',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'aria-hidden': 'true' },
  template: `
    <div
      class="rv-env"
      [class.is-opening]="state() === 'opening'"
      [class.is-open]="state() !== 'closed'"
      [style.width.px]="width()"
      [style.height.px]="width() * 0.66"
      [style.--rv-delay]="delay() + 'ms'"
    >
      <div class="rv-env-back bg-primary-hover"></div>
      @if (letter()) {
        <div class="rv-env-letter bg-surface">
          <i></i><i style="width: 70%"></i><i style="width: 85%"></i>
        </div>
      }
      <div class="rv-env-front"><div class="bg-primary"></div></div>
      <div class="rv-env-flap"><div class="bg-primary"></div></div>
      <div class="rv-env-seal bg-mustard"></div>
    </div>
  `,
})
class Envelope {
  readonly width = input(200);
  readonly state = input<'closed' | 'opening' | 'open'>('closed');
  readonly letter = input(true);
  /** Offset (ms) for the seal → flap → letter sequence. */
  readonly delay = input(0);
}

/** The closed-group note and, for the Admin of a Group not finished, "Anular el sorteo". */
@Component({
  selector: 'proto-draw-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, ConfirmPanel, LucideUndo2],
  host: { class: 'block' },
  template: `
    @if (s.finished()) {
      <p class="mt-4 text-sm text-ink-muted">El grupo ha finalizado.</p>
    } @else {
      <p class="mt-4 text-sm text-ink-muted">
        Con el sorteo hecho, el grupo queda cerrado: ya no entra ni sale nadie.
      </p>
    }
    @if (s.admin() && !s.finished()) {
      @if (confirming()) {
        <app-confirm-panel
          class="mt-4"
          question="¿Anular el sorteo?"
          confirmLabel="Sí, anular"
          returnFocusTo="cancel-draw"
          focusAfterConfirm="group-draw"
          (confirmed)="cancelDraw()"
          (cancelled)="confirming.set(false)"
        >
          Nadie tendrá ya a quién regalar, aunque lo haya visto, y el grupo se volverá a abrir:
          podrá entrar y salir gente y podrás cambiar las exclusiones antes de sortear de nuevo. A
          todos les avisaremos por email.
        </app-confirm-panel>
      } @else {
        <button
          id="cancel-draw"
          type="button"
          appButton="secondary"
          class="mt-4 w-full"
          (click)="confirming.set(true)"
        >
          <svg lucideUndo2 [size]="18"></svg>
          Anular el sorteo
        </button>
      }
    }
  `,
})
class DrawFooter {
  protected readonly s = store;
  protected readonly confirming = signal(false);
  protected cancelDraw(): void {
    store.data.set('not-drawn');
  }
}

/** Today's card for every state other than `drawn` (out of scope, unchanged). */
@Component({
  selector: 'proto-plain-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, LucideGift, LucideShuffle],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-draw" class="rounded-card bg-surface p-5 shadow-card">
      <div class="flex items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink">
          <svg lucideGift [size]="20"></svg>
        </div>
        <h2 id="group-draw" tabindex="-1" class="font-display text-lg font-semibold focus:outline-none">
          Sorteo
        </h2>
      </div>
      @switch (s.data()) {
        @case ('loading') {
          <p role="status" class="mt-4 text-ink-muted">Cargando…</p>
        }
        @case ('failed') {
          <p appAlert class="mt-4">No hemos podido cargar el sorteo. Inténtalo de nuevo.</p>
          <button type="button" appButton="secondary" class="mt-4 w-full" (click)="s.data.set('drawn')">
            Reintentar
          </button>
        }
        @default {
          @if (s.finished()) {
            <p class="mt-4 text-ink-muted">El grupo finalizó sin sorteo.</p>
          } @else if (!s.admin()) {
            <p class="mt-4 text-ink-muted">
              El sorteo aún no está hecho. Te avisaremos por email cuando lo esté.
            </p>
          } @else {
            <p class="mt-4 text-ink-muted">
              Ya sois 6. Cuando estéis todos, haz el sorteo: a cada uno le avisaremos por email.
            </p>
            <button type="button" appButton class="mt-4 w-full" (click)="draw()">
              <svg lucideShuffle [size]="20"></svg>
              Sortear
            </button>
          }
        }
      }
    </section>
  `,
})
class PlainCard {
  protected readonly s = store;
  protected draw(): void {
    store.visit.set('first');
    store.data.set('drawn');
    store.mount.update((m) => m + 1);
  }
}

// ─── Variant A · Envelope in place, inside the draw card ────────────────────────────────────────

@Component({
  selector: 'proto-variant-a',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Envelope, DrawFooter, Button, TextLink, LucideGift, LucideChevronRight, LucideRotateCcw],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-draw" class="rounded-card bg-surface p-5 shadow-card">
      <div class="flex items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink">
          <svg lucideGift [size]="20"></svg>
        </div>
        <h2 id="group-draw" tabindex="-1" class="font-display text-lg font-semibold focus:outline-none">
          Sorteo
        </h2>
      </div>

      <div aria-live="polite" class="sr-only">
        {{ phase() === 'revealed' ? 'Te toca regalar a ' + name() : '' }}
      </div>

      @if (phase() !== 'revealed') {
        <div class="flex flex-col items-center pt-20 text-center">
          <div
            class="cursor-pointer"
            [class.rv-bob]="phase() === 'closed'"
            (click)="phase() === 'closed' ? open() : skip()"
          >
            <proto-envelope [width]="200" [state]="phase() === 'opening' ? 'opening' : 'closed'" />
          </div>
          <p class="mt-6 font-display text-lg font-semibold">Tienes un sobre cerrado</p>
          <p class="mt-1.5 text-ink-muted">Dentro está la persona a la que vas a regalar.</p>
          <button
            id="open-envelope"
            type="button"
            appButton
            class="mt-6 w-full"
            (click)="phase() === 'closed' ? open() : skip()"
          >
            {{ phase() === 'opening' ? 'Saltar animación' : 'Abrir el sobre' }}
          </button>
        </div>
      } @else {
        <div class="mt-6 flex flex-col items-center text-center">
          <div [class.rv-settle]="animateIn()">
            <proto-envelope [width]="120" state="open" [letter]="false" />
          </div>
          <div
            class="relative -mt-10 w-full max-w-sm rounded-field bg-surface px-5 py-6 shadow-card ring-1 ring-line/30"
            [class.rv-grow]="animateIn()"
          >
            <p class="text-ink-muted">Te toca regalar a</p>
            <h3
              id="reveal-name"
              tabindex="-1"
              class="mt-1 font-display text-4xl font-bold tracking-tight break-words hyphens-auto focus:outline-none"
              lang="es"
              [class.rv-rise]="animateIn()"
              style="--d: 260ms"
            >
              {{ name() }}
            </h3>
          </div>
          <div class="w-full" [class.rv-rise]="animateIn()" style="--d: 520ms">
            <p class="mt-5 font-display text-lg font-semibold">¡Ya tienes a tu persona secreta!</p>
            <p class="mt-1.5 text-ink-muted">Nadie más lo sabe. 🤫</p>
            <a appButton href="#" class="mt-6 w-full" (click)="$event.preventDefault()">
              Ver sus deseos
              <svg lucideChevronRight [size]="20"></svg>
            </a>
            <button type="button" appLink standalone class="mt-2 gap-1.5" (click)="open()">
              <svg lucideRotateCcw [size]="16"></svg>
              Volver a abrir el sobre
            </button>
          </div>
        </div>
      }
      <div class="text-left"><proto-draw-footer /></div>
    </section>
  `,
})
class VariantA extends RevealBase {
  protected readonly openingMs = 1150;
  protected readonly nameId = 'reveal-name';
  protected override open(): void {
    super.open();
    if (this.phase() === 'opening') focusById('open-envelope');
  }
}

// ─── Variant B · Full-screen stage (Spotify Wrapped energy) ─────────────────────────────────────

const CONFETTI = [
  { dx: -150, dy: -230, r: 200, cls: 'bg-mustard rounded-full', w: 14 },
  { dx: 140, dy: -250, r: -160, cls: 'bg-sage rounded-sm', w: 16 },
  { dx: -190, dy: -60, r: 120, cls: 'bg-surface rv-tri', w: 18 },
  { dx: 180, dy: -90, r: 260, cls: 'bg-mustard rv-tri', w: 20 },
  { dx: -120, dy: 220, r: -220, cls: 'bg-sage rounded-full', w: 12 },
  { dx: 160, dy: 230, r: 180, cls: 'bg-clay rounded-sm', w: 14 },
  { dx: -40, dy: -300, r: 90, cls: 'bg-clay rounded-full', w: 10 },
  { dx: 60, dy: 300, r: -90, cls: 'bg-mustard rounded-sm', w: 12 },
  { dx: -210, dy: 120, r: 300, cls: 'bg-mustard rounded-full', w: 18 },
  { dx: 210, dy: 80, r: -260, cls: 'bg-sage rv-tri', w: 18 },
  { dx: -90, dy: -170, r: 45, cls: 'bg-surface rounded-full', w: 8 },
  { dx: 100, dy: -180, r: -45, cls: 'bg-clay rv-tri', w: 14 },
  { dx: -170, dy: 280, r: 150, cls: 'bg-surface rounded-sm', w: 10 },
  { dx: 120, dy: 160, r: 30, cls: 'bg-surface rounded-full', w: 9 },
];

@Component({
  selector: 'proto-variant-b',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Envelope, DrawFooter, Button, TextLink, LucideGift, LucideChevronRight, LucideRotateCcw],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-draw" class="rounded-card bg-surface p-5 shadow-card">
      <div class="flex items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink">
          <svg lucideGift [size]="20"></svg>
        </div>
        <h2 id="group-draw" tabindex="-1" class="font-display text-lg font-semibold focus:outline-none">
          Sorteo
        </h2>
      </div>

      @if (!seenInCard()) {
        <div class="mt-4 flex items-center gap-4 rounded-field bg-canvas p-4">
          <proto-envelope class="shrink-0" [width]="56" [letter]="false" />
          <div>
            <p class="font-display text-lg font-semibold">Tu sobre ya ha llegado</p>
            <p class="text-sm text-ink-muted">Ábrelo cuando nadie mire. 🤫</p>
          </div>
        </div>
        <button id="open-envelope" type="button" appButton class="mt-4 w-full" (click)="openStage()">
          Abrir el sobre
        </button>
      } @else {
        <p class="mt-4 text-ink-muted">
          Te toca regalar a
          <strong
            id="b-card-name"
            tabindex="-1"
            class="mt-1 block font-display text-3xl font-bold tracking-tight break-words text-ink focus:outline-none"
          >
            {{ name() }}
          </strong>
        </p>
        <p class="mt-2 text-ink-muted">Nadie más lo sabe. 🤫</p>
        <div class="flex flex-wrap items-center gap-x-6">
          <a appLink standalone href="#" class="mt-2 gap-0.5" (click)="$event.preventDefault()">
            Ver sus deseos
            <svg lucideChevronRight [size]="18"></svg>
          </a>
          <button
            id="replay"
            type="button"
            appLink
            standalone
            class="mt-2 gap-1.5"
            (click)="openStage()"
          >
            <svg lucideRotateCcw [size]="16"></svg>
            Ver el sobre otra vez
          </button>
        </div>
      }
      <proto-draw-footer />
    </section>

    <dialog
      #stage
      aria-label="Tu sobre"
      class="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-primary p-0 text-ink backdrop:bg-scrim"
      (close)="onStageClosed()"
    >
      @if (stageOpen()) {
        <div class="relative flex h-full flex-col items-center justify-center px-6">
          @if (step() === 'intro') {
            <button
              id="stage-skip"
              type="button"
              class="absolute top-4 right-4 min-h-11 px-3 font-display font-semibold text-on-primary underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-on-primary"
              (click)="skipStage()"
            >
              Saltar
            </button>
            <p class="font-display text-3xl font-bold tracking-tight text-on-primary rv-rise">
              Tu sobre ha llegado…
            </p>
            <div class="mt-14 rv-drop">
              <proto-envelope [width]="260" state="opening" [delay]="380" />
            </div>
          } @else {
            <div class="pointer-events-none absolute top-1/2 left-1/2" aria-hidden="true">
              @for (c of confetti; track $index) {
                <span
                  class="absolute block {{ c.cls }}"
                  [class.rv-confetti]="animateIn()"
                  [style.width.px]="c.w"
                  [style.height.px]="c.w"
                  [style.--dx]="c.dx + 'px'"
                  [style.--dy]="c.dy + 'px'"
                  [style.--r]="c.r + 'deg'"
                  [style.transform]="
                    'translate(' + c.dx + 'px,' + c.dy + 'px) rotate(' + c.r + 'deg)'
                  "
                ></span>
              }
            </div>
            <div
              class="relative w-full max-w-md rounded-card bg-surface p-6 text-center shadow-card"
              [class.rv-grow]="animateIn()"
            >
              <p class="font-display text-lg font-semibold">¡Ya tienes a tu persona secreta!</p>
              <p class="mt-5 text-ink-muted">Te toca regalar a</p>
              <h2
                id="stage-name"
                tabindex="-1"
                lang="es"
                class="mt-1 font-display text-4xl font-bold tracking-tight break-words hyphens-auto focus:outline-none"
                [class.rv-rise]="animateIn()"
                style="--d: 280ms"
              >
                {{ name() }}
              </h2>
              <p class="mt-3 text-ink-muted">Nadie más lo sabe. 🤫</p>
              <a appButton href="#" class="mt-6 w-full" (click)="$event.preventDefault()">
                Ver sus deseos
                <svg lucideChevronRight [size]="20"></svg>
              </a>
              <button type="button" appLink standalone class="mt-2" (click)="closeStage()">
                Volver al grupo
              </button>
            </div>
          }
          <div aria-live="polite" class="sr-only">
            {{ step() === 'letter' ? 'Te toca regalar a ' + name() : '' }}
          </div>
        </div>
      }
    </dialog>
  `,
})
class VariantB extends RevealBase {
  protected readonly openingMs = 1450;
  protected readonly nameId = 'stage-name';
  protected readonly confetti = CONFETTI;
  protected readonly stageOpen = signal(false);
  protected readonly step = signal<'intro' | 'letter'>('intro');
  /** The card shows the name once the stage has been seen (or on a returning visit). */
  protected readonly seenInCard = computed(() => this.phase() === 'revealed' && !this.stageOpen());
  private readonly stage = viewChild.required<ElementRef<HTMLDialogElement>>('stage');

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => {
      if (this.stage().nativeElement.open) this.stage().nativeElement.close();
    });
  }

  protected openStage(): void {
    this.stageOpen.set(true);
    this.stage().nativeElement.showModal();
    this.animateIn.set(true);
    clearTimeout(this.timer);
    if (reduced()) {
      this.toLetter();
      return;
    }
    this.step.set('intro');
    this.phase.set('opening');
    focusById('stage-skip');
    this.timer = setTimeout(() => this.toLetter(), this.openingMs);
  }

  protected skipStage(): void {
    clearTimeout(this.timer);
    this.animateIn.set(false);
    this.toLetter();
  }

  private toLetter(): void {
    this.step.set('letter');
    this.reveal();
  }

  protected closeStage(): void {
    this.stage().nativeElement.close();
  }

  /** Escape, "Volver al grupo" or a remount: back to the card, focus on the name. */
  protected onStageClosed(): void {
    clearTimeout(this.timer);
    this.stageOpen.set(false);
    this.phase.set('revealed');
    focusById('b-card-name');
  }
}

// ─── Variant C · The card is the envelope (hold to open) ────────────────────────────────────────

const HOLD_MS = 800;
const RING = 2 * Math.PI * 40;

@Component({
  selector: 'proto-variant-c',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DrawFooter, Button, TextLink, LucideChevronRight],
  host: { class: 'block' },
  template: `
    <div class="rv-c-wrap" [style.padding-top.px]="phase() === 'closed' ? 0 : 112">
      <section
        aria-labelledby="group-draw"
        class="relative rounded-card bg-surface shadow-card"
        style="perspective: 900px"
      >
        <div
          class="rounded-card bg-clay/25 px-5 pb-5"
          [class.pt-44]="phase() === 'closed'"
          [class.pt-5]="phase() !== 'closed'"
        >
          <h2
            id="group-draw"
            tabindex="-1"
            class="font-display text-lg font-semibold focus:outline-none"
            [class]="
              phase() === 'closed'
                ? 'absolute inset-x-0 top-4 z-10 text-center text-on-primary'
                : 'text-ink'
            "
          >
            Sorteo
          </h2>

          <div aria-live="polite" class="sr-only">
            {{ phase() === 'revealed' ? 'Te toca regalar a ' + name() : '' }}
          </div>

          @if (phase() === 'closed') {
            <div class="text-center">
              <p class="font-display text-lg font-semibold">Tienes un sobre cerrado</p>
              <p class="mt-1.5 text-ink-muted">Mantén pulsado el sello para abrirlo.</p>
              <button type="button" appButton class="mt-6 w-full" (click)="open()">
                Abrir el sobre
              </button>
            </div>
          } @else {
            @if (phase() === 'opening') {
              <button
                id="c-skip"
                type="button"
                appLink
                standalone
                class="absolute top-3 right-5"
                (click)="skip()"
              >
                Saltar
              </button>
            }
            <div
              class="mt-4 rounded-field bg-surface px-5 py-6 text-center shadow-card"
              [class.rv-letter-up]="animateIn()"
            >
              <p class="text-ink-muted">Te toca regalar a</p>
              <h3
                id="c-name"
                tabindex="-1"
                lang="es"
                class="mt-1 font-display text-4xl font-bold tracking-tight break-words hyphens-auto focus:outline-none"
                [class.rv-rise]="animateIn()"
                style="--d: 700ms"
              >
                {{ name() }}
              </h3>
            </div>
            <div [class.rv-unfold]="animateIn()" style="--d: 1000ms">
              <p class="mt-4 text-ink-muted">¡Ya tienes a tu persona secreta! Nadie más lo sabe. 🤫</p>
              <a appLink standalone href="#" class="mt-2 gap-0.5" (click)="$event.preventDefault()">
                Ver sus deseos
                <svg lucideChevronRight [size]="18"></svg>
              </a>
            </div>
          }
          <div [class.rv-unfold]="animateIn() && phase() !== 'closed'" style="--d: 1150ms">
            <proto-draw-footer />
          </div>
        </div>

        <div
          class="rv-c-flap pointer-events-none absolute inset-x-0 top-0 h-28"
          [class.is-open]="phase() !== 'closed'"
          [class.rv-c-flap-anim]="animateIn() && phase() !== 'closed'"
          aria-hidden="true"
        >
          <div class="rv-c-flap-shape absolute inset-0 rounded-t-card bg-primary"></div>
        </div>

        @if (phase() === 'closed') {
          <button
            type="button"
            aria-label="Mantén pulsado para abrir el sobre"
            class="absolute top-28 left-1/2 z-20 flex size-18 items-center justify-center rounded-full bg-mustard font-display text-2xl font-bold text-ink shadow-card select-none focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary"
            style="touch-action: none; -webkit-touch-callout: none"
            [style.transform]="'translate(-50%, -50%) scale(' + (1 - progress() * 0.08) + ')'"
            (pointerdown)="startHold($event)"
            (pointerup)="endHold()"
            (pointerleave)="endHold()"
            (pointercancel)="endHold()"
            (contextmenu)="$event.preventDefault()"
            (click)="sealClick($event)"
          >
            <svg class="pointer-events-none absolute -inset-2 size-22 -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
              <circle cx="44" cy="44" r="40" fill="none" class="stroke-surface" stroke-width="5" />
              <circle
                cx="44"
                cy="44"
                r="40"
                fill="none"
                class="stroke-ink"
                stroke-width="5"
                stroke-linecap="round"
                [attr.stroke-dasharray]="ring"
                [attr.stroke-dashoffset]="ring * (1 - progress())"
              />
            </svg>
            <span aria-hidden="true">S</span>
          </button>
        }
      </section>
    </div>
  `,
})
class VariantC extends RevealBase {
  protected readonly openingMs = 1300;
  protected readonly nameId = 'c-name';
  protected readonly ring = RING;
  protected readonly progress = signal(0);
  private holdStart = 0;
  private raf = 0;

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.raf));
  }

  protected override open(): void {
    super.open();
    if (this.phase() === 'opening') focusById('c-skip');
  }

  protected startHold(e: PointerEvent): void {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    this.holdStart = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - this.holdStart) / HOLD_MS);
      this.progress.set(p);
      if (p >= 1) {
        this.progress.set(0);
        this.open();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  protected endHold(): void {
    cancelAnimationFrame(this.raf);
    this.progress.set(0);
  }

  /** Enter/Space on the seal (a click with no pointer) opens at once; a tap must be held. */
  protected sealClick(e: MouseEvent): void {
    if (e.detail === 0) this.open();
  }
}

// ─── Switcher ───────────────────────────────────────────────────────────────────────────────────

const VARIANTS = [
  { key: 'A', name: 'Sobre en la tarjeta' },
  { key: 'B', name: 'Escenario a pantalla completa' },
  { key: 'C', name: 'La tarjeta es el sobre' },
] as const;

const LIGHT = `
  --color-canvas: #fbf3e9; --color-surface: #ffffff; --color-field: #f6ede3; --color-subtle: #f3e4d3;
  --color-ink: #3b2219; --color-ink-muted: #6e5146; --color-line: #9c7f6e;
  --color-primary: #b5502f; --color-primary-hover: #9c4227; --color-on-primary: #ffffff;
  --color-success: #3e6b3a; --color-success-soft: #e3eee0; --color-danger: #a12c1f; --color-danger-soft: #fbe3dd;
  --color-mustard: #e9b44c; --color-sage: #a9c3a3; --color-sage-soft: #d6e4d2; --color-clay: #e8a486;
  --color-scrim: rgb(59 34 25 / 0.55);
  --shadow-card: 0 2px 4px rgb(59 34 25 / 0.06), 0 24px 48px -16px rgb(59 34 25 / 0.28);
`;
const DARK = `
  --color-canvas: #22160f; --color-surface: #301f16; --color-field: #3e2a1f; --color-subtle: #3e2a1f;
  --color-ink: #fbf0e4; --color-ink-muted: #d3bba8; --color-line: #8c6e5c;
  --color-primary: #e98a63; --color-primary-hover: #f0a07f; --color-on-primary: #22160f;
  --color-success: #a9c3a3; --color-success-soft: #2f3d2b; --color-danger: #ff9c85; --color-danger-soft: #4a2018;
  --color-mustard: #d9a23e; --color-sage: #55704f; --color-sage-soft: #45573f; --color-clay: #8a4a33;
  --color-scrim: rgb(0 0 0 / 0.65);
  --shadow-card: 0 2px 4px rgb(0 0 0 / 0.3), 0 24px 48px -16px rgb(0 0 0 / 0.7);
`;

@Component({
  selector: 'app-reveal-prototype',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    AppShell,
    PlainCard,
    VariantA,
    VariantB,
    VariantC,
    LucideChevronLeft,
    LucideChevronRight,
    LucideMoon,
    LucideSun,
    LucideRotateCcw,
  ],
  styles: `
    html.proto-light { color-scheme: light; ${LIGHT} }
    html.proto-dark { color-scheme: dark; ${DARK} }

    /* ── Envelope ── */
    .rv-env { position: relative; perspective: 700px; }
    .rv-env > * { position: absolute; }
    .rv-env-back { inset: 0; border-radius: 10px; }
    .rv-env-letter {
      left: 8%; right: 8%; top: 6%; bottom: 6%; z-index: 2; border-radius: 6px;
      padding: 12% 10%; display: flex; flex-direction: column; gap: 9%;
    }
    .rv-env-letter i { display: block; height: 6px; border-radius: 3px; background: var(--color-line); opacity: .4; }
    .rv-env-front { inset: 0; z-index: 3; filter: drop-shadow(0 -2px 0 rgb(0 0 0 / .12)); }
    .rv-env-front > div {
      position: absolute; inset: 0; border-radius: 10px;
      clip-path: polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%);
    }
    .rv-env-flap {
      left: 0; right: 0; top: 0; height: 58%; z-index: 4; transform-origin: 50% 0;
      filter: drop-shadow(0 2px 1px rgb(0 0 0 / .2));
    }
    .rv-env-flap > div {
      position: absolute; inset: 0; border-radius: 10px 10px 0 0;
      clip-path: polygon(0 0, 100% 0, 50% 100%);
    }
    .rv-env-seal {
      left: 50%; top: 58%; width: 18%; aspect-ratio: 1; border-radius: 9999px; z-index: 5;
      transform: translate(-50%, -50%); box-shadow: inset 0 0 0 3px rgb(0 0 0 / .1);
    }
    .rv-env.is-open .rv-env-flap { transform: rotateX(180deg); z-index: 1; }
    .rv-env.is-open .rv-env-seal { opacity: 0; }
    .rv-env.is-open .rv-env-letter { transform: translateY(-48%); }

    .proto-motion .rv-env.is-opening .rv-env-seal {
      animation: rv-seal-pop 280ms var(--rv-delay, 0ms) ease-in both;
    }
    .proto-motion .rv-env.is-opening .rv-env-flap {
      animation: rv-flap 480ms calc(var(--rv-delay, 0ms) + 200ms) cubic-bezier(.4, 0, .2, 1) both;
    }
    .proto-motion .rv-env.is-opening .rv-env-letter {
      animation: rv-letter 560ms calc(var(--rv-delay, 0ms) + 560ms) cubic-bezier(.2, .8, .2, 1) both;
    }

    /* ── Entrances (motion) ── */
    .proto-motion .rv-bob { animation: rv-bob 3s ease-in-out infinite; }
    .proto-motion .rv-settle { animation: rv-settle 620ms cubic-bezier(.2, .8, .2, 1) both; }
    .proto-motion .rv-grow { animation: rv-grow 560ms cubic-bezier(.2, .8, .2, 1) both; }
    .proto-motion .rv-rise { animation: rv-rise 440ms var(--d, 0ms) cubic-bezier(.2, .8, .2, 1) both; }
    .proto-motion .rv-drop { animation: rv-drop 420ms cubic-bezier(.3, 1.3, .5, 1) both; }
    .proto-motion .rv-confetti { animation: rv-confetti 900ms 80ms cubic-bezier(.1, .9, .3, 1) both; }
    .proto-motion .rv-letter-up { animation: rv-letter-up 700ms 380ms cubic-bezier(.2, .8, .2, 1) both; }
    .proto-motion .rv-unfold { animation: rv-unfold 460ms var(--d, 0ms) cubic-bezier(.2, .8, .2, 1) both; }
    .proto-motion .rv-c-wrap { transition: padding-top 600ms cubic-bezier(.4, 0, .2, 1); }
    .proto-motion .rv-c-flap-anim { animation: rv-c-flap 620ms cubic-bezier(.4, 0, .2, 1) both; }

    /* ── Reduced motion: same states, a plain crossfade, no movement ── */
    .proto-still :is(.rv-settle, .rv-grow, .rv-rise, .rv-letter-up, .rv-unfold, .rv-confetti) {
      animation: rv-fade 220ms ease-out both;
    }

    /* ── Variant C flap (the card's top edge) ── */
    .rv-c-flap { transform-origin: 50% 0; z-index: 5; filter: drop-shadow(0 3px 2px rgb(0 0 0 / .18)); }
    .rv-c-flap-shape { clip-path: polygon(0 0, 100% 0, 50% 100%); }
    .rv-c-flap.is-open { transform: rotateX(180deg); }
    .rv-tri { clip-path: polygon(50% 0, 100% 100%, 0 100%); }

    @keyframes rv-seal-pop {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      45% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    }
    @keyframes rv-flap {
      0% { transform: rotateX(0); z-index: 4; }
      50% { z-index: 4; }
      51% { z-index: 1; }
      100% { transform: rotateX(180deg); z-index: 1; }
    }
    @keyframes rv-letter { from { transform: translateY(0); } to { transform: translateY(-48%); } }
    @keyframes rv-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes rv-settle { from { transform: translateY(40px) scale(1.66); } to { transform: none; } }
    @keyframes rv-grow {
      from { opacity: 0; transform: translateY(60px) scale(.55); }
      55% { opacity: 1; }
      to { opacity: 1; transform: none; }
    }
    @keyframes rv-rise {
      from { opacity: 0; transform: translateY(12px) scale(.96); }
      to { opacity: 1; transform: none; }
    }
    @keyframes rv-drop {
      from { transform: translateY(-70vh) rotate(-10deg); }
      to { transform: none; }
    }
    @keyframes rv-confetti {
      from { transform: translate(0, 0) rotate(0) scale(.2); opacity: 0; }
      15% { opacity: 1; }
      to { transform: translate(var(--dx), var(--dy)) rotate(var(--r)) scale(1); opacity: 1; }
    }
    @keyframes rv-letter-up {
      from { opacity: 0; transform: translateY(90px); }
      30% { opacity: 1; }
      to { opacity: 1; transform: none; }
    }
    @keyframes rv-unfold {
      from { opacity: 0; transform: translateY(-8px); clip-path: inset(0 0 100% 0); }
      to { opacity: 1; transform: none; clip-path: inset(0 0 0 0); }
    }
    @keyframes rv-c-flap { from { transform: rotateX(0); } to { transform: rotateX(180deg); } }
    @keyframes rv-fade { from { opacity: 0; } to { opacity: 1; } }
  `,
  template: `
    <app-shell>
      <div [class.proto-motion]="!reduced()" [class.proto-still]="reduced()">
        @if (s.data() !== 'drawn') {
          <proto-plain-card />
        } @else {
          @for (k of [mountKey()]; track k) {
            @switch (variant().key) {
              @case ('A') { <proto-variant-a /> }
              @case ('B') { <proto-variant-b /> }
              @case ('C') { <proto-variant-c /> }
            }
          }
        }
        <section class="mt-6 rounded-card bg-surface p-5 opacity-60 shadow-card" aria-hidden="true">
          <p class="font-display text-lg font-semibold">Miembros</p>
          <p class="mt-2 text-sm text-ink-muted">(resto de la página del grupo, de relleno)</p>
        </section>
      </div>
      <div [style.height.px]="barOpen() ? 220 : 72"></div>
    </app-shell>

    <div class="fixed inset-x-0 bottom-3 z-50 flex justify-center px-3" style="font-family: ui-sans-serif, system-ui">
      <div
        class="flex max-w-3xl flex-wrap items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs shadow-2xl"
        style="background: #111; color: #fff"
      >
        <button type="button" aria-label="Variante anterior" (click)="cycle(-1)" class="rounded-lg px-2 py-1" style="background: #333">
          <svg lucideChevronLeft [size]="16"></svg>
        </button>
        <span class="min-w-40 text-center text-sm font-semibold">{{ variant().key }} · {{ variant().name }}</span>
        <button type="button" aria-label="Variante siguiente" (click)="cycle(1)" class="rounded-lg px-2 py-1" style="background: #333">
          <svg lucideChevronRight [size]="16"></svg>
        </button>
        <span class="rounded-lg px-2 py-1 font-mono" style="background: #2a2a2a; color: #e9b44c">
          {{ s.data() === 'drawn' ? s.phase() : s.data() }}
        </span>
        <button type="button" (click)="barOpen.set(!barOpen())" class="rounded-lg px-2 py-1" style="background: #333">
          {{ barOpen() ? '▾' : '▸ más' }}
        </button>
        @if (barOpen()) {
          <span class="basis-full"></span>
          <select aria-label="Estado del sorteo" class="rounded-lg px-2 py-1" style="background: #333; color: #fff"
            [value]="s.data()" (change)="setData($any($event.target).value)">
            @for (d of dataStates; track d) { <option [value]="d">{{ d }}</option> }
          </select>
          <select aria-label="Visita" class="rounded-lg px-2 py-1" style="background: #333; color: #fff"
            [value]="s.visit()" (change)="setVisit($any($event.target).value)">
            <option value="first">1ª visita (cerrado)</option>
            <option value="returning">vuelve (ya abierto)</option>
          </select>
          <button type="button" (click)="s.admin.set(!s.admin())" class="rounded-lg px-2 py-1" style="background: #333">
            {{ s.admin() ? 'Admin' : 'Miembro' }}
          </button>
          <button type="button" (click)="s.finished.set(!s.finished())" class="rounded-lg px-2 py-1" style="background: #333">
            {{ s.finished() ? 'Finalizado' : 'Activo' }}
          </button>
          <button type="button" (click)="s.longName.set(!s.longName())" class="rounded-lg px-2 py-1" style="background: #333">
            Nombre {{ s.longName() ? 'largo' : 'corto' }}
          </button>
          <button type="button" (click)="s.simReduced.set(!s.simReduced())" class="rounded-lg px-2 py-1"
            [style.background]="reduced() ? '#7a5b16' : '#333'">
            Movimiento: {{ reduced() ? 'reducido' : 'normal' }}{{ s.osReduced() ? ' (SO)' : '' }}
          </button>
          <button type="button" (click)="toggleTheme()" class="flex items-center gap-1 rounded-lg px-2 py-1" style="background: #333">
            @if (dark()) { <svg lucideSun [size]="14"></svg> Claro } @else { <svg lucideMoon [size]="14"></svg> Oscuro }
          </button>
          <button type="button" (click)="remount()" class="flex items-center gap-1 rounded-lg px-2 py-1" style="background: #333">
            <svg lucideRotateCcw [size]="14"></svg> Reiniciar
          </button>
        }
      </div>
    </div>
  `,
})
export class RevealPrototype implements OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly s = store;
  protected readonly reduced = reduced;
  protected readonly dataStates = DATA_STATES;
  protected readonly mountKey = store.mount;
  protected readonly barOpen = signal(true);
  protected readonly variant = computed(
    () => VARIANTS.find((v) => v.key === this.params().get('variant')) ?? VARIANTS[0],
  );
  protected readonly dark = signal(
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  );

  constructor() {
    this.applyTheme();
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('proto-dark', 'proto-light');
  }

  protected cycle(step: number): void {
    const i = VARIANTS.findIndex((v) => v.key === this.variant().key);
    const key = VARIANTS[(i + step + VARIANTS.length) % VARIANTS.length].key;
    void this.router.navigate([], {
      queryParams: { variant: key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.remount();
  }
  protected setData(d: DataState): void {
    store.data.set(d);
    this.remount();
  }
  protected setVisit(v: Visit): void {
    store.visit.set(v);
    this.remount();
  }
  protected remount(): void {
    store.mount.update((m) => m + 1);
  }
  protected toggleTheme(): void {
    this.dark.update((d) => !d);
    this.applyTheme();
  }
  private applyTheme(): void {
    const root = document.documentElement.classList;
    root.toggle('proto-dark', this.dark());
    root.toggle('proto-light', !this.dark());
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable], dialog')) return;
    if (e.key === 'ArrowLeft') this.cycle(-1);
    if (e.key === 'ArrowRight') this.cycle(1);
  }
}
