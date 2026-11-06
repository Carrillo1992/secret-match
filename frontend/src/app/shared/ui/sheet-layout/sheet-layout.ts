import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GiftIllustration } from '../gift-illustration/gift-illustration';

/**
 * Page frame for focused, single-task screens (sign-up, confirmations, landing): the gift
 * illustration on top and the content in a sheet that rises over it. On wide screens the
 * sheet becomes a centred card. Projected content goes inside the page's `<main>`.
 */
@Component({
  selector: 'app-sheet-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GiftIllustration, RouterLink],
  host: { class: 'flex min-h-dvh flex-col' },
  template: `
    <div class="relative h-60 shrink-0 sm:h-72">
      <app-gift-illustration class="absolute inset-0" />
      <header class="relative mx-auto flex min-h-11 max-w-md items-center px-6 pt-5">
        <a
          routerLink="/"
          class="inline-flex min-h-11 items-center font-display text-xl font-bold tracking-tight text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >SecretMatch</a
        >
      </header>
    </div>
    <main
      class="relative -mt-8 flex flex-1 flex-col rounded-t-sheet bg-surface px-6 pt-7 pb-8 shadow-sheet sm:mx-auto sm:mb-12 sm:w-full sm:max-w-md sm:flex-none sm:rounded-sheet sm:px-8 sm:shadow-card"
    >
      <ng-content />
    </main>
  `,
})
export class SheetLayout {}
