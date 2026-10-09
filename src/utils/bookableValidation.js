/**
 * The local check of a bookable, mirroring the backend and nothing more
 * (ECCdigital/tickets#354, docs/adr/0002-one-field-one-component-one-rule.md).
 *
 * „Speichern“ refuses what the backend would refuse anyway, so the
 * Verwalter:in meets the problem at its field instead of in a toast after the
 * round-trip. Every rule names its reason in the backend
 * (smart-city-booking-backend `version/4.3.x`, ca36e62a); a rule the backend
 * neither refuses nor evaluates does not belong here.
 *
 * Two shapes come out of the same predicates, as in `heroBlockValidation`:
 * `bookableIssues` for the save, the overview and the step list - one issue
 * per field and message, with the tab, section and step to fix it in - and
 * `bookableRules` for the message under a field (glossary „Meldung“).
 * Messages are keys of the German catalogue (`bookable.validation.*`).
 */

import { isBookableEditSectionVisible } from "@/utils/bookableEditSections";
import { providerTakesOver } from "@/utils/bookableExternalProviders";

const message = (name) => `bookable.validation.${name}`;

/**
 * The most minutes an access buffer may hold: the backend's default of
 * `ACCESS_MAX_BUFFER_MINUTES` (bookable-controller.js `_validateAccessBuffers`).
 */
export const ACCESS_BUFFER_MAX_MINUTES = 1440;

// What every message may name; a message without the placeholder ignores it.
const MESSAGE_PARAMS = Object.freeze({ max: ACCESS_BUFFER_MAX_MINUTES });

const everyOption = () => true;

const isFilled = (value) =>
  value !== undefined && value !== null && value !== "";

const isNumber = (value) => isFilled(value) && Number.isFinite(Number(value));

const isWholeNumber = (value, min, max = Infinity) =>
  isNumber(value) &&
  Number.isInteger(Number(value)) &&
  Number(value) >= min &&
  Number(value) <= max;

/**
 * The predicates by rule name, each with its message. A field takes them as
 * rules (`bookableRules`), the check runs them over the bookable.
 */
const RULES = Object.freeze({
  // `title: { required: true }` (bookableSchema.js:109); a title of blanks
  // is no title to the Verwalter:in either (ECCdigital/tickets#341).
  title: [(value) => !!String(value ?? "").trim() || message("title")],
  // `priceEur: { type: Number, required: true }` per category
  // (bookableSchema.js:8): empty and what does not cast to a number fail.
  price: [(value) => isNumber(value) || message("price")],
  // `min: 1` and the whole-number validator (bookableSchema.js:150-159);
  // empty is unlimited and saved as `null`.
  maxAmountPerBooking: [
    (value) =>
      !isFilled(value) ||
      isWholeNumber(value, 1) ||
      message("maxAmountPerBooking"),
  ],
  // `discountPercent: { min: 0, max: 100, validate: Number.isInteger }` for
  // users and roles alike (bookableSchema.js:217-266).
  discountPercent: [
    (value) => isWholeNumber(value, 0, 100) || message("discountPercent"),
  ],

  // The entries of Zeitfenster, Öffnungszeiten and the service hours of the
  // Vorlaufzeit. Service hours: `weekdays` non-empty and `startTime`/
  // `endTime` required (bookableSchema.js:76-101). Zeitfenster and
  // Öffnungszeiten are not checked on save, but evaluated: a Zeitfenster
  // without weekdays never offers a slot (time-period-generator.js:39-46),
  // and the availability check splits the times of every entry of
  // Öffnungszeiten and Sonderöffnungszeiten (opening-hours-manager.js:161-
  // 185, :234-250), so an entry without them breaks the check of a booking.
  weekdays: [
    (value) =>
      (Array.isArray(value) && value.length > 0) || message("weekdays"),
  ],
  startTime: [(value) => !!value || message("startTime")],
  endTime: [(value) => !!value || message("endTime")],
  // A Sonderöffnungszeit applies to the day its `date` names
  // (opening-hours-manager.js:234-236); without one it applies to none.
  date: [(value) => !!value || message("date")],

  // Zeiträume: `validateBlockPeriods` (block-period-validation.js:96-137)
  // refuses a blank label and a missing weekday or time.
  label: [(value) => !!String(value ?? "").trim() || message("label")],
  startWeekday: [(value) => isFilled(value) || message("startWeekday")],
  endWeekday: [(value) => isFilled(value) || message("endWeekday")],

  // `preparationLeadTimeMinutes: { min: 0 }` (bookableSchema.js:175); while
  // the Vorlaufzeit is on, an empty one would quietly switch it off, since
  // the backend applies only a duration above zero (lead-time-calculator.js:
  // 26-33).
  leadTimeMinutes: [
    (value) =>
      (isNumber(value) && Number(value) >= 0) || message("leadTimeMinutes"),
  ],
  // `bufferTimeBeforeMinutes`/`bufferTimeAfterMinutes: { min: 0 }`
  // (bookableSchema.js:180-181); empty is no buffer.
  bufferMinutes: [
    (value) =>
      !isFilled(value) ||
      (isNumber(value) && Number(value) >= 0) ||
      message("bufferMinutes"),
  ],
  // `_validateAccessBuffers` (bookable-controller.js:472-509): a whole
  // number of minutes from 0 to the maximum, empty is none.
  accessBuffer: [
    (value) =>
      !isFilled(value) ||
      isWholeNumber(value, 0, ACCESS_BUFFER_MAX_MINUTES) ||
      "accessPoint.bookable.buffer.invalid",
  ],
});

