import BookableEditGeneral from "@/components/Bookable/Edit/BookableEditGeneral.vue";
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import BookableEditBookingMode from "@/components/Bookable/Edit/BookableEditBookingMode.vue";
import BookableEditBookingType from "@/components/Bookable/Edit/BookableEditBookingType.vue";
import BookableEditOpeningHours from "@/components/Bookable/Edit/BookableEditOpeningHours.vue";
import BookableEditPermissions from "@/components/Bookable/Edit/BookableEditPermissions.vue";
import BookableEditAccessLocks from "@/components/Bookable/Edit/BookableEditAccessLocks.vue";
import BookableEditCheckoutBookables from "@/components/Bookable/Edit/BookableEditCheckoutBookables.vue";
import BookableEditHierarchy from "@/components/Bookable/Edit/BookableEditHierarchy.vue";
import BookableEditGroupBooking from "@/components/Bookable/Edit/BookableEditGroupBooking.vue";
import BookableEditCancellation from "@/components/Bookable/Edit/BookableEditCancellation.vue";
import BookableEditAttachments from "@/components/Bookable/Edit/BookableEditAttachments.vue";
import BookableEditCustomFields from "@/components/Bookable/Edit/BookableEditCustomFields.vue";
import BookableEditRequiredFields from "@/components/Bookable/Edit/BookableEditRequiredFields.vue";
import BookableEditBookingNotes from "@/components/Bookable/Edit/BookableEditBookingNotes.vue";
import { BOOKABLE_AREAS } from "@/utils/bookableAreas";

/**
 * The component and icon of each area without a step in the guided flow
 * (`BOOKABLE_AREAS`). The editing page frames it as a card in its tab, the
 * step „Weitere Einstellungen“ as a row.
 */
export const AREA_COMPONENTS = Object.freeze({
  accessLocks: {
    comp: BookableEditAccessLocks,
    icon: "mdi-shield-key-outline",
  },
  checkoutBookables: {
    comp: BookableEditCheckoutBookables,
    icon: "mdi-cart-plus",
  },
  hierarchy: { comp: BookableEditHierarchy, icon: "mdi-file-tree" },
  groupBooking: {
    comp: BookableEditGroupBooking,
    icon: "mdi-calendar-multiple",
  },
  cancellation: {
    comp: BookableEditCancellation,
    icon: "mdi-book-cancel-outline",
  },
  attachments: { comp: BookableEditAttachments, icon: "mdi-paperclip" },
  customFields: { comp: BookableEditCustomFields, icon: "mdi-form-textbox" },
  requiredFields: { comp: BookableEditRequiredFields, icon: "mdi-form-select" },
  bookingNotes: {
    comp: BookableEditBookingNotes,
    icon: "mdi-information-variant",
  },
});

/**
 * The card of the area `key` in its tab: the area's component under its
 * title, anchored at its section and shown by its expert option.
 */
export function areaCard(key, extra = {}) {
  const area = BOOKABLE_AREAS.find((entry) => entry.key === key);
  if (!area) throw new Error(`Unknown area: ${key}`);
  return Object.freeze({
    key,
    ...AREA_COMPONENTS[key],
    titleKey: area.titleKey,
    section: area.sectionId,
    option: area.option,
    ...extra,
  });
}

/**
 * The tabs of the editing page, in order. A tab is either one component
 * (`comp`) that draws its heading and sections itself, or a list of `cards`
 * that `BookableEditTab` frames under the tab's heading. A card:
 *
 * - `key`, `comp`: its name in the tab and its component, on `bookableEditing`;
 * - `titleKey`, `icon`: the card's heading;
 * - `section`: the id of its section in `bookableEditSections` - the card's
 *   anchor, shown while the section is;
 * - `option`: the expert option it is, shown by `expertOptionShown`;
 * - `bare`: drawn without a card, for a component with cards of its own;
 * - `sectionTarget`: hands on the sub-section to open (`?section=`).
 *
 * A tab becomes cards one ticket at a time: a ticket edits only its entry.
 */
export const BOOKABLE_EDIT_TABS = Object.freeze([
  {
    key: "general",
    label: "Allgemein",
    icon: "mdi-information-outline",
    comp: BookableEditGeneral,
  },
  {
    key: "pricing",
    label: "Preise & Kapazität",
    icon: "mdi-cash",
    comp: BookableEditPrice,
  },
  {
    key: "bookingType",
    label: "Buchungsart",
    icon: "mdi-calendar-clock",
    cards: [
      {
        key: "bookingMode",
        comp: BookableEditBookingMode,
        titleKey: "bookable.edit.sections.bookingTypeSelect",
        icon: "mdi-calendar-question",
        section: "bookingType-select",
      },
      // The sections of the chosen mode, each a card of its own.
      { key: "bookingTypeSettings", comp: BookableEditBookingType, bare: true },
    ],
  },
  {
    key: "openingHours",
    label: "Öffnungszeiten",
    icon: "mdi-clock-outline",
    comp: BookableEditOpeningHours,
  },
  {
    key: "accessLocks",
    label: "Schließsysteme",
    icon: "mdi-lock-outline",
    cards: [areaCard("accessLocks")],
  },
  {
    key: "relatedBookables",
    label: "Abhängigkeiten",
    icon: "mdi-link-variant",
    cards: [areaCard("checkoutBookables"), areaCard("hierarchy")],
  },
  {
    key: "permissions",
    label: "Berechtigungen",
    icon: "mdi-account-lock-outline",
    cards: [
      // Anmeldepflicht, Individuelle Berechtigungen and Preisrabatte, until
      // „Wer darf buchen?“ takes their place.
      { key: "permissions", comp: BookableEditPermissions, bare: true },
      areaCard("groupBooking"),
      areaCard("cancellation"),
    ],
  },
  {
    key: "attachments",
    label: "Anhänge",
    icon: "mdi-paperclip",
    cards: [areaCard("attachments")],
  },
  {
    key: "customFields",
    label: "Eigene Felder",
    icon: "mdi-form-textbox",
    cards: [areaCard("customFields", { sectionTarget: true })],
  },
  {
    key: "additional",
    label: "Sonstiges",
    icon: "mdi-dots-horizontal",
    cards: [areaCard("requiredFields"), areaCard("bookingNotes")],
  },
]);
