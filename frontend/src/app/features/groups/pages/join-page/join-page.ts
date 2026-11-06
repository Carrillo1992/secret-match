import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle, LucideUnlink, LucideUserPlus, LucideWifiOff } from '@lucide/angular';
import { AuthSession } from '../../../../core/auth/auth-session';
import { Button } from '../../../../shared/ui/button/button';
import { SheetLayout } from '../../../../shared/ui/sheet-layout/sheet-layout';
import { StatusHeader } from '../../../../shared/ui/status-header/status-header';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { GroupsApi } from '../../data-access/groups-api';

type JoinStatus = 'joining' | 'signed-out' | 'invalid' | 'failed';

/**
 * Where an Invite Link lands: `/join/<code>`. A signed-in User joins the Group and goes to its page;
 * a signed-out visitor is asked to sign up or sign in, and comes back here afterwards. Nothing on
 * this page names the Group, so a link that does not work reveals nothing about one.
 */
@Component({
  selector: 'app-join-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    SheetLayout,
    StatusHeader,
    Button,
    TextLink,
    LucideLoaderCircle,
    LucideUnlink,
    LucideUserPlus,
    LucideWifiOff,
  ],
  templateUrl: './join-page.html',
})
export class JoinPage {
  private readonly groupsApi = inject(GroupsApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';

  protected readonly status = signal<JoinStatus>('joining');
  /** Brings the visitor back here once they have an account and are signed in. */
  protected readonly comeBack = { next: `/join/${encodeURIComponent(this.code)}` };

  constructor() {
    void this.start();
  }

  protected async join(): Promise<void> {
    this.status.set('joining');
    const outcome = await this.groupsApi.join(this.code);
    if (outcome.status === 'joined') {
      await this.router.navigate(['/groups', outcome.groupId], { replaceUrl: true });
    } else {
      this.status.set(outcome.status);
    }
  }

  private async start(): Promise<void> {
    if (this.session.isSignedIn() || (await this.session.refresh())) {
      await this.join();
    } else {
      this.status.set('signed-out');
    }
  }
}
