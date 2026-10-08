/**
 * The guided flow of a bookable (ECCdigital/tickets#326), after the cloud
 * variant: the steps over the same bookable the editor holds, saved once at
 * the end. Pure: which steps there are, how each question reads from the
 * bookable and lands on it, how the confirmation is worded by supervision
 * level and which optional editor sections it links. The flow components
 * only wire it to the page.
 *
 * Every answer is read from the bookable itself - the flow keeps no state of
 * its own beyond the step - so leaving for the editor and coming back shows
 * what the bookable holds.
 */

import { SUPERVISION_LEVELS } from "@/utils/supervision";
import { providerHandles } from "@/utils/bookableExternalProviders";
import {
  getBookingMode,
  getVisibleBookableEditSections,
  getBookableEditSectionById,
} from "@/utils/bookableEditSections";
import { getTypeText } from "@/utils/bookables";
import {
  PRICE_TYPE_SUFFIX,
  formatCurrency,
  getLocationLabel,
  joinList,
  truncate,
} from "@/utils/bookableOverview";

export const FLOW_STEPS = Object.freeze([
  "identity",
  "availability",
  "price",
  "amount",
  "permission",
  "approval",
  // Always last: what becomes public is the final question (#362).
  "publication",
]);

/** The bookable types a new bookable may take; events stay in their editor. */
export const FLOW_BOOKABLE_TYPES = Object.freeze([
  "room",
  "event-location",
  "resource",
  "ticket",
]);

/** The editor route of each type - the flow is a mode of that editor. */
export const BOOKABLE_EDIT_ROUTES = Object.freeze({
  room: "room-edit",
  resource: "resource-edit",
  ticket: "ticket-edit",
  "event-location": "location-edit",
});

export function editRouteOf(type) {
  return BOOKABLE_EDIT_ROUTES[type] || "room-edit";
}

/** The list each type is created from; the flow's way back from a new one. */
export const BOOKABLE_LIST_ROUTES = Object.freeze({
  room: "rooms",
  resource: "resources",
  ticket: "tickets",
  "event-location": "event-locations",
});

export function listRouteOf(type) {
  return BOOKABLE_LIST_ROUTES[type] || "rooms";
}

/** The query value that opens the editor in the guided flow. */
export const FLOW_MODE = "flow";

/** A new bookable is always created in the flow; an existing one on request. */
export function isFlowMode({ bookableId, mode }) {
  return !bookableId || mode === FLOW_MODE;
}

function externalProviderHandles(bookable, capability) {
  return (bookable?.externalProviders || []).some((provider) =>
    providerHandles(provider, capability)
  );
}

export function handlesExternalAvailability(bookable) {
  return externalProviderHandles(bookable, "availability");
}

export function handlesExternalPricing(bookable) {
  return externalProviderHandles(bookable, "pricing");
}

// --- Verfügbarkeit ---------------------------------------------------------

/**
 * How the time is booked, as the booking type tab names it: `schedule`
 * (Freie Zeitwahl), `timePeriod` (Feste Zeiten), `blockPeriod` (Zeiträume),
 * `week` / `month` (Langzeit) or `independent` (ohne Zeit).
 */
export const bookingModeOf = getBookingMode;

/** The flow's second question: the long range is one answer, weeks or months. */
export function timeModeOf(bookable) {
  const mode = bookingModeOf(bookable);
  return mode === "week" || mode === "month" ? "longRange" : mode;
}

/**
 * Sets the booking mode as the booking type tab does: one flag at a time,
 * the long range with its unit. What belongs to another mode stays stored,
 * as it does when the tab switches - the backend reads only the active one.
 */
