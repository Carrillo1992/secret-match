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
import { LucideChevronLeft, LucideCircleCheck, LucideSearchX } from '@lucide/angular';
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
import {
  DeleteStatus,
  LeaveStatus,
  MembershipCard,
} from '../../components/membership-card/membership-card';
import {
  EditStatus,
  GroupDetailsCard,
} from '../../components/group-details-card/group-details-card';
import {
  Addition,
  ExclusionRemoval,
  ExclusionsCard,
  ExclusionsListing,
  NewExclusion,
} from '../../components/exclusions-card/exclusions-card';
import { DrawCard, DrawState, RunStatus } from '../../components/draw-card/draw-card';
import { DrawApi } from '../../data-access/draw-api';
import { Exclusion, ExclusionsApi } from '../../data-access/exclusions-api';
import { longExchangeDate } from '../../data-access/group-format';
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
    DrawCard,
    InviteLinkCard,
    MembersCard,
    ExclusionsCard,
    MembershipCard,
    GroupDetailsCard,
    LucideChevronLeft,
    LucideCircleCheck,
    LucideSearchX,
  ],
  templateUrl: './group-page.html',
})
export class GroupPage {
  private readonly groupsApi = inject(GroupsApi);
  private readonly exclusionsApi = inject(ExclusionsApi);
  private readonly drawApi = inject(DrawApi);
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
  protected readonly longExchangeDate = longExchangeDate;
  protected readonly notFound = computed(() => this.result()?.status === 'not-found');

  /** The Invite Link to share: the SPA's own address, so it works on any host. */
  protected readonly inviteLink = computed(() => {
    const group = this.group();
    return group ? `${this.origin}/join/${encodeURIComponent(group.inviteCode)}` : '';
  });
  protected readonly regenerateStatus = signal<RegenerateStatus>('idle');
  protected readonly leaveStatus = signal<LeaveStatus>('idle');
  protected readonly deleteStatus = signal<DeleteStatus>('idle');
  protected readonly removal = signal<Removal | null>(null);

  protected readonly editStatus = signal<EditStatus>('idle');

  /** Asked for once the Group is found: a Group the User cannot see has no Draw for them either. */
  private readonly drawOutcome = resource({
    params: () => (this.group() ? this.groupId() : undefined),
    loader: ({ params }) => this.drawApi.draw(params),
  });
  protected readonly drawState = computed<DrawState>(() => {
    if (this.drawOutcome.isLoading() || !this.drawOutcome.hasValue()) {
      return { status: 'loading' };
    }
    return this.drawOutcome.value();
  });
  protected readonly runStatus = signal<RunStatus>('idle');

  /** Once the API agrees, the Admin sees their own Receiver, like every other Member. */
  protected async runDraw(): Promise<void> {
    this.runStatus.set('drawing');
    const outcome = await this.drawApi.run(this.groupId());
    switch (outcome.status) {
      case 'drawn':
        this.drawOutcome.set(outcome);
        this.runStatus.set('idle');
        return;
      case 'already-drawn':
        // Drawn meanwhile, e.g. from another tab: show that Draw.
        this.runStatus.set('idle');
        this.drawOutcome.reload();
        return;
      case 'no-valid-draw':
        this.runStatus.set('no-valid-draw');
        return;
      case 'failed':
        this.runStatus.set('failed');
    }
  }

  protected reloadDraw(): void {
    this.drawOutcome.reload();
  }

  /** Only the Admin's page asks for the Exclusions: nobody else may know anything about them. */
  private readonly exclusionsOutcome = resource({
    params: () => (this.group()?.admin ? this.groupId() : undefined),
    loader: ({ params }) => this.exclusionsApi.exclusions(params),
  });
  protected readonly exclusionsListing = computed<ExclusionsListing>(() => {
    if (this.exclusionsOutcome.isLoading() || !this.exclusionsOutcome.hasValue()) {
      return { status: 'loading' };
    }
    return this.exclusionsOutcome.value();
  });
  protected readonly addition = signal<Addition | null>(null);
  protected readonly exclusionRemoval = signal<ExclusionRemoval | null>(null);

  /** Once the API agrees, the new pair joins the list, unless the Group already had it. */
  protected async addExclusion(memberIds: NewExclusion): Promise<void> {
    this.exclusionRemoval.set(null);
    this.addition.set({ status: 'adding' });
    const outcome = await this.exclusionsApi.add(this.groupId(), memberIds);
    if (outcome.status === 'added') {
      const { exclusion } = outcome;
      this.updateExclusions((exclusions) =>
        exclusions.some((other) => other.id === exclusion.id)
          ? exclusions
          : [...exclusions, exclusion],
      );
    }
    this.addition.set(outcome);
  }

  /** Removed at once, without asking: adding it again takes two taps. */
  protected async removeExclusion(exclusion: Exclusion): Promise<void> {
    this.addition.set(null);
    this.exclusionRemoval.set({ exclusion, status: 'removing' });
    const outcome = await this.exclusionsApi.remove(this.groupId(), exclusion.id);
    if (outcome.status === 'removed') {
      this.updateExclusions((exclusions) =>
        exclusions.filter((other) => other.id !== exclusion.id),
      );
    }
    this.exclusionRemoval.set({ exclusion, status: outcome.status });
  }

  protected reloadExclusions(): void {
    this.exclusionsOutcome.reload();
  }

  private updateExclusions(
    change: (exclusions: readonly Exclusion[]) => readonly Exclusion[],
  ): void {
    const listing = this.exclusionsListing();
    if (listing.status === 'loaded') {
      this.exclusionsOutcome.set({ status: 'loaded', exclusions: change(listing.exclusions) });
    }
  }

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

  /** Once deleted, the Group is gone for everyone: back to the Admin's Groups. */
  protected async deleteGroup(): Promise<void> {
    this.deleteStatus.set('deleting');
    const outcome = await this.groupsApi.deleteGroup(this.groupId());
    if (outcome.status === 'deleted') {
      await this.router.navigateByUrl('/home');
      return;
    }
    this.deleteStatus.set('failed');
  }

  /**
   * The Admin removes another Member: once the API agrees, they leave the list, and so do their
   * Exclusions, which the API deleted with them.
   */
  protected async removeMember(member: Member): Promise<void> {
    this.removal.set({ member, status: 'removing' });
    const outcome = await this.groupsApi.removeMember(this.groupId(), member.id);
    const group = this.group();
    if (outcome.status === 'removed' && group) {
      this.outcome.set({
        status: 'found',
        group: { ...group, members: group.members.filter((other) => other.id !== member.id) },
      });
      this.updateExclusions((exclusions) =>
        exclusions.filter((exclusion) => !exclusion.members.some((one) => one.id === member.id)),
      );
    }
    this.removal.set({ member, status: outcome.status });
  }

  protected reload(): void {
    this.outcome.reload();
  }
}
