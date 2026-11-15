import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideGift,
  LucideHeartOff,
  LucideLink,
  LucideListChecks,
  LucideShieldCheck,
  LucideSparkles,
} from '@lucide/angular';
import { SIGN_IN } from '../../../core/route-paths';
import { Alert } from '../../../shared/ui/alert/alert';
import { Button } from '../../../shared/ui/button/button';
import { SheetLayout } from '../../../shared/ui/sheet-layout/sheet-layout';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { LandingCopy } from './landing-copy';

/**
 * PROTOTYPE (#115) option A, "El sobre que sigue": the sheet screen as today, but the sheet keeps
 * going: hero + CTA above the fold, then how it works, feature rows, an anonymity well and a closing CTA.
 */
@Component({
  selector: 'app-landing-variant-a',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    Button,
    RouterLink,
    SheetLayout,
    TextLink,
    LucideGift,
    LucideHeartOff,
    LucideLink,
    LucideListChecks,
    LucideShieldCheck,
    LucideSparkles,
  ],
  template: `
    <app-sheet-layout>
      @let c = copy();
      <div class="flex flex-col items-center gap-6 text-center">
        @if (accountDeleted()) {
          <p appAlert="success" class="w-full">{{ c.accountDeleted }}</p>
        }
        <div class="flex flex-col gap-2">
          <h1 class="font-display text-4xl font-bold tracking-tight">{{ c.tagline }}</h1>
          <p class="text-lg text-ink-muted">{{ c.lead }}</p>
        </div>
        <div class="flex w-full flex-col items-center gap-2">
          <a routerLink="/sign-up" appButton class="w-full">{{ c.createAccount }}</a>
          <a [routerLink]="signIn" appLink standalone>{{ c.signIn }}</a>
        </div>
        <div role="status" aria-live="polite" class="flex flex-col items-center gap-3">
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

      <section class="mt-10" aria-labelledby="a-how">
        <h2 id="a-how" class="font-display text-lg font-semibold">{{ c.howTitle }}</h2>
        <ol class="mt-4 flex flex-col gap-4">
          @for (step of c.steps; track $index) {
            <li class="flex gap-4">
              <span
                class="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-bold text-on-primary"
                >{{ $index + 1 }}</span
              >
              <div>
                <p class="font-bold">{{ step.title }}</p>
                <p class="text-ink-muted">{{ step.body }}</p>
              </div>
            </li>
          }
        </ol>
      </section>

      <section class="mt-10" aria-labelledby="a-features">
        <h2 id="a-features" class="font-display text-lg font-semibold">{{ c.featuresTitle }}</h2>
        <ul class="mt-4 flex flex-col gap-5">
          <li class="flex gap-4">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"
              ><svg lucideLink [size]="20"></svg
            ></span>
            <div>
              <p class="font-bold">{{ c.invite.title }}</p>
              <p class="text-ink-muted">{{ c.invite.body }}</p>
            </div>
          </li>
          <li class="flex gap-4">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"
              ><svg lucideHeartOff [size]="20"></svg
            ></span>
            <div>
              <p class="font-bold">{{ c.exclusions.title }}</p>
              <p class="text-ink-muted">{{ c.exclusions.body }}</p>
            </div>
          </li>
          <li class="flex gap-4">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"
              ><svg lucideListChecks [size]="20"></svg
            ></span>
            <div>
              <p class="font-bold">{{ c.wishlist.title }}</p>
              <p class="text-ink-muted">{{ c.wishlist.body }}</p>
            </div>
          </li>
          <li class="flex gap-4">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"
              ><svg lucideGift [size]="20"></svg
            ></span>
            <div>
              <p class="font-bold">{{ c.reveal.title }}</p>
              <p class="text-ink-muted">{{ c.reveal.body }}</p>
            </div>
          </li>
          <li class="flex gap-4">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"
              ><svg lucideSparkles [size]="20"></svg
            ></span>
            <div>
              <p class="font-bold">{{ c.free.title }}</p>
              <p class="text-ink-muted">{{ c.free.body }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section class="mt-10 rounded-card bg-canvas p-5" aria-labelledby="a-mailbox">
        <div class="flex items-center gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"
            ><svg lucideShieldCheck [size]="20"></svg
          ></span>
          <h2 id="a-mailbox" class="font-display text-lg font-semibold">{{ c.mailboxTitle }}</h2>
        </div>
        <p class="mt-2 text-ink-muted">{{ c.mailboxBody }}</p>
        <div class="mt-4 flex flex-col gap-2">
          <p
            class="max-w-5/6 self-end rounded-card rounded-br-md bg-primary px-4 py-2.5 text-on-primary"
          >
            <span class="sr-only">{{ c.srMe }} </span>{{ c.bubbleMine }}
          </p>
          <p class="max-w-5/6 self-start rounded-card rounded-bl-md bg-subtle px-4 py-2.5 text-ink">
            <span class="sr-only">{{ c.srThem }} </span>{{ c.bubbleTheirs }}
          </p>
        </div>
        <p class="mt-4 font-bold">{{ c.guarantee }}</p>
      </section>

      <section class="mt-10 flex flex-col items-center gap-2 text-center" aria-labelledby="a-end">
        <h2 id="a-end" class="font-display text-2xl font-bold tracking-tight">
          {{ c.closingTitle }}
        </h2>
        <p class="text-ink-muted">{{ c.closingBody }}</p>
        <a routerLink="/sign-up" appButton class="mt-4 w-full">{{ c.createAccount }}</a>
        <a [routerLink]="signIn" appLink standalone>{{ c.signIn }}</a>
      </section>
    </app-sheet-layout>
  `,
})
export class VariantA {
  readonly copy = input.required<LandingCopy>();
  readonly apiDown = input(false);
  readonly accountDeleted = input(false);
  readonly retry = output();
  protected readonly signIn = SIGN_IN;
}
