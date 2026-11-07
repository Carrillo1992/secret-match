import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import {
  createExclusion,
  deleteExclusion,
  groupExclusions,
} from '../../../core/api/generated/functions';
import { ExclusionResponse } from '../../../core/api/generated/models';

/** Two Members of the Group who are never drawn for each other. Only the Admin sees them. */
export type Exclusion = ExclusionResponse;

export type ExclusionsOutcome =
  | { readonly status: 'loaded'; readonly exclusions: readonly Exclusion[] }
  | { readonly status: 'failed' };

/**
 * `failed` covers every refusal too: the page offers this only to the Admin and only between two
 * different Members, so a refusal means the Group changed under them (someone left, it finished).
 */
export type AddExclusionOutcome =
  { readonly status: 'added'; readonly exclusion: Exclusion } | { readonly status: 'failed' };

export type RemoveExclusionOutcome = { readonly status: 'removed' } | { readonly status: 'failed' };

/** A Group's Exclusions, for its Admin, with the API's errors turned into outcomes. */
@Injectable({ providedIn: 'root' })
export class ExclusionsApi {
  private readonly api = inject(Api);

  /** Oldest first. */
  async exclusions(groupId: string): Promise<ExclusionsOutcome> {
    try {
      return { status: 'loaded', exclusions: await this.api.invoke(groupExclusions, { groupId }) };
    } catch {
      return { status: 'failed' };
    }
  }

  /** Two Members who already have one get it back unchanged. */
  async add(groupId: string, memberIds: readonly [string, string]): Promise<AddExclusionOutcome> {
    try {
      const exclusion = await this.api.invoke(createExclusion, {
        groupId,
        body: { memberIds: [...memberIds] },
      });
      return { status: 'added', exclusion };
    } catch {
      return { status: 'failed' };
    }
  }

  async remove(groupId: string, exclusionId: string): Promise<RemoveExclusionOutcome> {
    try {
      await this.api.invoke(deleteExclusion, { groupId, exclusionId });
      return { status: 'removed' };
    } catch {
      return { status: 'failed' };
    }
  }
}