/** The names `bookableRules` knows. */
export const BOOKABLE_RULE_NAMES = Object.freeze(Object.keys(RULES));

/**
 * Where an issue of a top-level field is fixed: the tab and section of the
 * editing page, the step of the guided flow (`null` where it has none) and,
 * in the step „Weitere Einstellungen“, its area.
 */
const PLACES = Object.freeze({
  title: { tab: "general", section: "general-catalog", step: "identity" },
  priceCategories: { tab: "pricing", section: "pricing-price", step: "price" },
  maxAmountPerBooking: {
    tab: "pricing",
    section: "pricing-amount",
    step: "amount",
  },
  bookingDiscounts: {
    tab: "permissions",
    section: "permissions-discounts",
    step: "permission",
  },
  timePeriods: {
    tab: "bookingType",
    section: "bookingType-time-periods",
    step: "availability",
  },
  blockPeriods: {
    tab: "bookingType",
    section: "bookingType-block-periods",
    step: "availability",
  },
  preparationLeadTimeMinutes: {
    tab: "bookingType",
    section: "bookingType-lead-time",
    step: "availability",
  },
  serviceHours: {
    tab: "bookingType",
    section: "bookingType-lead-time",
    step: "availability",
  },
  bufferTimeBeforeMinutes: {
    tab: "bookingType",
    section: "bookingType-buffer",
    step: "availability",
  },
  bufferTimeAfterMinutes: {
    tab: "bookingType",
    section: "bookingType-buffer",
    step: "availability",
  },
  openingHours: {
    tab: "openingHours",
    section: "openingHours-regular",
    step: "availability",
  },
  specialOpeningHours: {
    tab: "openingHours",
    section: "openingHours-special",
    step: "availability",
  },
  // Schließsysteme: an area of „Weitere Einstellungen“ in the guided flow.
  accessPointDetails: {
    tab: "accessLocks",
    section: null,
    step: "more",
    area: "accessLocks",
  },
});

const MINUTES_PER_DAY = 24 * 60;

