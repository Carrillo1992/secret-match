import { ChangeDetectionStrategy, Component } from '@angular/core';
import { injectApiHealth } from '../../data-access/api-health';

@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-page.html',
})
export class LandingPage {
  protected readonly health = injectApiHealth();
}