export function applyBookingMode(bookable, mode) {
  bookable.isScheduleRelated = mode === "schedule";
  bookable.isTimePeriodRelated = mode === "timePeriod";
  bookable.isBlockPeriodRelated = mode === "blockPeriod";
  bookable.isLongRange = mode === "week" || mode === "month";
  bookable.longRangeOptions = bookable.isLongRange ? { type: mode } : {};

  if (mode === "blockPeriod") {
    if (!Array.isArray(bookable.blockPeriods)) bookable.blockPeriods = [];
    // A group booking is not offered for time ranges (booking type tab).
    if (bookable.groupBooking?.enabled) bookable.groupBooking.enabled = false;
  }
  return bookable;
}

/**
 * Opening hours and exceptions apply where a time is picked within a day -
 * where the opening hours tab offers them.
 */
export function usesOpeningHours(bookable) {
  return ["schedule", "timePeriod"].includes(bookingModeOf(bookable));
}

// --- Preis -----------------------------------------------------------------

const toNumber = (value) =>
  Number(typeof value === "string" ? value.replace(",", ".") : value) || 0;

/** A category beyond the plain one: an interval, weekdays or holidays. */
function isTierCategory(category) {
  return (
    (category?.interval &&
      (category.interval.start != null || category.interval.end != null)) ||
    category?.weekdays?.length > 0 ||
    category?.holidays?.length > 0
  );
}

/**
 * `free` when nothing costs anything, `tiers` when the price editor would
 * show graduated prices, `simple` otherwise - the same rule as the price
 * tab's „Staffelpreise“ switch.
 */
export function priceModeOf(bookable) {
  const categories = bookable?.priceCategories || [];
  if (categories.length > 1 || categories.some(isTierCategory)) {
    return "tiers";
  }
  return categories.some((category) => toNumber(category.priceEur) > 0)
    ? "simple"
    : "free";
}

export function isPaid(bookable) {
  return (bookable?.priceCategories || []).some(
    (category) => toNumber(category.priceEur) > 0
  );
}

function plainCategory(priceEur, fixedPrice) {
  return {
    priceEur,
    interval: { start: null, end: null },
    fixedPrice: !!fixedPrice,
    holidays: [],
    weekdays: [],
  };
}

/**
 * The price unit the availability suggests when a price is set for the first
 * time (cloud variant): a day for long ranges, an hour where a time is
 * chosen, the item where none is.
 */
export function suggestedPriceType(bookable) {
  const mode = bookingModeOf(bookable);
  if (mode === "week" || mode === "month") return "per-day";
  if (mode === "independent") return "per-item";
  return "per-hour";
}

/**
 * Lands the price mode on the bookable. Free keeps one category at 0 €;
 * simple keeps the first category's amount; tiers starts from what is
 * stored. Leaving free takes the unit the availability suggests.
 */
export function applyPriceMode(bookable, mode) {
  const categories = bookable.priceCategories || [];
  const first = categories[0] || plainCategory(0, false);
  const wasFree = priceModeOf(bookable) === "free";

  if (mode === "free") {
    bookable.priceCategories = [plainCategory(0, false)];
    return bookable;
  }
  if (wasFree) {
    bookable.priceType = suggestedPriceType(bookable);
  }
  if (mode === "simple") {
    bookable.priceCategories = [
      plainCategory(toNumber(first.priceEur), first.fixedPrice),
    ];
  } else if (!categories.length) {
    bookable.priceCategories = [plainCategory(0, false)];
  }
  return bookable;
}

/** `per-hour`, `per-day` or `fixed` - the item and the m² are both fixed. */
export function priceBasisOf(bookable) {
  return ["per-hour", "per-day"].includes(bookable?.priceType)
    ? bookable.priceType
    : "fixed";
}

/**
 * Sets the basis of the price. A day counts started days in full, as the
 * cloud variant sets it for a simple price; the fixed price keeps m² when
 * it had it. Tiers keep their categories' own settings.
 */
