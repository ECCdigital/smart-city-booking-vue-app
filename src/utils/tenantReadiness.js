/**
 * The answer of the readiness check (glossary „Bereitschafts-Check“,
 * `GET api/tenants/:tenant/readiness`): criteria with a `key` and a `state`.
 * The one place that reads the states.
 */

const FULFILLED = "fulfilled";
const MISSING = "missing";

/** Whether the answer reports the criterion `key` as missing. */
export function isCriterionMissing(readiness, key) {
  return (readiness?.criteria || []).some(
    (criterion) => criterion.key === key && criterion.state === MISSING
  );
}

/** The chip colour of a criterion's state; an unknown state is grey. */
export function criterionColor(state) {
  if (state === FULFILLED) return "success";
  return state === MISSING ? "warning" : "grey";
}
