/**
 * PROTOTYPE — throwaway, never ships (#36). Three structurally different variants of the anonymous
 * Mailbox on one route, switchable with `?variant=A|B|C` and the floating bar at the bottom:
 *
 *   A · Tarjeta + página propia   B · Todo en el grupo (pestañas)   C · Una página, dos hilos
 *
 * Stub data in memory only; no API calls. The floating bar also switches the thread state, which
 * Mailbox is open and light/dark, so every state can be judged in both themes.
 */
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideGift,
  LucideMail,
  LucideMoon,
  LucideSearchX,
  LucideSend,
  LucideSun,
} from '@lucide/angular';
import { AppShell } from '../../../shared/ui/app-shell/app-shell';
import { Alert } from '../../../shared/ui/alert/alert';
import { Button } from '../../../shared/ui/button/button';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { StatusHeader } from '../../../shared/ui/status-header/status-header';

// ─── Stub data ──────────────────────────────────────────────────────────────────────────────────

type Side = 'GIVER' | 'RECEIVER';
type MailboxSummary = { id: string; side: Side; receiverDisplayName: string | null };
type Message = { mine: boolean; text: string; sentOn: string; fresh?: boolean };
type ThreadState =
  | 'messages'
  | 'empty'
  | 'loading'
  | 'error'
  | 'sending'
  | 'send-error'
  | 'not-found'
  | 'not-drawn';

const STATES: readonly ThreadState[] = [
  'messages',
  'empty',
  'loading',
  'error',
  'sending',
  'send-error',
  'not-found',
  'not-drawn',
];
const MAX = 1000;

const MAILBOXES: readonly MailboxSummary[] = [
  { id: 'b6f1…', side: 'GIVER', receiverDisplayName: 'Lucía' },
  { id: '0c9e…', side: 'RECEIVER', receiverDisplayName: null },
];

const SEED: Record<Side, Message[]> = {
  GIVER: [
    { mine: true, text: '¡Hola! Soy quien te regala 🤫 ¿Prefieres algo para leer o para la cocina?', sentOn: '2026-12-10' },
    { mine: false, text: 'Uy, qué intriga. Para leer, sin duda. Me encanta la novela negra.', sentOn: '2026-12-10' },
    { mine: true, text: '¿Alguna autora que ya tengas toda?', sentOn: '2026-12-12' },
    { mine: false, text: 'Tengo todo de Dolores Redondo, así que esa no 😅', sentOn: '2026-12-12' },
  ],
  RECEIVER: [
    { mine: false, text: '¿Qué talla de camiseta usas? No preguntes por qué 😇', sentOn: '2026-12-11' },
    { mine: true, text: 'Una M, gracias. ¡Me muero de curiosidad!', sentOn: '2026-12-11' },
    { mine: false, text: 'Perfecto. Paciencia, que ya queda poco.', sentOn: '2026-12-13' },
  ],
};

function title(m: MailboxSummary): string {
  return m.side === 'GIVER' ? `Con ${m.receiverDisplayName}` : 'Tu Giver';
}
function hint(m: MailboxSummary): string {
  return m.side === 'GIVER' ? 'Le regalas tú. No sabrá quién eres.' : 'Quien te regala. Nunca sabrás quién es.';
}
function longDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(iso + 'T00:00:00Z'),
  );
}
type Day = { date: string; label: string; messages: Message[] };
function byDay(messages: Message[]): Day[] {
  const days: Day[] = [];
  for (const m of messages) {
    const last = days.at(-1);
    if (last?.date === m.sentOn) last.messages.push(m);
    else days.push({ date: m.sentOn, label: longDate(m.sentOn), messages: [m] });
  }
  return days;
}

/** Shared in-memory store for all variants, so switching variant keeps the conversation. */
class Store {
  readonly state = signal<ThreadState>('messages');
  readonly threads = signal<Record<Side, Message[]>>({ GIVER: [...SEED.GIVER], RECEIVER: [...SEED.RECEIVER] });
  readonly drafts = signal<Record<Side, string>>({ GIVER: '', RECEIVER: '' });

