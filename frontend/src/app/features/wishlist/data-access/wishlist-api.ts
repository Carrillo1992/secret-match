import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import {
  addDontListEntry,
  addWish,
  deleteDontListEntry,
  deleteWish,
  editPreferences,
  editWish,
  wishlist,
} from '../../../core/api/generated/functions';
import {
  DontListEntryResponse,
  WishlistResponse,
  WishRequest,
  WishResponse,
} from '../../../core/api/generated/models';

/**
 * A Member's Wishlist in a Group: whose it is, their Wishes (high priority first), their
 * Preferences and their Don't List (oldest first).
 */
export type Wishlist = WishlistResponse;
export type Wish = WishResponse;
export type WishPriority = Wish['priority'];
/** What the owner writes for a Wish, to add it or to replace one. */
export type WishInput = WishRequest;

/** One thing on a Member's Don't List: what they do not want to receive. */
export type DontListEntry = DontListEntryResponse;

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

/** `preferences` is `undefined` once cleared. `invalid` is the API refusing the length. */
export type SavePreferencesOutcome =
  | { readonly status: 'saved'; readonly preferences: string | undefined }
  | { readonly status: 'invalid' }
  | { readonly status: 'failed' };

/** `invalid` is the API refusing an empty or too long entry. */
export type AddDontListEntryOutcome =
  | { readonly status: 'added'; readonly entry: DontListEntry }
  | { readonly status: 'invalid' }
  | { readonly status: 'failed' };

export type DeleteDontListEntryOutcome =
  { readonly status: 'deleted' } | { readonly status: 'failed' };

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

  /**
   * Replaces the signed-in Member's own Preferences; blank text clears them. Sent trimmed: the API
   * checks the length of the text as it arrives.
   */
  async editPreferences(groupId: string, preferences: string): Promise<SavePreferencesOutcome> {
    try {
      const saved = await this.api.invoke(editPreferences, {
        groupId,
        body: { preferences: preferences.trim() },
      });
      return { status: 'saved', preferences: saved.preferences };
    } catch (error) {
      return { status: isRefused(error, 'invalid-preferences') ? 'invalid' : 'failed' };
    }
  }

  /** Adds to the signed-in Member's own Don't List, trimmed like the Preferences. */
  async addDontListEntry(groupId: string, text: string): Promise<AddDontListEntryOutcome> {
    try {
      return {
        status: 'added',
        entry: await this.api.invoke(addDontListEntry, { groupId, body: { text: text.trim() } }),
      };
    } catch (error) {
      return { status: isRefused(error, 'invalid-dont-list-entry') ? 'invalid' : 'failed' };
    }
  }

  async deleteDontListEntry(groupId: string, entryId: string): Promise<DeleteDontListEntryOutcome> {
    try {
      await this.api.invoke(deleteDontListEntry, { groupId, entryId });
      return { status: 'deleted' };
    } catch {
      return { status: 'failed' };
    }
  }
}

function isProblem(error: unknown, code: string): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 422 &&
    (error.error as { type?: string } | null)?.type === `urn:secretmatch:problem:${code}`
  );
}

/**
 * The API refusing the text: its request validation (any 400, whose body names no field) or the
 * named problem (422).
 */
function isRefused(error: unknown, code: string): boolean {
  return (error instanceof HttpErrorResponse && error.status === 400) || isProblem(error, code);
}

function saveFailure(error: unknown): SaveWishOutcome {
  return { status: isProblem(error, 'invalid-wish-link') ? 'invalid-link' : 'failed' };
}
