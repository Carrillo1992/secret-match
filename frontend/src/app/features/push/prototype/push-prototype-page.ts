// PROTOTYPE (#119), throwaway. Question: what should the "notifications on this device" invitation
// and Preferences toggle look like? Three invitation variants (?variant=A|B|C) and two toggle
// options (?pref=P1|P2) on a stubbed Group page at /prototype/push, dev builds only. Stub data in
// memory, no API calls. Every bar setting lives in the URL, so a view is shareable and reload-stable.
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  inject,
  isDevMode,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideChevronLeft,
  LucideGift,
  LucideMail,
  LucideSend,
  LucideShuffle,
} from '@lucide/angular';
import { Theme, ThemePreference } from '../../../core/preferences/theme-preference';
import { AppShell } from '../../../shared/ui/app-shell/app-shell';
import { Button } from '../../../shared/ui/button/button';
import { Chip } from '../../../shared/ui/chip/chip';
import { Field } from '../../../shared/ui/field/field';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { InviteContext, InviteState, VariantA, VariantB, VariantC } from './push-invite-variants';
import { PrefOption, PushPreferencesMock, ToggleState } from './push-preferences-mock';

type Variant = 'A' | 'B' | 'C';
type HostContext = 'member' | 'admin' | 'mailbox';

const VARIANTS: readonly Variant[] = ['A', 'B', 'C'];
const VARIANT_NAMES: Record<Variant, string> = {
  A: 'Fila al pie de la tarjeta',
  B: 'Tarjeta propia',
  C: 'Enlace discreto',
};
const CONTEXTS: Record<HostContext, string> = {
  member: 'Sorteo · Miembro',
  admin: 'Sorteo · Admin (Sortear)',
  mailbox: 'Buzón',
};
const INVITE_STATES: Record<InviteState, string> = {
  visible: 'Visible',
  working: 'Activando…',
  done: 'Hecho',
  denied: 'Bloqueado en el diálogo',
  failed: 'Falló',
  hidden: 'Oculta',
};
const TOGGLE_STATES: Record<ToggleState, string> = {
  off: 'Desactivado',
  on: 'Activado',
  activating: 'Activando…',
  deactivating: 'Desactivando…',
  denied: 'Bloqueado',
  failed: 'Falló',
  hidden: 'Oculto',
};
const THEMES: Record<Theme, string> = { system: 'Sistema', light: 'Claro', dark: 'Oscuro' };

const MEMBERS = ['Marta', 'Ana', 'Luis', 'Lucía', 'Pablo', 'Tú'];

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

