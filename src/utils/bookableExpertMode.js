import { priceModeOf } from "@/utils/bookableFlow";
import { bookingModeOf } from "@/utils/bookableBookingMode";
import { IFBS_PROVIDER } from "@/utils/bookableExternalProviders";
import { hasBufferConfig } from "@/utils/bookingLeadTime";

const SESSION_STORAGE_KEY = "bookableEditExpertMode";

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

const nonEmpty = (list) => Array.isArray(list) && list.length > 0;

const ifbsProviderOn = (bookable) =>
  (bookable.externalProviders || []).some(
    (provider) => provider?.provider === IFBS_PROVIDER && provider.active
  );

// What the backend's schema gives a new bookable.
const DEFAULT_REQUIRED_FIELDS = ["address", "zipCode", "city"];

/**
 * When a bookable uses an expert option: its stand differs from the one of a
 * new bookable. One entry per option - a booking mode, a section or a tab.
 */
const USED = {
  // Zeiträume, Ganze Wochen, Ganze Monate: the booking mode is this one.
  blockPeriod: (bookable) => bookingModeOf(bookable) === "blockPeriod",
  week: (bookable) => bookingModeOf(bookable) === "week",
  month: (bookable) => bookingModeOf(bookable) === "month",
  tiers: (bookable) => priceModeOf(bookable) === "tiers",
  coupons: (bookable) => bookable.enableCoupons === false,
  externalPrices: (bookable) => ifbsProviderOn(bookable),
  leadTime: (bookable) => bookable.isLeadTimeRelated === true,
  // The switch counts as well as the minutes: switched on, it is no longer
  // the stand of a new bookable.
  buffer: (bookable) =>
    bookable.isBufferRelated === true || hasBufferConfig(bookable),
  specialOpeningHours: (bookable) =>
    bookable.isSpecialOpeningHoursRelated === true ||
    nonEmpty(bookable.specialOpeningHours),
  tags: (bookable) => nonEmpty(bookable.tags),
  bookingDiscounts: (bookable) =>
    nonEmpty(bookable.bookingDiscounts?.users) ||
    nonEmpty(bookable.bookingDiscounts?.roles),
  // The settings of ParkraumService lie here too: switched on, they are in
  // use, so the place the notes of its fields lead to shows.
  accessLocks: (bookable) =>
    nonEmpty(bookable.accessPointDetails?.accessPointIds) ||
    ifbsProviderOn(bookable),
  checkoutBookables: (bookable) => nonEmpty(bookable.checkoutBookableIds),
  hierarchy: (bookable) => nonEmpty(bookable.relatedBookableIds),
  cancellation: (bookable) =>
    bookable.cancellationPolicy?.userCancellable === false,
  // In any order; missing is the backend's default.
  requiredFields: (bookable) =>
    Array.isArray(bookable.requiredFields) &&
    (bookable.requiredFields.length !== DEFAULT_REQUIRED_FIELDS.length ||
      DEFAULT_REQUIRED_FIELDS.some(
        (field) => !bookable.requiredFields.includes(field)
      )),
  customFieldDefinitions: (bookable) =>
    nonEmpty(bookable.customFieldDefinitions),
};

/**
 * Whether an expert option shows: always in expert mode, without it only
 * while the stored or the current bookable uses it - so expert mode hides
 * nothing a bookable relies on, and switching it off loses nothing unsaved.
 * There is no locked option with a hint.
 *
 * @param {string} option An expert option, a key of the table above
 * @param {{ expertMode: boolean, stored: ?object, current: ?object }} state
 *   The mode, the bookable as loaded or last saved, and as edited now
 * @returns {boolean}
 */
export function expertOptionShown(option, { expertMode, stored, current }) {
  const used = usedOf(option);
  if (expertMode) return true;
  return [stored, current].some((bookable) => !!bookable && used(bookable));
}

/**
 * Whether `bookable` uses the expert option - for what reads „genutzt“ by
 * the same table, like the areas of Weitere Einstellungen.
 */
export function expertOptionUsed(option, bookable) {
  return !!bookable && usedOf(option)(bookable);
}

function usedOf(option) {
  const used = USED[option];
  if (!used) throw new Error(`Unknown expert option: ${option}`);
  return used;
}

/**
 * The tabs of the editing page that hold expert options only, with their
 * options: such a tab shows while one of them does.
 */
const EXPERT_TABS = {
  accessLocks: ["accessLocks"],
  relatedBookables: ["checkoutBookables", "hierarchy"],
};

/**
 * Whether a tab of the editing page shows, given `shown(option)` - the rule
 * as the caller asks it, e.g. `BookableEdit.expertOptionShown`.
 */
export function expertTabShown(tabKey, shown) {
  const options = EXPERT_TABS[tabKey];
  return !options || options.some((option) => shown(option));
}
