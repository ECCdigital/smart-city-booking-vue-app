import { describe, expect, it } from "vitest";
import {
  REGISTRATION,
  eventDays,
  eventImagesOf,
  eventImagesPatch,
  eventIssues,
  isMultiDay,
  locationToAdopt,
  normalizedSchedules,
  registrationModeOf,
  registrationPatch,
} from "@/utils/eventEditing";
import { EVENT_FORMATS } from "@/utils/eventParticipationLink";

/** An event that can be saved: on site, one day, registration in the portal. */
const validEvent = (patch = {}) => ({
  format: EVENT_FORMATS.PRESENCE,
  externalBookingUrl: "",
  information: {
    name: "Einführung in den 3D-Druck",
    startDate: "2026-11-21",
    startTime: "10:00",
    endDate: "2026-11-21",
    endTime: "13:00",
  },
  eventLocation: {
    name: "Makerspace",
    emailAddress: "info@example.org",
    url: "",
  },
  eventOrganizer: { name: "Stadtbibliothek", addContactPerson: false },
  attendees: { needsRegistration: true, maxAttendees: 12 },
  schedules: [],
  ...patch,
});

const fieldsOf = (issues) => issues.map((issue) => issue.field);

describe("registrationModeOf", () => {
  it("reads an external address first", () => {
    expect(
      registrationModeOf({
        externalBookingUrl: "https://example.org",
        attendees: { needsRegistration: true },
      })
    ).toBe(REGISTRATION.EXTERNAL);
  });

  it("reads the registration in the portal", () => {
    expect(registrationModeOf({ attendees: { needsRegistration: true } })).toBe(
      REGISTRATION.PORTAL
    );
  });

  it("reads none without either", () => {
    expect(registrationModeOf({ attendees: {} })).toBe(REGISTRATION.NONE);
  });
});

describe("registrationPatch", () => {
  const form = { externalBookingUrl: "https://example.org/anmeldung" };

  it("clears the address for the portal", () => {
    expect(registrationPatch(REGISTRATION.PORTAL, form)).toEqual({
      needsRegistration: true,
      externalBookingUrl: "",
    });
  });

  it("keeps a typed address for another website", () => {
    expect(registrationPatch(REGISTRATION.EXTERNAL, form)).toEqual({
      needsRegistration: false,
      externalBookingUrl: "https://example.org/anmeldung",
    });
  });

  it("clears both without registration", () => {
    expect(registrationPatch(REGISTRATION.NONE, form)).toEqual({
      needsRegistration: false,
      externalBookingUrl: "",
    });
  });
});

describe("eventDays", () => {
  it("is the start date for an event on one day", () => {
    expect(eventDays(validEvent())).toEqual(["2026-11-21"]);
    expect(isMultiDay(validEvent())).toBe(false);
  });

  it("spans every day from start to end", () => {
    const event = validEvent();
    event.information.endDate = "2026-11-23";
    expect(isMultiDay(event)).toBe(true);
    expect(eventDays(event)).toEqual([
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
    ]);
  });

  it("is empty without a start date", () => {
    expect(eventDays({ information: {} })).toEqual([]);
  });
});

describe("normalizedSchedules", () => {
  it("puts every point of a one-day event on its day", () => {
    const event = validEvent({
      schedules: [{ id: "1", date: "2026-01-01", time: "10:00" }],
    });
    expect(normalizedSchedules(event)[0].date).toBe("2026-11-21");
  });

  it("keeps the dates of a multi-day event", () => {
    const event = validEvent({
      schedules: [{ id: "1", date: "2026-11-22", time: "10:00" }],
    });
    event.information.endDate = "2026-11-23";
    expect(normalizedSchedules(event)[0].date).toBe("2026-11-22");
  });
});

