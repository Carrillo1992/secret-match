const KEY_PREFIX = 'secretmatch.openedEnvelope.';

/**
 * Remembers on this device that the Giver opened their envelope in a Group (#30), so the Reveal
 * shows it open on their next visit. It is keyed by the Receiver too: after a Draw is cancelled and
 * made again, a new envelope arrives closed. Only this browser remembers it; if storage is blocked
 * the envelope simply shows closed again, which is harmless.
 */
export function rememberOpenedEnvelope(groupId: string, receiverId: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + groupId, receiverId);
  } catch {
    // Storage blocked (private mode, disabled site data): nothing to remember with.
  }
}

/** Whether this device opened the envelope with this Receiver in this Group before. */
export function envelopeWasOpened(groupId: string, receiverId: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + groupId) === receiverId;
  } catch {
    return false;
  }
}
