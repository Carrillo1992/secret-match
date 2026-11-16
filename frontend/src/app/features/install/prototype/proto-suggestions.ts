// PROTOTYPE (#118), throwaway: the install suggestion in each variant's shape.
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideSmartphone, LucideX } from '@lucide/angular';
import { Button } from '../../../shared/ui/button/button';
import { IconButton } from '../../../shared/ui/icon-button/icon-button';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { focusSoon, InstallPrototypeState } from './install-prototype-state';
import { ProtoGuideWell } from './proto-guide-well';

/** Where focus goes after "Ahora no": the page heading. */
export const GROUP_HEADING_ID = 'proto-group-name';

/** A: a Notice-shaped card in the page flow, with actions, and the iOS guide expanding inside it. */
@Component({
  selector: 'app-proto-suggestion-a',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, LucideSmartphone, ProtoGuideWell, TextLink],
  host: { class: 'block' },
  template: `
    <section
      aria-labelledby="proto-suggestion-title"
      class="flex gap-3 rounded-card bg-surface p-5 shadow-card motion-safe:animate-pop"
    >
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
      >
        <svg lucideSmartphone [size]="20"></svg>
      </div>
      <div class="min-w-0 flex-1">
        <h2 id="proto-suggestion-title" class="font-display text-lg font-semibold">
          Ten SecretMatch a mano
        </h2>
        <p class="mt-1.5 text-ink-muted">
          Instálala en tu pantalla de inicio y entra a tu grupo con un toque, sin buscar el enlace.
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-4">
          <button
            id="proto-suggestion-install"
            type="button"
            appButton="secondary"
            [attr.aria-expanded]="
              state.platform() === 'ios' ? state.inlineGuide() === 'suggestion' : null
            "
            (click)="state.installFromSuggestion('A')"
          >
            Instalar
          </button>
          <button type="button" appLink standalone (click)="notNow()">Ahora no</button>
        </div>
        @if (state.inlineGuide() === 'suggestion') {
          <app-proto-guide-well
            class="mt-4"
            headingId="proto-guide-suggestion"
            (done)="collapseGuide()"
          />
        }
      </div>
    </section>
  `,
})
export class ProtoSuggestionA {
  protected readonly state = inject(InstallPrototypeState);

  protected notNow(): void {
    this.state.notNow();
    focusSoon(GROUP_HEADING_ID);
  }

  protected collapseGuide(): void {
    this.state.inlineGuide.set(null);
    focusSoon('proto-suggestion-install');
  }
}

/** B: a bar fixed at the bottom on phones (Sticky-CTA shape), a small card bottom-right from `sm`. */
@Component({
  selector: 'app-proto-suggestion-b',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, IconButton, LucideSmartphone, LucideX],
  template: `
    <section
      aria-labelledby="proto-suggestion-title"
      class="fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 bg-surface px-4 py-3 shadow-sheet motion-safe:animate-sheet-rise sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-sm sm:rounded-card sm:py-4 sm:pl-5 sm:shadow-card"
    >
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
      >
        <svg lucideSmartphone [size]="20"></svg>
      </div>
      <h2 id="proto-suggestion-title" class="min-w-0 flex-1 font-semibold">
        Instala SecretMatch en tu móvil
      </h2>
      <button
        type="button"
        appButton="secondary"
        class="shrink-0 px-4!"
        (click)="state.installFromSuggestion('B')"
      >
        Instalar
      </button>
      <button type="button" appIconButton aria-label="Ahora no" (click)="notNow()">
        <svg lucideX [size]="20"></svg>
      </button>
    </section>
  `,
})
export class ProtoSuggestionB {
  protected readonly state = inject(InstallPrototypeState);

  protected notNow(): void {
    this.state.notNow();
    focusSoon(GROUP_HEADING_ID);
  }
}

/** C: a one-line strip right under the top bar, full width, pushing the page down. */
@Component({
  selector: 'app-proto-suggestion-c',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconButton, LucideSmartphone, LucideX, TextLink],
  host: { class: 'block' },
  template: `
    <section
      aria-labelledby="proto-suggestion-title"
      class="relative left-1/2 w-screen -translate-x-1/2 border-b border-line/40 bg-canvas"
    >
      <div class="mx-auto flex max-w-2xl items-center gap-2 px-6 text-sm">
        <svg lucideSmartphone [size]="18" class="shrink-0"></svg>
        <h2 id="proto-suggestion-title" class="min-w-0 flex-1">
          Instala la app para entrar con un toque
        </h2>
        <button
          type="button"
          appLink
          standalone
          class="shrink-0"
          (click)="state.installFromSuggestion('C')"
        >
          Instalar
        </button>
        <button type="button" appIconButton aria-label="Ahora no" (click)="notNow()">
          <svg lucideX [size]="18"></svg>
        </button>
      </div>
    </section>
  `,
})
export class ProtoSuggestionC {
  protected readonly state = inject(InstallPrototypeState);

  protected notNow(): void {
    this.state.notNow();
    focusSoon(GROUP_HEADING_ID);
  }
}
