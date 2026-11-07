import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import {
  create,
  deleteGroup,
  edit,
  group,
  join,
  myGroups,
  regenerateInviteLink,
  removeMember,
} from '../../../core/api/generated/functions';
import {
  CreateGroupRequest,
  EditGroupRequest,
  GroupResponse,
  GroupSummaryResponse,
} from '../../../core/api/generated/models';
import { problemCode } from '../../../core/api/problem';

export type GroupSummary = GroupSummaryResponse;
export type Group = GroupResponse;
export type NewGroup = CreateGroupRequest;
/** All the Group's details, which replace the current ones; a budget left out is taken away. */
export type GroupEdit = EditGroupRequest;

/**
 * `not-found` covers a Group the User is not a Member of (the API answers both the same) and a
 * malformed link, whose id is not even a Group id.
 */
export type GroupOutcome =
  | { readonly status: 'found'; readonly group: Group }
  | { readonly status: 'not-found' }
  | { readonly status: 'failed' };

export type CreateGroupOutcome =
  | { readonly status: 'created'; readonly groupId: string }
  | { readonly status: 'exchange-date-not-in-future' }
  | { readonly status: 'failed' };

/** `failed` covers the other refusals too: the page only offers editing to the Admin. */
export type EditGroupOutcome =
  | { readonly status: 'edited'; readonly group: Group }
  | { readonly status: 'exchange-date-not-in-future' }
  | { readonly status: 'failed' };

/** `invalid` covers an unknown, malformed or regenerated code: the API answers them all the same. */
export type JoinOutcome =
  | { readonly status: 'joined'; readonly groupId: string }
  | { readonly status: 'invalid' }
  | { readonly status: 'failed' };

export type RegenerateOutcome =
  { readonly status: 'regenerated'; readonly group: Group } | { readonly status: 'failed' };

/** `failed` covers every refusal too: the page offers it only to whom the API allows it. */
export type RemoveMemberOutcome = { readonly status: 'removed' } | { readonly status: 'failed' };

/** `failed` covers every refusal too: the page offers it only to the Admin. */
export type DeleteGroupOutcome = { readonly status: 'deleted' } | { readonly status: 'failed' };

/** The signed-in User's Groups, with the API's errors turned into outcomes a page can show. */
@Injectable({ providedIn: 'root' })
export class GroupsApi {
  private readonly api = inject(Api);

  /** Soonest Exchange Date first. Rejects when the Groups cannot be loaded. */
  myGroups(): Promise<GroupSummary[]> {
    return this.api.invoke(myGroups);
  }

  async group(groupId: string): Promise<GroupOutcome> {
    try {
      return { status: 'found', group: await this.api.invoke(group, { groupId }) };
    } catch (error) {
      const notFound =
        error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400);
      return { status: notFound ? 'not-found' : 'failed' };
    }
  }

  async create(details: NewGroup): Promise<CreateGroupOutcome> {
    try {
      const { id } = await this.api.invoke(create, { body: details });
      return { status: 'created', groupId: id };
    } catch (error) {
      return problemCode(error) === 'exchange-date-not-in-future'
        ? { status: 'exchange-date-not-in-future' }
        : { status: 'failed' };
    }
  }

  async edit(groupId: string, details: GroupEdit): Promise<EditGroupOutcome> {
    try {
      return { status: 'edited', group: await this.api.invoke(edit, { groupId, body: details }) };
    } catch (error) {
      return problemCode(error) === 'exchange-date-not-in-future'
        ? { status: 'exchange-date-not-in-future' }
        : { status: 'failed' };
    }
  }

  /** Joins the Group of this Invite Link code; a Member already in it just gets the Group back. */
  async join(inviteCode: string): Promise<JoinOutcome> {
    try {
      const { groupId } = await this.api.invoke(join, { body: { inviteCode } });
      return { status: 'joined', groupId };
    } catch (error) {
      const invalid =
        error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400);
      return { status: invalid ? 'invalid' : 'failed' };
    }
  }

  /**
   * Gives the Group a new Invite Link. `failed` covers every refusal too: the page only offers this
   * to the Admin, so a refusal means the Group changed under them, and the current link still works.
   */
  async regenerateInviteLink(groupId: string): Promise<RegenerateOutcome> {
    try {
      return {
        status: 'regenerated',
        group: await this.api.invoke(regenerateInviteLink, { groupId }),
      };
    } catch {
      return { status: 'failed' };
    }
  }

  /**
   * Ends a membership of the Group: the signed-in User leaves when `memberId` is their own, or the
   * Admin removes another Member.
   */
  async removeMember(groupId: string, memberId: string): Promise<RemoveMemberOutcome> {
    try {
      await this.api.invoke(removeMember, { groupId, memberId });
      return { status: 'removed' };
    } catch {
      return { status: 'failed' };
    }
  }

  /** The Admin deletes the Group, with everything in it, for every Member. */
  async deleteGroup(groupId: string): Promise<DeleteGroupOutcome> {
    try {
      await this.api.invoke(deleteGroup, { groupId });
      return { status: 'deleted' };
    } catch {
      return { status: 'failed' };
    }
  }
}
