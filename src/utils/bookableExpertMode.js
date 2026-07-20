const SESSION_STORAGE_KEY = "bookableEditExpertMode";

/** Tabs hidden in simple (non-expert) mode */
export const BOOKABLE_EXPERT_ONLY_TAB_KEYS = [
  "lockerSystems",
  "relatedBookables",
  "customFields",
];

/** Booking types only selectable in expert mode */
export const BOOKABLE_EXPERT_ONLY_BOOKING_TYPES = [
  "week",
  "month",
  "blockPeriod",
];

function getExpertModeEnvRaw() {
  return process.env.VUE_APP_BOOKABLE_EXPERT_MODE_DEFAULT;
}

/**
 * Toggle is only available when the env var is explicitly set to "true" or "false".
 * Unset / empty → classic UI (expert mode always on, no toggle).
 */
export function isBookableExpertModeConfigured() {
  const value = getExpertModeEnvRaw();
  return value === "true" || value === "false";
}

/**
 * Default expert mode from build-time env.
 * Unset / empty → expert mode on.
 * "false" → expert mode off; "true" → expert mode on.
 */
export function getBookableExpertModeDefault() {
  return getExpertModeEnvRaw() !== "false";
}

export function getInitialBookableExpertMode() {
  if (!isBookableExpertModeConfigured()) {
    return true;
  }
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch (error) {
    // sessionStorage unavailable (e.g. private mode restrictions)
  }
  return getBookableExpertModeDefault();
}

export function setBookableExpertModeSession(enabled) {
  if (!isBookableExpertModeConfigured()) {
    return;
  }
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, enabled ? "true" : "false");
  } catch (error) {
    // ignore persistence failures
  }
}

export function isBookableExpertOnlyTab(tabKey) {
  return BOOKABLE_EXPERT_ONLY_TAB_KEYS.includes(tabKey);
}

export function isBookableExpertOnlyBookingType(bookingType) {
  return BOOKABLE_EXPERT_ONLY_BOOKING_TYPES.includes(bookingType);
}

/** Overview trait keys that represent expert-only configuration */
export const BOOKABLE_EXPERT_OVERVIEW_TRAIT_KEYS = [
  "tags",
  "specialOpeningHours",
  "lockerSystems",
  "checkoutOptions",
  "relatedBookables",
  "discounts",
  "cancellation",
];

export function isBookableExpertOverviewTraitKey(traitKey) {
  return BOOKABLE_EXPERT_OVERVIEW_TRAIT_KEYS.includes(traitKey);
}
