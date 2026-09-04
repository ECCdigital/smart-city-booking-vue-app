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
import { ACCESS_BLOCKING_REASON } from "@/utilities/access-blocking-reasons";

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

/**
 * The provider actions the projection offers a client, one button each
 * (`access-point-projection.js`, `UI_CAPABILITIES`). Everything else a
 * provider declares is management business. `unlatch` is deliberately not
 * among them: pulling the latch is decided behind `open`, per lock.
 */
export const ACCESS_CAPABILITY = Object.freeze({
  OPEN: "open",
  CLOSE: "close",
  GET_STATUS: "getStatus",
});

/** The modes that leave a remote way in, as the backend reads them. */
const REMOTE_MODES = Object.freeze(["remote", "both"]);

/**
 * Whether the provider of this entry offers the action at all. A missing
 * declaration is not permission: Pareva declares none, and an open button on
 * a Pareva system is a button the provider cannot serve.
 *
 * @param {Object} entry One entry of the projection
 * @param {string} capability One of `ACCESS_CAPABILITY`
 * @returns {boolean} Whether the action may be offered
 */
export function hasCapability(entry, capability) {
  return (entry?.capabilities || []).includes(capability);
}

/**
 * Whether this entry can be opened from here at all. Two independent things
 * have to hold. The mode has to leave a remote way in - a PIN-only door is
 * opened at the door, by hand, and the backend refuses it with
 * `no_remote_access`. And the provider has to declare `open`: one that does
 * not throws inside its adapter, which reaches the caller as a plain server
 * error naming nothing. Both are reported as "no remote access" here, because
 * that is what the person in front of the button is looking at.
 *
 * @param {Object} entry One entry of the projection
 * @returns {boolean} Whether an open button would reach anything
 */
export function isRemotelyOperable(entry) {
  return (
    hasCapability(entry, ACCESS_CAPABILITY.OPEN) &&
    REMOTE_MODES.includes(entry?.mode)
  );
}

/**
 * Whether the entry declares a window at all. The projection carries
 * `accessFrom`/`accessTo` as `null` where it knows none, and a null read as a
 * number would put every such entry outside its window for good.
 *
 * @param {Object} entry One entry of the projection
 * @returns {boolean} Whether both ends of the window are known
 */
export function hasAccessWindow(entry) {
  return entry?.accessFrom != null && entry?.accessTo != null;
}

/**
 * Whether the entry may be operated at this moment, as far as its window
 * says. An entry without a window is not fenced in by one.
 *
 * @param {Object} entry One entry of the projection
 * @param {number} now The moment to judge by, in milliseconds
 * @returns {boolean} Whether now lies inside the window
 */
export function isWithinAccessWindow(entry, now) {
  if (!hasAccessWindow(entry)) return true;
  return entry.accessFrom <= now && entry.accessTo >= now;
}

/**
 * Why the open button of this entry is dead, in the backend's own reason
 * vocabulary - or `null` where nothing stands in the way.
 *
 * Only the fields of the tenant-scaled projection are read. The finer reasons
 * of `accessEligibility` (`primaryBlockingReason`, `evidenceWaived`) are not
 * on that route, and a backend PR for message texts alone is not warranted.
 * So this repeats the part of the decision that is visible from here: the
 * provider and the mode, the window, the grant, and the evidence this screen
 * cannot send. The order is the spec's - what will never work is said before
 * what is merely not the case right now.
 *
 * The grant is only held against an entry that has no other way in: a
 * compartment is assigned by its grant, while a door that opens remotely
 * stays operable without one (`access-decision.js`, `grantIsTheOnlyWayIn`).
 * A grant that was taken back is named as taken back rather than as missing,
 * so the reason agrees with the state chip beside it.
 *
 * @param {Object} entry One entry of the projection
 * @param {Object} options
 * @param {number} options.now The moment to judge the window by
 * @returns {string|null} One of `ACCESS_BLOCKING_REASON`, or null
 */
export function openBlockOf(entry, { now }) {
  if (!isRemotelyOperable(entry)) {
    return ACCESS_BLOCKING_REASON.NO_REMOTE_ACCESS;
  }

  if (!isWithinAccessWindow(entry, now)) {
    return ACCESS_BLOCKING_REASON.OUTSIDE_ACCESS_WINDOW;
  }

  if (isLockerAccessPoint(entry) && entry?.isProvisioned !== true) {
    return accessState(entry) === ACCESS_STATE.REVOKED
      ? ACCESS_BLOCKING_REASON.AUTHORIZATION_REVOKED
      : ACCESS_BLOCKING_REASON.NOT_PROVISIONED;
  }

  // Open is called without a body - from here no evidence can be given, so
  // the click would run into a refusal. The server leaves
  // `validationRuleTypes` empty where its rules do not bite.
  if ((entry?.validationRuleTypes || []).length > 0) {
    return ACCESS_BLOCKING_REASON.EVIDENCE_MISSING;
  }

  return null;
}

/** How far a started open has come, as far as a poll could tell. */
export const OPEN_PROGRESS = Object.freeze({
  /** The provider confirmed the open. */
  CONFIRMED: "confirmed",
  /** The open is running and not confirmed yet. */
  PENDING: "pending",
  /** The poll itself could not tell - which is not the same as "not yet". */
  UNKNOWN: "unknown",
});

/**
 * What one answer of `/open-status` says. `confirmed` is `null` where the
 * poll failed and the provider cannot say (`OpenProgress` in the backend), so
 * `null` must not be read as `false`: one is "we do not know", the other is
 * "not yet".
 *
 * @param {Object} status The body of an `/open-status` answer
 * @returns {string} One of `OPEN_PROGRESS`
 */
export function openProgressOf(status) {
  if (status?.confirmed === true) return OPEN_PROGRESS.CONFIRMED;
  if (status?.confirmed === false) return OPEN_PROGRESS.PENDING;
  return OPEN_PROGRESS.UNKNOWN;
}
