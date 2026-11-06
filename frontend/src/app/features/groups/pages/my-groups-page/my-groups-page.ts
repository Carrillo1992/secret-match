import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideLogOut, LucidePlus } from '@lucide/angular';
import { AuthSession } from '../../../../core/auth/auth-session';
import { CurrentUser } from '../../../../core/auth/current-user';
import { AppShell } from '../../../../shared/ui/app-shell/app-shell';
import { Button } from '../../../../shared/ui/button/button';
import { GiftIllustration } from '../../../../shared/ui/gift-illustration/gift-illustration';
import { GroupCard } from '../../components/group-card/group-card';
import { GroupsApi } from '../../data-access/groups-api';

/** "Mis grupos": the first page behind sign-in, listing every Group the User is a Member of. */
@Component({
  selector: 'app-my-groups-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppShell, Button, GiftIllustration, GroupCard, RouterLink, LucideLogOut, LucidePlus],
  templateUrl: './my-groups-page.html',
  providers: [CurrentUser],
})
export class MyGroupsPage {
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly groupsApi = inject(GroupsApi);

  protected readonly user = inject(CurrentUser);
  private readonly groups = resource({ loader: () => this.groupsApi.myGroups() });

  protected readonly isLoading = computed(() => this.user.isLoading() || this.groups.isLoading());
  /** `undefined` while loading or after a failure: reading a failed resource's value throws. */
  protected readonly loaded = computed(() => {
    const me = this.user.value();
    return me && this.groups.hasValue() ? { me, groups: this.groups.value() } : undefined;
  });
  protected readonly signOutFailed = signal(false);

  protected reload(): void {
    this.user.reload();
    this.groups.reload();
  }

  protected async signOut(): Promise<void> {
    this.signOutFailed.set(false);
    if (await this.session.signOut()) {
      await this.router.navigateByUrl('/sign-in');
    } else {
      this.signOutFailed.set(true);
    }
  }
}
