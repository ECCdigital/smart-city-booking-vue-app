/*
 * The anchor of a field of a bookable: the element around it carries
 * `data-field="<key>"`, the key of its row in the overview
 * (`overviewBlocks` in bookableFlow.js). A click in the overview leads to the
 * tab or step of the field, then here (ECCdigital/tickets#364).
 */

const FOCUSABLE =
  "input:not([type='hidden']):not([disabled]), textarea, select, button:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Scrolls the anchor of the field `key` within `root` into view and puts the
 * focus on it or its first control. Whether the anchor was found: a field
 * that does not show has none.
 *
 * @param {?Element} root - Where to look, e.g. the page or the flow.
 * @param {?string} key - The key of the field.
 * @returns {boolean} Whether the field was found.
 */
export function revealField(root, key) {
  if (!root || !key) return false;
  const anchor = root.querySelector(`[data-field="${key}"]`);
  if (!anchor) return false;
  anchor.scrollIntoView?.({ behavior: "smooth", block: "center" });
  const control = anchor.matches(FOCUSABLE)
    ? anchor
    : anchor.querySelector(FOCUSABLE);
  control?.focus?.({ preventScroll: true });
  return true;
}
