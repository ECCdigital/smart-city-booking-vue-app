/**
 * The review of an offer (glossary "Prüfstatus", tenant supervision spec §4
 * and §5.1) as the admin UI reads it: how the status is named, which actions
 * the viewer is offered and what the status means for the public right now.
 * Pure and offer-type agnostic - bookables and events carry the same
 * `review` and `isPublic`.
 */

import {
  REVIEW_STATUS,
  SUPERVISION_LEVELS as LEVELS,
  knownReviewStatus,
  reviewStatusColor,
} from "@/utils/supervision";

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

/** A missing review or an unknown status is "no review status yet". */
const statusOf = (review) => knownReviewStatus(review?.status);

/** An unknown level (not loaded, or not readable by the viewer) is `null`. */
function levelOf(level) {
  return Object.values(LEVELS).includes(level) ? level : null;
}

export function reviewStatusView(review) {
  const status = statusOf(review);
  return {
    status,
    labelKey: `supervision.review.status.${status || "none"}`,
    color: reviewStatusColor(status),
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
 * spec §5.1, row by row. `null` while the tenant's level is unknown, and for
 * a free tenant, whose offers show no review.
 */
export function reviewEffectKey({ review, isPublic } = {}, supervisionLevel) {
  const level = levelOf(supervisionLevel);
  if (!level || level === LEVELS.FREE) return null;
  return `supervision.review.effect.${effectOf(
    level,
    statusOf(review),
    isPublic === true
  )}`;
}

function effectOf(level, status, isPublic) {
  if (level === LEVELS.BLOCKED) return "blocked";
  if (status !== REVIEW_STATUS.APPROVED) return "not-reachable";
  return isPublic ? "listed" : "direct-link-only";
}

/**
 * A free tenant is not supervised, so its offers show no review at all (spec
 * §9) - not even a status left over from a supervised time, which has no
 * effect there. While the level is unknown, only what is certain shows: an
 * existing status, or the instance owner's panel.
 */
export function showsReview(review, supervisionLevel, { instanceOwner } = {}) {
  const level = levelOf(supervisionLevel);
  if (level === LEVELS.FREE) return false;
  return level !== null || instanceOwner === true || statusOf(review) !== null;
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
