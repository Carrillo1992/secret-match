import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideBan, LucideLink, LucideShieldCheck, LucideUnlink } from '@lucide/angular';
import { SIGN_IN } from '../../../core/route-paths';
import { Envelope } from '../../groups/components/envelope/envelope';
import { Alert } from '../../../shared/ui/alert/alert';
import { Button } from '../../../shared/ui/button/button';
import { Chip } from '../../../shared/ui/chip/chip';
import { GiftIllustration } from '../../../shared/ui/gift-illustration/gift-illustration';
import { PreferencesMenu } from '../../../shared/ui/preferences-menu/preferences-menu';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { LandingCopy } from './landing-copy';

/**
 * PROTOTYPE (#115) option C, "La historia de un grupo": a sheet-like header and hero, then one
 * vertical timeline that tells a Group's story, each step a numbered node on a `line` rail with a
 * small card. On desktop the rail is centred and the cards alternate left and right.
 */
@Component({
  selector: 'app-landing-variant-c',
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
    LucideLink,
    LucideShieldCheck,
    LucideUnlink,
  ],
  host: { class: 'block min-h-dvh bg-canvas' },
  template: `
    @let c = copy();
    <div class="relative h-60 shrink-0 sm:h-72">
      <app-gift-illustration class="absolute inset-0" />
      <header
        class="relative mx-auto flex min-h-11 max-w-md items-center justify-between px-6 pt-5"
      >
        <a
          routerLink="/"
          class="inline-flex min-h-11 items-center font-display text-xl font-bold tracking-tight text-ink"
          >SecretMatch</a
        >
        <app-preferences-menu raised />
      </header>
    </div>

    <main>
      <section
        class="relative -mt-8 rounded-t-sheet bg-surface px-6 pt-7 pb-8 text-center shadow-sheet sm:mx-auto sm:w-full sm:max-w-md sm:rounded-sheet sm:px-8 sm:shadow-card"
      >
        <div class="flex flex-col items-center gap-6">
          @if (accountDeleted()) {
            <p appAlert="success" class="w-full">{{ c.accountDeleted }}</p>
          }
          <div class="flex flex-col gap-2">
            <h1 class="font-display text-4xl font-bold tracking-tight">{{ c.tagline }}</h1>
            <p class="text-lg text-ink-muted">{{ c.lead }}</p>
          </div>
          <ul class="flex flex-wrap justify-center gap-2">
            @for (chip of c.freeChips; track chip) {
              <li appChip>{{ chip }}</li>
            }
          </ul>
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
      </section>

      <section class="mx-auto max-w-4xl px-6 py-12 md:px-10" aria-labelledby="c-story">
        <h2 id="c-story" class="text-center font-display text-2xl font-bold tracking-tight">
          {{ c.howTitle }}
        </h2>
        <ol class="relative mt-8">
          <!-- The rail -->
          <span
            aria-hidden="true"
            class="absolute top-5 bottom-5 left-5 w-0.5 -translate-x-1/2 bg-line md:left-1/2"
          ></span>

          @for (node of c.story; track $index; let i = $index; let even = $even) {
            <li
              class="relative grid grid-cols-[2.5rem_1fr] gap-4 pb-8 last:pb-0 md:grid-cols-[1fr_2.5rem_1fr] md:gap-6"
            >
              <span
                class="relative z-10 grid size-10 place-items-center rounded-full bg-primary font-display text-lg font-bold text-on-primary md:col-start-2 md:row-start-1"
                >{{ i + 1 }}</span
              >
              <div
                class="min-w-0 rounded-card bg-surface p-5 shadow-card md:row-start-1"
                [class]="even ? 'md:col-start-1' : 'md:col-start-3'"
              >
                <h3 class="font-display text-lg font-semibold">{{ node.title }}</h3>
                <p class="mt-1 text-ink-muted">{{ node.body }}</p>

                @switch (i) {
                  @case (0) {
                    <div class="mt-4 rounded-field bg-canvas p-4">
                      <p class="font-bold">{{ c.groupName }}</p>
                      <ul class="mt-2 flex flex-wrap gap-2">
                        @for (chip of c.groupChips; track chip) {
                          <li appChip>{{ chip }}</li>
                        }
                      </ul>
                    </div>
                  }
                  @case (1) {
                    <p
                      class="mt-4 flex items-center gap-2 truncate rounded-field bg-field px-4 py-3 text-sm font-semibold"
                    >
                      <svg lucideLink [size]="16" class="shrink-0"></svg
                      >app.secret-match.app/join/7KQ2…
                    </p>
                  }
                  @case (2) {
                    <div class="mt-4 flex items-center gap-3" aria-hidden="true">
                      <span
                        class="grid size-11 place-items-center rounded-full bg-sage font-display font-bold"
                        >{{ c.exclusionNames[0][0] }}</span
                      >
                      <svg lucideUnlink [size]="20" class="text-danger"></svg>
                      <span
                        class="grid size-11 place-items-center rounded-full bg-clay font-display font-bold"
                        >{{ c.exclusionNames[1][0] }}</span
                      >
                    </div>
                    <p class="mt-2 text-sm font-semibold">{{ c.exclusionCaption }}</p>
                  }
                  @case (3) {
                    <ul class="mt-4 flex flex-wrap gap-2">
                      @for (wish of c.wishes; track wish) {
                        <li appChip>{{ wish }}</li>
                      }
                    </ul>
                    <div class="mt-3 rounded-field bg-danger-soft px-4 py-3">
                      <p class="flex items-center gap-2 font-semibold text-danger">
                        <svg lucideBan [size]="18"></svg>{{ c.dontListTitle }}
                      </p>
                      <p class="mt-1 text-ink">{{ c.dontListItems.join(', ') }}</p>
                    </div>
                  }
                  @case (4) {
                    <div class="mt-4 flex items-center gap-4">
                      <app-envelope class="w-24 shrink-0 motion-safe:animate-bob" />
                      <p class="font-semibold">{{ c.revealWink }}</p>
                    </div>
                  }
                  @case (5) {
                    <div class="mt-4 flex flex-col gap-2">
                      <p
                        class="max-w-5/6 self-end rounded-card rounded-br-md bg-primary px-4 py-2.5 text-on-primary"
                      >
                        <span class="sr-only">{{ c.srMe }} </span>{{ c.bubbleMine }}
                      </p>
                      <p
                        class="max-w-5/6 self-start rounded-card rounded-bl-md bg-subtle px-4 py-2.5 text-ink"
                      >
                        <span class="sr-only">{{ c.srThem }} </span>{{ c.bubbleTheirs }}
                      </p>
                    </div>
                    <p class="mt-3 flex items-start gap-2 font-bold">
                      <svg lucideShieldCheck [size]="20" class="mt-0.5 shrink-0"></svg
                      >{{ c.guarantee }}
                    </p>
                  }
                  @case (6) {
                    <div class="mt-4 flex flex-col items-center gap-2">
                      <a routerLink="/sign-up" appButton class="w-full">{{ c.createAccount }}</a>
                      <a [routerLink]="signIn" appLink standalone>{{ c.signIn }}</a>
                    </div>
                  }
                }
              </div>
            </li>
          }
        </ol>
      </section>
    </main>
  `,
})
export class VariantC {
  readonly copy = input.required<LandingCopy>();
  readonly apiDown = input(false);
  readonly accountDeleted = input(false);
  readonly retry = output();
  protected readonly signIn = SIGN_IN;
}
