import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiHealth } from '../../data-access/api-health';

@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-page.html',
  providers: [ApiHealth],
})
export class LandingPage {
  protected readonly health = inject(ApiHealth);
}
