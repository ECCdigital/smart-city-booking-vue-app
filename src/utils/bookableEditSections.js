/**
 * Section anchors and sub-nav targets for BookableEdit.
 * DOM id: be-section-{id}
 */

import {
  IFBS_PROVIDER,
  handlesCapability,
} from "@/utils/bookableExternalProviders";

export function bookableEditSectionElementId(sectionId) {
  return `be-section-${sectionId}`;
}

/** The booking type of the bookable, as the booking type tab names it. */
export function getBookingMode(bookable) {
  if (!bookable) return "independent";
  if (bookable.isScheduleRelated) return "schedule";
  if (bookable.isTimePeriodRelated) return "timePeriod";
  if (bookable.isBlockPeriodRelated) return "blockPeriod";
  if (bookable.isLongRange) {
    const type = bookable.longRangeOptions?.type;
    if (type === "week" || type === "month") return type;
  }
  return "independent";
}

/**
 * The Buchungsart by the names of its questions: Freie Zeitwahl, Feste
 * Zeitfenster, Zeiträume, Ganze Wochen, Ganze Monate or Ohne Zeit.
 */
export function bookingModeNameKey(bookable) {
  const availability = "bookable.flow.availability";
  const mode = getBookingMode(bookable);
  if (mode === "independent") return `${availability}.timed-no`;
  if (mode === "week" || mode === "month") {
    return `${availability}.long-range-${mode}`;
  }
  return `${availability}.modes.${mode}`;
}

/**
 * Whether the bookable declares the external data source Schließsysteme
 * configures.
 *
 * Since the locker fold the bookable no longer says which of its access points
 * is a locker system - the ids alone do not, and resolving them needs the
 * tenant's access point list, which this module cannot load. The declaration
 * is the part of that section that does live on the bookable, so it is what
 * the anchor keys on.
 */
function declaresExternalProvider(bookable) {
  return (bookable?.externalProviders || []).some(
    (provider) => provider?.provider === IFBS_PROVIDER
  );
}

/**
 * All known sections. `labelKey` names a section in the navigation with the
 * key of the card or area it is - the same key its heading reads, so the
 * navigation and the card say the same. A section that is an expert option
 * names it in `expertOption`.
 */
const ALL_SECTIONS = [
  // The two groups of the Grunddaten (BookableFlowIdentity), named as the
  // groups themselves are.
  {
    tabKey: "general",
    id: "general-catalog",
    labelKey: "bookable.flow.identity.catalog",
    type: "scroll",
  },
  {
    tabKey: "general",
    id: "general-admin",
    labelKey: "bookable.flow.identity.admin",
    type: "scroll",
  },
  {
    tabKey: "pricing",
    id: "pricing-price",
    labelKey: "bookable.flow.steps.price.title",
    type: "scroll",
  },
  {
    tabKey: "pricing",
    id: "pricing-amount",
    labelKey: "bookable.edit.sections.pricingAmount",
    type: "scroll",
  },
  // The settings of ParkraumService, part of Schließsysteme; the id stays
  // what links to it have known.
  {
    tabKey: "accessLocks",
    id: "pricing-external",
    labelKey: "bookable.edit.sections.accessLocksExternal",
    type: "scroll",
    expertOption: "externalPrices",
  },
  {
    tabKey: "bookingType",
    id: "bookingType-select",
    labelKey: "bookable.edit.sections.bookingTypeSelect",
    type: "scroll",
  },
  {
    tabKey: "bookingType",
    id: "bookingType-duration",
    labelKey: "bookable.edit.cards.bookingDuration",
    type: "scroll",
  },
  {
    tabKey: "bookingType",
    id: "bookingType-time-periods",
    labelKey: "bookable.flow.availability.modes.timePeriod",
    type: "scroll",
  },
  {
    tabKey: "bookingType",
    id: "bookingType-block-periods",
    labelKey: "bookable.flow.availability.modes.blockPeriod",
    type: "scroll",
  },
  {
    tabKey: "bookingType",
    id: "bookingType-lead-time",
    labelKey: "bookable.edit.cards.leadTime",
    type: "scroll",
    expertOption: "leadTime",
  },
  {
    tabKey: "bookingType",
    id: "bookingType-buffer",
    labelKey: "bookable.edit.cards.buffer",
    type: "scroll",
    expertOption: "buffer",
  },
  {
    tabKey: "openingHours",
    id: "openingHours-regular",
    labelKey: "bookable.edit.cards.openingHours",
    type: "scroll",
  },
  {
    tabKey: "openingHours",
    id: "openingHours-special",
    labelKey: "bookable.edit.cards.specialOpeningHours",
    type: "scroll",
    expertOption: "specialOpeningHours",
  },
  {
    tabKey: "permissions",
    id: "permissions-access",
    labelKey: "bookable.flow.steps.permission.title",
    type: "scroll",
  },
  {
    // Inside the card of „Wer darf buchen?“ (BookableFlowPermission).
    tabKey: "permissions",
    id: "permissions-discounts",
    labelKey: "bookable.flow.permission.discounts",
    type: "scroll",
    expertOption: "bookingDiscounts",
  },
  {
    tabKey: "permissions",
    id: "permissions-confirmation",
    labelKey: "bookable.flow.steps.approval.title",
    type: "scroll",
  },
  {
    tabKey: "permissions",
    id: "permissions-group-booking",
    labelKey: "bookable.areas.groupBooking.title",
    type: "scroll",
  },
  {
    tabKey: "permissions",
    id: "permissions-cancellation",
    labelKey: "bookable.areas.cancellation.title",
    type: "scroll",
    expertOption: "cancellation",
  },
  {
    tabKey: "customFields",
    id: "customFields-values",
    labelKey: "bookable.edit.sections.customFieldsValues",
    type: "subTab",
    subTab: 0,
  },
  {
    tabKey: "customFields",
    id: "customFields-definitions",
    labelKey: "bookable.edit.sections.customFieldsDefinitions",
    type: "subTab",
    subTab: 1,
    expertOption: "customFieldDefinitions",
  },
  {
    tabKey: "relatedBookables",
    id: "related-checkout",
    labelKey: "bookable.areas.checkoutBookables.title",
    type: "scroll",
    expertOption: "checkoutBookables",
  },
  {
    tabKey: "relatedBookables",
    id: "related-hierarchy",
    labelKey: "bookable.areas.hierarchy.title",
    type: "scroll",
    expertOption: "hierarchy",
  },
  {
    tabKey: "additional",
    id: "additional-required-fields",
    labelKey: "bookable.areas.requiredFields.title",
    type: "scroll",
    expertOption: "requiredFields",
  },
  {
    tabKey: "additional",
    id: "additional-notes",
    labelKey: "bookable.areas.bookingNotes.title",
    type: "scroll",
  },
];

