/*
 * PROTOTYPE (#115), throwaway. Question: "what should the signed-out landing look like so it sells
 * SecretMatch in one scroll?" Three variants of the landing on `/prototype/landing?variant=A|B|C`,
 * registered only in dev mode. Stub copy and a stub API health state: no API calls.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { map } from 'rxjs';
import { GiftIllustration } from '../../../shared/ui/gift-illustration/gift-illustration';
import { EN, ES } from './landing-copy';
import { VariantA } from './variant-a';
import { VariantB } from './variant-b';
import { VariantC } from './variant-c';

const VARIANTS = [
  { key: 'A', name: 'El sobre que sigue' },
  { key: 'B', name: 'Wrapped' },
  { key: 'C', name: 'La historia de un grupo' },
] as const;

type Theme = 'system' | 'light' | 'dark';

@Component({
  selector: 'app-landing-prototype',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GiftIllustration, LucideChevronLeft, LucideChevronRight, VariantA, VariantB, VariantC],
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    @switch (variant().key) {
      @case ('A') {
        <app-landing-variant-a
          [copy]="copy()"
          [apiDown]="apiDown()"
          [accountDeleted]="accountDeleted()"
          (retry)="retry()"
        />
      }
      @case ('B') {
        <app-landing-variant-b
          [copy]="copy()"
          [apiDown]="apiDown()"
          [accountDeleted]="accountDeleted()"
          (retry)="retry()"
        />
      }
      @case ('C') {
        <app-landing-variant-c
          [copy]="copy()"
          [apiDown]="apiDown()"
          [accountDeleted]="accountDeleted()"
          (retry)="retry()"
        />
      }
    }

    @if (showOg()) {
      <!-- Generic chat link-preview mock (not any real app's UI) -->
      <div
        class="fixed inset-0 z-50 grid place-items-center bg-scrim p-4"
        (click)="showOg.set(false)"
      >
        <div class="w-full max-w-sm" (click)="$event.stopPropagation()">
          <p class="mb-2 text-sm font-semibold" style="color: #fff">Link preview (OG 1200×630)</p>
          <div class="overflow-hidden rounded-field bg-surface shadow-card">
            <div class="relative aspect-[1200/630] overflow-hidden bg-canvas">
              <app-gift-illustration class="absolute inset-y-0 right-0 w-3/5" />
              <div class="absolute inset-y-0 left-0 flex w-1/2 flex-col justify-center pl-5">
                <p class="font-display text-2xl font-bold tracking-tight text-ink">SecretMatch</p>
                <p class="mt-1 text-sm leading-snug text-ink-muted">{{ copy().tagline }}</p>
              </div>
            </div>
            <div class="px-4 py-3">
              <p class="font-bold leading-snug">{{ copy().ogTitle }}</p>
              <p class="mt-0.5 truncate text-sm text-ink-muted">{{ copy().ogDescription }}</p>
              <p class="mt-1 text-sm text-ink-muted">app.secret-match.app</p>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- PROTOTYPE switcher: deliberately not part of the design -->
    <div
      class="fixed bottom-3 left-1/2 z-[60] -translate-x-1/2 font-sans text-sm"
      style="color: #fff; background: #111; border-radius: 9999px; box-shadow: 0 8px 24px rgb(0 0 0 / 0.35)"
    >
      @if (collapsed()) {
        <button type="button" class="px-4 py-2 font-bold" (click)="collapsed.set(false)">
          Prototype {{ variant().key }} ▴
        </button>
      } @else {
        <div
          class="flex max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-x-auto px-2 py-1.5 whitespace-nowrap"
        >
          <button
            type="button"
            class="grid size-8 place-items-center"
            aria-label="Previous variant"
            (click)="step(-1)"
          >
            <svg lucideChevronLeft [size]="18"></svg>
          </button>
          <span class="px-1 font-bold whitespace-nowrap"
            >{{ variant().key }} · {{ variant().name }}</span
          >
          <button
            type="button"
            class="grid size-8 place-items-center"
            aria-label="Next variant"
            (click)="step(1)"
          >
            <svg lucideChevronRight [size]="18"></svg>
          </button>
          <span class="mx-1 h-5 w-px" style="background: #555"></span>
          <button
            type="button"
            class="rounded-full px-2.5 py-1"
            [style.background]="apiDown() ? '#b91c1c' : '#333'"
            (click)="apiDown.set(!apiDown())"
          >
            API down
          </button>
          <button
            type="button"
            class="rounded-full px-2.5 py-1"
            [style.background]="accountDeleted() ? '#15803d' : '#333'"
            (click)="accountDeleted.set(!accountDeleted())"
          >
            Deleted
          </button>
          <button
            type="button"
            class="rounded-full px-2.5 py-1"
            [style.background]="english() ? '#1d4ed8' : '#333'"
            (click)="english.set(!english())"
          >
            EN copy
          </button>
          <button
            type="button"
            class="rounded-full px-2.5 py-1"
            [style.background]="showOg() ? '#7c3aed' : '#333'"
            (click)="showOg.set(!showOg())"
          >
            OG card
          </button>
          <button
            type="button"
            class="rounded-full px-2.5 py-1"
            style="background: #333"
            (click)="cycleTheme()"
          >
            Theme: {{ theme() }}
          </button>
          <button
            type="button"
            class="grid size-8 place-items-center"
            aria-label="Collapse bar"
            (click)="collapsed.set(true)"
          >
            ▾
          </button>
        </div>
      }
    </div>
  `,
})
export class LandingPrototype {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly html = inject(DOCUMENT).documentElement;

  private readonly key = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('variant'))));
  protected readonly variant = computed(
    () => VARIANTS.find((v) => v.key === this.key()?.toUpperCase()) ?? VARIANTS[0],
  );

  protected readonly apiDown = signal(false);
  protected readonly accountDeleted = signal(false);
  protected readonly english = signal(false);
  protected readonly showOg = signal(false);
  protected readonly collapsed = signal(false);
  protected readonly theme = signal<Theme>('system');
  protected readonly copy = computed(() => (this.english() ? EN : ES));

  constructor() {
    const previous = this.html.getAttribute('data-theme');
    inject(DestroyRef).onDestroy(() => {
      if (previous) this.html.setAttribute('data-theme', previous);
      else this.html.removeAttribute('data-theme');
    });
  }

  protected step(delta: number): void {
    const i = VARIANTS.indexOf(this.variant());
    const next = VARIANTS[(i + delta + VARIANTS.length) % VARIANTS.length];
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { variant: next.key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected cycleTheme(): void {
    const order: Theme[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(this.theme()) + 1) % order.length];
    this.theme.set(next);
    if (next === 'system') this.html.removeAttribute('data-theme');
    else this.html.setAttribute('data-theme', next);
  }

  /** Stub of `ApiHealth.recheck()`: pretend the API came back. */
  protected retry(): void {
    this.apiDown.set(false);
  }

  protected onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, [contenteditable], dialog')) return;
    if (event.key === 'ArrowLeft') this.step(-1);
    if (event.key === 'ArrowRight') this.step(1);
  }
}