  messages(side: Side): Message[] {
    return this.state() === 'empty' ? [] : this.threads()[side];
  }
  send(side: Side, text: string): void {
    const today = '2026-12-14';
    this.threads.update((t) => ({ ...t, [side]: [...t[side], { mine: true, text, sentOn: today, fresh: true }] }));
    this.drafts.update((d) => ({ ...d, [side]: '' }));
    if (this.state() === 'empty') this.state.set('messages');
  }
}
const store = new Store();

// ─── Shared building blocks (the new patterns: bubble, date separator, composer) ───────────────

@Component({
  selector: 'proto-thread',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, LucideMail],
  host: { class: 'block' },
  template: `
    @switch (state()) {
      @case ('loading') {
        <p role="status" class="py-8 text-center text-ink-muted">Cargando mensajes…</p>
      }
      @case ('error') {
        <p appAlert>No hemos podido cargar los mensajes. Inténtalo de nuevo.</p>
        <button type="button" appButton="secondary" class="mt-4 w-full">Reintentar</button>
      }
      @default {
        @if (days().length === 0) {
          <div class="flex flex-col items-center py-6 text-center">
            <svg viewBox="0 0 120 90" class="h-20 w-28" aria-hidden="true">
              <circle cx="96" cy="22" r="16" class="fill-mustard" />
              <ellipse cx="18" cy="76" rx="26" ry="16" class="fill-sage" />
              <g class="motion-safe:animate-bob">
                <rect x="28" y="28" width="64" height="44" rx="8" class="fill-primary" />
                <path d="M30 32 L60 54 L90 32" class="fill-none stroke-on-primary" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
              </g>
            </svg>
            <p class="mt-3 font-display text-lg font-semibold">Aún no hay mensajes</p>
            <p class="mt-1.5 max-w-xs text-ink-muted">
              @if (side() === 'GIVER') {
                Pregúntale lo que quieras: no sabrá que eres tú. 🤫
              } @else {
                Escribe a quien te regala: lo leerá sin que sepas quién es.
              }
            </p>
          </div>
        } @else {
          <ol class="flex flex-col gap-2" aria-label="Mensajes">
            @for (day of days(); track day.date) {
              <li class="my-2 flex items-center gap-3" aria-hidden="false">
                <span class="h-px flex-1 bg-line/60"></span>
                <span class="text-sm text-ink-muted">{{ day.label }}</span>
                <span class="h-px flex-1 bg-line/60"></span>
              </li>
              @for (m of day.messages; track $index) {
                <li class="flex" [class.justify-end]="m.mine">
                  <p
                    class="max-w-[85%] rounded-card px-4 py-2.5 break-words whitespace-pre-line"
                    [class.bg-primary]="m.mine"
                    [class.text-on-primary]="m.mine"
                    [class.rounded-br-md]="m.mine"
                    [class.bg-subtle]="!m.mine"
                    [class.text-ink]="!m.mine"
                    [class.rounded-bl-md]="!m.mine"
                    [class.motion-safe:animate-pop]="m.fresh"
                  >
                    <span class="sr-only">{{ m.mine ? 'Tú' : otherName() }}: </span>{{ m.text }}
                  </p>
                </li>
              }
            }
          </ol>
        }
      }
    }
  `,
})
class Thread {
  readonly side = input.required<Side>();
  readonly otherName = input.required<string>();
  readonly state = store.state;
  readonly days = computed(() => byDay(store.messages(this.side())));
}

