/*
 * The participation link of an event (`eventLocation.url`). A hybrid or
 * online event cannot be saved without one, and it has to be a full https
 * address (ECCdigital/tickets#457). The backend does not check it yet.
 */

/** The values of `format`; only the Admin UI knows them. */
export const EVENT_FORMATS = Object.freeze({
  PRESENCE: 0,
  HYBRID: 1,
  ONLINE: 2,
});

/** Whether an event of this format needs a participation link. */
export function needsParticipationLink(format) {
  return format === EVENT_FORMATS.HYBRID || format === EVENT_FORMATS.ONLINE;
}

/**
 * Whether the value is a full https address with a host, as a booker can
 * open it: `https://meet.example/abc` is one, `http://…`, `meet.example/abc`
 * and anything with a blank are not.
 */
export function isHttpsUrl(value) {
  if (typeof value !== "string" || value === "" || /\s/.test(value)) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch (error) {
    return false;
  }
}

/** Whether the event form may be saved as far as the link is concerned. */
export function hasValidParticipationLink(form) {
  if (!needsParticipationLink(form?.format)) return true;
  return isHttpsUrl(form?.eventLocation?.url);
}
