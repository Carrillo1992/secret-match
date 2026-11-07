import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideChevronLeft, LucideSearchX } from '@lucide/angular';
import { map } from 'rxjs';
import { AppShell } from '../../../../shared/ui/app-shell/app-shell';
import { Button } from '../../../../shared/ui/button/button';
import { StatusHeader } from '../../../../shared/ui/status-header/status-header';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import {
  InviteLinkCard,
  RegenerateStatus,
} from '../../components/invite-link-card/invite-link-card';
import { Member, MembersCard, Removal } from '../../components/members-card/members-card';
import { LeaveStatus, MembershipCard } from '../../components/membership-card/membership-card';
import {
  EditStatus,
  GroupDetailsCard,
} from '../../components/group-details-card/group-details-card';
import { GroupEdit, GroupsApi } from '../../data-access/groups-api';
import { Alert } from '../../../../shared/ui/alert/alert';

/** A Group as its Members see it: its details and who is in it. */
@Component({
  selector: 'app-group-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    RouterLink,
    AppShell,
    Button,
    StatusHeader,
    TextLink,
    InviteLinkCard,
    MembersCard,
    MembershipCard,
    GroupDetailsCard,
    LucideChevronLeft,
    LucideSearchX,
  ],
  templateUrl: './group-page.html',
})
export class GroupPage {
  private readonly groupsApi = inject(GroupsApi);
  private readonly router = inject(Router);
  private readonly origin = inject(DOCUMENT).location.origin;
  private readonly groupId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('groupId') ?? '')),
    { requireSync: true },
  );

  private readonly outcome = resource({
    params: () => this.groupId(),
    loader: ({ params }) => this.groupsApi.group(params),
  });

  protected readonly isLoading = this.outcome.isLoading;
  /** The data-access layer never rejects: it reports `not-found` or `failed` instead. */
  private readonly result = computed(() =>
    this.outcome.hasValue() ? this.outcome.value() : undefined,
  );
  protected readonly group = computed(() => {
    const result = this.result();
    return result?.status === 'found' ? result.group : undefined;
  });
  protected readonly notFound = computed(() => this.result()?.status === 'not-found');

  /** The Invite Link to share: the SPA's own address, so it works on any host. */
  protected readonly inviteLink = computed(() => {
    const group = this.group();
    return group ? `${this.origin}/join/${encodeURIComponent(group.inviteCode)}` : '';
  });
  protected readonly regenerateStatus = signal<RegenerateStatus>('idle');
  protected readonly leaveStatus = signal<LeaveStatus>('idle');
  protected readonly removal = signal<Removal | null>(null);

  protected readonly editStatus = signal<EditStatus>('idle');

  /** The Admin's new details: once the API agrees, every part of the page shows them. */
  protected async edit(details: GroupEdit): Promise<void> {
    this.editStatus.set('saving');
    const outcome = await this.groupsApi.edit(this.groupId(), details);
    if (outcome.status === 'edited') {
      this.outcome.set({ status: 'found', group: outcome.group });
      this.editStatus.set('saved');
      return;
    }
    this.editStatus.set(outcome.status);
  }

  protected async regenerateInviteLink(): Promise<void> {
    this.regenerateStatus.set('regenerating');
    const outcome = await this.groupsApi.regenerateInviteLink(this.groupId());
    if (outcome.status === 'regenerated') {
      this.outcome.set({ status: 'found', group: outcome.group });
    }
    this.regenerateStatus.set(outcome.status);
  }

  /** Once out, the Group is gone for them: back to their Groups. */
  protected async leave(): Promise<void> {
    const you = this.group()?.members.find((member) => member.you);
    if (!you) {
      return;
    }
    this.leaveStatus.set('leaving');
    const outcome = await this.groupsApi.removeMember(this.groupId(), you.id);
    if (outcome.status === 'removed') {
      await this.router.navigateByUrl('/home');
      return;
    }
    this.leaveStatus.set('failed');
  }

  /** The Admin removes another Member: once the API agrees, they leave the list. */
  protected async removeMember(member: Member): Promise<void> {
    this.removal.set({ member, status: 'removing' });
    const outcome = await this.groupsApi.removeMember(this.groupId(), member.id);
    const group = this.group();
    if (outcome.status === 'removed' && group) {
      this.outcome.set({
        status: 'found',
        group: { ...group, members: group.members.filter((other) => other.id !== member.id) },
      });
    }
    this.removal.set({ member, status: outcome.status });
  }

  protected reload(): void {
    this.outcome.reload();
  }
}