@Component({
  selector: 'proto-composer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, LucideSend],
  host: { class: 'block' },
  template: `
    <form (submit)="$event.preventDefault(); submit()" novalidate>
      <label [for]="id()" class="sr-only">Mensaje</label>
      @if (store.state() === 'send-error') {
        <p appAlert class="mb-3">No se ha enviado. Tu texto sigue aquí: inténtalo otra vez.</p>
      }
      <textarea
        [id]="id()"
        rows="3"
        placeholder="Escribe un mensaje…"
        class="block w-full resize-none rounded-field border border-line bg-field px-4 py-3 text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-2 aria-invalid:border-danger"
        [value]="draft()"
        (input)="onInput($any($event.target).value)"
        [attr.aria-invalid]="error() ? true : null"
        [attr.aria-describedby]="id() + '-hint'"
        [disabled]="sending()"
      ></textarea>
      <div class="mt-2 flex items-center justify-between gap-3">
        <p [id]="id() + '-hint'" class="text-sm" [class.text-ink-muted]="!error()" [class.font-semibold]="!!error()" [class.text-danger]="!!error()">
          @if (error(); as e) { {{ e }} } @else { {{ draft().length }}/{{ max }} }
        </p>
        <button type="submit" appButton="secondary" class="gap-2" [disabled]="sending()">
          <svg lucideSend [size]="18"></svg>
          {{ sending() ? 'Enviando…' : 'Enviar' }}
        </button>
      </div>
    </form>
  `,
})
class Composer {
  readonly side = input.required<Side>();
  readonly id = computed(() => 'composer-' + this.side());
  readonly store = store;
  readonly max = MAX;
  readonly touched = signal(false);
  readonly draft = computed(() => store.drafts()[this.side()]);
  readonly sending = computed(() => store.state() === 'sending');
  readonly error = computed(() => {
    const t = this.draft();
    if (t.length > MAX) return `Te sobran ${t.length - MAX} caracteres (máximo ${MAX}).`;
    if (this.touched() && t.trim() === '') return 'Escribe algo antes de enviar.';
    return null;
  });
  onInput(v: string): void {
    store.drafts.update((d) => ({ ...d, [this.side()]: v }));
    this.touched.set(false);
  }
  submit(): void {
    this.touched.set(true);
    if (this.error() || store.state() === 'send-error') return;
    store.send(this.side(), this.draft().trim());
    this.touched.set(false);
  }
}

/** The part of the group page above the Mailbox entry point, so variants are judged in context. */
@Component({
  selector: 'proto-group-top',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextLink, LucideChevronLeft, LucideChevronRight, LucideGift],
  host: { class: 'block' },
  template: `
    <a appLink standalone class="gap-1" href="javascript:void 0"><svg lucideChevronLeft [size]="18"></svg>Mis grupos</a>
    <h1 class="mt-4 font-display text-3xl font-bold tracking-tight">Navidad en casa de la abuela</h1>
    <section class="mt-6 rounded-card bg-surface p-5 shadow-card">
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-full bg-subtle"><svg lucideGift [size]="20"></svg></div>
        <h2 class="font-display text-lg font-semibold">Sorteo</h2>
      </div>
      @if (drawn()) {
        <p class="mt-4 text-ink-muted">Te toca regalar a
          <strong class="mt-1 block font-display text-3xl font-bold tracking-tight text-ink">Lucía</strong>
        </p>
        <a appLink standalone class="mt-2 gap-0.5" href="javascript:void 0">Ver sus deseos<svg lucideChevronRight [size]="18"></svg></a>
        <ng-content />
      } @else {
        <p class="mt-4 text-ink-muted">El sorteo aún no está hecho. Te avisaremos por email cuando lo esté.</p>
      }
    </section>
  `,
})
class GroupTop {
  readonly drawn = input(true);
}

@Component({
  selector: 'proto-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusHeader, LucideSearchX],
  template: `
    <div class="mt-6">
      <app-status-header><svg lucideSearchX statusIcon [size]="30"></svg>No encontramos este buzón</app-status-header>
      <p class="mt-1.5 text-ink-muted">Puede que el enlace no esté bien o que el buzón no sea tuyo.</p>
    </div>
  `,
})
class NotFound {}

// ─── Variant A: card on the group page + a page per Mailbox ────────────────────────────────────

