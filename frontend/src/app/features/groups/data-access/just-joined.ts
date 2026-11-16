/**
 * Navigation state marking a Group page reached right after joining or creating that Group, the
 * moment the install suggestion first shows (#118). It travels with the navigation only, so
 * neither a reload nor a link brings it back.
 */
export const JUST_JOINED = { justJoined: true } as const;

/** Whether a navigation's state is `JUST_JOINED`. */
export function isJustJoined(state: Record<string, unknown> | undefined): boolean {
  return state?.['justJoined'] === true;
}
