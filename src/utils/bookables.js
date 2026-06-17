export function getTypeText(type) {
  switch (type) {
  case "event-location":
    return "Veranstaltungsort";
  case "room":
    return "Raum";
  case "resource":
    return "Gerät / Weiteres";
  case "ticket":
    return "Ticket";
  default:
    return "";
  }
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
