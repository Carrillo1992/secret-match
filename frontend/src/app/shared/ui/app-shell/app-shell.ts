import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Page frame for screens inside the app, once someone has signed in: a top bar on `surface` with
 * the wordmark and the screen's bar actions, and the page on `canvas`, without illustration.
 * Project the bar actions with the `shellActions` attribute; everything else goes inside `<main>`.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: { class: 'flex min-h-dvh flex-col' },
  template: `
    <header class="border-b border-line/40 bg-surface">
      <div class="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-4 px-6 py-3">
        <a
          routerLink="/home"
          class="inline-flex min-h-11 items-center font-display text-xl font-bold tracking-tight text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >SecretMatch</a
        >
        <ng-content select="[shellActions]" />
      </div>
    </header>
    <main class="mx-auto w-full max-w-2xl flex-1 px-6 pt-8 pb-12">
      <ng-content />
    </main>
  `,
})
export class AppShell {}
