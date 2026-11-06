import { HttpErrorResponse } from '@angular/common/http';

const PROBLEM_TYPE_PREFIX = 'urn:secretmatch:problem:';

/**
 * The `code` of an API problem (`urn:secretmatch:problem:<code>`), or `''` when the error is not
 * one of the API's own problems (a network failure, an unexpected answer).
 */
export function problemCode(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return '';
  }
  const type = problemBody(error.error)?.type;
  return typeof type === 'string' && type.startsWith(PROBLEM_TYPE_PREFIX)
    ? type.slice(PROBLEM_TYPE_PREFIX.length)
    : '';
}

/** Endpoints without a response body are read as text, so their problems arrive as JSON text. */
function problemBody(body: unknown): { type?: unknown } | null {
  if (typeof body !== 'string') {
    return typeof body === 'object' ? (body as { type?: unknown } | null) : null;
  }
  try {
    return JSON.parse(body) as { type?: unknown } | null;
  } catch {
    return null;
  }
}
