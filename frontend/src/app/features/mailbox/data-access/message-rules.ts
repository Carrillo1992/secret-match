/** The rules of a Message's text, mirroring the API's: not blank, at most 1000 characters. */

export const MESSAGE_MAX_LENGTH = 1000;

/** Counted in code points, as the API does: an emoji is one character, not two. */
export function messageLength(text: string): number {
  return [...text].length;
}

/** Whitespace, no-break and other separator spaces, and zero-width/format characters. */
const NOTHING_VISIBLE = /[\s\p{Z}\p{Cf}]/gu;

/** Why the text cannot be sent, in the composer's words; `null` when it can. */
export function messageProblem(text: string): string | null {
  const extra = messageLength(text) - MESSAGE_MAX_LENGTH;
  if (extra > 0) {
    return extra === 1
      ? `Te sobra 1 carácter (máximo ${MESSAGE_MAX_LENGTH}).`
      : `Te sobran ${extra} caracteres (máximo ${MESSAGE_MAX_LENGTH}).`;
  }
  return text.replace(NOTHING_VISIBLE, '') === '' ? 'Escribe algo antes de enviar.' : null;
}