export function applyPriceBasis(bookable, basis) {
  if (basis === "fixed") {
    if (bookable.priceType !== "per-square-meter") {
      bookable.priceType = "per-item";
    }
  } else {
    bookable.priceType = basis;
  }
  if (priceModeOf(bookable) === "simple" && bookable.priceCategories?.[0]) {
    bookable.priceCategories[0].fixedPrice = basis === "per-day";
  }
  return bookable;
}

/**
 * The sentence under a simple price: what an example booking costs, as the
 * cloud variant explains it. The key below `bookable.flow.price.explain`
 * and the amounts (net, in euros) its parameters need.
 */
export function priceExplanation(bookable) {
  const category = bookable?.priceCategories?.[0];
  const price = toNumber(category?.priceEur);
  if (!(price > 0)) return { key: "none", amounts: {} };

  const fixed = !!category.fixedPrice;
  const mode = bookingModeOf(bookable);
  switch (bookable.priceType) {
  case "per-hour":
    return { key: "per-hour", amounts: { total: price * 2.5 } };
  case "per-day":
    if (mode === "week")
      return { key: "week", amounts: { total: price * 7 } };
    if (mode === "month") {
      return { key: "month", amounts: { low: price * 28, high: price * 31 } };
    }
    return fixed
      ? { key: "per-day-full", amounts: { total: price * 3 } }
      : { key: "per-day-exact", amounts: { total: (price * 6) / 24 } };
  case "per-square-meter":
    return fixed
      ? { key: "once", amounts: { price } }
      : { key: "per-square-meter", amounts: { price } };
  default:
    if (fixed) return { key: "once", amounts: { price } };
    return toNumber(bookable.amount) === 1
      ? { key: "per-item", amounts: { price } }
      : { key: "per-items", amounts: { total: price * 3 } };
  }
}

/** The VAT rates offered as chips; any other is typed. */
export const VAT_RATES = Object.freeze([19, 7]);

// --- Anzahl ----------------------------------------------------------------

/** Empty or 0 is unlimited, as the price tab reads it. */
export function isUnlimitedAmount(bookable) {
  return !toNumber(bookable?.amount);
}

/** More than one unit of a room is rarely meant (cloud variant). */
export function warnsAboutAmount(bookable) {
  return (
    ["room", "event-location"].includes(bookable?.type) &&
    toNumber(bookable?.amount) > 1
  );
}

// --- Berechtigung ----------------------------------------------------------

/**
 * Who may book: `everyone`, `signedIn` (an account is needed) or `selected`
 * (named roles or users, which need an account too).
 */
export function accessOf(bookable) {
  if (
    bookable?.permittedRoles?.length > 0 ||
    bookable?.permittedUsers?.length > 0
  ) {
    return "selected";
  }
  return bookable?.requiresLogin ? "signedIn" : "everyone";
}

export function applyAccess(bookable, access) {
  bookable.requiresLogin = access !== "everyone";
  if (access !== "selected") {
    bookable.permittedRoles = [];
    bookable.permittedUsers = [];
  }
  return bookable;
}

// --- Abschluss -------------------------------------------------------------

/**
 * The wording of the confirmation by supervision level: free publishes,
 * supervised submits for review, pending and declined note the wish. A
 * missing or unknown level reads as free - wording only, the backend decides
 * what becomes public.
 */
export function publishVariant(level) {
  return Object.values(SUPERVISION_LEVELS).includes(level)
    ? level
    : SUPERVISION_LEVELS.FREE;
}

/**
 * The optional sections of the cloud variant's confirmation, each pointing
 * at the section of today's editor that holds it. Only what the editor
 * offers is linked: an expert option as `shown(option)` - the expert-mode
 * rule - says.
 */
const OPTIONAL_SECTIONS = Object.freeze([
  { key: "required-fields", sectionId: "additional-required-fields" },
  { key: "attachments", tabKey: "attachments" },
  { key: "notes", sectionId: "additional-notes" },
  { key: "checkout", sectionId: "related-checkout" },
  { key: "hierarchy", sectionId: "related-hierarchy" },
  { key: "group-booking", sectionId: "permissions-group-booking" },
  { key: "cancellation", sectionId: "permissions-cancellation" },
]);

