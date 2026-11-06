import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { ApiHealth } from '../../data-access/api-health';

@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SheetLayout],
  templateUrl: './landing-page.html',
  providers: [ApiHealth],
})
export class LandingPage {
  protected readonly health = inject(ApiHealth);
}
