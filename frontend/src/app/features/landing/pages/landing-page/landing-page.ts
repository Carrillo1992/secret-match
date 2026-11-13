import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { ApiHealth } from '../../data-access/api-health';

@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, RouterLink, SheetLayout, TextLink],
  templateUrl: './landing-page.html',
  providers: [ApiHealth],
})
export class LandingPage {
  protected readonly health = inject(ApiHealth);
  /**
   * Whether the User arrives right after deleting their account (`ProfilePage`). It travels in the
   * navigation's state, not the URL, so a reload or a shared link does not show it again.
   */
  protected readonly accountDeleted =
    inject(Router).currentNavigation()?.extras.state?.['accountDeleted'] === true;
}
