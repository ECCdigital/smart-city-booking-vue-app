/**
 * Whether a redirect target handed in from outside (a `?next=` or
 * `?redirect=` query) may be pushed onto the router: only a relative in-app
 * path that resolves to a known route. Absolute and protocol-relative URLs,
 * backslash tricks and unknown paths are refused.
 *
 * @param {unknown} redirect
 * @param {{ resolve: (path: string) => { route: { matched: unknown[] } } }} router
 * @returns {boolean}
 */
export function isSafeInternalRedirect(redirect, router) {
  if (typeof redirect !== "string" || redirect.length < 2) {
    return false;
  }
  if (!redirect.startsWith("/") || redirect.startsWith("//")) {
    return false;
  }
  if (redirect.includes("\\")) {
    return false;
  }

  const resolved = router.resolve(redirect);
  return resolved.route.matched.length > 0;
}
