/*
 * PROTOTYPE (#87), throwaway: three variants of the Preferences menu (Theme + Language) on
 * `/prototype/preferences?variant=A|B|C`, registered only under isDevMode(). Stub data in memory, no
 * API calls. The frames below copy the header markup of `app-sheet-layout` (signed out) and
 * `app-shell` (signed in, Home's bar actions) because the shared components have no slot for the
 * menu button. The floating bar is prototype chrome, not part of the design.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideLoaderCircle,
  LucideLogOut,
  LucideUserRound,
} from '@lucide/angular';
import { Button } from '../../../shared/ui/button/button';
import { GiftIllustration } from '../../../shared/ui/gift-illustration/gift-illustration';
import { ForcedState, LANG_NAMES, Outcome, PrefsStore, Theme } from './prefs-store';
import { VariantA } from './variant-a';
import { VariantB } from './variant-b';
import { VariantC } from './variant-c';

const VARIANTS = [
  { key: 'A', name: 'Popover + segmented' },
  { key: 'B', name: 'Sheet / dialog + rows' },
  { key: 'C', name: 'Popover + selects' },
] as const;

type VariantKey = (typeof VARIANTS)[number]['key'];

@Component({
  selector: 'app-preferences-prototype',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './prototype-theme.css',
  providers: [PrefsStore],
  imports: [
    Button,
    GiftIllustration,
    NgTemplateOutlet,
    VariantA,
    VariantB,
    VariantC,
    LucideChevronLeft,
    LucideChevronRight,
    LucideLoaderCircle,
    LucideLogOut,
    LucideUserRound,
  ],
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <ng-template #menu let-onIllustration="onIllustration">
      @switch (variant()) {
        @case ('A') {
          <app-prefs-variant-a [onIllustration]="onIllustration" />
        }
        @case ('B') {
          <app-prefs-variant-b [onIllustration]="onIllustration" />
        }
        @case ('C') {
          <app-prefs-variant-c [onIllustration]="onIllustration" />
        }
      }
    </ng-template>

    @if (store.signedIn()) {
      <!-- Signed in: copy of app-shell's header, with Home's bar actions and the menu button last. -->
      <div class="flex min-h-dvh flex-col">
        <header class="border-b border-line/40 bg-surface">
          <div class="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-4 px-6 py-3">
            <a
              href="#"
              (click)="$event.preventDefault()"
              class="inline-flex min-h-11 items-center font-display text-xl font-bold tracking-tight text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >SecretMatch</a
            >
            <div class="flex flex-wrap items-center gap-3">
              <button type="button" appButton="secondary">
                <svg lucideUserRound [size]="18"></svg>
                {{ t().profile }}
              </button>
              <button type="button" appButton="secondary">
                <svg lucideLogOut [size]="18"></svg>
                {{ t().signOut }}
              </button>
              <ng-container *ngTemplateOutlet="menu; context: { onIllustration: false }" />
            </div>
          </div>
        </header>
        <main class="mx-auto w-full max-w-2xl flex-1 px-6 pt-8 pb-40">
          <h1 class="font-display text-3xl font-bold tracking-tight">{{ t().myGroups }}</h1>
          <ul class="mt-6 flex flex-col gap-4">
            @for (group of stubGroups; track group) {
              <li class="rounded-card bg-surface p-5 shadow-card">
                <p class="font-display text-lg font-semibold">{{ group }}</p>
                <p class="mt-1 text-sm text-ink-muted">24 dic · 6 miembros</p>
              </li>
            }
          </ul>
        </main>
      </div>
    } @else {
      <!-- Signed out: copy of app-sheet-layout's header over the gift illustration. -->
      <div class="flex min-h-dvh flex-col">
        <div class="relative h-60 shrink-0 sm:h-72">
          <app-gift-illustration class="absolute inset-0" />
          <header class="relative mx-auto flex min-h-11 max-w-md items-center justify-between px-6 pt-5">
            <a
              href="#"
              (click)="$event.preventDefault()"
              class="inline-flex min-h-11 items-center font-display text-xl font-bold tracking-tight text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >SecretMatch</a
            >
            <ng-container *ngTemplateOutlet="menu; context: { onIllustration: true }" />
          </header>
        </div>
        <main
          class="relative -mt-8 flex flex-1 flex-col rounded-t-sheet bg-surface px-6 pt-7 pb-40 shadow-sheet sm:mx-auto sm:mb-12 sm:w-full sm:max-w-md sm:flex-none sm:rounded-sheet sm:px-8 sm:pb-8 sm:shadow-card"
        >
          <h1 class="font-display text-3xl font-bold tracking-tight">Intercambia regalos sin spoilers</h1>
          <p class="mt-3 text-ink-muted">
            Crea un grupo, comparte el enlace y deja que el sorteo haga el resto.
          </p>
          <button type="button" appButton class="mt-6 w-full">Crear cuenta</button>
        </main>
      </div>
    }

    @if (store.reloadingTo(); as target) {
      <!-- Stand-in for the full page reload into the new Language. -->
      <div class="fixed inset-0 z-40 grid place-items-center bg-canvas text-ink" role="status">
        <p class="inline-flex items-center gap-3 font-display text-xl font-semibold">
          <svg lucideLoaderCircle [size]="24" class="animate-spin text-primary" aria-hidden="true"></svg>
          {{ t().switching }} <span [attr.lang]="target">{{ names[target] }}</span>…
        </p>
      </div>
    }

    <!-- PROTOTYPE switcher: deliberately off-palette so it reads as tooling, not design. -->
    <div
      data-proto-bar
      class="fixed bottom-3 left-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 rounded-2xl text-xs text-white shadow-2xl"
      style="background: #111; font-family: ui-monospace, monospace; color: #fff"
    >
      <div class="flex items-center gap-2 px-2 py-1.5">
        <button type="button" class="proto-btn" (click)="step(-1)" aria-label="Variante anterior">
          <svg lucideChevronLeft [size]="16"></svg>
        </button>
        <span class="flex-1 text-center font-bold">{{ variant() }} · {{ variantName() }}</span>
        <button type="button" class="proto-btn" (click)="step(1)" aria-label="Variante siguiente">
          <svg lucideChevronRight [size]="16"></svg>
        </button>
        <button type="button" class="proto-btn" (click)="barOpen.set(!barOpen())">
          {{ barOpen() ? '▾' : '▴' }}
        </button>
      </div>
      @if (barOpen()) {
        <div class="flex flex-col gap-1.5 border-t px-3 py-2" style="border-color: #333">
          <div class="proto-row">
            <span>frame</span>
            <button type="button" class="proto-btn" [class.on]="!store.signedIn()" (click)="store.signedIn.set(false)">signed out</button>
            <button type="button" class="proto-btn" [class.on]="store.signedIn()" (click)="store.signedIn.set(true)">signed in</button>
          </div>
          <div class="proto-row">
            <span>menu</span>
            <button type="button" class="proto-btn" [class.on]="!store.open()" (click)="store.open.set(false)">closed</button>
            <button type="button" class="proto-btn" [class.on]="store.open()" (click)="store.open.set(true)">open</button>
          </div>
          <div class="proto-row">
            <span>state</span>
            @for (s of forcedStates; track s) {
              <button type="button" class="proto-btn" [class.on]="store.forcedState() === s" (click)="store.force(s)">{{ s }}</button>
            }
          </div>
          <div class="proto-row">
            <span>PUT stub</span>
            @for (o of outcomes; track o) {
              <button type="button" class="proto-btn" [class.on]="store.outcome() === o" (click)="store.outcome.set(o)">{{ o }}</button>
            }
          </div>
          <div class="proto-row">
            <span>theme</span>
            @for (th of themes; track th) {
              <button type="button" class="proto-btn" [class.on]="store.theme() === th" (click)="store.chooseTheme(th)">{{ th }}</button>
            }
            <span class="ml-2">storage</span>
            <button type="button" class="proto-btn" [class.on]="store.storageBlocked()" (click)="store.setStorageBlocked(!store.storageBlocked())">
              {{ store.storageBlocked() ? 'blocked' : 'ok' }}
            </button>
          </div>
          <p style="color: #9ca3af">
            theme={{ store.theme() }} lang={{ store.language() }} open={{ store.open() }}
            saving={{ store.saving() ?? '-' }} failed={{ store.saveFailed() }}
            reloading={{ store.reloadingTo() ?? '-' }}
          </p>
        </div>
      }
    </div>
  `,
})
export class PreferencesPrototype {
  protected readonly store = inject(PrefsStore);
  protected readonly t = this.store.t;
  protected readonly names = LANG_NAMES;
  protected readonly barOpen = signal(true);
  protected readonly stubGroups = ['Navidad en casa de la abuela', 'Amigo invisible de la oficina'];
  protected readonly forcedStates: ForcedState[] = ['idle', 'saving', 'failed', 'reloading'];
  protected readonly outcomes: Outcome[] = ['success', 'failure', 'slow'];
  protected readonly themes: Theme[] = ['system', 'light', 'dark'];

  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap);

  protected readonly variant = computed<VariantKey>(() => {
    const key = this.params()?.get('variant')?.toUpperCase();
    return VARIANTS.find((v) => v.key === key)?.key ?? 'A';
  });
  protected readonly variantName = computed(
    () => VARIANTS.find((v) => v.key === this.variant())?.name ?? '',
  );

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    effect(() => {
      const theme = this.store.theme();
      if (theme === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', theme);
    });
    effect(() => root.setAttribute('lang', this.store.language()));
    inject(DestroyRef).onDestroy(() => root.removeAttribute('data-theme'));
  }

  protected step(delta: number): void {
    const index = VARIANTS.findIndex((v) => v.key === this.variant());
    const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length].key;
    this.store.open.set(false);
    void this.router.navigate([], { queryParams: { variant: next }, replaceUrl: true });
  }

  protected onKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const el = document.activeElement as HTMLElement | null;
    if (el?.closest('input, select, textarea, [contenteditable], [role="radiogroup"]')) return;
    this.step(event.key === 'ArrowLeft' ? -1 : 1);
  }
}
