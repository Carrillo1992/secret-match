import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideLogOut } from '@lucide/angular';
import { AuthSession } from '../../../../core/auth/auth-session';
import { AppShell } from '../../../../shared/ui/app-shell/app-shell';
import { Button } from '../../../../shared/ui/button/button';
import { CurrentUser } from '../../data-access/current-user';

/** The first page behind sign-in. Groups will live here; for now it greets the User. */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShell, Button, LucideLogOut],
  templateUrl: './home-page.html',
  providers: [CurrentUser],
})
export class HomePage {
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly user = inject(CurrentUser);

  protected async signOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigateByUrl('/sign-in');
  }
}
