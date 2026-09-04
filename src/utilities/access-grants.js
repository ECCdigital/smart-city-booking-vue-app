/**
 * Which bookings still hold a live access at an access point.
 *
 * A booking records what it was given in `accessInfo`: one entry per door and
 * one per compartment of a locker system, each with `isProvisioned` and
 * `revokedAt` (backend `access-service.js`, `_upsertAccessInfo`). A door in
 * mode `remote` is marked provisioned without a grant object, so the question
 * is "provisioned and not revoked", not "has a grant".
 *
 * Bookings whose period has passed are left out: their access is over, so
 * removing the access point takes nothing from them. So are rejected ones -
 * a cancelled booking may still carry a stale entry, but it is not running.
 *
 * @param {Array} bookings The tenant's bookings, as `GET /:tenant/bookings`
 *   hands them out
 * @param {string} accessPointId The access point about to be deleted
 * @param {number} [now=Date.now()] The moment to judge "still running" against
 * @returns {Array} The bookings that would lose a live access, each once
 */
export function bookingsWithLiveAccess(
  bookings,
  accessPointId,
  now = Date.now()
) {
  const id = String(accessPointId);

  return (bookings || []).filter((booking) => {
    if (booking?.isRejected) return false;
    if (booking?.timeEnd && booking.timeEnd < now) return false;

    return (booking?.accessInfo || []).some(
      (entry) =>
        String(entry?.accessPointId) === id &&
        entry?.isProvisioned === true &&
        !entry?.revokedAt
    );
  });
}