const everyOption = () => true;

function isSectionVisible(section, { bookable, shown = everyOption }) {
  if (section.expertOption && !shown(section.expertOption)) {
    return false;
  }

  const bookingMode = getBookingMode(bookable);
  const isTimeWindowMode =
    bookingMode === "schedule" || bookingMode === "timePeriod";
  // Where a provider handles the availability, the Buchungsart shows only
  // its note and none of the sections of a mode.
  const mode = handlesCapability(bookable, "availability") ? null : bookingMode;
  const visibilityById = {
    "pricing-external": () => declaresExternalProvider(bookable),
    "bookingType-duration": () => mode === "schedule",
    "bookingType-time-periods": () => mode === "timePeriod",
    "bookingType-block-periods": () => mode === "blockPeriod",
    "bookingType-lead-time": () =>
      ["schedule", "timePeriod", "blockPeriod"].includes(mode),
    "bookingType-buffer": () => mode === "schedule",
    "openingHours-regular": () => isTimeWindowMode,
    "openingHours-special": () => isTimeWindowMode,
  };

  const check = visibilityById[section.id];
  return check ? check() : true;
}

/**
 * @param {string} tabKey
 * @param {{ bookable: object, shown?: function(string): boolean }} ctx
 *   `shown(option)` is the expert-mode rule as the caller asks it (e.g.
 *   `BookableEdit.expertOptionShown`); without it every option shows.
 * @returns {Array<object>}
 */
export function getVisibleBookableEditSections(tabKey, ctx) {
  return ALL_SECTIONS.filter(
    (section) =>
      section.tabKey === tabKey && isSectionVisible(section, ctx || {})
  );
}

/**
 * Whether the section `sectionId` shows for the bookable - by its expert
 * option and its own condition, as the nav reads it. `bookableValidation`
 * checks a section only while it shows.
 */
export function isBookableEditSectionVisible(sectionId, ctx) {
  const section = getBookableEditSectionById(sectionId);
  return !!section && isSectionVisible(section, ctx || {});
}

export function getBookableEditSectionById(sectionId) {
  return ALL_SECTIONS.find((section) => section.id === sectionId) || null;
}

/**
 * Whether the nav should show nested section links for this tab.
 */
export function shouldShowBookableEditSectionNav(tabKey, ctx) {
  return getVisibleBookableEditSections(tabKey, ctx).length >= 2;
}

/**
 * Where an external provider is set up, as `{ tabKey, sectionId }` for
 * `BookableEdit.openSection`: the jump of the notes that a provider handles
 * the availability or the prices - the settings of ParkraumService in
 * Schließsysteme. Follows the section wherever its tab is.
 */
export const EXTERNAL_PROVIDER_SETTING = Object.freeze({
  tabKey: getBookableEditSectionById("pricing-external").tabKey,
  sectionId: "pricing-external",
});
