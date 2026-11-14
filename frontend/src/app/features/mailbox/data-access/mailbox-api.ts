import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import { mailboxMessages, myMailboxes, sendMessage } from '../../../core/api/generated/functions';
import { MailboxResponse, MessageResponse } from '../../../core/api/generated/models';
import { problemCode } from '../../../core/api/problem';

/**
 * One of the signed-in Member's two Mailboxes in a Group: `GIVER` is the one with their Receiver,
 * named; `RECEIVER` the one with their Giver, who is never named.
 */
export type Mailbox = MailboxResponse;
export type MailboxSide = Mailbox['side'];
/** A Message as its reader sees it: whether they wrote it, its text and the day it was sent. */
export type Message = MessageResponse;

/** `loaded` with none before the Draw, and for a Group the User is not in. */
export type MailboxesOutcome =
  | { readonly status: 'loaded'; readonly mailboxes: readonly Mailbox[] }
  | { readonly status: 'failed' };

/** `not-found`: the Mailbox is not the caller's (or no longer is). */
export type MessagesOutcome =
  | { readonly status: 'loaded'; readonly messages: readonly Message[] }
  | { readonly status: 'not-found' }
  | { readonly status: 'failed' };

/** `invalid`: the API refused the text (blank or too long), which the composer checks too. */
export type SendMessageOutcome =
  | { readonly status: 'sent'; readonly message: Message }
  | { readonly status: 'invalid' }
  | { readonly status: 'not-found' }
  | { readonly status: 'failed' };

/** The anonymous Mailboxes and their Messages, with the API's errors turned into outcomes. */
@Injectable({ providedIn: 'root' })
export class MailboxApi {
  private readonly api = inject(Api);

  /** After the Draw, the one with the Receiver first, then the one with the Giver. */
  async mailboxes(groupId: string): Promise<MailboxesOutcome> {
    try {
      return { status: 'loaded', mailboxes: await this.api.invoke(myMailboxes, { groupId }) };
    } catch (error) {
      return isNotFound(error) ? { status: 'loaded', mailboxes: [] } : { status: 'failed' };
    }
  }

  /** Oldest first. */
  async messages(mailboxId: string): Promise<MessagesOutcome> {
    try {
      return { status: 'loaded', messages: await this.api.invoke(mailboxMessages, { mailboxId }) };
    } catch (error) {
      return { status: isNotFound(error) ? 'not-found' : 'failed' };
    }
  }

  async send(mailboxId: string, text: string): Promise<SendMessageOutcome> {
    try {
      return {
        status: 'sent',
        message: await this.api.invoke(sendMessage, { mailboxId, body: { text } }),
      };
    } catch (error) {
      if (problemCode(error) === 'invalid-message') {
        return { status: 'invalid' };
      }
      return { status: isNotFound(error) ? 'not-found' : 'failed' };
    }
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
