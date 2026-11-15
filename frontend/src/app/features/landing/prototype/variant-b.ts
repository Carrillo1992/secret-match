import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideBan,
  LucideGift,
  LucideLink,
  LucideListChecks,
  LucideMessageCircle,
  LucideShieldCheck,
  LucideSparkles,
  LucideUnlink,
} from '@lucide/angular';
import { SIGN_IN } from '../../../core/route-paths';
import { Envelope, EnvelopeState } from '../../groups/components/envelope/envelope';
import { Alert } from '../../../shared/ui/alert/alert';
import { Button } from '../../../shared/ui/button/button';
import { Chip } from '../../../shared/ui/chip/chip';
import { GiftIllustration } from '../../../shared/ui/gift-illustration/gift-illustration';
import { PreferencesMenu } from '../../../shared/ui/preferences-menu/preferences-menu';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { LandingCopy } from './landing-copy';

/**
 * PROTOTYPE (#115) option B, "Wrapped": a new full-width showcase layout. Hero band, then one
 * full-bleed band per selling point with a live mini-demo, alternating canvas / surface, a sticky
 * bottom CTA on phones once the hero CTA scrolls away, and a closing band in primary.
 */
@Component({
  selector: 'app-landing-variant-b',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    Button,
    Chip,
    Envelope,
    GiftIllustration,
    PreferencesMenu,
    RouterLink,
    TextLink,
    LucideBan,
    LucideGift,
    LucideLink,
    LucideListChecks,
    LucideMessageCircle,
    LucideShieldCheck,
    LucideSparkles,
    LucideUnlink,
  ],
  host: { class: 'block min-h-dvh bg-canvas' },
  template: `
    @let c = copy();
    <header class="mx-auto flex max-w-5xl items-center justify-between px-6 pt-5 md:px-10">
      <a
        routerLink="/"
        class="inline-flex min-h-11 items-center font-display text-xl font-bold tracking-tight text-ink"
        >SecretMatch</a
      >
      <app-preferences-menu raised />
    </header>

    <main>
      <!-- Hero band -->
      <section
        class="mx-auto grid max-w-5xl items-center gap-2 px-6 pb-12 md:grid-cols-2 md:gap-10 md:px-10 md:py-16"
      >
        <app-gift-illustration class="h-56 md:order-2 md:h-96" />
        <div class="flex flex-col gap-5 text-center md:text-left">
          @if (accountDeleted()) {
            <p appAlert="success">{{ c.accountDeleted }}</p>
          }
          <h1 class="font-display text-4xl font-bold tracking-tight md:text-6xl">
            {{ c.tagline }}
          </h1>
          <p class="text-lg text-ink-muted">{{ c.lead }}</p>
          <div #heroCta class="flex flex-col items-center gap-2 md:flex-row md:gap-6">
            <a routerLink="/sign-up" appButton class="w-full md:w-auto">{{ c.createAccount }}</a>
            <a [routerLink]="signIn" appLink standalone>{{ c.signIn }}</a>
          </div>
          <div
            role="status"
            aria-live="polite"
            class="flex flex-col items-center gap-3 md:items-start"
          >
            @if (apiDown()) {
              <p class="rounded-full bg-danger-soft px-4 py-1 font-semibold text-danger">
                {{ c.apiDown }}
              </p>
              <button type="button" appButton="secondary" (click)="retry.emit()">
                {{ c.retry }}
              </button>
            }
          </div>
        </div>
      </section>

      <!-- Reveal band -->
      <section class="relative overflow-hidden bg-surface px-6 py-16 md:px-10">
        <div
          aria-hidden="true"
          class="absolute -top-16 -right-16 size-48 rounded-full bg-mustard"
        ></div>
        <div class="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <span class="grid size-10 place-items-center rounded-full bg-subtle"
              ><svg lucideGift [size]="20"></svg
            ></span>
            <h2 class="mt-4 font-display text-3xl font-bold tracking-tight md:text-5xl">
              {{ c.reveal.title }}
            </h2>
            <p class="mt-3 text-lg text-ink-muted">{{ c.reveal.body }}</p>
          </div>
          <div class="flex flex-col items-center gap-4">
            <app-envelope class="w-56" [state]="envelope()" />
            <div role="status" aria-live="polite" class="min-h-16 text-center">
              @if (envelope() !== 'closed') {
                <p class="text-ink-muted">{{ c.revealLead }}</p>
                <p
                  class="font-display text-3xl font-bold tracking-tight motion-safe:animate-reveal-name"
                >
                  {{ c.revealName }}
                </p>
                <p class="mt-1 motion-safe:animate-reveal-rest">{{ c.revealWink }}</p>
              }
            </div>
            <button type="button" appButton="secondary" (click)="toggleEnvelope()">
              {{ envelope() === 'closed' ? c.openEnvelope : c.closeEnvelope }}
            </button>
          </div>
        </div>
      </section>

      <!-- Mailbox band -->
      <section class="relative overflow-hidden px-6 py-16 md:px-10">
        <div
          aria-hidden="true"
          class="absolute -bottom-20 -left-16 h-48 w-72 rounded-full bg-sage"
        ></div>
        <div class="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div class="md:order-2">
            <span class="grid size-10 place-items-center rounded-full bg-subtle"
              ><svg lucideMessageCircle [size]="20"></svg
            ></span>
            <h2 class="mt-4 font-display text-3xl font-bold tracking-tight md:text-5xl">
              {{ c.mailboxTitle }}
            </h2>
            <p class="mt-3 text-lg text-ink-muted">{{ c.mailboxBody }}</p>
            <p class="mt-4 flex items-start gap-2 font-bold">
              <svg lucideShieldCheck [size]="20" class="mt-0.5 shrink-0 text-success"></svg
              >{{ c.guarantee }}
            </p>
          </div>
          <div class="flex flex-col gap-2 rounded-card bg-surface p-5 shadow-card">
            <p
              class="max-w-5/6 self-end rounded-card rounded-br-md bg-primary px-4 py-2.5 text-on-primary motion-safe:animate-pop"
            >
              <span class="sr-only">{{ c.srMe }} </span>{{ c.bubbleMine }}
            </p>
            <p
              class="max-w-5/6 self-start rounded-card rounded-bl-md bg-subtle px-4 py-2.5 text-ink motion-safe:animate-pop [animation-delay:700ms]"
            >
              <span class="sr-only">{{ c.srThem }} </span>{{ c.bubbleTheirs }}
            </p>
          </div>
        </div>
      </section>

      <!-- Wishlist band -->
      <section class="relative overflow-hidden bg-surface px-6 py-16 md:px-10">
        <div
          aria-hidden="true"
          class="absolute top-10 -right-10 size-28 rounded-full bg-clay"
        ></div>
        <div class="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <span class="grid size-10 place-items-center rounded-full bg-subtle"
              ><svg lucideListChecks [size]="20"></svg
            ></span>
            <h2 class="mt-4 font-display text-3xl font-bold tracking-tight md:text-5xl">
              {{ c.wishlist.title }}
            </h2>
            <p class="mt-3 text-lg text-ink-muted">{{ c.wishlist.body }}</p>
          </div>
          <div class="flex flex-col gap-4">
            <ul class="flex flex-wrap gap-2">
              @for (wish of c.wishes; track wish) {
                <li appChip>{{ wish }}</li>
              }
            </ul>
            <div class="rounded-card bg-danger-soft p-5 shadow-card">
              <p class="flex items-center gap-2 font-display text-lg font-semibold text-danger">
                <svg lucideBan [size]="20"></svg>{{ c.dontListTitle }}
              </p>
              <ul class="mt-2 list-inside list-disc text-ink">
                @for (item of c.dontListItems; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Exclusions band -->
      <section class="relative overflow-hidden px-6 py-16 md:px-10">
        <div
          aria-hidden="true"
          class="absolute -top-10 left-1/3 size-24 rounded-full bg-mustard"
        ></div>
        <div class="relative mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div class="md:order-2">
            <span class="grid size-10 place-items-center rounded-full bg-subtle"
              ><svg lucideUnlink [size]="20"></svg
            ></span>
            <h2 class="mt-4 font-display text-3xl font-bold tracking-tight md:text-5xl">
              {{ c.exclusions.title }}
            </h2>
            <p class="mt-3 text-lg text-ink-muted">{{ c.exclusions.body }}</p>
          </div>
          <figure class="flex flex-col items-center gap-4">
            <div class="flex items-center gap-3" aria-hidden="true">
              <span
                class="grid size-20 place-items-center rounded-full bg-sage font-display text-3xl font-bold text-ink"
                >{{ c.exclusionNames[0][0] }}</span
              >
              <span class="h-1 w-8 rounded-full bg-line"></span>
              <span
                class="grid size-12 place-items-center rounded-full bg-surface text-danger shadow-card"
                ><svg lucideUnlink [size]="22"></svg
              ></span>
              <span class="h-1 w-8 rounded-full bg-line"></span>
              <span
                class="grid size-20 place-items-center rounded-full bg-clay font-display text-3xl font-bold text-ink"
                >{{ c.exclusionNames[1][0] }}</span
              >
            </div>
            <figcaption class="font-semibold">{{ c.exclusionCaption }}</figcaption>
          </figure>
        </div>
      </section>

      <!-- How it works band -->
      <section class="bg-surface px-6 py-16 md:px-10">
        <div class="mx-auto max-w-5xl">
          <h2 class="font-display text-3xl font-bold tracking-tight md:text-5xl">
            {{ c.howTitle }}
          </h2>
          <ol class="mt-8 grid gap-4 md:grid-cols-3">
            @for (step of c.steps; track $index) {
              <li class="rounded-card bg-canvas p-5">
                <span
                  class="grid size-10 place-items-center rounded-full bg-primary font-display text-lg font-bold text-on-primary"
                  >{{ $index + 1 }}</span
                >
                <p class="mt-4 font-display text-xl font-bold">{{ step.title }}</p>
                <p class="mt-1 text-ink-muted">{{ step.body }}</p>
              </li>
            }
          </ol>
          <ul class="mt-8 flex flex-wrap gap-2">
            <li appChip><svg lucideLink [size]="16"></svg>{{ c.invite.title }}</li>
            <li appChip><svg lucideSparkles [size]="16"></svg>{{ c.free.title }}</li>
          </ul>
        </div>
      </section>

      <!-- Closing band -->
      <section
        class="relative overflow-hidden bg-primary px-6 py-16 text-center text-on-primary md:px-10 md:py-24"
      >
        <div
          aria-hidden="true"
          class="absolute -bottom-12 -left-12 size-40 rounded-full bg-mustard opacity-80"
        ></div>
        <div aria-hidden="true" class="absolute -top-8 right-6 size-16 rounded-full bg-clay"></div>
        <div class="relative mx-auto flex max-w-xl flex-col items-center gap-4">
          <h2 class="font-display text-4xl font-bold tracking-tight md:text-5xl">
            {{ c.closingTitle }}
          </h2>
          <p class="text-lg">{{ c.closingBody }}</p>
          <!-- New recipe: inverted primary button on a primary band (surface fill, primary text). -->
          <a
            routerLink="/sign-up"
            class="mt-2 inline-flex h-14 w-full items-center justify-center rounded-full bg-surface px-8 font-display text-lg font-semibold text-primary transition-colors duration-200 hover:bg-canvas focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-surface md:w-auto"
            >{{ c.createAccount }}</a
          >
          <a
            [routerLink]="signIn"
            class="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
            >{{ c.signIn }}</a
          >
        </div>
      </section>
    </main>

    <!-- Sticky CTA on phones once the hero CTA has scrolled out of view -->
    @if (showSticky()) {
      <div
        class="fixed inset-x-0 bottom-0 z-40 bg-surface px-6 pt-3 pb-4 shadow-sheet md:hidden motion-safe:animate-sheet-rise"
      >
        <a routerLink="/sign-up" appButton class="w-full">{{ c.createAccount }}</a>
      </div>
    }
  `,
})
export class VariantB {
  readonly copy = input.required<LandingCopy>();
  readonly apiDown = input(false);
  readonly accountDeleted = input(false);
  readonly retry = output();
  protected readonly signIn = SIGN_IN;

  protected readonly envelope = signal<EnvelopeState>('closed');
  protected readonly showSticky = signal(false);
  private readonly heroCta = viewChild.required<ElementRef<HTMLElement>>('heroCta');
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new IntersectionObserver(([entry]) =>
        this.showSticky.set(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      );
      observer.observe(this.heroCta().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    destroyRef.onDestroy(() => clearTimeout(this.timer));
  }

  protected toggleEnvelope(): void {
    clearTimeout(this.timer);
    if (this.envelope() !== 'closed') {
      this.envelope.set('closed');
      return;
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      this.envelope.set('open');
      return;
    }
    this.envelope.set('opening');
    this.timer = setTimeout(() => this.envelope.set('open'), 1300);
  }
}
