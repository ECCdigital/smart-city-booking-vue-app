/**
 * Section anchors and sub-nav targets for BookableEdit.
 * DOM id: be-section-{id}
 */

import {
  IFBS_PROVIDER,
  handlesCapability,
  providerHandles,
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
 * Whether the bookable declares the external data source the pricing tab
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

function handlesExternalPricing(bookable) {
  const providers = bookable?.externalProviders;
  if (!Array.isArray(providers)) return false;
  return providers.some(
    (provider) =>
      provider?.provider === IFBS_PROVIDER &&
      providerHandles(provider, "pricing")
  );
}

/**
 * All known sections (labelKey → i18n bookable.edit.sections.*, or the title
 * of the area the section is - `bookable.areas.*`). A section that is an
 * expert option names it in `expertOption`.
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
    id: "pricing-external",
    labelKey: "bookable.edit.sections.pricingExternal",
    type: "scroll",
    expertOption: "externalPrices",
  },
  {
    tabKey: "pricing",
    id: "pricing-base",
    labelKey: "bookable.edit.sections.pricingBase",
    type: "scroll",
  },
  {
    tabKey: "pricing",
    id: "pricing-tiers",
    labelKey: "bookable.edit.sections.pricingTiers",
    type: "scroll",
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
    labelKey: "bookable.edit.sections.bookingTypeDuration",
    type: "scroll",
  },
  {
    tabKey: "bookingType",
    id: "bookingType-time-periods",
    labelKey: "bookable.edit.sections.bookingTypeTimePeriods",
    type: "scroll",
  },
  {
    tabKey: "bookingType",
    id: "bookingType-block-periods",
    labelKey: "bookable.edit.sections.bookingTypeBlockPeriods",
    type: "scroll",
  },
  {
    tabKey: "bookingType",
    id: "bookingType-lead-time",
    labelKey: "bookable.edit.sections.bookingTypeLeadTime",
    type: "scroll",
    expertOption: "leadTime",
  },
  {
    tabKey: "bookingType",
    id: "bookingType-buffer",
    labelKey: "bookable.edit.sections.bookingTypeBuffer",
    type: "scroll",
    expertOption: "buffer",
  },
  {
    tabKey: "openingHours",
    id: "openingHours-regular",
    labelKey: "bookable.edit.sections.openingHoursRegular",
    type: "scroll",
  },
  {
    tabKey: "openingHours",
    id: "openingHours-special",
    labelKey: "bookable.edit.sections.openingHoursSpecial",
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
    "pricing-tiers": () => !handlesExternalPricing(bookable),
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
 * `BookableEdit.openSection`: the jump of the note that a provider handles
 * the availability. Follows the section wherever its tab is.
 */
export const EXTERNAL_PROVIDER_SETTING = Object.freeze({
  tabKey: getBookableEditSectionById("pricing-external").tabKey,
  sectionId: "pricing-external",
});
