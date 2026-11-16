// PROTOTYPE (#118), throwaway: three variants of "Instalar la app" (Preferences entry, install
// suggestion on the Group page, iOS guide) on /prototype/install?variant=A|B|C, dev builds only.
// The Group page is a stub look-alike inside the real app-shell; all state is in memory.
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideGift,
  LucideSettings2,
} from '@lucide/angular';
import { AppShell } from '../../../shared/ui/app-shell/app-shell';
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet';
import { Button } from '../../../shared/ui/button/button';
import { Chip } from '../../../shared/ui/chip/chip';
import { IconButton } from '../../../shared/ui/icon-button/icon-button';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { ProtoIosGuideSteps } from './ios-guide-steps';
import { focusSoon, InstallPrototypeState, Variant, VARIANTS } from './install-prototype-state';
import { ProtoNativeDialog } from './proto-native-dialog';
import { ProtoPreferencesSheet } from './proto-preferences-sheet';
import {
  GROUP_HEADING_ID,
  ProtoSuggestionA,
  ProtoSuggestionB,
  ProtoSuggestionC,
} from './proto-suggestions';
import { PrototypeBar } from './prototype-bar';

const MEMBERS = [
  { name: 'Lucía', admin: true },
  { name: 'Marta', admin: false },
  { name: 'Ana', admin: false },
  { name: 'Luis', admin: false },
  { name: 'Jorge', admin: false },
];

