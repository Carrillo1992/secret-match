import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../shared/ui/button/button';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { ApiHealth } from '../../data-access/api-health';

@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, RouterLink, SheetLayout, TextLink],
  templateUrl: './landing-page.html',
  providers: [ApiHealth],
})
export class LandingPage {
  protected readonly health = inject(ApiHealth);
}
