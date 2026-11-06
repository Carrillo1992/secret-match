import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import {
  create,
  group,
  join,
  myGroups,
  regenerateInviteLink,
} from '../../../core/api/generated/functions';
import {
  CreateGroupRequest,
  GroupResponse,
  GroupSummaryResponse,
} from '../../../core/api/generated/models';
import { problemCode } from '../../../core/api/problem';

export type GroupSummary = GroupSummaryResponse;
export type Group = GroupResponse;
export type NewGroup = CreateGroupRequest;

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

/** `invalid` covers an unknown, malformed or regenerated code: the API answers them all the same. */
export type JoinOutcome =
  | { readonly status: 'joined'; readonly groupId: string }
  | { readonly status: 'invalid' }
  | { readonly status: 'failed' };

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

  /** The Group with its new Invite Link, or `null` when it could not be regenerated. */
  async regenerateInviteLink(groupId: string): Promise<Group | null> {
    try {
      return await this.api.invoke(regenerateInviteLink, { groupId });
    } catch {
      return null;
    }
  }
}
