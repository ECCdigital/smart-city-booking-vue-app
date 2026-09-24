/**
 * The shared vocabulary of the tenant supervision (glossary
 * "Mandanten-Aufsicht"): levels, review statuses, the history's event types,
 * their German label keys and chip colours. Pure; the components translate
 * the keys.
 */

/**
 * The supervision level of a tenant (glossary "Aufsichtsstufe"): `pending`
 * is "Freigabe ausstehend", `declined` is "abgewiesen". `PENDING` shares its
 * value with `REVIEW_STATUS.PENDING` on purpose, as in the backend.
 */
export const SUPERVISION_LEVELS = Object.freeze({
  FREE: "free",
  SUPERVISED: "supervised",
  PENDING: "pending",
  DECLINED: "declined",
});

export const SUPERVISION_LEVEL_VALUES = Object.freeze(
  Object.values(SUPERVISION_LEVELS)
);

/** The levels a self-created tenant may start at (glossary "Startstufe"). */
export const INITIAL_SUPERVISION_LEVELS = Object.freeze([
  SUPERVISION_LEVELS.FREE,
  SUPERVISION_LEVELS.SUPERVISED,
  SUPERVISION_LEVELS.PENDING,
]);

/**
 * The levels with a public projection: a positive list, as in the backend,
 * so a level added later is not public until it is named here.
 */
export const PUBLIC_SUPERVISION_LEVELS = Object.freeze([
  SUPERVISION_LEVELS.FREE,
  SUPERVISION_LEVELS.SUPERVISED,
]);

/** The review status of an offer (glossary "Prüfstatus"); `null` is none yet. */
export const REVIEW_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

/** What is reviewed: the two kinds of offer, as the backend names them. */
export const OFFER_TYPES = Object.freeze({
  BOOKABLE: "bookable",
  EVENT: "event",
});

export const OFFER_TYPE_VALUES = Object.freeze(Object.values(OFFER_TYPES));

/** `null` for a type without a label: the caller shows the raw value. */
export function offerTypeLabelKey(offerType) {
  return OFFER_TYPE_VALUES.includes(offerType)
    ? `supervision.offer-types.${offerType}`
    : null;
}

// Only a missing level is free; an unknown one is passed on as it is.
const levelOrFree = (level) => level ?? SUPERVISION_LEVELS.FREE;

/**
 * The effective level of a tenant: a tenant from before the supervision
 * stores none and is free - the backend reads it the same way. A stored
 * level the UI does not know stays what it is, never free.
 */
export function effectiveLevel(tenant) {
  return levelOrFree(tenant?.supervisionLevel);
}

/**
 * The level names came with the guided setup; they are reused, not
 * repeated. `null` for a level without a name: the caller shows the raw
 * value.
 */
export function levelLabelKey(level) {
  const effective = levelOrFree(level);
  return SUPERVISION_LEVEL_VALUES.includes(effective)
    ? `tenant.onboarding.level.names.${effective}`
    : null;
}

const LEVEL_COLORS = Object.freeze({
  free: "success",
  supervised: "warning",
  pending: "warning",
  declined: "error",
});

export function levelColor(level) {
  const effective = levelOrFree(level);
  return SUPERVISION_LEVEL_VALUES.includes(effective)
    ? LEVEL_COLORS[effective]
    : "grey";
}

/**
 * The levels a change may lead to: every one but the effective. `declined`
 * is never one of them - a tenant is declined through its own action.
 */
export function selectableLevels(currentLevel) {
  const current = levelOrFree(currentLevel);
  return SUPERVISION_LEVEL_VALUES.filter(
    (level) => level !== current && level !== SUPERVISION_LEVELS.DECLINED
  );
}

const REVIEW_STATUS_VALUES = Object.values(REVIEW_STATUS);

/** A missing or unknown status is "no review status yet": `null`. */
export function knownReviewStatus(status) {
  return REVIEW_STATUS_VALUES.includes(status) ? status : null;
}

// Two wordings on purpose: `supervision.review-status.*` names a state inside
// a sentence (the history's "ausstehend → freigegeben"), while
// `supervision.review.status.*` is the headline of chip and review panel.
export function reviewStatusLabelKey(status) {
  return `supervision.review-status.${knownReviewStatus(status) || "none"}`;
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
 * (a creation has no old one) or one without a label.
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
