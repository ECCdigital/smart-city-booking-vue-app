/*
 * The rules of the event editing page (`EventEdit`): how the answer to „Wie
 * melden sich Teilnehmende an?“ maps onto the stored fields, which days the
 * event spans, and what keeps it from being saved. Pure functions on the
 * event form of the `events` store, so the page, its overview and the
 * tests read the same rules.
 */
import {
  EVENT_FORMATS,
  isHttpsUrl,
  needsParticipationLink,
} from "@/utils/eventParticipationLink";

/** The answers to „Wie melden sich Teilnehmende an?“. */
export const REGISTRATION = Object.freeze({
  PORTAL: "portal",
  EXTERNAL: "external",
  NONE: "none",
});

/**
 * The answer a stored event gives: an external booking address wins, then
 * the registration in the portal, else none.
 */
export function registrationModeOf(form) {
  if ((form?.externalBookingUrl || "").trim()) return REGISTRATION.EXTERNAL;
  if (form?.attendees?.needsRegistration) return REGISTRATION.PORTAL;
  return REGISTRATION.NONE;
}

/**
 * The stored fields an answer sets. Leaving „Auf einer anderen Website“
 * clears the address; choosing it keeps one already typed.
 */
export function registrationPatch(mode, form) {
  const url = form?.externalBookingUrl || "";
  switch (mode) {
    case REGISTRATION.PORTAL:
      return { needsRegistration: true, externalBookingUrl: "" };
    case REGISTRATION.EXTERNAL:
      return { needsRegistration: false, externalBookingUrl: url };
    default:
      return { needsRegistration: false, externalBookingUrl: "" };
  }
}

/** Whether the event ends on another day than it begins. */
export function isMultiDay(form) {
  const { startDate, endDate } = form?.information || {};
  return !!(startDate && endDate && endDate !== startDate);
}

/**
 * The days of the event as `YYYY-MM-DD`, from its start to its end, at
 * most 62 of them; a single day for an event on one day.
 */
export function eventDays(form) {
  const { startDate, endDate } = form?.information || {};
  if (!startDate) return [];
  if (!isMultiDay(form)) return [startDate];
  const days = [];
  const day = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (day <= end && days.length < 62) {
    days.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return days;
}

/**
 * The program points as they are saved: on an event of one day every point
 * is on that day, so the date follows the start date.
 */
export function normalizedSchedules(form) {
  const schedules = form?.schedules || [];
  if (isMultiDay(form)) return schedules;
  const day = form?.information?.startDate || "";
  return schedules.map((schedule) => ({ ...schedule, date: day }));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const filled = (value) => typeof value === "string" && value.trim() !== "";

/**
 * What keeps the event from being saved, in the order of the page: each
 * issue names its field (the anchor `data-field` on the page), the tab that
 * holds it and the message key under `event.edit.issues`.
 *
 * @param {Object} form The event form
 * @param {Object} [context]
 * @param {string} [context.registration] The answer to the registration
 *   question, as the store holds it (`REGISTRATION`)
 * @param {string|null} [context.locationRefusal] Why the location may not
 *   be saved (`location.reason.*`)
 */
export function eventIssues(form, context = {}) {
  const issues = [];
  const add = (field, tab, key = field) => issues.push({ field, tab, key });
  const info = form?.information || {};
  const place = form?.eventLocation || {};
  const registration = context.registration ?? registrationModeOf(form);

  if (!filled(info.name)) add("name", "general");
  if (!info.startDate || !info.startTime) add("start", "date");
  if (!info.endDate || !info.endTime) add("end", "date");
  if (
    info.startDate &&
    info.endDate &&
    `${info.endDate}T${info.endTime || "23:59"}` <
      `${info.startDate}T${info.startTime || "00:00"}`
  ) {
    add("end", "date", "endBeforeStart");
  }

  if (form?.format !== EVENT_FORMATS.ONLINE) {
    if (!filled(place.name)) add("placeName", "place");
    if (context.locationRefusal) add("location", "place");
  }
  if (needsParticipationLink(form?.format) && !isHttpsUrl(place.url)) {
    add("url", "place");
  }

  if (!filled(form?.eventOrganizer?.name)) add("organizer", "people");
  if (!EMAIL.test((place.emailAddress || "").trim())) {
    add("emailAddress", "people");
  }
  const organizer = form?.eventOrganizer || {};
  if (organizer.addContactPerson) {
    if (!filled(organizer.contactPersonName))
      add("contactPersonName", "people");
    if (!filled(organizer.contactPersonPhoneNumber)) {
      add("contactPersonPhoneNumber", "people");
    }
    if (!EMAIL.test((organizer.contactPersonEmailAddress || "").trim())) {
      add("contactPersonEmailAddress", "people");
    }
  }

  if (registration === REGISTRATION.PORTAL) {
    if (!(Number(form?.attendees?.maxAttendees) > 0)) {
      add("maxAttendees", "participation");
    }
  }
  if (
    registration === REGISTRATION.EXTERNAL &&
    !isHttpsUrl(form?.externalBookingUrl)
  ) {
    add("externalBookingUrl", "participation");
  }
  return issues;
}
