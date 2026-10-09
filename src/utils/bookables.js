import i18n from "@/language/index";

/** The bookable types the catalogue names (`editBookables.types.<type>`). */
const NAMED_TYPES = Object.freeze([
  "room",
  "resource",
  "ticket",
  "event-location",
]);

/**
 * The catalogue key of a bookable type's name, as the field „Typ“ reads it;
 * `null` for a type the catalogue does not name.
 */
export function typeNameKey(type) {
  return NAMED_TYPES.includes(type) ? `editBookables.types.${type}` : null;
}

/** A bookable type's name from the catalogue; "" for an unnamed type. */
export function getTypeText(type) {
  const key = typeNameKey(type);
  return key ? i18n.t(key) : "";
}

export function getTypeIcon(type) {
  const iconMap = {
    "event-location": "mdi-map-marker-outline",
    room: "mdi-door",
    resource: "mdi-package-variant",
    ticket: "mdi-ticket-confirmation-outline",
  };

  return iconMap[type] || "mdi-help-circle";
}

export function getTypeColor(type) {
  const colors = {
    "event-location": "deep-purple",
    room: "blue",
    resource: "teal",
    ticket: "orange",
  };

  return colors[type] || "grey";
}
