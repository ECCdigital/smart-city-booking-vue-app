/**
 * What a booking's access list is made of.
 *
 * The only source is `GET /api/:tenant/access?bookingId=<id>`, which projects
 * doors and the compartments of locker systems into one flat list
 * (`access-point-projection.js`). An entry carries `id`, `type`, `provider`,
 * `label`, `mode`, `validationRuleTypes`, `capabilities`, `accessFrom`,
 * `accessTo`, `accessBuffer`, `isProvisioned` and - at a compartment alone -
 * `externalBookingId` and `compartment`.
 *
 * The `id` of a compartment is opaque (`<accessPointId>:<authorizationId>`,
 * `<accessPointId>:hold` before the grant). It is passed on as it came: never
 * split, never assembled.
 */
import { isLockerAccessPoint } from "@/utilities/access-points";

/** The three states an entry of the list can be in. */
export const ACCESS_STATE = Object.freeze({
  /** Claimed for the booking, not granted yet. */
  HELD: "held",
  /** Granted and not taken back. */
  GRANTED: "granted",
  /** Granted once, taken back since. The entry stays as the trace. */
  REVOKED: "revoked",
});

const STATE_CHIPS = Object.freeze({
  [ACCESS_STATE.HELD]: Object.freeze({
    color: "grey",
    icon: "mdi-timer-sand",
    key: "accessPoint.booking.state.held",
  }),
  [ACCESS_STATE.GRANTED]: Object.freeze({
    color: "success",
    icon: "mdi-check-decagram-outline",
    key: "accessPoint.booking.state.granted",
  }),
  [ACCESS_STATE.REVOKED]: Object.freeze({
    color: "error",
    icon: "mdi-cancel",
    key: "accessPoint.booking.state.revoked",
  }),
});

/**
 * The state of one entry, read off the two fields the projection carries for
 * it. `externalBookingId` is the authorization id of the grant
 * (`access-service.js` `_compartmentContext`), so it is null exactly until the
 * grant exists and stays set once it did; `isProvisioned` is the grant that is
 * not revoked. A door never carries `externalBookingId` and is therefore held
 * or granted, never revoked.
 *
 * @param {Object} entry One entry of the projection
 * @returns {string} One of `ACCESS_STATE`
 */
export function accessState(entry) {
  if (entry?.isProvisioned === true) {
    return ACCESS_STATE.GRANTED;
  }
  return entry?.externalBookingId == null
    ? ACCESS_STATE.HELD
    : ACCESS_STATE.REVOKED;
}

/**
 * How a state is shown: one colour, one icon, one translation key.
 *
 * @param {string} state One of `ACCESS_STATE`
 * @returns {{ color: string, icon: string, key: string }} The chip
 */
export function accessStateChip(state) {
  return STATE_CHIPS[state] || STATE_CHIPS[ACCESS_STATE.HELD];
}

/**
 * The entries of an access answer, compartments first. The API answers them in
 * that order already; sorting here means the list reads the same whatever
 * order it arrives in.
 *
 * @param {Object|Array} responseBody The body of the access request, either
 *   the `{ success, data }` envelope or a bare array
 * @returns {Object[]} The entries, compartments before doors
 */
export function accessEntriesOf(responseBody) {
  const entries = Array.isArray(responseBody)
    ? responseBody
    : responseBody?.data;

  if (!Array.isArray(entries)) {
    return [];
  }

  return [...entries].sort(
    (a, b) => Number(isLockerAccessPoint(b)) - Number(isLockerAccessPoint(a))
  );
}