@Component({
  selector: 'app-install-prototype-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [InstallPrototypeState],
  imports: [
    AppShell,
    BottomSheet,
    Button,
    Chip,
    IconButton,
    LucideChevronLeft,
    LucideChevronRight,
    LucideGift,
    LucideSettings2,
    PrototypeBar,
    ProtoIosGuideSteps,
    ProtoNativeDialog,
    ProtoPreferencesSheet,
    ProtoSuggestionA,
    ProtoSuggestionB,
    ProtoSuggestionC,
    TextLink,
  ],
  host: { class: 'block overflow-x-clip', '(document:keydown)': 'onKey($event)' },
  // The real Preferences menu hides here; the prototype's own button below opens the copy.
  styles: [':host ::ng-deep app-preferences-menu { display: none !important; }'],
  template: `
    <app-shell>
      <button
        shellActions
        id="proto-prefs"
        type="button"
        appIconButton
        aria-label="Preferencias"
        aria-haspopup="dialog"
        [attr.aria-expanded]="state.prefsOpen()"
        (click)="state.prefsOpen.set(true)"
      >
        <svg lucideSettings2 [size]="22"></svg>
      </button>

      @if (variant() === 'C' && state.suggestionVisible()) {
        <app-proto-suggestion-c class="-mt-8 mb-4" />
      }

      <a href="#" appLink standalone class="gap-1" (click)="$event.preventDefault()">
        <svg lucideChevronLeft [size]="18"></svg>
        Mis grupos
      </a>
      <h1
        [id]="headingId"
        tabindex="-1"
        class="mt-4 font-display text-3xl font-bold tracking-tight break-words focus:outline-none"
      >
        Cena de Navidad del curro
      </h1>

      @if (variant() === 'A' && state.suggestionVisible()) {
        <app-proto-suggestion-a class="mt-6" />
      }

      <section aria-labelledby="proto-draw" class="mt-6 rounded-card bg-surface p-5 shadow-card">
        <div class="flex items-center gap-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink"
          >
            <svg lucideGift [size]="20"></svg>
          </div>
          <h2 id="proto-draw" class="font-display text-lg font-semibold">Sorteo</h2>
        </div>
        <p class="mt-4 text-ink-muted">
          Sois 5. Cuando estéis todos, haz el sorteo: a cada uno le tocará alguien en secreto.
        </p>
        <button type="button" appButton class="mt-4 w-full">Hacer el sorteo</button>
      </section>

      <section
        aria-labelledby="proto-wishlist"
        class="mt-6 rounded-card bg-surface p-5 shadow-card"
      >
        <h2 id="proto-wishlist" class="font-display text-lg font-semibold">Tu lista de deseos</h2>
        <p class="mt-1.5 text-ink-muted">Solo la verá quien te regale, cuando se haga el sorteo.</p>
        <a href="#" appLink standalone class="mt-2 gap-0.5" (click)="$event.preventDefault()">
          Escribir tus deseos
          <svg lucideChevronRight [size]="18"></svg>
        </a>
      </section>

      <section aria-labelledby="proto-members" class="mt-6 rounded-card bg-surface p-5 shadow-card">
        <h2 id="proto-members" class="font-display text-lg font-semibold">
          Miembros ({{ members.length }})
        </h2>
        <ul class="mt-3 flex flex-col gap-3">
          @for (member of members; track member.name) {
            <li class="flex items-center gap-3">
              <span
                aria-hidden="true"
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle font-display font-bold"
                >{{ member.name[0] }}</span
              >
              <span>{{ member.name }}</span>
              @if (member.admin) {
                <span appChip>Admin</span>
              }
            </li>
          }
        </ul>
      </section>

      @if (variant() === 'B' && state.suggestionVisible()) {
        <!-- Room so the fixed bar never hides the end of the page on phones. -->
        <div class="h-20 sm:hidden" aria-hidden="true"></div>
        <app-proto-suggestion-b />
      }
      <!-- Room for the prototype bar. -->
      <div class="h-36" aria-hidden="true"></div>
    </app-shell>

    <app-proto-preferences-sheet [variant]="variant()" />

    <app-bottom-sheet
      heading="Instalar SecretMatch"
      [open]="state.guideSheetFrom() !== null"
      (closed)="closeGuideSheet()"
    >
      <app-proto-ios-guide-steps [look]="variant() === 'C' ? 'numbered' : 'rows'" />
    </app-bottom-sheet>

    <app-proto-native-dialog
      [open]="state.nativeDialog() !== null"
      (answered)="nativeAnswered($event)"
    />

    <app-prototype-bar [variant]="variant()" (step)="step($event)" />
  `,
})
export class InstallPrototypePage {
  protected readonly state = inject(InstallPrototypeState);
  protected readonly headingId = GROUP_HEADING_ID;
  protected readonly members = MEMBERS;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap);

  protected readonly variant = computed<Variant>(() => {
    const raw = this.params()?.get('variant')?.toUpperCase();
    return VARIANTS.find((v) => v === raw) ?? 'A';
  });

  constructor() {
    const root = document.documentElement;
    const original = root.dataset['theme'];
    effect(() => {
      const theme = this.state.theme();
      if (theme === 'system') {
        delete root.dataset['theme'];
      } else {
        root.dataset['theme'] = theme;
      }
    });
    inject(DestroyRef).onDestroy(() => {
      if (original) {
        root.dataset['theme'] = original;
      } else {
        delete root.dataset['theme'];
      }
    });
    // Switching variant starts the visible pieces over, so each one is seen fresh.
    effect(() => {
      this.variant();
      this.state.inlineGuide.set(null);
      this.state.guideSheetFrom.set(null);
    });
  }

  protected step(delta: number): void {
    const index = VARIANTS.indexOf(this.variant());
    const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
    void this.router.navigate([], {
      queryParams: { variant: next },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest('input, textarea, [contenteditable], [role="radiogroup"], dialog[open]') ||
      (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
    ) {
      return;
    }
    this.step(event.key === 'ArrowLeft' ? -1 : 1);
  }

  protected nativeAnswered(accepted: boolean): void {
    const from = this.state.nativeDialog();
    this.state.nativeResult(accepted);
    // The button that opened it is gone either way.
    focusSoon(from === 'entry' ? 'proto-prefs' : GROUP_HEADING_ID);
  }

  protected closeGuideSheet(): void {
    const from = this.state.guideSheetFrom();
    this.state.guideSheetFrom.set(null);
    if (from === 'entry') {
      focusSoon('proto-prefs');
    }
  }
}
