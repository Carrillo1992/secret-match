import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Chip } from '../../../../shared/ui/chip/chip';
import { GiftIllustration } from '../../../../shared/ui/gift-illustration/gift-illustration';
import { PreferencesMenu } from '../../../../shared/ui/preferences-menu/preferences-menu';
import { KoFiLink } from '../../../../shared/ui/ko-fi-link/ko-fi-link';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { EnvelopeDemo } from '../../components/envelope-demo/envelope-demo';
import { FeatureBand } from '../../components/feature-band/feature-band';
import { ApiHealth } from '../../data-access/api-health';
import { SIGN_IN } from '../../../../core/route-paths';

/** "Cómo funciona": from creating a Group to the Draw. */
const STEPS: readonly { readonly title: string; readonly body: string }[] = [
  { title: $localize`Crea un grupo`, body: $localize`Ponle nombre, fecha y presupuesto.` },
  {
    title: $localize`Comparte el enlace`,
    body: $localize`No creas cuentas por nadie: cada uno entra con el enlace de invitación.`,
  },
  { title: $localize`Haz el sorteo`, body: $localize`Lanzas el sorteo y cada uno abre su sobre.` },
];

/**
 * The signed-out landing (#115): what SecretMatch is and why to use it, in one scroll. A showcase
 * layout of its own (DESIGN.md): a hero band, one band per selling point with a live mini-demo,
 * "how it works" and a closing band in `primary`. On phones a sticky "Crear cuenta" rises once the
 * hero's one has scrolled away, and leaves again when the closing one comes into view.
 */
@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    Button,
    Chip,
    EnvelopeDemo,
    FeatureBand,
    GiftIllustration,
    KoFiLink,
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
  templateUrl: './landing-page.html',
  host: { class: 'block min-h-dvh bg-canvas' },
  providers: [ApiHealth],
})
export class LandingPage {
  protected readonly signIn = SIGN_IN;
  protected readonly health = inject(ApiHealth);
  /**
   * Whether the User arrives right after deleting their account (`ProfilePage`). It travels in the
   * navigation's state, not the URL, so a reload or a shared link does not show it again.
   */
  protected readonly accountDeleted =
    inject(Router).currentNavigation()?.extras.state?.['accountDeleted'] === true;

  protected readonly steps = STEPS;

  private readonly heroCta = viewChild.required<ElementRef<HTMLElement>>('heroCta');
  private readonly closingCta = viewChild.required<ElementRef<HTMLElement>>('closingCta');
  /** The hero's call to action has scrolled away above the viewport. */
  private readonly heroCtaGone = signal(false);
  private readonly closingCtaInView = signal(false);
  protected readonly showStickyCta = computed(() => this.heroCtaGone() && !this.closingCtaInView());

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof IntersectionObserver !== 'function') {
        return;
      }
      const hero = this.heroCta().nativeElement;
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === hero) {
            this.heroCtaGone.set(!entry.isIntersecting && entry.boundingClientRect.top < 0);
          } else {
            this.closingCtaInView.set(entry.isIntersecting);
          }
        }
      });
      observer.observe(hero);
      observer.observe(this.closingCta().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
