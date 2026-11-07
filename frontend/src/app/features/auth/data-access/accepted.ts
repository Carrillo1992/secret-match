/**
 * Resolves `true` once the API has taken a request that answers the same whether or not it acts on it
 * (a new link, a reset link), and `false` if it could not be sent.
 */
export async function accepted(request: Promise<void>): Promise<boolean> {
  try {
    await request;
    return true;
  } catch {
    return false;
  }
}
