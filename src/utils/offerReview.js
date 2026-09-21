/**
 * The review of an offer (glossary "Prüfstatus", tenant supervision spec §4
 * and §5.1) as the admin UI reads it: how the status is named, which actions
 * the viewer is offered and what the status means for the public right now.
 * Pure and offer-type agnostic - bookables and events carry the same
 * `review` and `isPublic`.
 */

import { SUPERVISION_LEVELS as LEVELS } from "@/utils/tenantOnboarding";

export const OFFER_TYPES = Object.freeze({
  BOOKABLE: "bookable",
  EVENT: "event",
});

export const REVIEW_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
});

/**
 * What the panel offers. `resubmit` is the backend's submission of a rejected
 * offer; `approve`, `reject` and `withdraw` are the backend's decisions.
 */
export const REVIEW_ACTIONS = Object.freeze({
  SUBMIT: "submit",
  RESUBMIT: "resubmit",
  APPROVE: "approve",
  REJECT: "reject",
  WITHDRAW: "withdraw",
});

const STATUS_COLORS = Object.freeze({
  [REVIEW_STATUS.PENDING]: "warning",
  [REVIEW_STATUS.APPROVED]: "success",
  [REVIEW_STATUS.REJECTED]: "error",
});

/** A missing review or an unknown status is "no review status yet". */
function statusOf(review) {
  const status = review?.status;
  return Object.values(REVIEW_STATUS).includes(status) ? status : null;
}

/** An unknown level (not loaded, or not readable by the viewer) is `null`. */
function levelOf(level) {
  return Object.values(LEVELS).includes(level) ? level : null;
}

export function reviewStatusView(review) {
  const status = statusOf(review);
  return {
    status,
    labelKey: `supervision.review.status.${status || "none"}`,
    color: STATUS_COLORS[status] || "grey",
  };
}

/**
 * The transitions of spec §4 the viewer may trigger, nothing else. The
 * instance owner decides; the tenant owner submits. The backend lets the
 * instance owner submit as well - needed for an offer nobody submitted - but
 * on a rejected offer his move is the correction, not a resubmission.
 */
export function reviewActions(
  review,
  { tenantOwner = false, instanceOwner = false } = {}
) {
  const status = statusOf(review);
  const maySubmit = tenantOwner || instanceOwner;
  if (status === null) {
    return maySubmit ? [REVIEW_ACTIONS.SUBMIT] : [];
  }
  if (status === REVIEW_STATUS.PENDING) {
    return instanceOwner ? [REVIEW_ACTIONS.APPROVE, REVIEW_ACTIONS.REJECT] : [];
  }
  if (status === REVIEW_STATUS.APPROVED) {
    return instanceOwner ? [REVIEW_ACTIONS.WITHDRAW] : [];
  }
  if (instanceOwner) return [REVIEW_ACTIONS.APPROVE];
  return tenantOwner ? [REVIEW_ACTIONS.RESUBMIT] : [];
}

/** The action the backend knows: a resubmission is a submission. */
export function isSubmission(action) {
  return action === REVIEW_ACTIONS.SUBMIT || action === REVIEW_ACTIONS.RESUBMIT;
}

/**
 * What the status means for the public right now - the supervision gate of
 * spec §5.1, row by row. `null` while the tenant's level is unknown.
 */
export function reviewEffectKey({ review, isPublic } = {}, supervisionLevel) {
  const level = levelOf(supervisionLevel);
  if (!level) return null;
  return `supervision.review.effect.${effectOf(
    level,
    statusOf(review),
    isPublic === true
  )}`;
}

function effectOf(level, status, isPublic) {
  if (level === LEVELS.BLOCKED) return "blocked";
  if (level === LEVELS.FREE) return isPublic ? "free-listed" : "free-unlisted";
  if (status !== REVIEW_STATUS.APPROVED) return "not-reachable";
  return isPublic ? "listed" : "direct-link-only";
}

/**
 * Free tenants get no supervision explanations (spec §9): their owner sees
 * the review only once there is a status. The instance owner always does.
 */
export function showsReview(review, supervisionLevel, { instanceOwner } = {}) {
  if (instanceOwner || statusOf(review) !== null) return true;
  const level = levelOf(supervisionLevel);
  return level !== null && level !== LEVELS.FREE;
}

/** The effect line is such an explanation: free shows it to the instance owner only. */
export function showsReviewEffect(supervisionLevel, { instanceOwner } = {}) {
  const level = levelOf(supervisionLevel);
  if (!level) return false;
  return level !== LEVELS.FREE || instanceOwner === true;
}

/** The badge of an offer in a list: a status that matters, else `null`. */
export function reviewBadge(review, supervisionLevel) {
  const level = levelOf(supervisionLevel);
  if (!level || level === LEVELS.FREE || statusOf(review) === null) return null;
  return reviewStatusView(review);
}

/** Under supervision the publication wish (`isPublic`) alone publishes nothing. */
export function publicationWishHintKey(supervisionLevel) {
  const level = levelOf(supervisionLevel);
  if (!level || level === LEVELS.FREE) return null;
  return `supervision.review.wish-hint.${level}`;
}
