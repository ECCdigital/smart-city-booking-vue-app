/**
 * Section anchors and sub-nav targets for BookableEdit.
 * DOM id: be-section-{id}
 */

export function bookableEditSectionElementId(sectionId) {
  return `be-section-${sectionId}`;
}

function getBookingMode(bookable) {
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

function hasIfbsLocker(bookable) {
  return (bookable?.lockerDetails?.units || []).some(
    (unit) => unit?.lockerSystem === "ifbs"
  );
}

function handlesExternalPricing(bookable) {
  const providers = bookable?.externalProviders;
  if (!Array.isArray(providers)) return false;
  return providers.some(
    (provider) =>
      provider?.provider === "ifbs" &&
      provider?.active === true &&
      Array.isArray(provider.handles) &&
      provider.handles.includes("pricing")
  );
}

function lockerSystemType(bookable) {
  const units = bookable?.lockerDetails?.units || [];
  if (!bookable?.lockerDetails?.active) return null;
  if (!units.length) return "select";
  const type = units[0]?.lockerSystem;
  if (type === "pareva" || type === "ifbs") return type;
  return "select";
}

/** All known sections (labelKey → i18n bookable.edit.sections.*) */
const ALL_SECTIONS = [
  {
    tabKey: "general",
    id: "general-info",
    labelKey: "bookable.edit.sections.generalInfo",
    type: "scroll",
  },
  {
    tabKey: "general",
    id: "general-images",
    labelKey: "bookable.edit.sections.generalImages",
    type: "scroll",
  },
  {
    tabKey: "general",
    id: "general-booker-info",
    labelKey: "bookable.edit.sections.generalBookerInfo",
    type: "scroll",
  },
  {
    tabKey: "general",
    id: "general-tags",
    labelKey: "bookable.edit.sections.generalTags",
    type: "scroll",
    expertOnly: true,
  },
  {
    tabKey: "pricing",
    id: "pricing-external",
    labelKey: "bookable.edit.sections.pricingExternal",
    type: "scroll",
    expertOnly: true,
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
    expertOnly: true,
  },
  {
    tabKey: "bookingType",
    id: "bookingType-buffer",
    labelKey: "bookable.edit.sections.bookingTypeBuffer",
    type: "scroll",
    expertOnly: true,
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
    expertOnly: true,
  },
  {
    tabKey: "permissions",
    id: "permissions-login",
    labelKey: "bookable.edit.sections.permissionsLogin",
    type: "scroll",
  },
  {
    tabKey: "permissions",
    id: "permissions-access",
    labelKey: "bookable.edit.sections.permissionsAccess",
    type: "scroll",
  },
  {
    tabKey: "permissions",
    id: "permissions-discounts",
    labelKey: "bookable.edit.sections.permissionsDiscounts",
    type: "scroll",
    expertOnly: true,
  },
  {
    tabKey: "permissions",
    id: "permissions-group-booking",
    labelKey: "bookable.edit.sections.permissionsGroupBooking",
    type: "scroll",
  },
  {
    tabKey: "permissions",
    id: "permissions-cancellation",
    labelKey: "bookable.edit.sections.permissionsCancellation",
    type: "scroll",
    expertOnly: true,
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
    expertOnly: true,
  },
  {
    tabKey: "relatedBookables",
    id: "related-checkout",
    labelKey: "bookable.edit.sections.relatedCheckout",
    type: "scroll",
  },
  {
    tabKey: "relatedBookables",
    id: "related-hierarchy",
    labelKey: "bookable.edit.sections.relatedHierarchy",
    type: "scroll",
  },
  {
    tabKey: "accessLocks",
    id: "lockers-select",
    labelKey: "bookable.edit.sections.lockersSelect",
    type: "scroll",
  },
  {
    tabKey: "accessLocks",
    id: "lockers-pareva",
    labelKey: "bookable.edit.sections.lockersPareva",
    type: "scroll",
  },
  {
    tabKey: "accessLocks",
    id: "lockers-ifbs",
    labelKey: "bookable.edit.sections.lockersIfbs",
    type: "scroll",
  },
  {
    tabKey: "additional",
    id: "additional-required-fields",
    labelKey: "bookable.edit.sections.additionalRequiredFields",
    type: "scroll",
    expertOnly: true,
  },
  {
    tabKey: "additional",
    id: "additional-notes",
    labelKey: "bookable.edit.sections.additionalNotes",
    type: "scroll",
  },
];

function isSectionVisible(section, { bookable, expertMode }) {
  if (section.expertOnly && !expertMode) {
    return false;
  }

  const mode = getBookingMode(bookable);
  const isTimeWindowMode = mode === "schedule" || mode === "timePeriod";
  const visibilityById = {
    "pricing-external": () => hasIfbsLocker(bookable),
    "pricing-tiers": () =>
      !hasIfbsLocker(bookable) || !handlesExternalPricing(bookable),
    "bookingType-duration": () => mode === "schedule",
    "bookingType-time-periods": () => mode === "timePeriod",
    "bookingType-block-periods": () => mode === "blockPeriod",
    "bookingType-lead-time": () =>
      ["schedule", "timePeriod", "blockPeriod"].includes(mode),
    "bookingType-buffer": () => mode === "schedule",
    "openingHours-regular": () => isTimeWindowMode,
    "openingHours-special": () => isTimeWindowMode,
    "lockers-select": () => lockerSystemType(bookable) === "select",
    "lockers-pareva": () => lockerSystemType(bookable) === "pareva",
    "lockers-ifbs": () => lockerSystemType(bookable) === "ifbs",
  };

  const check = visibilityById[section.id];
  return check ? check() : true;
}

/**
 * @param {string} tabKey
 * @param {{ bookable: object, expertMode: boolean }} ctx
 * @returns {Array<object>}
 */
export function getVisibleBookableEditSections(tabKey, ctx) {
  return ALL_SECTIONS.filter(
    (section) =>
      section.tabKey === tabKey && isSectionVisible(section, ctx || {})
  );
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
