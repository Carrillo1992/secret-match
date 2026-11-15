import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LucideCoffee } from '@lucide/angular';
import { KO_FI_URL } from '../../../core/ko-fi';
import { Button } from '../button/button';
import { TextLink } from '../text-link/text-link';

/** `link`: a quiet inline link, inside a settings screen. `button`: a secondary button on its own. */
export type KoFiLook = 'link' | 'button';

/**
 * The "buy me a coffee" link to SecretMatch's Ko-fi page (#115): the Lucide `Coffee` icon, the
 * projected label, and a screen-reader-only note that it opens in a new tab. A plain link to
 * another site, never Ko-fi's widget or script, so nothing third-party runs here. It looks like an
 * inline link by default (`standalone` gives it a 44 px touch target on its own line), or like a
 * secondary button with `look="button"`, where it stands alone and must still never outshine the
 * screen's primary action.
 */
@Component({
  selector: 'app-ko-fi-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, LucideCoffee, NgTemplateOutlet, TextLink],
  template: `
    <ng-template #label>
      <svg lucideCoffee [size]="look() === 'button' ? 20 : 18" class="shrink-0"></svg>
      <span><ng-content /></span>&ngsp;
      <span class="sr-only" i18n>(se abre en una pestaña nueva)</span>
    </ng-template>
    @if (look() === 'button') {
      <a appButton="secondary" [href]="url" target="_blank" rel="noopener">
        <ng-container [ngTemplateOutlet]="label" />
      </a>
    } @else {
      <a
        appLink
        [standalone]="standalone()"
        [href]="url"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1.5"
      >
        <ng-container [ngTemplateOutlet]="label" />
      </a>
    }
  `,
})
export class KoFiLink {
  readonly look = input<KoFiLook>('link');
  readonly standalone = input(false, { transform: booleanAttribute });
  protected readonly url = KO_FI_URL;
}