@Component({
  selector: 'proto-variant-a',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GroupTop, Thread, Composer, NotFound, TextLink, LucideChevronLeft, LucideChevronRight, LucideMail],
  template: `
    @if (open() === null) {
      <proto-group-top [drawn]="state() !== 'not-drawn'" />
      @if (state() !== 'not-drawn') {
        <section aria-labelledby="mailboxes" class="mt-6 rounded-card bg-surface p-5 shadow-card">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-full bg-subtle"><svg lucideMail [size]="20"></svg></div>
            <h2 id="mailboxes" class="font-display text-lg font-semibold">Buzones</h2>
          </div>
          <p class="mt-1.5 text-ink-muted">Mensajes anónimos: quien te regala nunca se descubre.</p>
          <ul class="mt-3 divide-y divide-line/40">
            @for (m of mailboxes; track m.id) {
              <li>
                <button type="button" (click)="openMailbox.emit(m.side)"
                  class="flex min-h-14 w-full items-center gap-3 py-3 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-field">
                  <span class="flex-1">
                    <span class="block font-bold">{{ title(m) }}</span>
                    <span class="block text-sm text-ink-muted">{{ hint(m) }}</span>
                  </span>
                  <svg lucideChevronRight [size]="20" class="text-ink-muted"></svg>
                </button>
              </li>
            }
          </ul>
        </section>
      }
    } @else {
      <a appLink standalone class="gap-1" href="javascript:void 0" (click)="openMailbox.emit(null)"><svg lucideChevronLeft [size]="18"></svg>Navidad en casa de la abuela</a>
      @if (state() === 'not-found') {
        <proto-not-found />
      } @else {
        <h1 class="mt-4 font-display text-3xl font-bold tracking-tight">{{ title(current()) }}</h1>
        <p class="mt-1.5 text-ink-muted">{{ hint(current()) }} Solo se ve la fecha de cada mensaje.</p>
        <section class="mt-6 rounded-card bg-surface p-5 shadow-card">
          <proto-thread [side]="current().side" [otherName]="title(current())" />
          @if (state() !== 'loading' && state() !== 'error') {
            <proto-composer class="mt-5 border-t border-line/40 pt-4" [side]="current().side" />
          }
        </section>
      }
    }
  `,
})
class VariantA {
  readonly open = input<Side | null>(null);
  readonly openMailbox = output<Side | null>();
  readonly state = store.state;
  readonly mailboxes = MAILBOXES;
  readonly current = computed(() => MAILBOXES.find((m) => m.side === this.open())!);
  readonly title = title;
  readonly hint = hint;
}

// ─── Variant B: everything on the group page, two tabs inside one card ─────────────────────────

@Component({
  selector: 'proto-variant-b',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GroupTop, Thread, Composer, LucideMail],
  template: `
    <proto-group-top [drawn]="state() !== 'not-drawn'" />
    @if (state() !== 'not-drawn') {
      <section aria-labelledby="mailbox" class="mt-6 rounded-card bg-surface p-5 shadow-card">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-full bg-subtle"><svg lucideMail [size]="20"></svg></div>
          <h2 id="mailbox" class="font-display text-lg font-semibold">Buzón</h2>
        </div>
        <div role="tablist" aria-label="Buzones" class="mt-4 flex gap-1 border-b border-line/40">
          @for (m of mailboxes; track m.id) {
            <button type="button" role="tab" [attr.aria-selected]="tab() === m.side" (click)="openMailbox.emit(m.side)"
              class="-mb-px min-h-11 flex-1 border-b-3 px-3 font-display font-semibold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-primary"
              [class.border-primary]="tab() === m.side" [class.text-primary]="tab() === m.side"
              [class.border-transparent]="tab() !== m.side" [class.text-ink-muted]="tab() !== m.side">
              {{ title(m) }}
            </button>
          }
        </div>
        <div role="tabpanel" class="mt-4">
          @if (state() === 'not-found') {
            <p class="text-ink-muted">Este buzón ya no existe.</p>
          } @else {
            <p class="mb-3 text-sm text-ink-muted">{{ hint(current()) }}</p>
            <div class="max-h-96 overflow-y-auto pr-1">
              <proto-thread [side]="current().side" [otherName]="title(current())" />
            </div>
            @if (state() !== 'loading' && state() !== 'error') {
              <proto-composer class="mt-4" [side]="current().side" />
            }
          }
        </div>
      </section>
    }
    <section class="mt-6 rounded-card bg-surface p-5 opacity-60 shadow-card">
      <h2 class="font-display text-lg font-semibold">Tu lista de deseos</h2>
      <p class="mt-1.5 text-ink-muted">(…el resto de la página del grupo sigue aquí)</p>
    </section>
  `,
})
class VariantB {
  readonly open = input<Side | null>(null);
  readonly openMailbox = output<Side | null>();
  readonly state = store.state;
  readonly mailboxes = MAILBOXES;
  readonly tab = computed<Side>(() => this.open() ?? 'GIVER');
  readonly current = computed(() => MAILBOXES.find((m) => m.side === this.tab())!);
  readonly title = title;
  readonly hint = hint;
}

