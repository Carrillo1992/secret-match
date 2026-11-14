import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import { addWish, deleteWish, editWish, wishlist } from '../../../core/api/generated/functions';
import { WishlistResponse, WishRequest, WishResponse } from '../../../core/api/generated/models';

/** A Member's Wishlist in a Group: whose it is and their Wishes, high priority first. */
export type Wishlist = WishlistResponse;
export type Wish = WishResponse;
export type WishPriority = Wish['priority'];
/** What the owner writes for a Wish, to add it or to replace one. */
export type WishInput = WishRequest;

export type WishlistOutcome =
  | { readonly status: 'found'; readonly wishlist: Wishlist }
  | { readonly status: 'not-found' }
  | { readonly status: 'failed' };

/**
 * `invalid-link` is the API refusing a link that is not http or https, which the form checks too;
 * `failed` covers everything else, such as the owner having left the Group meanwhile.
 */
export type SaveWishOutcome =
  | { readonly status: 'saved'; readonly wish: Wish }
  | { readonly status: 'invalid-link' }
  | { readonly status: 'failed' };

export type DeleteWishOutcome = { readonly status: 'deleted' } | { readonly status: 'failed' };

/** Wishlists, with the API's errors turned into outcomes. */
@Injectable({ providedIn: 'root' })
export class WishlistApi {
  private readonly api = inject(Api);

  /** `not-found` when the Group or the Member is not there for the User: both look the same. */
  async wishlist(groupId: string, memberId: string): Promise<WishlistOutcome> {
    try {
      return { status: 'found', wishlist: await this.api.invoke(wishlist, { groupId, memberId }) };
    } catch (error) {
      const notFound =
        error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400);
      return { status: notFound ? 'not-found' : 'failed' };
    }
  }

  /** Adds to the signed-in Member's own Wishlist. */
  async add(groupId: string, wish: WishInput): Promise<SaveWishOutcome> {
    try {
      return { status: 'saved', wish: await this.api.invoke(addWish, { groupId, body: wish }) };
    } catch (error) {
      return saveFailure(error);
    }
  }

  /** Replaces every field: one left out is cleared. */
  async edit(groupId: string, wishId: string, wish: WishInput): Promise<SaveWishOutcome> {
    try {
      return {
        status: 'saved',
        wish: await this.api.invoke(editWish, { groupId, wishId, body: wish }),
      };
    } catch (error) {
      return saveFailure(error);
    }
  }

  async delete(groupId: string, wishId: string): Promise<DeleteWishOutcome> {
    try {
      await this.api.invoke(deleteWish, { groupId, wishId });
      return { status: 'deleted' };
    } catch {
      return { status: 'failed' };
    }
  }
}

function saveFailure(error: unknown): SaveWishOutcome {
  const invalidLink =
    error instanceof HttpErrorResponse &&
    error.status === 422 &&
    (error.error as { type?: string } | null)?.type === 'urn:secretmatch:problem:invalid-wish-link';
  return { status: invalidLink ? 'invalid-link' : 'failed' };
}