function minutesOf(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Whether a complete Zeitraum lasts no time at all. Its end lies in the same
 * week when its weekday follows the start, else in the next; the same weekday
 * and time is a whole week (block-period-validation.js:26-66, :117-135).
 *
 * @param {Object} period - A Zeitraum of `blockPeriods`.
 * @returns {boolean} Whether its duration is not above zero.
 */
export function blockPeriodTooShort(period) {
  const { startWeekday, endWeekday, startTime, endTime } = period || {};
  if (![startWeekday, endWeekday].every(isFilled) || !startTime || !endTime) {
    return false;
  }
  const start = Number(startWeekday);
  const end = Number(endWeekday);
  const startMinutes = minutesOf(startTime);
  const endMinutes = minutesOf(endTime);
  if (start === end && startMinutes === endMinutes) return true;

  let days = 7;
  if (end > start) days = end - start;
  else if (end < start) days = 7 - start + end;
  else if (endMinutes > startMinutes) days = 0;
  return days * MINUTES_PER_DAY + endMinutes - startMinutes <= 0;
}

/**
 * The rules of the field `name`, as a Vuetify input takes them. With
 * `translate` (`$t`) the message is the German sentence, else its key.
 *
 * @param {string} name - A rule name, e.g. `title` or `price`.
 * @param {function(string): string} [translate] - Turns a key into text.
 * @returns {Array<function(*): (true|string)>} The rules.
 */
export function bookableRules(name, translate = (key) => key) {
  const rules = RULES[name];
  if (!rules) throw new Error(`Unknown bookable rule: ${name}`);
  return rules.map((rule) => (value) => {
    const answer = rule(value);
    return answer === true ? true : bookableMessage(answer, translate);
  });
}

/**
 * The text of an issue's or a rule's message.
 *
 * @param {string} key - The message, as an issue carries it.
 * @param {function(string, Object): string} translate - `$t`.
 * @returns {string} The German sentence.
 */
export function bookableMessage(key, translate) {
  return translate(key, MESSAGE_PARAMS);
}

/** The first message the rules `name` refuse `value` with, or `null`. */
function refusal(name, value) {
  const answer = RULES[name]
    .map((rule) => rule(value))
    .find((result) => result !== true);
  return answer === undefined ? null : answer;
}

/**
 * Why the backend would refuse this bookable: one issue per field and
 * message, in the order of the fields below. Only what shows is checked -
 * a section by its expert option and its own condition, as the editing
 * page's nav reads it - whether or not its component is mounted.
 *
 * @param {Object} bookable - The bookable as `BookableEdit` holds it.
 * @param {{ shown?: function(string): boolean, accessPoints?: Array<Object> }}
 *   [options] - `shown(option)` is the expert-mode rule as the caller asks
 *   it (`expertOptionShown`); without it every option shows. `accessPoints`
 *   are the tenant's, for what ParkraumService takes over.
 * @returns {Array<{field: string, message: string, tab: string,
 *   section: ?string, step: ?string, area?: string}>} The issues, empty
 *   while it is fine. `area` names the area of the step „Weitere
 *   Einstellungen“ (`bookableAreas`) that holds the field.
 */
export function bookableIssues(
  bookable,
  { shown = everyOption, accessPoints = [] } = {}
) {
  const found = [];
  const add = (field, keys) =>
    [...new Set(keys.filter(Boolean))].forEach((key) =>
      found.push({ field, message: key, ...PLACES[field] })
    );
  const check = (field, name, values) =>
    add(
      field,
      values.map((value) => refusal(name, value))
    );
  // Each entry of a list against the rules of its fields, by field name.
  const checkEntries = (field, entries, rulesByKey) =>
    add(
      field,
      list(entries).flatMap((entry) =>
        Object.entries(rulesByKey).map(([key, name]) =>
          refusal(name, entry?.[key])
        )
      )
    );
  const sectionShows = (id) =>
    isBookableEditSectionVisible(id, { bookable, shown, accessPoints });
  const times = { startTime: "startTime", endTime: "endTime" };

  check("title", "title", [bookable.title]);
  // Where ParkraumService handles the prices, the price shows only its note.
  if (!providerTakesOver(bookable, "pricing", accessPoints)) {
    checkEntries("priceCategories", bookable.priceCategories, {
      priceEur: "price",
    });
  }
  check("maxAmountPerBooking", "maxAmountPerBooking", [
    bookable.maxAmountPerBooking,
  ]);

  if (sectionShows("bookingType-time-periods")) {
    checkEntries("timePeriods", bookable.timePeriods, {
      weekdays: "weekdays",
      ...times,
    });
  }
  if (sectionShows("bookingType-block-periods")) {
    // `blockPeriods must contain at least one entry when
    // isBlockPeriodRelated is true` (block-period-validation.js:145-149).
    if (!list(bookable.blockPeriods).length) {
      add("blockPeriods", [message("blockPeriods")]);
    }
    checkEntries("blockPeriods", bookable.blockPeriods, {
      label: "label",
      startWeekday: "startWeekday",
      startTime: "startTime",
      endWeekday: "endWeekday",
      endTime: "endTime",
    });
    if (list(bookable.blockPeriods).some(blockPeriodTooShort)) {
      add("blockPeriods", [message("blockPeriodDuration")]);
    }
  }
  if (sectionShows("bookingType-lead-time") && bookable.isLeadTimeRelated) {
    check("preparationLeadTimeMinutes", "leadTimeMinutes", [
      bookable.preparationLeadTimeMinutes,
    ]);
    checkEntries("serviceHours", bookable.serviceHours, {
      weekdays: "weekdays",
      ...times,
    });
  }
  if (sectionShows("bookingType-buffer") && bookable.isBufferRelated) {
    check("bufferTimeBeforeMinutes", "bufferMinutes", [
      bookable.bufferTimeBeforeMinutes,
    ]);
    check("bufferTimeAfterMinutes", "bufferMinutes", [
      bookable.bufferTimeAfterMinutes,
    ]);
  }
  if (sectionShows("openingHours-regular") && bookable.isOpeningHoursRelated) {
    checkEntries("openingHours", bookable.openingHours, {
      weekdays: "weekdays",
      ...times,
    });
  }
  if (
    sectionShows("openingHours-special") &&
    bookable.isSpecialOpeningHoursRelated
  ) {
    checkEntries("specialOpeningHours", bookable.specialOpeningHours, {
      date: "date",
      ...times,
    });
  }

  const details = bookable.accessPointDetails;
  if (shown("accessLocks") && details?.active) {
    check("accessPointDetails", "accessBuffer", [
      details.accessBuffer?.before,
      details.accessBuffer?.after,
    ]);
  }

  if (sectionShows("permissions-discounts")) {
    const discounts = bookable.bookingDiscounts || {};
    checkEntries(
      "bookingDiscounts",
      [...list(discounts.users), ...list(discounts.roles)],
      { discountPercent: "discountPercent" }
    );
  }

  return found;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * The issue to open on a refused save: the one whose tab or step comes
 * first in `order` - the visible tabs of the editing page or the steps of
 * the guided flow. An issue whose place is not in `order` comes after.
 *
 * @param {Array<Object>} issues - What `bookableIssues` found.
 * @param {string[]} order - Tab keys or step names, in their order.
 * @param {"tab"|"step"} by - Which place `order` names.
 * @returns {?Object} The issue, or `null` without issues.
 */
export function firstIssue(issues, order, by) {
  const rank = (issue) => {
    const index = order.indexOf(issue[by]);
    return index < 0 ? order.length : index;
  };
  return issues.reduce(
    (first, issue) => (!first || rank(issue) < rank(first) ? issue : first),
    null
  );
}