// ─── Variant C: one Mailbox page, segmented control between the two threads ────────────────────

@Component({
  selector: 'proto-variant-c',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GroupTop, Thread, Composer, NotFound, TextLink, LucideChevronLeft, LucideChevronRight, LucideMail],
  template: `
    @if (open() === null) {
      <proto-group-top [drawn]="state() !== 'not-drawn'">
        <a appLink standalone class="gap-1.5" href="javascript:void 0" (click)="openMailbox.emit('GIVER')">
          <svg lucideMail [size]="18"></svg>Abrir buzón<svg lucideChevronRight [size]="18"></svg>
        </a>
      </proto-group-top>
    } @else {
      <a appLink standalone class="gap-1" href="javascript:void 0" (click)="openMailbox.emit(null)"><svg lucideChevronLeft [size]="18"></svg>Navidad en casa de la abuela</a>
      @if (state() === 'not-found') {
        <proto-not-found />
      } @else {
        <h1 class="mt-4 font-display text-3xl font-bold tracking-tight">Buzón</h1>
        <div role="radiogroup" aria-label="Conversación" class="mt-6 grid grid-cols-2 gap-1 rounded-full bg-subtle p-1">
          @for (m of mailboxes; track m.id) {
            <button type="button" role="radio" [attr.aria-checked]="tab() === m.side" (click)="openMailbox.emit(m.side)"
              class="min-h-11 rounded-full px-3 font-display font-semibold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
              [class.bg-surface]="tab() === m.side" [class.shadow-card]="tab() === m.side" [class.text-ink]="tab() === m.side"
              [class.text-ink-muted]="tab() !== m.side">
              {{ title(m) }}
            </button>
          }
        </div>
        <p class="mt-3 text-sm text-ink-muted">{{ hint(current()) }}</p>
        <div class="mt-4">
          <proto-thread [side]="current().side" [otherName]="title(current())" />
        </div>
        @if (state() !== 'loading' && state() !== 'error') {
          <div class="sticky bottom-20 mt-6 rounded-card bg-surface p-4 shadow-card">
            <proto-composer [side]="current().side" />
          </div>
        }
      }
    }
  `,
})
class VariantC {
  readonly open = input<Side | null>(null);
  readonly openMailbox = output<Side | null>();
  readonly state = store.state;
  readonly mailboxes = MAILBOXES;
  readonly tab = computed<Side>(() => this.open() ?? 'GIVER');
  readonly current = computed(() => MAILBOXES.find((m) => m.side === this.tab())!);
  readonly title = title;
  readonly hint = hint;
}

// ─── Route host + floating switcher ─────────────────────────────────────────────────────────────

const VARIANTS = [
  { key: 'A', name: 'Tarjeta + página propia' },
  { key: 'B', name: 'Todo en el grupo' },
  { key: 'C', name: 'Una página, dos hilos' },
] as const;

