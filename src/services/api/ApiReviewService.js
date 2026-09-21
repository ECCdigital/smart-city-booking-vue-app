import ApiClient from "./ApiClientService";

/** The path segment of each offer type (the backend's `OFFER_TYPES`). */
const OFFER_PATHS = Object.freeze({
  bookable: "bookables",
  event: "events",
});

function offerPath(tenantId, offerType, offerId) {
  const offers = OFFER_PATHS[offerType];
  if (!offers) {
    throw new Error(`Unknown offer type: ${offerType}`);
  }
  return `api/${tenantId}/${offers}/${offerId}`;
}

function reviewPath(tenantId, offerType, offerId) {
  return `${offerPath(tenantId, offerType, offerId)}/review`;
}

/**
 * The review of an offer (glossary "Prüfstatus"): bookables and events share
 * the two operations. Both answer `{ offerType, offerId, review }`; the
 * review is what the caller needs. An invalid or outdated transition is a
 * 409 `review_transition_invalid`.
 */
export default {
  /**
   * The current review, read from the offer's admin DTO - there is no review
   * read of its own. For catching up after a conflict.
   */
  async getReview(tenantId, offerType, offerId) {
    const response = await ApiClient.get(
      offerPath(tenantId, offerType, offerId)
    );
    return response.data.review || null;
  },

  /**
   * Submits the offer for review. Takes no body; a repeat on a pending
   * offer is a no-op that answers the unchanged review.
   */
  async submit(tenantId, offerType, offerId) {
    const response = await ApiClient.post(
      `${reviewPath(tenantId, offerType, offerId)}/submissions`
    );
    return response.data.review;
  },

  /**
   * The instance owner's decision: `approve`, `reject` or `withdraw`, with
   * an optional reason.
   */
  async decide(tenantId, offerType, offerId, { action, reason } = {}) {
    const body = { action };
    if (typeof reason === "string" && reason.trim() !== "") {
      body.reason = reason.trim();
    }
    const response = await ApiClient.post(
      `${reviewPath(tenantId, offerType, offerId)}/decisions`,
      body
    );
    return response.data.review;
  },
};
