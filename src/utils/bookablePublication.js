/**
 * The publication of a bookable (glossary „Veröffentlichung“, ECCdigital/
 * tickets#362): two independent switches, „Buchbar“ (`isBookable`) and „Im
 * Katalog listen“ (`isPublic`, the Veröffentlichungswunsch), and what they
 * mean together with the tenant's Aufsichtsstufe and the offer's Prüfstatus.
 * Pure: the component „Veröffentlichung“ and the flow's confirmation read it,
 * in both modes the same.
 *
 * The gate is the backend's public projection: a free tenant passes, a
 * supervised one only with an approved review (in the catalog and by
 * Direktlink alike), a pending or declined one never. Behind the gate,
 * `isPublic` lists the bookable and `isBookable` lets it be booked; without
 * `isPublic` it is still reachable by Direktlink.
 */

import {
  REVIEW_STATUS,
  SUPERVISION_LEVELS as LEVELS,
  knownReviewStatus,
} from "@/utils/supervision";

const EFFECT = "bookable.publication.effect";

/**
 * A missing or unknown level reads as free, as the flow's wording always
 * did (`publishVariant`) - the backend decides what becomes public.
 */
function levelOf(level) {
  return Object.values(LEVELS).includes(level) ? level : LEVELS.FREE;
}

/** What the two switches allow once the gate is passed. */
function switchesEffect({ isBookable, isPublic }) {
  const bookable = isBookable === true;
  const listed = isPublic === true;
  if (bookable) return listed ? "listed" : "direct-link";
  return listed ? "listed-not-bookable" : "hidden";
}

/**
 * The line under the switches: what follows from „Buchbar“, „Im Katalog
 * listen“, the level and the review, as an i18n key. Always one, also for a
 * free tenant. With both switches off nothing is reachable whatever the
 * gate. Under supervision without approval it says what follows after the
 * approval only while one is coming - the review runs, or saving submits
 * the wish (`submitsOnSave`); without the wish nothing is submitted, and a
 * rejected offer keeps its status. A pending or declined tenant keeps
 * everything back.
 */
export function publicationEffectKey(
  { isBookable, isPublic, review } = {},
  supervisionLevel
) {
  const effect = switchesEffect({ isBookable, isPublic });
  const level = levelOf(supervisionLevel);
  if (effect === "hidden" || level === LEVELS.FREE) {
    return `${EFFECT}.${effect}`;
  }
  if (level === LEVELS.SUPERVISED) {
    const status = knownReviewStatus(review?.status);
    if (status === REVIEW_STATUS.APPROVED) return `${EFFECT}.${effect}`;
    if (status === REVIEW_STATUS.REJECTED) return `${EFFECT}.rejected`;
    if (status === REVIEW_STATUS.PENDING || isPublic === true) {
      return `${EFFECT}.after-approval.${effect}`;
    }
    return `${EFFECT}.unsubmitted`;
  }
  return `${EFFECT}.${level}`;
}

/**
 * Whether saving submits the offer for review (glossary „Einreichung“): the
 * backend submits an offer without a Prüfstatus on its Veröffentlichungs-
 * wunsch. Said under supervision only - a free tenant reads no supervision
 * texts, and while the level is unknown nothing is certain.
 */
export function submitsOnSave({ isPublic, review } = {}, supervisionLevel) {
  if (!Object.values(LEVELS).includes(supervisionLevel)) return false;
  if (supervisionLevel === LEVELS.FREE) return false;
  return isPublic === true && knownReviewStatus(review?.status) === null;
}

const PUBLICATION_FIELDS = ["isBookable", "isPublic"];
const isOn = (bookable, field) => bookable?.[field] === true;

/** What the public meets once the gate is passed, as the confirmation says it. */
const OUTCOME_OF_EFFECT = Object.freeze({
  listed: "published",
  "direct-link": "direct-link",
  "listed-not-bookable": "listed-not-bookable",
  hidden: "draft",
});

/**
 * What the flow's confirmation says became of the publication, read from
 * the bookable as the backend answered the save (`saved`, with the review
 * it started) against the one stored before (`before`, `null` for a new
 * one):
 *
 * - `submitted`: under supervision this save submitted the offer (its
 *   review is pending now, it was not before);
 * - `kept`: an existing bookable whose switches stayed as they were;
 * - `noted`: a pending or declined tenant's Veröffentlichungswunsch;
 * - `in-review`: under supervision, the review still runs;
 * - where the gate is passed (a free tenant, an approved offer) what the
 *   switches allow: `published` (Buchbar and Im Katalog), `direct-link`,
 *   `listed-not-bookable`;
 * - else `draft`: nothing is public.
 *
 * A missing or unknown level reads as free.
 */
export function publicationOutcome(saved, before, supervisionLevel) {
  const level = levelOf(supervisionLevel);
  const status = knownReviewStatus(saved?.review?.status);
  const statusBefore = before ? knownReviewStatus(before.review?.status) : null;
  if (
    level !== LEVELS.FREE &&
    status === REVIEW_STATUS.PENDING &&
    statusBefore !== REVIEW_STATUS.PENDING
  ) {
    return "submitted";
  }
  if (
    before &&
    PUBLICATION_FIELDS.every(
      (field) => isOn(saved, field) === isOn(before, field)
    )
  ) {
    return "kept";
  }
  if (level === LEVELS.PENDING || level === LEVELS.DECLINED) {
    return isOn(saved, "isPublic") ? "noted" : "draft";
  }
  if (level === LEVELS.SUPERVISED && status !== REVIEW_STATUS.APPROVED) {
    return status === REVIEW_STATUS.PENDING ? "in-review" : "draft";
  }
  return OUTCOME_OF_EFFECT[switchesEffect(saved || {})];
}
