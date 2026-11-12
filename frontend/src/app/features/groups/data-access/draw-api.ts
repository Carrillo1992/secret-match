import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import { draw, runDraw } from '../../../core/api/generated/functions';
import { ReceiverResponse } from '../../../core/api/generated/models';
import { problemCode } from '../../../core/api/problem';

/** Who the signed-in Member gives a gift to: the only Assignment anyone ever sees. */
export type Receiver = ReceiverResponse;

/** `not-drawn` is also what a Group the User cannot see answers; the page asks only for its own. */
export type DrawOutcome =
  | { readonly status: 'drawn'; readonly receiver: Receiver }
  | { readonly status: 'not-drawn' }
  | { readonly status: 'failed' };

/**
 * `no-valid-draw`: the Exclusions leave no Draw, and the API does not say which one is to blame.
 * `already-drawn`: the Group was drawn meanwhile (another tab). `failed` covers the other refusals:
 * the page offers the Draw only to the Admin of a Group with enough Members.
 */
export type RunDrawOutcome =
  | { readonly status: 'drawn'; readonly receiver: Receiver }
  | { readonly status: 'no-valid-draw' }
  | { readonly status: 'already-drawn' }
  | { readonly status: 'failed' };

/** A Group's Draw as the signed-in Member sees it, with the API's errors turned into outcomes. */
@Injectable({ providedIn: 'root' })
export class DrawApi {
  private readonly api = inject(Api);

  async draw(groupId: string): Promise<DrawOutcome> {
    try {
      const { myReceiver } = await this.api.invoke(draw, { groupId });
      return { status: 'drawn', receiver: myReceiver };
    } catch (error) {
      return error instanceof HttpErrorResponse && error.status === 404
        ? { status: 'not-drawn' }
        : { status: 'failed' };
    }
  }

  /** The Admin draws the Group; every Member is emailed. */
  async run(groupId: string): Promise<RunDrawOutcome> {
    try {
      const { myReceiver } = await this.api.invoke(runDraw, { groupId });
      return { status: 'drawn', receiver: myReceiver };
    } catch (error) {
      switch (problemCode(error)) {
        case 'no-valid-draw':
          return { status: 'no-valid-draw' };
        case 'draw-already-made':
          return { status: 'already-drawn' };
        default:
          return { status: 'failed' };
      }
    }
  }
}