@Component({
  selector: 'app-push-prototype-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppShell,
    Button,
    Chip,
    Field,
    TextLink,
    LucideChevronLeft,
    LucideGift,
    LucideMail,
    LucideSend,
    LucideShuffle,
    PushPreferencesMock,
    VariantA,
    VariantB,
    VariantC,
  ],
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <app-shell>
      <a href="#" appLink standalone class="gap-1" (click)="$event.preventDefault()">
        <svg lucideChevronLeft [size]="18"></svg>
        Mis grupos
      </a>
      <h1
        id="group-name"
        tabindex="-1"
        class="mt-4 font-display text-3xl font-bold tracking-tight break-words"
      >
        Cumpleaños de Marta
      </h1>

      @if (context() === 'mailbox') {
        <!-- After the Draw: a drawn draw card (static) and then the Mailbox card. -->
        <section class="mt-6 rounded-card bg-surface p-5 shadow-card">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
            >
              <svg lucideGift [size]="20"></svg>
            </div>
            <h2 class="font-display text-lg font-semibold">Sorteo</h2>
          </div>
          <p class="mt-4">Te toca regalar a <strong>Lucía</strong>.</p>
          <p class="mt-4 text-sm text-ink-muted">
            Con el sorteo hecho, el grupo queda cerrado: ya no entra ni sale nadie.
          </p>
        </section>

        <section
          aria-labelledby="group-mailbox"
          class="mt-6 rounded-card bg-surface p-5 shadow-card"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
            >
              <svg lucideMail [size]="20"></svg>
            </div>
            <h2
              id="group-mailbox"
              tabindex="-1"
              class="font-display text-lg font-semibold focus:outline-none"
            >
              Buzón
            </h2>
          </div>
          <div role="tablist" aria-label="Buzones" class="mt-4 flex gap-1 border-b border-line">
            <button
              type="button"
              role="tab"
              aria-selected="true"
              class="-mb-px min-h-11 flex-1 border-b-3 border-primary px-3 font-display font-semibold text-primary"
            >
              Con Lucía
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="false"
              tabindex="-1"
              class="-mb-px min-h-11 flex-1 border-b-3 border-transparent px-3 font-display font-semibold text-ink-muted"
            >
              Chat misterioso
            </button>
          </div>
          <div class="mt-4">
            <p class="mb-3 text-sm text-ink-muted">Le regalas tú. No sabrá quién eres.</p>
            <div class="flex flex-col gap-2">
              <p
                class="max-w-5/6 self-end rounded-card rounded-br-md bg-primary px-4 py-2.5 text-on-primary"
              >
                ¿Qué talla de jersey usas?
              </p>
              <p
                class="max-w-5/6 self-start rounded-card rounded-bl-md bg-subtle px-4 py-2.5 text-ink"
              >
                Una M, ¡gracias! Mejor en colores oscuros.
              </p>
              <p
                class="max-w-5/6 self-end rounded-card rounded-br-md bg-primary px-4 py-2.5 text-on-primary"
              >
                Apuntado 🤫
              </p>
            </div>
            <label for="proto-message" class="sr-only">Mensaje</label>
            <textarea
              id="proto-message"
              appField
              rows="3"
              class="mt-4 w-full"
              placeholder="Escribe un mensaje…"
            ></textarea>
            <div class="mt-2 flex items-center justify-between gap-3">
              <p class="text-sm text-ink-muted">0/1000</p>
              <button type="button" appButton="secondary" class="shrink-0">
                <svg lucideSend [size]="18"></svg>
                Enviar
              </button>
            </div>
          </div>
          @if (variant() === 'A') {
            <app-push-invite-a
              context="mailbox"
              [state]="invite()"
              (turnOn)="turnOn()"
              (dismiss)="dismiss()"
            />
          } @else if (variant() === 'C') {
            <app-push-invite-c
              context="mailbox"
              [state]="invite()"
              (turnOn)="turnOn()"
              (dismiss)="dismiss()"
            />
          }
        </section>
        @if (variant() === 'B') {
          <app-push-invite-b
            context="mailbox"
            [state]="invite()"
            (turnOn)="turnOn()"
            (dismiss)="dismiss()"
          />
        }
      } @else {
        <!-- Before the Draw: the draw card in its not-drawn state, as a Member or as the Admin. -->
        <section aria-labelledby="group-draw" class="mt-6 rounded-card bg-surface p-5 shadow-card">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
            >
              <svg lucideGift [size]="20"></svg>
            </div>
            <h2
              id="group-draw"
              tabindex="-1"
              class="font-display text-lg font-semibold focus:outline-none"
            >
              Sorteo
            </h2>
          </div>
          @if (context() === 'member') {
            <p class="mt-4 text-ink-muted">
              El sorteo aún no está hecho. Te avisaremos por email cuando lo esté.
            </p>
          } @else {
            <p class="mt-4 text-ink-muted">
              Ya sois 6. Cuando estéis todos, haz el sorteo: a cada uno le avisaremos por email.
            </p>
            <button type="button" appButton class="mt-4 w-full">
              <svg lucideShuffle [size]="20"></svg>
              Sortear
            </button>
          }
          @if (variant() === 'A') {
            <app-push-invite-a
              context="draw"
              [state]="invite()"
              (turnOn)="turnOn()"
              (dismiss)="dismiss()"
            />
          } @else if (variant() === 'C') {
            <app-push-invite-c
              context="draw"
              [state]="invite()"
              (turnOn)="turnOn()"
              (dismiss)="dismiss()"
            />
          }
        </section>
        @if (variant() === 'B') {
          <app-push-invite-b
            context="draw"
            [state]="invite()"
            (turnOn)="turnOn()"
            (dismiss)="dismiss()"
          />
        }
      }

      <!-- Below: the rest of a long Group page, so the variants are judged in context. -->
      <section class="mt-6 rounded-card bg-surface p-5 shadow-card">
        <h2 class="font-display text-lg font-semibold">Miembros</h2>
        <ul class="mt-4 flex flex-wrap gap-2">
          @for (member of members; track member) {
            <li appChip>{{ member }}</li>
          }
        </ul>
      </section>
      <section class="mt-6 rounded-card bg-surface p-5 shadow-card">
        <h2 class="font-display text-lg font-semibold">Tu lista de deseos</h2>
        <p class="mt-2 text-ink-muted">Tienes 3 deseos apuntados.</p>
      </section>

      <!-- Room so the prototype bar never covers the last card. -->
      <div class="h-72" aria-hidden="true"></div>
    </app-shell>

    <app-push-preferences-mock
      [open]="sheetOpen()"
      [pref]="pref()"
      [state]="toggle()"
      [installRow]="installRow()"
      (closed)="set('sheet', null)"
      (toggle)="flipToggle()"
    />

    <!-- PROTOTYPE switcher: deliberately not part of the design being judged. -->
    <div
      class="fixed inset-x-0 bottom-3 z-50 mx-auto w-fit max-w-[calc(100%-1.5rem)] rounded-card bg-ink p-3 font-sans text-sm text-canvas shadow-sheet"
      role="region"
      aria-label="Prototipo"
    >
      <div class="flex items-center justify-center gap-2">
        <button
          type="button"
          class="size-9 rounded-full hover:bg-canvas/20"
          aria-label="Variante anterior"
          (click)="cycle(-1)"
        >
          ←
        </button>
        <span class="min-w-48 text-center font-bold"> {{ variant() }} · {{ variantName() }} </span>
        <button
          type="button"
          class="size-9 rounded-full hover:bg-canvas/20"
          aria-label="Variante siguiente"
          (click)="cycle(1)"
        >
          →
        </button>
        <button
          type="button"
          class="ml-2 rounded-full border border-canvas/40 px-3 py-1"
          [attr.aria-expanded]="!collapsed()"
          (click)="set('bar', collapsed() ? null : 'min')"
        >
          {{ collapsed() ? 'Más' : 'Menos' }}
        </button>
      </div>
      @if (!collapsed()) {
        <div class="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
          <label for="proto-context">Contexto</label>
          <select
            id="proto-context"
            [class]="select"
            [value]="context()"
            (change)="set('context', value($event))"
          >
            @for (entry of contexts; track entry[0]) {
              <option [value]="entry[0]" [selected]="entry[0] === context()">{{ entry[1] }}</option>
            }
          </select>

          <label for="proto-invite">Invitación</label>
          <select
            id="proto-invite"
            [class]="select"
            [value]="invite()"
            (change)="set('invite', value($event))"
          >
            @for (entry of inviteStates; track entry[0]) {
              <option [value]="entry[0]" [selected]="entry[0] === invite()">{{ entry[1] }}</option>
            }
          </select>

          <span>Preferencias</span>
          <div class="flex flex-wrap items-center gap-1.5">
            @for (option of prefs; track option) {
              <button
                type="button"
                class="rounded-full border px-3 py-1"
                [class]="
                  option === pref() ? 'border-canvas bg-canvas text-ink' : 'border-canvas/40'
                "
                [attr.aria-pressed]="option === pref()"
                (click)="set('pref', option)"
              >
                {{ option }}
              </button>
            }
            <button
              type="button"
              class="rounded-full border border-canvas/40 px-3 py-1"
              (click)="set('sheet', 'open')"
            >
              Abrir Preferencias
            </button>
          </div>

          <label for="proto-toggle">Interruptor</label>
          <select
            id="proto-toggle"
            [class]="select"
            [value]="toggle()"
            (change)="set('toggle', value($event))"
          >
            @for (entry of toggleStates; track entry[0]) {
              <option [value]="entry[0]" [selected]="entry[0] === toggle()">{{ entry[1] }}</option>
            }
          </select>

          <label for="proto-install">«Instalar la app»</label>
          <label class="flex items-center gap-2">
            <input
              id="proto-install"
              type="checkbox"
              [checked]="installRow()"
              (change)="set('install', checked($event) ? null : 'no')"
            />
            también en el grupo App
          </label>

          <label for="proto-theme">Tema</label>
          <select
            id="proto-theme"
            [class]="select"
            [value]="theme.theme()"
            (change)="chooseTheme(value($event))"
          >
            @for (entry of themes; track entry[0]) {
              <option [value]="entry[0]" [selected]="entry[0] === theme.theme()">
                {{ entry[1] }}
              </option>
            }
          </select>
        </div>
      }
    </div>
  `,
})
export class PushPrototypePage {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  protected readonly theme = inject(ThemePreference);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  protected readonly members = MEMBERS;
  protected readonly prefs: readonly PrefOption[] = ['P1', 'P2'];
  protected readonly contexts = Object.entries(CONTEXTS);
  protected readonly inviteStates = Object.entries(INVITE_STATES);
  protected readonly toggleStates = Object.entries(TOGGLE_STATES);
  protected readonly themes = Object.entries(THEMES);
  protected readonly select = 'rounded-full bg-canvas px-3 py-1 text-ink';

  protected readonly variant = computed(() => pick(this.params().get('variant'), VARIANTS, 'A'));
  protected readonly variantName = computed(() => VARIANT_NAMES[this.variant()]);
  protected readonly context = computed(() =>
    pick(this.params().get('context'), Object.keys(CONTEXTS) as HostContext[], 'member'),
  );
  protected readonly invite = computed(() =>
    pick(this.params().get('invite'), Object.keys(INVITE_STATES) as InviteState[], 'visible'),
  );
  protected readonly pref = computed(() => pick(this.params().get('pref'), this.prefs, 'P1'));
  protected readonly toggle = computed(() =>
    pick(this.params().get('toggle'), Object.keys(TOGGLE_STATES) as ToggleState[], 'off'),
  );
  protected readonly installRow = computed(() => this.params().get('install') !== 'no');
  protected readonly sheetOpen = computed(() => this.params().get('sheet') === 'open');
  protected readonly collapsed = computed(() => this.params().get('bar') === 'min');

  constructor() {
    if (!isDevMode()) {
      throw new Error('The push prototype only runs in dev builds.');
    }
  }

  protected set(key: string, value: string | null): void {
    void this.router.navigate([], {
      queryParams: { [key]: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected cycle(step: number): void {
    const index = VARIANTS.indexOf(this.variant());
    this.set('variant', VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length]);
  }

  /** ← and → cycle the variant, unless the focus is somewhere that uses the arrow keys. */
  protected onKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        'input, textarea, select, [contenteditable], [role="tablist"], [role="radiogroup"], dialog',
      )
    ) {
      return;
    }
    this.cycle(event.key === 'ArrowLeft' ? -1 : 1);
  }

  /** "Activar avisos": simulates the permission dialog and the subscription, then success. */
  protected turnOn(): void {
    this.set('invite', 'working');
    setTimeout(() => this.set('invite', 'done'), 1500);
  }

  /** "Ahora no": the invitation goes and focus moves to the heading of the card it was about. */
  protected dismiss(): void {
    this.set('invite', 'hidden');
    const heading = this.context() === 'mailbox' ? 'group-mailbox' : 'group-draw';
    setTimeout(() => this.document.getElementById(heading)?.focus());
  }

  /** The switch, or P2's other row: a simulated round trip either way. */
  protected flipToggle(): void {
    const turningOn = this.toggle() !== 'on';
    this.set('toggle', turningOn ? 'activating' : 'deactivating');
    setTimeout(() => this.set('toggle', turningOn ? 'on' : 'off'), 1500);
  }

  protected chooseTheme(theme: string): void {
    this.theme.choose(theme as Theme);
  }

  protected value(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
}
