import type { AuthenticatorManager } from "@/authenticators/AuthenticatorManager";

/**
 * Polls for an authenticator to be initialized.
 *
 * Repeatedly checks if the specified authenticator is in the list of initialized
 * authenticators, waiting up to `timeoutMs` before giving up.
 *
 * Useful for deferred initialization flows where the authenticator may take time
 * to become ready after being installed and initialized.
 *
 * @param authenticatorManager - The authenticator manager instance to query
 * @param authenticatorId - The ID of the authenticator (e.g., "farcaster:nounspace")
 * @param timeoutMs - Maximum time to wait in milliseconds (default: 60_000)
 * @returns true if the authenticator was initialized within the timeout, false if timeout expired
 *
 * @example
 * const ready = await waitForAuthenticatorReady(authenticatorManager, "farcaster:nounspace");
 * if (ready) {
 *   // authenticator is ready to use
 * } else {
 *   // timeout expired; authenticator never became ready
 * }
 */
export async function waitForAuthenticatorReady(
  authenticatorManager: AuthenticatorManager,
  authenticatorId: string,
  timeoutMs = 60_000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const initialized = await authenticatorManager.getInitializedAuthenticators();
    if (initialized.includes(authenticatorId)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
