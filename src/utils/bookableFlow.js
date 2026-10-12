/**
 * The guided flow of a bookable (ECCdigital/tickets#326), after the cloud
 * variant: the steps over the same bookable the editor holds, saved once at
 * the end. Pure: which steps there are, how each question reads from the
 * bookable and lands on it, how the confirmation is worded by supervision
 * level and what the overview shows per step. The flow components only
 * wire it to the page.
 *
 * Every answer is read from the bookable itself - the flow keeps no state of
 * its own beyond the step - so leaving for the editor and coming back shows
 * what the bookable holds.
 */

import { typeNameKey } from "@/utils/bookables";
import { SUPERVISION_LEVELS } from "@/utils/supervision";
import { providerTakesOver } from "@/utils/bookableExternalProviders";
import {
  getBookableEditSectionById,
  isBookableEditSectionVisible,
} from "@/utils/bookableEditSections";
import { bookingModeNameKey, bookingModeOf } from "@/utils/bookableBookingMode";
import {
  BOOKABLE_AREAS,
  areaSummary,
  areaUsed,
  shownAreas,
} from "@/utils/bookableAreas";
import { bookableIssues } from "@/utils/bookableValidation";

export const FLOW_STEPS = Object.freeze([
  "identity",
  "availability",
  "price",
  "amount",
  "permission",
  "approval",
  "more",
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

/** The query value that opens the editor in the guided flow. */
export const FLOW_MODE = "flow";

/** The query value that opens a new bookable on the editing page. */
export const PAGE_MODE = "page";

/**
 * A new bookable starts in the flow and leaves it only on request; an
 * existing one opens on the editing page and enters the flow on request.
 */
export function isFlowMode({ bookableId, mode }) {
  return bookableId ? mode === FLOW_MODE : mode !== PAGE_MODE;
}

/**
 * The route query that shows the bookable of `query` (its `id`) in the flow
 * or on its editing page - `isFlowMode` read backwards. The default mode is
 * left out of the address.
 */
export function withMode(query, flow) {
  const next = { ...query };
  delete next.mode;
  if (next.id && flow) next.mode = FLOW_MODE;
  if (!next.id && !flow) next.mode = PAGE_MODE;
  return next;
}

// --- Verfügbarkeit ---------------------------------------------------------

/** The flow's second question: the long range is one answer, weeks or months. */
export function timeModeOf(bookable) {
  const mode = bookingModeOf(bookable);
  return mode === "week" || mode === "month" ? "longRange" : mode;
}

/**
 * The modes an answer to the questions of the Buchungsart stands for, the
 * one it sets first in front: „Für eine Zeit“ (`timed`) Freie Zeitwahl,
 * „Langzeit“ (`longRange`) Ganze Wochen.
 */
const BOOKING_ANSWERS = Object.freeze({
  timed: ["schedule"],
  longRange: ["week", "month"],
});

/**
 * Sets the Buchungsart from an answer to its questions, in both modes: a mode
 * (`schedule`, `timePeriod`, `blockPeriod`, `week`, `month`, `independent`)
 * or `timed` / `longRange`, which set their first mode among `offered` - all
 * of them by default; „Langzeit“ sets Ganze Monate only where Ganze Wochen is
 * not offered. One flag at a time, the long range with its unit. What belongs
 * to another mode stays stored - the backend reads only the active one -
 * and Zeiträume turn the Serienbuchung off.
 */
export function applyBookingMode(bookable, answer, offered = null) {
  const modes = BOOKING_ANSWERS[answer];
  const mode = modes
    ? modes.find((m) => !offered || offered.includes(m)) || modes[0]
    : answer;
  bookable.isScheduleRelated = mode === "schedule";
  bookable.isTimePeriodRelated = mode === "timePeriod";
  bookable.isBlockPeriodRelated = mode === "blockPeriod";
  bookable.isLongRange = mode === "week" || mode === "month";
  bookable.longRangeOptions = bookable.isLongRange ? { type: mode } : {};

  if (mode === "blockPeriod") {
    if (!Array.isArray(bookable.blockPeriods)) bookable.blockPeriods = [];
    // Zeiträume offer no Serienbuchung.
    if (bookable.groupBooking?.enabled) bookable.groupBooking.enabled = false;
  }
  return bookable;
}

// --- Preis -----------------------------------------------------------------

const toNumber = (value) =>
  Number(typeof value === "string" ? value.replace(",", ".") : value) || 0;

/** A category beyond the plain one: an interval, weekdays or holidays. */
export function isTierCategory(category) {
  return (
    (category?.interval &&
      (category.interval.start != null || category.interval.end != null)) ||
    category?.weekdays?.length > 0 ||
    category?.holidays?.length > 0
  );
}

/**
 * `free` when nothing costs anything, `tiers` when a category is more than
 * the plain one, `simple` otherwise. The one rule of the price form in both
 * modes: a missing bound (`null` or `undefined`) makes no tier.
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

/** The four Preisarten the backend prices by, in the order offered. */
export const PRICE_TYPES = Object.freeze([
  "per-hour",
  "per-day",
  "per-item",
  "per-square-meter",
]);

/**
 * What `fixedPrice` starts as for a Preisart: on for a day price (started
 * days count in full), off for the others.
 */
function defaultFixedPrice(priceType) {
  return priceType === "per-day";
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
 * Sets the Preisart. `fixedPrice` means something else for each of them
 * (Tagespauschale, full days, once per booking), so every category falls
 * back to the new Preisart's default rather than silently changing meaning.
 * The same Preisart again changes nothing.
 */
export function applyPriceType(bookable, priceType) {
  if (bookable.priceType === priceType) return bookable;
  bookable.priceType = priceType;
  (bookable.priceCategories || []).forEach((category) => {
    category.fixedPrice = defaultFixedPrice(priceType);
  });
  return bookable;
}

/**
 * Lands the price form on the bookable. Free keeps one category at 0 €;
 * simple keeps the first category's amount; tiers start from what is
 * stored. Leaving free takes the Preisart the availability suggests, with
 * its default `fixedPrice`.
 */
export function applyPriceMode(bookable, mode) {
  if (mode === "free") {
    bookable.priceCategories = [plainCategory(0, false)];
    return bookable;
  }
  if (!bookable.priceCategories?.length) {
    bookable.priceCategories = [plainCategory(0, false)];
  }
  if (priceModeOf(bookable) === "free") {
    bookable.priceType = suggestedPriceType(bookable);
    bookable.priceCategories.forEach((category) => {
      category.fixedPrice = defaultFixedPrice(bookable.priceType);
    });
  }
  if (mode === "simple") {
    const first = bookable.priceCategories[0];
    bookable.priceCategories = [
      plainCategory(toNumber(first.priceEur), first.fixedPrice),
    ];
  }
  return bookable;
}

/**
 * The sentence under a simple price: what an example booking costs, as the
 * backend reckons it (`_internalRegularPriceEur`). The booking is split into
 * calendar days; per day an hour price counts the hours, a day price the
 * share of 24 hours, and `fixedPrice` drops that factor, so each touched day
 * costs the price once. Item and m² ignore the duration; with `fixedPrice`
 * they ignore the booked quantity too. The key below
 * `bookable.price.explain` and the amounts (net, in euros) its
 * parameters need. The examples: 2.5 hours, Friday 14:00 to Sunday 12:00
 * (three touched days), 6 hours, 3 items.
 */
export function priceExplanation(bookable) {
  const category = bookable?.priceCategories?.[0];
  const price = toNumber(category?.priceEur);
  if (!(price > 0)) return { key: "none", amounts: {} };

  const fixed = !!category.fixedPrice;
  const mode = bookingModeOf(bookable);
  switch (bookable.priceType) {
    case "per-hour":
      // Tagespauschale: no time factor, once per touched calendar day.
      return fixed
        ? { key: "per-hour-daily", amounts: { total: price * 3 } }
        : { key: "per-hour", amounts: { total: price * 2.5 } };
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

/** Item and m² with `fixedPrice`: the price holds once per booking. */
function oncePerBooking(bookable) {
  return (
    ["per-item", "per-square-meter"].includes(bookable?.priceType) &&
    !!bookable?.priceCategories?.[0]?.fixedPrice
  );
}

/** The VAT rates offered as shortcuts; any other is typed. */
export const VAT_RATES = Object.freeze([19, 7]);

// --- Anzahl ----------------------------------------------------------------

/**
 * Anzahl: empty, `null` and 0 are unlimited, as the backend reads them
 * (`normalizeBookable` stores 0 as `null`).
 */
export function isUnlimitedAmount(bookable) {
  return !toNumber(bookable?.amount);
}

/**
 * Höchstmenge je Buchung: only empty is unlimited. 0 or a fraction is a limit
 * the backend refuses (`min: 1`, whole numbers), so it stays a limit and
 * shows its Meldung until it is fixed or „Unbegrenzt“ is chosen.
 */
export function isUnlimitedMaxAmount(bookable) {
  const value = bookable?.maxAmountPerBooking;
  return value == null || value === "";
}

/**
 * The Höchstmenge je Buchung matters only where one booking could take more
 * than one unit: it shows unless the Anzahl is exactly 1, and always once it
 * is set.
 */
export function showsMaxAmount(bookable) {
  return toNumber(bookable?.amount) !== 1 || !isUnlimitedMaxAmount(bookable);
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
 * „Wer darf buchen?“: `everyone` („Alle“), `signedIn` („Alle mit Konto“) or
 * `selected` („Nur ausgewählte Rollen und Personen“). The backend lets only
 * the named roles and people book once a list is set, with or without
 * `requiresLogin` - so lists read as `selected` before the login requirement.
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

/**
 * Sets the choice of „Wer darf buchen?“ in place: `everyone` clears the login
 * requirement and the lists, `signedIn` clears the lists, `selected` sets
 * the login requirement and keeps the lists.
 */
export function applyAccess(bookable, access) {
  bookable.requiresLogin = access !== "everyone";
  if (access !== "selected") {
    bookable.permittedRoles = [];
    bookable.permittedUsers = [];
  }
  return bookable;
}

/**
 * Sets `permittedRoles` and/or `permittedUsers` in place. A role or person
 * named sets `requiresLogin` with it, so data and effect agree; emptying
 * the lists leaves it (nobody named reads as „Alle mit Konto“).
 */
export function applyPermitted(bookable, { permittedRoles, permittedUsers }) {
  if (permittedRoles) bookable.permittedRoles = permittedRoles;
  if (permittedUsers) bookable.permittedUsers = permittedUsers;
  bookable.permittedRoles = bookable.permittedRoles || [];
  bookable.permittedUsers = bookable.permittedUsers || [];
  if (bookable.permittedRoles.length > 0 || bookable.permittedUsers.length > 0)
    bookable.requiresLogin = true;
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

// --- Übersicht -------------------------------------------------------------

/*
 * The one overview beside the form, in both modes (ECCdigital/tickets#364):
 * a block per step, its rows named and valued as the fields themselves, each
 * row with the way to its field.
 */

const OVERVIEW = "bookable.flow.overview";
const VALUES = `${OVERVIEW}.values`;

/*
 * A row's value is a list of parts, read joined by commas; no part reads
 * „Nicht festgelegt“. A part is ready text, an i18n key with its params, or
 * a plural key with its count. A param may be a part itself.
 */
const textPart = (text) => ({ type: "text", text: String(text) });
const wordPart = (key, params) => ({ type: "word", key, params });
const pluralPart = (key, count) => ({ type: "plural", key, count });

/** A value of ready text; nothing to show is no part. */
const asText = (text) => (text ? [textPart(text)] : []);
/** A value of one i18n key. */
const asWord = (key, params) => [wordPart(key, params)];
/** A value of a count; none is no part. */
const asCount = (key, count) => (count > 0 ? [pluralPart(key, count)] : []);

const listOf = (value) => (Array.isArray(value) ? value : []);

function formatCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "0,00 €";
  return `${num.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function truncate(text, maxLength = 64) {
  const normalized = String(text ?? "").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

/** Up to four entries, the rest as „+n“. */
function joinList(items, maxItems = 4) {
  const clean = listOf(items)
    .map((item) => String(item).trim())
    .filter(Boolean);
  if (clean.length <= maxItems) return clean.join(", ");
  return `${clean.slice(0, maxItems).join(", ")} +${clean.length - maxItems}`;
}

function locationLabel(bookable) {
  const location = bookable?.location;
  if (!location) return "";
  if (typeof location === "string") return truncate(location);
  return truncate(location.display_address || "");
}

/** The event of a ticket by its title, else by its id. */
function eventLabel(bookable, eventTitlesById = {}) {
  if (!bookable?.eventId) return "";
  return (
    truncate(eventTitlesById[bookable.eventId]) ||
    truncate(String(bookable.eventId), 32)
  );
}

/** Minutes as whole days, hours or minutes. */
function durationPart(minutes) {
  const value = toNumber(minutes);
  if (value > 0 && value % 1440 === 0) {
    return pluralPart(`${VALUES}.days`, value / 1440);
  }
  if (value > 0 && value % 60 === 0) {
    return pluralPart(`${VALUES}.hours`, value / 60);
  }
  return pluralPart(`${VALUES}.minutes`, value);
}

const EXTERNAL = asWord(`${VALUES}.external`);
const UNLIMITED = asWord("bookable.amount.unlimited");
const yesNo = (on) => asWord(`${VALUES}.${on ? "yes" : "no"}`);

// --- the rows per step ---

/*
 * A row: `key` (also the name of its field's anchor, `data-field`), the
 * i18n key of its `label`, its `value`, the `section` of the editing page
 * that holds the field, the `fields` whose issues it shows and, where it
 * shows only sometimes, `when` and the expert `option`.
 */

const IDENTITY_ROWS = [
  {
    key: "title",
    label: "bookable.identity.title",
    section: "general-catalog",
    fields: ["title"],
    value: (b) => asText(truncate(b.title)),
  },
  {
    key: "flags",
    label: "bookable.identity.flags",
    section: "general-catalog",
    value: (b) => asText(joinList(b.flags)),
  },
  {
    key: "images",
    label: "bookable.identity.images",
    section: "general-catalog",
    // The legacy cover counts until images are chosen.
    value: (b) =>
      asCount(
        `${VALUES}.images`,
        listOf(b.images).length || (b.imgUrl ? 1 : 0)
      ),
  },
  {
    key: "location",
    label: "bookable.identity.location",
    section: "general-catalog",
    value: (b) => asText(locationLabel(b)),
  },
  {
    key: "type",
    label: "bookable.identity.type",
    section: "general-admin",
    value: (b) =>
      typeNameKey(b.type) ? asWord(typeNameKey(b.type)) : asText(b.type),
  },
  {
    key: "eventId",
    label: "bookable.identity.event",
    section: "general-admin",
    when: (b) => b.type === "ticket",
    value: (b, { eventTitlesById }) => asText(eventLabel(b, eventTitlesById)),
  },
  {
    key: "tags",
    label: "bookable.identity.tags",
    section: "general-admin",
    option: "tags",
    value: (b) => asText(joinList(b.tags)),
  },
];

const CARDS = "bookable.edit.cards";

/** Buchungsdauer in hours, as the fields take it. */
function durationValue(bookable) {
  const min = toNumber(bookable.minBookingDuration);
  const max = toNumber(bookable.maxBookingDuration);
  if (min > 0 && max > 0) return asWord(`${VALUES}.hours-range`, { min, max });
  if (min > 0) return asWord(`${VALUES}.hours-min`, { min });
  if (max > 0) return asWord(`${VALUES}.hours-max`, { max });
  return [];
}

/** Puffer before and after, each where set. */
function bufferValue(bookable) {
  if (!bookable.isBufferRelated) return [];
  return [
    ["before", bookable.bufferTimeBeforeMinutes],
    ["after", bookable.bufferTimeAfterMinutes],
  ]
    .filter(([, minutes]) => toNumber(minutes) > 0)
    .map(([side, minutes]) =>
      wordPart(`${VALUES}.buffer-${side}`, { duration: durationPart(minutes) })
    );
}

const AVAILABILITY_ROWS = [
  {
    key: "bookingMode",
    label: "bookable.edit.sections.bookingTypeSelect",
    section: "bookingType-select",
    value: (b, { accessPoints }) =>
      providerTakesOver(b, "availability", accessPoints)
        ? EXTERNAL
        : asWord(bookingModeNameKey(b)),
  },
  {
    key: "bookingDuration",
    label: `${CARDS}.bookingDuration`,
    section: "bookingType-duration",
    value: durationValue,
  },
  {
    key: "timePeriods",
    label: "bookable.availability.modes.timePeriod",
    section: "bookingType-time-periods",
    fields: ["timePeriods"],
    value: (b) =>
      asCount(`${VALUES}.time-periods`, listOf(b.timePeriods).length),
  },
  {
    key: "blockPeriods",
    label: "bookable.availability.modes.blockPeriod",
    section: "bookingType-block-periods",
    fields: ["blockPeriods"],
    value: (b) =>
      asCount(`${VALUES}.block-periods`, listOf(b.blockPeriods).length),
  },
  {
    key: "leadTime",
    label: `${CARDS}.leadTime`,
    section: "bookingType-lead-time",
    fields: ["preparationLeadTimeMinutes", "serviceHours"],
    value: (b) =>
      b.isLeadTimeRelated && toNumber(b.preparationLeadTimeMinutes) > 0
        ? [durationPart(b.preparationLeadTimeMinutes)]
        : [],
  },
  {
    key: "buffer",
    label: `${CARDS}.buffer`,
    section: "bookingType-buffer",
    fields: ["bufferTimeBeforeMinutes", "bufferTimeAfterMinutes"],
    value: bufferValue,
  },
  {
    key: "openingHours",
    label: `${CARDS}.openingHours`,
    section: "openingHours-regular",
    fields: ["openingHours"],
    value: (b) =>
      b.isOpeningHoursRelated
        ? asCount(`${VALUES}.entries`, listOf(b.openingHours).length)
        : [],
  },
  {
    key: "specialOpeningHours",
    label: `${CARDS}.specialOpeningHours`,
    section: "openingHours-special",
    fields: ["specialOpeningHours"],
    value: (b) =>
      b.isSpecialOpeningHoursRelated
        ? asCount(`${VALUES}.entries`, listOf(b.specialOpeningHours).length)
        : [],
  },
];

/**
 * A simple price's amount with its unit; a fixed price that holds once per
 * booking, or an hour price as Tagespauschale, in the words of the price.
 */
function simpleAmountValue(bookable) {
  const category = bookable.priceCategories[0];
  const amount = formatCurrency(toNumber(category.priceEur));
  if (oncePerBooking(bookable)) {
    return asWord(`${VALUES}.once`, { price: amount });
  }
  if (bookable.priceType === "per-hour" && category.fixedPrice) {
    return asWord(`${VALUES}.daily-flat`, { price: amount });
  }
  // The price with the unit of its Preisart, as „25,00 €/h“.
  if (PRICE_TYPES.includes(bookable.priceType)) {
    return asWord(`${VALUES}.price-per.${bookable.priceType}`, {
      price: amount,
    });
  }
  return asText(amount);
}

function priceValue(bookable, { accessPoints }) {
  if (providerTakesOver(bookable, "pricing", accessPoints)) return EXTERNAL;
  const mode = priceModeOf(bookable);
  if (mode === "free") return asWord("bookable.price.modes.free");
  if (mode === "tiers") {
    return asCount(`${VALUES}.tiers`, bookable.priceCategories.length);
  }
  return simpleAmountValue(bookable);
}

/** VAT and Rabattcodes belong to a price the bookable sets itself. */
const ownPrice = (b, { accessPoints }) =>
  !providerTakesOver(b, "pricing", accessPoints) && priceModeOf(b) !== "free";

const PRICE_ROWS = [
  {
    key: "price",
    label: "bookable.flow.steps.price.title",
    section: "pricing-price",
    fields: ["priceCategories"],
    value: priceValue,
  },
  {
    key: "vat",
    label: "bookable.price.vat",
    section: "pricing-price",
    when: ownPrice,
    value: (b) => {
      const rate = toNumber(b.priceValueAddedTax);
      if (!(rate > 0)) return asWord(`${VALUES}.vat-none`);
      return asWord(`${VALUES}.vat-rate`, {
        rate: rate.toLocaleString("de-DE"),
      });
    },
  },
  {
    key: "coupons",
    label: "bookable.price.coupons",
    section: "pricing-price",
    option: "coupons",
    when: ownPrice,
    // Never stored reads as on, as the backend takes it.
    value: (b) => yesNo(b.enableCoupons !== false),
  },
];

const AMOUNT_ROWS = [
  {
    key: "amount",
    label: "bookable.amount.title",
    section: "pricing-amount",
    value: (b, { accessPoints }) => {
      if (providerTakesOver(b, "maxAmount", accessPoints)) return EXTERNAL;
      return isUnlimitedAmount(b) ? UNLIMITED : asText(toNumber(b.amount));
    },
  },
  {
    key: "maxAmountPerBooking",
    label: "bookable.amount.max-title",
    section: "pricing-amount",
    fields: ["maxAmountPerBooking"],
    when: showsMaxAmount,
    value: (b) =>
      isUnlimitedMaxAmount(b) ? UNLIMITED : asText(b.maxAmountPerBooking),
  },
];

/** Roles and people, counted. */
const namedValue = (roles, users) => [
  ...asCount(`${VALUES}.roles`, listOf(roles).length),
  ...asCount(`${VALUES}.users`, listOf(users).length),
];

const PERMISSION_ROWS = [
  {
    key: "access",
    label: "bookable.permission.who",
    section: "permissions-access",
    // Selected with nobody named yet reads as „Alle mit Konto“, as the
    // backend lets them book.
    value: (b) => {
      const access = accessOf(b);
      return access === "selected"
        ? namedValue(b.permittedRoles, b.permittedUsers)
        : asWord(`bookable.permission.access.${access}`);
    },
  },
  {
    key: "bookingDiscounts",
    label: "bookable.permission.discounts",
    section: "permissions-discounts",
    fields: ["bookingDiscounts"],
    value: (b) =>
      namedValue(b.bookingDiscounts?.roles, b.bookingDiscounts?.users),
  },
];

const APPROVAL_ROWS = [
  {
    key: "confirmation",
    label: "bookable.flow.steps.approval.title",
    section: "permissions-confirmation",
    // The words of its tiles; anything but on is „Manuell bestätigen“.
    value: (b) =>
      asWord(
        `bookable.confirmation.${b.autoCommitBooking ? "auto" : "manual"}`
      ),
  },
];

// The Veröffentlichung lies in the status band of the editing page: no tab.
const PUBLICATION_ROWS = [
  ["isBookable", "bookable.publication.bookable.label"],
  ["isPublic", "bookable.publication.public.label"],
].map(([key, label]) => ({
  key,
  label,
  section: null,
  value: (b) => yesNo(b[key] === true),
}));

const STEP_ROWS = {
  identity: IDENTITY_ROWS,
  availability: AVAILABILITY_ROWS,
  price: PRICE_ROWS,
  amount: AMOUNT_ROWS,
  permission: PERMISSION_ROWS,
  approval: APPROVAL_ROWS,
  publication: PUBLICATION_ROWS,
};

// The fields of an area's issues, by area.
const AREA_FIELDS = { accessLocks: ["accessPointDetails"] };

const target = (
  step,
  { tab = null, section = null, field = null, area = null }
) => ({
  step,
  tab,
  section,
  field,
  area,
});

/**
 * Weitere Einstellungen: a row per area in use, its summary as the value,
 * leading to the area. None in use is one row „Nicht festgelegt“, leading
 * on the editing page to the first area that shows, in the order of the
 * tabs, and in the flow to the step.
 */
function moreRows(bookable, { shown }) {
  const rows = BOOKABLE_AREAS.filter(({ key }) => areaUsed(key, bookable)).map(
    ({ key, titleKey, tabKey, sectionId }) => ({
      key,
      label: titleKey,
      value: areaSummary(key, bookable),
      fields: AREA_FIELDS[key] || [],
      target: target("more", { tab: tabKey, section: sectionId, area: key }),
    })
  );
  if (rows.length) return rows;
  const [first] = shownAreas(shown);
  return [
    {
      key: "more",
      label: null,
      value: [],
      fields: [],
      target: target("more", {
        tab: first ? first.tabKey : null,
        section: first ? first.sectionId : null,
      }),
    },
  ];
}

function stepRows(step, bookable, options) {
  if (step === "more") return moreRows(bookable, options);
  const { shown, accessPoints } = options;
  return STEP_ROWS[step]
    .filter(
      (row) =>
        (!row.section ||
          isBookableEditSectionVisible(row.section, {
            bookable,
            shown,
            accessPoints,
          })) &&
        (!row.option || shown(row.option)) &&
        (!row.when || row.when(bookable, options))
    )
    .map((row) => ({
      key: row.key,
      label: row.label,
      value: row.value(bookable, options),
      fields: row.fields || [],
      target: target(step, {
        tab: row.section
          ? getBookableEditSectionById(row.section).tabKey
          : null,
        section: row.section,
        field: row.key,
      }),
    }));
}

const everyOption = () => true;

/**
 * The overview beside the form, the same in both modes: one block per step,
 * in the flow's order. Each block has `target`, the way to its first row,
 * and `rows` of `{ key, label, value, target, issues }`:
 *
 * - `label` an i18n key (`null` for the lone row of Weitere Einstellungen),
 *   `value` a list of parts read joined by commas, each `{ type: "text",
 *   text }`, `{ type: "word", key, params }` or `{ type: "plural", key,
 *   count }`; an empty list reads „Nicht festgelegt“;
 * - `target` `{ step, tab, section, field, area }`: the step of the flow,
 *   the tab and section of the editing page (no tab: the status band), the
 *   anchor of the field (`data-field`) and the area of Weitere Einstellungen;
 * - `issues` the messages of `bookableIssues` for the row's fields. An issue
 *   of a field without a row stands at the first row of its step.
 *
 * Expert options show by `shown(option)`, the expert-mode rule as the caller
 * asks it - every option by default. What ParkraumService takes over reads
 * from the tenant's `accessPoints` (none by default: nothing). In the flow a step not `visited` yet is
 * `open` and shows no rows; by default every step was.
 */
export function overviewBlocks(
  bookable,
  {
    visited = FLOW_STEPS,
    shown = everyOption,
    eventTitlesById = {},
    accessPoints = [],
  } = {}
) {
  const options = { shown, eventTitlesById, accessPoints };
  const issues = bookableIssues(bookable, { shown, accessPoints });
  const blocks = FLOW_STEPS.map((step) => {
    const rows = stepRows(step, bookable, options).map((row) => ({
      ...row,
      issues: issues
        .filter((issue) => row.fields.includes(issue.field))
        .map((issue) => issue.message),
    }));
    return {
      step,
      open: !visited.includes(step),
      target: rows[0].target,
      rows,
    };
  });

  // An issue whose field has no row stands at the first row of its step.
  issues
    .filter(
      (issue) =>
        !blocks.some((block) =>
          block.rows.some((row) => row.fields.includes(issue.field))
        )
    )
    .forEach((issue) => {
      const block = blocks.find(({ step }) => step === issue.step);
      if (block) block.rows[0].issues.push(issue.message);
    });

  // What a row shows; `fields` only placed its issues.
  const shownRow = ({ key, label, value, target, issues }) => ({
    key,
    label,
    value,
    target,
    issues,
  });
  return blocks.map(({ rows, ...block }) => ({
    ...block,
    rows: block.open ? [] : rows.map(shownRow),
  }));
}
