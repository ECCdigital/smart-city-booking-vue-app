/**
 * The shared vocabulary of the tenant supervision (glossary
 * "Mandanten-Aufsicht"): levels, review statuses, the history's event types,
 * their German label keys and chip colours. Pure; the components translate
 * the keys.
 */

/** The supervision level of a tenant (glossary "Aufsichtsstufe"). */
export const SUPERVISION_LEVELS = Object.freeze({
  FREE: "free",
  SUPERVISED: "supervised",
  BLOCKED: "blocked",
});

export const SUPERVISION_LEVEL_VALUES = Object.freeze(
  Object.values(SUPERVISION_LEVELS)
);

/** The review status of an offer (glossary "Prüfstatus"); `null` is none yet. */
export const REVIEW_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

const knownLevel = (level) =>
  SUPERVISION_LEVEL_VALUES.includes(level) ? level : SUPERVISION_LEVELS.FREE;

/**
 * The effective level of a tenant: a tenant from before the supervision
 * stores none and is free - the backend reads it the same way.
 */
export function effectiveLevel(tenant) {
  return knownLevel(tenant?.supervisionLevel);
}

// The level names came with the guided setup; they are reused, not repeated.
export function levelLabelKey(level) {
  return `tenant.onboarding.level.names.${knownLevel(level)}`;
}

const LEVEL_COLORS = Object.freeze({
  free: "success",
  supervised: "warning",
  blocked: "error",
});

export function levelColor(level) {
  return LEVEL_COLORS[knownLevel(level)];
}

/** The levels a change may lead to: every one but the effective. */
export function selectableLevels(currentLevel) {
  const current = knownLevel(currentLevel);
  return SUPERVISION_LEVEL_VALUES.filter((level) => level !== current);
}

const REVIEW_STATUS_VALUES = Object.values(REVIEW_STATUS);

export function reviewStatusLabelKey(status) {
  return `supervision.review-status.${
    REVIEW_STATUS_VALUES.includes(status) ? status : "none"
  }`;
}

const REVIEW_STATUS_COLORS = Object.freeze({
  pending: "warning",
  approved: "success",
  rejected: "error",
});

export function reviewStatusColor(status) {
  return REVIEW_STATUS_COLORS[status] || "grey";
}

/** The event types of the supervision history, as the backend spells them. */
export const HISTORY_EVENT_TYPES = Object.freeze([
  "tenant.created",
  "tenant.levelInitialized",
  "tenant.levelChanged",
  "review.submitted",
  "review.approved",
  "review.rejected",
  "review.withdrawn",
]);

// A dot would nest the i18n path, so the key spells the event with a dash.
export function historyEventLabelKey(eventType) {
  return HISTORY_EVENT_TYPES.includes(eventType)
    ? `supervision.history.events.${eventType.replace(".", "-")}`
    : "supervision.history.events.unknown";
}

/**
 * The label of a row's old or new state: a level for the tenant's events, a
 * review status for an offer's. `null` where a tenant event names no level
 * (a creation has no old one).
 */
export function historyStateLabelKey(eventType, state) {
  if (String(eventType).startsWith("review.")) {
    return reviewStatusLabelKey(state);
  }
  return state ? levelLabelKey(state) : null;
}

/**
 * Who acted, where no user did: the migration or the system. `null` for a
 * user - the row names them by id.
 */
export function historyActorLabelKey(row) {
  if (row?.origin === "migration") return "supervision.history.actor.migration";
  if (row?.actor?.type === "user" && row.actor.userId) return null;
  return "supervision.history.actor.system";
}