export function optionalSections({ bookable, shown }) {
  return OPTIONAL_SECTIONS.map((entry) => {
    const section = entry.sectionId
      ? getBookableEditSectionById(entry.sectionId)
      : null;
    return {
      key: entry.key,
      tabKey: section ? section.tabKey : entry.tabKey,
      sectionId: entry.sectionId || null,
    };
  }).filter(({ tabKey, sectionId }) => {
    if (!sectionId) return true;
    return getVisibleBookableEditSections(tabKey, { bookable, shown }).some(
      (section) => section.id === sectionId
    );
  });
}

// --- Übersicht -------------------------------------------------------------

const OVERVIEW = "bookable.flow.overview";

/*
 * A row's value is a list of parts, read joined by commas; no part reads
 * „–“. A part is ready text, an i18n key with its params, or a plural key
 * with its count.
 */
const textPart = (text) => ({ type: "text", text: String(text) });
const wordPart = (key, params) => ({ type: "word", key, params });
const pluralPart = (key, count) => ({ type: "plural", key, count });

/** A value of ready text; nothing to show is no part. */
const asText = (text) => (text ? [textPart(text)] : []);
/** A value of one i18n key. */
const asWord = (key, params) => [wordPart(key, params)];

/** The event of a ticket by its title, as the editor's overview resolves it. */
function eventLabel(bookable, eventTitlesById = {}) {
  if (!bookable?.eventId) return "";
  return (
    truncate(eventTitlesById[bookable.eventId]) ||
    truncate(String(bookable.eventId), 32)
  );
}

function identityRows(bookable, { eventTitlesById } = {}) {
  const label = (field) => `bookable.flow.identity.${field}`;
  const image = bookable?.images?.length > 0 || bookable?.imgUrl;
  const event = {
    label: label("event"),
    value: asText(eventLabel(bookable, eventTitlesById)),
  };
  return [
    { label: label("title"), value: asText(truncate(bookable?.title)) },
    { label: label("type"), value: asText(getTypeText(bookable?.type)) },
    ...(bookable?.type === "ticket" ? [event] : []),
    {
      label: label("image"),
      value: asWord(
        `${OVERVIEW}.values.${image ? "image-present" : "image-none"}`
      ),
    },
    { label: label("location"), value: asText(getLocationLabel(bookable)) },
    { label: label("flags"), value: asText(joinList(bookable?.flags)) },
  ];
}

const EXTERNAL = asWord(`${OVERVIEW}.values.external`);

/** The booking type in the step's words; the long range with its unit. */
function bookingTypeValue(bookable) {
  const availability = "bookable.flow.availability";
  const mode = bookingModeOf(bookable);
  if (mode === "independent") return asWord(`${availability}.timed-no`);
  if (mode === "week" || mode === "month") {
    return [
      wordPart(`${availability}.modes.longRange`),
      wordPart(`${availability}.long-range-${mode}`),
    ];
  }
  return asWord(`${availability}.modes.${mode}`);
}

function availabilityRows(bookable) {
  return [
    {
      label: `${OVERVIEW}.labels.availability`,
      value: handlesExternalAvailability(bookable)
        ? EXTERNAL
        : bookingTypeValue(bookable),
    },
  ];
}

/**
 * A simple price's amount with its unit, as the editor's overview formats
 * it; a fixed price that holds once per booking in the step's words.
 */
function simpleAmountValue(bookable) {
  const category = bookable.priceCategories[0];
  const amount = formatCurrency(toNumber(category.priceEur));
  if (priceBasisOf(bookable) === "fixed" && category.fixedPrice) {
    return asWord(`${OVERVIEW}.values.once`, { price: amount });
  }
  return asText(`${amount}${PRICE_TYPE_SUFFIX[bookable.priceType] || ""}`);
}

