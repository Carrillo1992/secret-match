import { isTooManyRequests } from '../../../core/api/problem';

/**
 * How a request went that the API answers the same whether or not it acts on it (a new link, a reset
 * link): `accepted` once it was taken, `throttled` when this client asked too often, else `failed`.
 */
export type RequestOutcome = 'accepted' | 'throttled' | 'failed';

export async function accepted(request: Promise<void>): Promise<RequestOutcome> {
  try {
    await request;
    return 'accepted';
  } catch (error) {
    return isTooManyRequests(error) ? 'throttled' : 'failed';
  }
}