describe("eventIssues", () => {
  it("finds nothing on a complete event", () => {
    expect(eventIssues(validEvent())).toEqual([]);
  });

  it("asks for name, times, place, organizer and e-mail", () => {
    const event = validEvent({
      information: {},
      eventLocation: {},
      eventOrganizer: {},
    });
    expect(fieldsOf(eventIssues(event))).toEqual([
      "name",
      "start",
      "end",
      "placeName",
      "organizer",
      "emailAddress",
    ]);
  });

  it("refuses an end before the start", () => {
    const event = validEvent();
    event.information.endTime = "09:00";
    expect(eventIssues(event)).toEqual([
      { field: "end", tab: "date", key: "endBeforeStart" },
    ]);
  });

  it("asks an online event for a link, not a place", () => {
    const event = validEvent({ format: EVENT_FORMATS.ONLINE });
    event.eventLocation.name = "";
    expect(fieldsOf(eventIssues(event))).toEqual(["url"]);
  });

  it("asks a hybrid event for both", () => {
    const event = validEvent({ format: EVENT_FORMATS.HYBRID });
    event.eventLocation.name = "";
    expect(fieldsOf(eventIssues(event))).toEqual(["placeName", "url"]);
  });

  it("refuses a location the backend would refuse", () => {
    expect(
      fieldsOf(eventIssues(validEvent(), { locationRefusal: "location.x" }))
    ).toEqual(["location"]);
  });

  it("asks the contact person for name, phone and e-mail", () => {
    const event = validEvent();
    event.eventOrganizer.addContactPerson = true;
    expect(fieldsOf(eventIssues(event))).toEqual([
      "contactPersonName",
      "contactPersonPhoneNumber",
      "contactPersonEmailAddress",
    ]);
  });

  it("asks the portal for places", () => {
    const event = validEvent();
    event.attendees.maxAttendees = null;
    expect(fieldsOf(eventIssues(event))).toEqual(["maxAttendees"]);
  });

  it("asks another website for its address, whatever is stored", () => {
    expect(
      fieldsOf(
        eventIssues(validEvent(), { registration: REGISTRATION.EXTERNAL })
      )
    ).toEqual(["externalBookingUrl"]);
  });

  it("asks nothing more without registration", () => {
    const event = validEvent();
    event.attendees = { needsRegistration: false, maxAttendees: null };
    expect(eventIssues(event)).toEqual([]);
  });
});

describe("locationToAdopt", () => {
  const location = (patch = {}) => ({
    coordinates: { type: "Point", points: [null, null] },
    display_address: "",
    address: { street: null, house_number: null, postcode: null, city: null },
    meta: {},
    ...patch,
  });

  it("takes a location with an address, as a copy", () => {
    const bookable = {
      location: location({
        display_address: "Bahnhofstraße 1, 24392 Süderbrarup",
        address: { street: "Bahnhofstraße", house_number: "1" },
      }),
    };
    const adopted = locationToAdopt(bookable);

    expect(adopted.display_address).toBe("Bahnhofstraße 1, 24392 Süderbrarup");
    expect(adopted).not.toBe(bookable.location);
  });

  it("takes a location with a point only", () => {
    const bookable = {
      location: location({ coordinates: { points: [54.6, 9.7] } }),
    };
    expect(locationToAdopt(bookable)).not.toBeNull();
  });

  it("takes a legacy text", () => {
    expect(locationToAdopt({ location: "Am Markt 2" })).toBe("Am Markt 2");
  });

  it.each([
    ["no bookable", undefined],
    ["no location", {}],
    ["an empty location", { location: location() }],
    ["an empty text", { location: "  " }],
  ])("takes nothing from %s", (_, bookable) => {
    expect(locationToAdopt(bookable)).toBeNull();
  });
});

describe("eventImagesOf / eventImagesPatch", () => {
  const cover = { source: "library", mediaId: "m1", url: null };
  const other = { source: "library", mediaId: "m2", url: null };

  it("lists the cover first, then the gallery", () => {
    const form = { information: { teaserImage: cover }, images: [other] };
    expect(eventImagesOf(form)).toEqual([cover, other]);
  });

  it("reads an old cover stored as a URL as an external reference", () => {
    const form = {
      information: { teaserImage: "https://example.org/bild.jpg" },
      images: [],
    };
    expect(eventImagesOf(form)).toEqual([
      {
        source: "external",
        mediaId: null,
        url: "https://example.org/bild.jpg",
      },
    ]);
  });

  it("lists the gallery alone without a cover", () => {
    expect(eventImagesOf({ information: {}, images: [other] })).toEqual([
      other,
    ]);
  });

  it("stores the first image as the cover, the rest as the gallery", () => {
    expect(eventImagesPatch([other, cover])).toEqual({
      teaserImage: other,
      images: [cover],
    });
  });

  it("stores an empty list as no cover and no gallery", () => {
    expect(eventImagesPatch([])).toEqual({ teaserImage: null, images: [] });
  });
});
