import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideCoffee } from '@lucide/angular';
import { KO_FI_URL } from '../../../core/ko-fi';
import { TextLink } from '../text-link/text-link';

/**
 * The "buy me a coffee" link to SecretMatch's Ko-fi page (#115): an inline link with the Lucide
 * `Coffee` icon, the projected label, and a screen-reader-only note that it opens in a new tab. A
 * plain link to another site, never Ko-fi's widget or script, so nothing third-party runs here.
 * `standalone` gives it the 44 px touch target of a link on its own line.
 */
@Component({
  selector: 'app-ko-fi-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideCoffee, TextLink],
  template: `
    <a
      appLink
      [standalone]="standalone()"
      [href]="url"
      target="_blank"
      rel="noopener"
      class="inline-flex items-center gap-1.5"
    >
      <svg lucideCoffee [size]="18" class="shrink-0"></svg>
      <span><ng-content /></span>
      <span class="sr-only" i18n>(se abre en una pestaña nueva)</span>
    </a>
  `,
})
export class KoFiLink {
  readonly standalone = input(false, { transform: booleanAttribute });
  protected readonly url = KO_FI_URL;
}
