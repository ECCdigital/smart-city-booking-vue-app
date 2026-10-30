/*
 * The filters of the event list behind the funnel of its search band:
 * public, registration, free, format and the maximum number of attendees. They are field filters of `Search`: sections
 * of the filter card (see `@/utils/filterSections`) with `matches`.
 */
import { EVENT_FORMATS } from "@/utils/eventParticipationLink";

/** The selection of a yes/no filter. */
export const YES_NO = Object.freeze({ ALL: "all", YES: "yes", NO: "no" });

/** The selection of the format filter that restricts nothing. */
export const ALL_FORMATS = "all";

function yesNoFilter(t, key, label, read) {
  return {
    key,
    label,
    multiple: false,
    segmented: true,
    empty: YES_NO.ALL,
    options: [
      { value: YES_NO.ALL, label: t("event.list.filter.all") },
      { value: YES_NO.YES, label: t("event.list.filter.yes") },
      { value: YES_NO.NO, label: t("event.list.filter.no") },
    ],
    matches: (event, selection) =>
      Boolean(read(event)) === (selection === YES_NO.YES),
  };
}

/**
 * Whether the maximum number of attendees lies within the range; an event
 * without one lies in no bounded range.
 */
export function attendeesInRange(maxAttendees, { from = null, to = null }) {
  if (maxAttendees === null || maxAttendees === undefined) return false;
  if (maxAttendees === "") return false;
  const count = Number(maxAttendees);
  if (!Number.isFinite(count)) return false;
  if (from !== null && count < from) return false;
  if (to !== null && count > to) return false;
  return true;
}

/** The filters of the event list, labelled by `t` (`$t` of the page). */
export function eventFilters(t) {
  return [
    yesNoFilter(
      t,
      "public",
      t("event.list.filter.public"),
      (event) => event.attendees?.publicEvent
    ),
    yesNoFilter(
      t,
      "registration",
      t("event.list.filter.registration"),
      (event) => event.attendees?.needsRegistration
    ),
    yesNoFilter(
      t,
      "free",
      t("event.list.filter.free"),
      (event) => event.attendees?.free
    ),
    {
      key: "format",
      label: t("event.list.filter.format"),
      multiple: false,
      segmented: true,
      empty: ALL_FORMATS,
      options: [
        { value: ALL_FORMATS, label: t("event.list.filter.all") },
        {
          value: EVENT_FORMATS.PRESENCE,
          label: t("event.list.filter.presence"),
        },
        { value: EVENT_FORMATS.ONLINE, label: t("event.list.filter.online") },
        { value: EVENT_FORMATS.HYBRID, label: t("event.list.filter.hybrid") },
      ],
      // An event without a format is one in presence, the form's default.
      matches: (event, selection) =>
        (event.format ?? EVENT_FORMATS.PRESENCE) === selection,
    },
    {
      key: "attendees",
      label: t("event.list.filter.attendees"),
      range: true,
      matches: (event, selection) =>
        attendeesInRange(event.attendees?.maxAttendees, selection),
    },
  ];
}
