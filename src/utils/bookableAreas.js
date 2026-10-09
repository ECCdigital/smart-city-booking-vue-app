import { expertOptionUsed } from "@/utils/bookableExpertMode";

/*
 * The areas of a bookable that have no step of their own in the guided flow
 * (ECCdigital/tickets#346): each is one component, which the editing page
 * frames as a card in its tab and the step „Weitere Einstellungen“ as a row.
 * Per area: whether it is used and the one line that sums it up.
 *
 * An area that is an expert option names it in `option`: it shows by the
 * expert-mode rule, and „genutzt“ is that rule's table. The others are always
 * there and read „genutzt“ by their own rule below.
 */

const AREAS = "bookable.areas";

const nonEmpty = (list) => Array.isArray(list) && list.length > 0;
const count = (list) => (Array.isArray(list) ? list.length : 0);

const textPart = (text) => ({ type: "text", text });
/** The part, or none while `condition` fails. */
const partIf = (condition, part) => (condition ? [part] : []);
const wordPart = (key, params) => ({ type: "word", key, params });
const pluralPart = (key, n) => ({ type: "plural", key, count: n });

/** A value of a custom field counts once it is more than empty. */
const isSet = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  !(Array.isArray(value) && value.length === 0);

const valuesSet = (bookable) =>
  (bookable.customFieldValues || []).filter((entry) => isSet(entry?.value));

const ENTITIES = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
};

/** The text of the editor's HTML, without tags, in one line. */
function plainText(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(nbsp|amp|lt|gt);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, " ")
    .trim();
}

const NOTES_SUMMARY_LENGTH = 56;

/** `text` up to the last whole word within `max` characters. */
function shortened(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const end = cut.lastIndexOf(" ");
  return `${(end > 0 ? cut.slice(0, end) : text.slice(0, max)).trim()}…`;
}

const expertArea = (key, option, extra) => ({
  key,
  option,
  used: (bookable) => expertOptionUsed(option, bookable),
  ...extra,
});

const area = (key, extra) => ({ key, option: null, ...extra });

const AREA_LIST = [
  expertArea("accessLocks", "accessLocks", {
    tabKey: "accessLocks",
    sectionId: null,
    summary: (bookable) => [
      pluralPart(
        `${AREAS}.accessLocks.summary`,
        count(bookable.accessPointDetails?.accessPointIds)
      ),
    ],
  }),
  expertArea("checkoutBookables", "checkoutBookables", {
    tabKey: "relatedBookables",
    sectionId: "related-checkout",
    summary: (bookable) => [
      pluralPart(
        `${AREAS}.checkoutBookables.summary`,
        count(bookable.checkoutBookableIds)
      ),
    ],
  }),
  expertArea("hierarchy", "hierarchy", {
    tabKey: "relatedBookables",
    sectionId: "related-hierarchy",
    summary: (bookable) => [
      pluralPart(
        `${AREAS}.hierarchy.summary`,
        count(bookable.relatedBookableIds)
      ),
    ],
  }),
  area("groupBooking", {
    tabKey: "permissions",
    sectionId: "permissions-group-booking",
    used: (bookable) => bookable.groupBooking?.enabled === true,
    summary: (bookable) => {
      const roles = count(bookable.groupBooking?.permittedRoles);
      return [
        wordPart(`${AREAS}.groupBooking.summary`),
        ...partIf(
          roles,
          pluralPart(`${AREAS}.groupBooking.summaryRoles`, roles)
        ),
      ];
    },
  }),
  expertArea("cancellation", "cancellation", {
    tabKey: "permissions",
    sectionId: "permissions-cancellation",
    summary: () => [wordPart(`${AREAS}.cancellation.summary`)],
  }),
  area("attachments", {
    tabKey: "attachments",
    sectionId: null,
    used: (bookable) => nonEmpty(bookable.attachments),
    summary: (bookable) => [
      pluralPart(`${AREAS}.attachments.summary`, count(bookable.attachments)),
    ],
  }),
  area("customFields", {
    tabKey: "customFields",
    sectionId: null,
    used: (bookable) =>
      valuesSet(bookable).length > 0 ||
      nonEmpty(bookable.customFieldDefinitions),
    summary: (bookable) => {
      const values = valuesSet(bookable).length;
      const definitions = count(bookable.customFieldDefinitions);
      return [
        ...partIf(
          values,
          pluralPart(`${AREAS}.customFields.summaryValues`, values)
        ),
        ...partIf(
          definitions,
          pluralPart(`${AREAS}.customFields.summaryDefinitions`, definitions)
        ),
      ];
    },
  }),
  expertArea("requiredFields", "requiredFields", {
    tabKey: "additional",
    sectionId: "additional-required-fields",
    summary: (bookable) => [
      pluralPart(
        `${AREAS}.requiredFields.summary`,
        count(bookable.requiredFields)
      ),
    ],
  }),
  area("bookingNotes", {
    tabKey: "additional",
    sectionId: "additional-notes",
    used: (bookable) => plainText(bookable.bookingNotes) !== "",
    summary: (bookable) => [
      textPart(
        shortened(plainText(bookable.bookingNotes), NOTES_SUMMARY_LENGTH)
      ),
    ],
  }),
];

/**
 * The areas in the order of the editing page's tabs: `key`, the expert
 * `option` (or `null`), the `tabKey` and `sectionId` of the editing page,
 * and the i18n keys of `title` and `hint`.
 */
export const BOOKABLE_AREAS = Object.freeze(
  AREA_LIST.map(({ key, option, tabKey, sectionId }) =>
    Object.freeze({
      key,
      option,
      tabKey,
      sectionId,
      titleKey: `${AREAS}.${key}.title`,
      hintKey: `${AREAS}.${key}.hint`,
    })
  )
);

function areaOf(key) {
  const found = AREA_LIST.find((entry) => entry.key === key);
  if (!found) throw new Error(`Unknown area: ${key}`);
  return found;
}

/** Whether `bookable` uses the area `key`. */
export function areaUsed(key, bookable) {
  return !!bookable && areaOf(key).used(bookable);
}

/**
 * The one line of a used area, as parts like the overview's rows: ready
 * text, an i18n key with params or a plural key with its count. An unused
 * area has none - the caller says „Nicht genutzt“.
 */
export function areaSummary(key, bookable) {
  if (!areaUsed(key, bookable)) return [];
  return areaOf(key).summary(bookable);
}

/**
 * Whether the area `key` shows, given `shown(option)` - the expert-mode rule
 * as the caller asks it. An area that is no expert option always shows.
 */
export function areaShown(key, shown) {
  const { option } = areaOf(key);
  return !option || shown(option);
}

/**
 * The areas that show, given `shown(option)`, in the order of the tabs: the
 * rows of the step „Weitere Einstellungen“ and the links to it.
 */
export function shownAreas(shown) {
  return BOOKABLE_AREAS.filter((entry) => areaShown(entry.key, shown));
}

/**
 * The key of the area a place of the editing page lies in, given as
 * `{ tabKey, sectionId }` like `BookableEdit.openSection` takes it: the area
 * of that section, or the area that is the whole tab - so the settings of
 * ParkraumService (`pricing-external`, in Schließsysteme) lie in
 * `accessLocks`. `null` for a place outside the areas.
 */
export function areaAt({ tabKey, sectionId = null }) {
  const found = BOOKABLE_AREAS.find(
    (entry) =>
      entry.tabKey === tabKey &&
      (entry.sectionId === null || entry.sectionId === sectionId)
  );
  return found ? found.key : null;
}