/** Tiers by their number. */
function tiersValue(bookable) {
  const count = bookable.priceCategories.length;
  return [pluralPart(`${OVERVIEW}.values.tiers`, count)];
}

function vatValue(bookable) {
  const rate = toNumber(bookable.priceValueAddedTax);
  if (!(rate > 0)) return asWord(`${OVERVIEW}.values.vat-none`);
  return asWord(`${OVERVIEW}.values.vat-rate`, {
    rate: rate.toLocaleString("de-DE"),
  });
}

/**
 * The price as the step labels its mode choice; with a price, the VAT rate
 * and whether coupons apply, as the step sets them.
 */
function priceRows(bookable) {
  const price = "bookable.flow.price";
  const label = "bookable.flow.steps.price.title";
  if (handlesExternalPricing(bookable)) return [{ label, value: EXTERNAL }];

  const mode = priceModeOf(bookable);
  if (mode === "free") return [{ label, value: asWord(`${price}.modes.free`) }];

  const amount =
    mode === "tiers" ? tiersValue(bookable) : simpleAmountValue(bookable);
  const coupons = bookable.enableCoupons !== false ? "yes" : "no";
  return [
    { label, value: amount },
    { label: `${price}.vat`, value: vatValue(bookable) },
    {
      label: `${price}.coupons`,
      value: asWord(`${OVERVIEW}.values.${coupons}`),
    },
  ];
}

/**
 * Who may book in the step's words. Selected access with nobody named yet
 * reads as signed-in users, as the step explains it.
 */
function permissionRows(bookable) {
  const access = accessOf(bookable);
  const chosen = [
    pluralPart(`${OVERVIEW}.values.roles`, bookable.permittedRoles?.length),
    pluralPart(`${OVERVIEW}.values.users`, bookable.permittedUsers?.length),
  ].filter(({ count }) => count > 0);
  return [
    {
      label: `${OVERVIEW}.labels.permission`,
      value:
        access === "selected"
          ? chosen
          : asWord(`bookable.flow.permission.access.${access}`),
    },
  ];
}

/** The rows of each visited block. */
const OVERVIEW_ROWS = {
  identity: identityRows,
  availability: availabilityRows,
  price: priceRows,
  amount: (bookable) => [
    {
      label: `${OVERVIEW}.labels.amount`,
      value: isUnlimitedAmount(bookable)
        ? asWord("bookable.flow.amount.unlimited")
        : asText(toNumber(bookable.amount)),
    },
  ],
  permission: permissionRows,
  approval: (bookable) => [
    {
      label: `${OVERVIEW}.labels.approval`,
      value: asWord(
        `${OVERVIEW}.values.${
          bookable?.autoCommitBooking ? "approval-auto" : "approval-manual"
        }`
      ),
    },
  ],
  // The two switches by the labels of the fields themselves.
  publication: (bookable) =>
    [
      ["isBookable", "bookable.publication.bookable.label"],
      ["isPublic", "bookable.publication.public.label"],
    ].map(([field, label]) => ({
      label,
      value: asWord(`${OVERVIEW}.values.${bookable?.[field] ? "yes" : "no"}`),
    })),
};

/**
 * The overview beside the flow on a wide screen (ECCdigital/tickets#331):
 * one block per step, in the flow's order. A step not visited yet is open
 * and has no rows. A visited one has rows of `{ label, value }`: the label
 * an i18n key, the value a list of parts read joined by commas, each
 * `{ type: "text", text }`, `{ type: "word", key, params }` or
 * `{ type: "plural", key, count }`; an empty list reads „–“.
 */
export function overviewBlocks(bookable, { visited = [], ...options } = {}) {
  return FLOW_STEPS.map((step) => {
    const open = !visited.includes(step);
    return {
      step,
      open,
      rows: open ? [] : OVERVIEW_ROWS[step](bookable, options),
    };
  });
}
