import EventEditBasics from "./EventEditBasics.vue";
import EventEditDate from "./EventEditDate.vue";
import EventEditPlace from "./EventEditPlace.vue";
import EventEditPeople from "./EventEditPeople.vue";
import EventEditParticipation from "./EventEditParticipation.vue";
import EventEditProgram from "./EventEditProgram.vue";
import EventEditMedia from "./EventEditMedia.vue";
import EventEditTickets from "./EventEditTickets.vue";

/**
 * The tabs of the event editing page, in order, as the bookable editor
 * lays out its own: each tab one component, its cards the sections the
 * navigation lists under it (`sections`; a card's element id is
 * `event-section-<id>`). The keys are the `tab` of an issue (`eventIssues`)
 * and of the query `?tab=`.
 */
export const EVENT_EDIT_TABS = Object.freeze([
  {
    key: "general",
    icon: "mdi-information-outline",
    labelKey: "event.edit.tabs.general",
    comp: EventEditBasics,
    sections: ["basics", "description", "features"],
  },
  {
    key: "date",
    icon: "mdi-calendar",
    labelKey: "event.edit.tabs.date",
    comp: EventEditDate,
    sections: [],
  },
  {
    key: "place",
    icon: "mdi-map-marker-outline",
    labelKey: "event.edit.tabs.place",
    comp: EventEditPlace,
    sections: [],
  },
  {
    key: "people",
    icon: "mdi-account-group-outline",
    labelKey: "event.edit.tabs.people",
    comp: EventEditPeople,
    sections: ["organizer", "contact", "people"],
  },
  {
    key: "participation",
    icon: "mdi-account-check-outline",
    labelKey: "event.edit.tabs.participation",
    comp: EventEditParticipation,
    sections: [],
  },
  {
    key: "program",
    icon: "mdi-clock-outline",
    labelKey: "event.edit.tabs.program",
    comp: EventEditProgram,
    sections: [],
  },
  {
    key: "media",
    icon: "mdi-paperclip",
    labelKey: "event.edit.tabs.media",
    comp: EventEditMedia,
    sections: [],
  },
  {
    key: "tickets",
    icon: "mdi-ticket-outline",
    labelKey: "event.edit.tabs.tickets",
    comp: EventEditTickets,
    sections: [],
  },
]);