@Component({
  selector: 'app-mailbox-prototype',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [AppShell, VariantA, VariantB, VariantC, LucideChevronLeft, LucideChevronRight, LucideMoon, LucideSun],
  styles: `
    @keyframes proto-pop {
      from { opacity: 0; transform: translateY(8px) scale(0.96); }
      to { opacity: 1; transform: none; }
    }
    .motion-safe\\:animate-pop { }
    @media (prefers-reduced-motion: no-preference) {
      .motion-safe\\:animate-pop { animation: proto-pop 260ms cubic-bezier(.2,.8,.2,1) both; }
    }
    html.proto-dark {
      color-scheme: dark;
      --color-canvas: #22160f; --color-surface: #301f16; --color-field: #3e2a1f; --color-subtle: #3e2a1f;
      --color-ink: #fbf0e4; --color-ink-muted: #d3bba8; --color-line: #8c6e5c;
      --color-primary: #e98a63; --color-primary-hover: #f0a07f; --color-on-primary: #22160f;
      --color-success: #a9c3a3; --color-success-soft: #2f3d2b; --color-danger: #ff9c85; --color-danger-soft: #4a2018;
      --color-mustard: #d9a23e; --color-sage: #55704f; --color-sage-soft: #45573f; --color-clay: #8a4a33;
      --shadow-card: 0 2px 4px rgb(0 0 0 / 0.3), 0 24px 48px -16px rgb(0 0 0 / 0.7);
    }
    html.proto-light {
      color-scheme: light;
      --color-canvas: revert-layer;
    }
  `,
  template: `
    <app-shell>
      @switch (variant().key) {
        @case ('A') { <proto-variant-a [open]="open()" (openMailbox)="setOpen($event)" /> }
        @case ('B') { <proto-variant-b [open]="open()" (openMailbox)="setOpen($event)" /> }
        @case ('C') { <proto-variant-c [open]="open()" (openMailbox)="setOpen($event)" /> }
      }
      <div class="h-28"></div>
    </app-shell>

    <div class="fixed inset-x-0 bottom-3 z-50 flex justify-center px-3" style="font-family: ui-sans-serif, system-ui">
      <div class="flex flex-wrap items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm shadow-2xl"
        style="background:#111;color:#fff">
        <button type="button" aria-label="Variante anterior" (click)="cycle(-1)" class="rounded-lg px-2 py-1" style="background:#333">
          <svg lucideChevronLeft [size]="16"></svg>
        </button>
        <span class="min-w-44 text-center font-semibold">{{ variant().key }} ({{ variant().name }})</span>
        <button type="button" aria-label="Variante siguiente" (click)="cycle(1)" class="rounded-lg px-2 py-1" style="background:#333">
          <svg lucideChevronRight [size]="16"></svg>
        </button>
        <select aria-label="Estado" class="rounded-lg px-2 py-1" style="background:#333;color:#fff" [value]="state()" (change)="setState($any($event.target).value)">
          @for (s of states; track s) { <option [value]="s">{{ s }}</option> }
        </select>
        <select aria-label="Buzón" class="rounded-lg px-2 py-1" style="background:#333;color:#fff" [value]="open() ?? 'none'" (change)="setOpen($any($event.target).value === 'none' ? null : $any($event.target).value)">
          <option value="none">página del grupo</option>
          <option value="GIVER">Con Lucía</option>
          <option value="RECEIVER">Tu Giver</option>
        </select>
        <button type="button" (click)="toggleTheme()" class="flex items-center gap-1 rounded-lg px-2 py-1" style="background:#333">
          @if (dark()) { <svg lucideSun [size]="16"></svg> Claro } @else { <svg lucideMoon [size]="16"></svg> Oscuro }
        </button>
      </div>
    </div>
  `,
})
export class MailboxPrototype {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap.pipe(map((p) => p)), { requireSync: true });

  readonly states = STATES;
  readonly state = store.state;
  readonly variant = computed(() => VARIANTS.find((v) => v.key === this.params().get('variant')) ?? VARIANTS[0]);
  readonly open = computed<Side | null>(() => {
    const o = this.params().get('open');
    return o === 'GIVER' || o === 'RECEIVER' ? o : null;
  });
  readonly dark = signal(
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  );

  constructor() {
    this.applyTheme();
  }

  cycle(step: number): void {
    const i = VARIANTS.findIndex((v) => v.key === this.variant().key);
    this.nav({ variant: VARIANTS[(i + step + VARIANTS.length) % VARIANTS.length].key });
  }
  setOpen(open: Side | null): void {
    this.nav({ open });
  }
  setState(s: ThreadState): void {
    store.state.set(s);
  }
  toggleTheme(): void {
    this.dark.update((d) => !d);
    this.applyTheme();
  }
  private applyTheme(): void {
    document.documentElement.classList.toggle('proto-dark', this.dark());
  }
  private nav(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowLeft') this.cycle(-1);
    if (e.key === 'ArrowRight') this.cycle(1);
  }
}
