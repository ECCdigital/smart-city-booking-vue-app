import { describe, expect, it } from "vitest";
import Bookable from "@/entities/bookable";
import {
  BOOKABLE_AREAS,
  areaAt,
  areaShown,
  areaSummary,
  areaUsed,
  shownAreas,
} from "@/utils/bookableAreas";

// A new bookable as BookableEdit creates it: the stand every area is
// compared with. Pflichtfelder default as the backend's schema does.
const fresh = (overrides = {}) =>
  new Bookable({
    tenantId: "t1",
    title: "Saal",
    requiredFields: ["address", "zipCode", "city"],
    ...overrides,
  }).toPlain();

describe("BOOKABLE_AREAS", () => {
  it("lists the areas without a step in the order of the tabs", () => {
    expect(BOOKABLE_AREAS.map((area) => area.key)).toEqual([
      "accessLocks",
      "checkoutBookables",
      "hierarchy",
      "groupBooking",
      "cancellation",
      "attachments",
      "customFields",
      "requiredFields",
      "bookingNotes",
    ]);
  });
});

/*
 * „Genutzt“ per area (ECCdigital/tickets#346): the expert areas by the table
 * of the expert mode, the four that are always there by their own rule. Each
 * case pairs a bookable that uses the area with the stand of a new one.
 */
const USED = {
  accessLocks: { accessPointDetails: { accessPointIds: ["ap1"] } },
  checkoutBookables: {
    checkoutBookableIds: [{ bookableId: "b2", mandatory: false }],
  },
  hierarchy: { relatedBookableIds: ["b3"] },
  groupBooking: { groupBooking: { enabled: true, permittedRoles: [] } },
  cancellation: { cancellationPolicy: { userCancellable: false } },
  attachments: { attachments: [{ id: "a1", title: "AGB" }] },
  customFields: { customFieldValues: [{ fieldId: "f1", value: "Bühne" }] },
  requiredFields: { requiredFields: ["address", "zipCode", "city", "phone"] },
  bookingNotes: { bookingNotes: "<p>Schlüssel beim Hausmeister</p>" },
};

describe("areaUsed", () => {
  it.each(Object.entries(USED))("reads %s as used", (key, overrides) => {
    expect(areaUsed(key, fresh(overrides))).toBe(true);
  });

  it.each(Object.keys(USED))("reads %s of a new bookable as unused", (key) => {
    expect(areaUsed(key, fresh())).toBe(false);
  });

  it("reads Eigene Felder as used while the bookable defines fields", () => {
    const bookable = fresh({
      customFieldDefinitions: [{ id: "f9", caption: "Anlass" }],
    });
    expect(areaUsed("customFields", bookable)).toBe(true);
  });

  it("reads Eigene Felder with emptied values as unused", () => {
    const bookable = fresh({
      customFieldValues: [
        { fieldId: "f1", value: "" },
        { fieldId: "f2", value: null },
        { fieldId: "f3", value: [] },
      ],
    });
    expect(areaUsed("customFields", bookable)).toBe(false);
  });

  it("reads Buchungshinweise of an emptied editor as unused", () => {
    expect(areaUsed("bookingNotes", fresh({ bookingNotes: "<p></p>" }))).toBe(
      false
    );
  });

  it("reads a switched-off Serienbuchung with roles as unused", () => {
    const bookable = fresh({
      groupBooking: { enabled: false, permittedRoles: ["r1"] },
    });
    expect(areaUsed("groupBooking", bookable)).toBe(false);
  });

  it("knows no area by another name", () => {
    expect(() => areaUsed("tags", fresh())).toThrow("Unknown area: tags");
  });
});

/*
 * The one line a used area reads, as parts like the rows of the overview:
 * ready text, an i18n key with params, or a plural key with its count.
 */
describe("areaSummary", () => {
  const plural = (key, count) => ({
    type: "plural",
    key: `bookable.areas.${key}`,
    count,
  });
  const word = (key) => ({
    type: "word",
    key: `bookable.areas.${key}`,
    params: undefined,
  });

  it("says nothing for an unused area", () => {
    expect(areaSummary("hierarchy", fresh())).toEqual([]);
  });

  it("counts the access points of Schließsysteme", () => {
    const bookable = fresh({
      accessPointDetails: { accessPointIds: ["ap1", "ap2"] },
    });
    expect(areaSummary("accessLocks", bookable)).toEqual([
      plural("accessLocks.summary", 2),
    ]);
  });

  it("counts the Zusatzobjekte", () => {
    expect(
      areaSummary("checkoutBookables", fresh(USED.checkoutBookables))
    ).toEqual([plural("checkoutBookables.summary", 1)]);
  });

  it("counts the objects below in the Hierarchie", () => {
    const bookable = fresh({ relatedBookableIds: ["b3", "b4", "b5"] });
    expect(areaSummary("hierarchy", bookable)).toEqual([
      plural("hierarchy.summary", 3),
    ]);
  });

  it("says Serienbuchung is allowed, for everyone", () => {
    expect(areaSummary("groupBooking", fresh(USED.groupBooking))).toEqual([
      word("groupBooking.summary"),
    ]);
  });

  it("names the roles Serienbuchung is limited to", () => {
    const bookable = fresh({
      groupBooking: { enabled: true, permittedRoles: ["r1", "r2"] },
    });
    expect(areaSummary("groupBooking", bookable)).toEqual([
      word("groupBooking.summary"),
      plural("groupBooking.summaryRoles", 2),
    ]);
  });

  it("says only the administration cancels", () => {
    expect(areaSummary("cancellation", fresh(USED.cancellation))).toEqual([
      word("cancellation.summary"),
    ]);
  });

  it("counts the Anhänge", () => {
    expect(areaSummary("attachments", fresh(USED.attachments))).toEqual([
      plural("attachments.summary", 1),
    ]);
  });

  it("counts the values set and the fields defined of Eigene Felder", () => {
    const bookable = fresh({
      customFieldValues: [
        { fieldId: "f1", value: "Bühne" },
        { fieldId: "f2", value: "" },
        { fieldId: "f3", value: false },
      ],
      customFieldDefinitions: [{ id: "f9", caption: "Anlass" }],
    });
    expect(areaSummary("customFields", bookable)).toEqual([
      plural("customFields.summaryValues", 2),
      plural("customFields.summaryDefinitions", 1),
    ]);
  });

  it("leaves out the definitions of Eigene Felder while there are none", () => {
    expect(areaSummary("customFields", fresh(USED.customFields))).toEqual([
      plural("customFields.summaryValues", 1),
    ]);
  });

  it("counts the Pflichtfelder, none as well", () => {
    expect(
      areaSummary("requiredFields", fresh({ requiredFields: [] }))
    ).toEqual([plural("requiredFields.summary", 0)]);
  });

  it("reads the start of the Buchungshinweise as plain text", () => {
    const bookable = fresh({
      bookingNotes:
        "<p>Schlüssel&nbsp;beim <strong>Hausmeister</strong> &amp; Pförtner abholen, bitte bis 18 Uhr zurück</p>",
    });
    expect(areaSummary("bookingNotes", bookable)).toEqual([
      {
        type: "text",
        text: "Schlüssel beim Hausmeister & Pförtner abholen, bitte bis…",
      },
    ]);
  });
});

describe("areaShown", () => {
  const onlyHierarchy = (option) => option === "hierarchy";

  it("asks the expert rule for an expert area", () => {
    expect(areaShown("hierarchy", onlyHierarchy)).toBe(true);
    expect(areaShown("checkoutBookables", onlyHierarchy)).toBe(false);
  });

  it.each(["groupBooking", "attachments", "customFields", "bookingNotes"])(
    "always shows %s",
    (key) => {
      expect(areaShown(key, () => false)).toBe(true);
    }
  );
});

describe("shownAreas", () => {
  it("lists the areas that show, in the order of the tabs", () => {
    const keys = (shown) => shownAreas(shown).map((area) => area.key);

    expect(keys(() => true)).toHaveLength(9);
    expect(keys((option) => option === "cancellation")).toEqual([
      "groupBooking",
      "cancellation",
      "attachments",
      "customFields",
      "bookingNotes",
    ]);
  });
});

describe("areaAt", () => {
  it("finds the area of a section, or of the whole tab", () => {
    expect(
      areaAt({ tabKey: "permissions", sectionId: "permissions-cancellation" })
    ).toBe("cancellation");
    expect(areaAt({ tabKey: "attachments", sectionId: null })).toBe(
      "attachments"
    );
  });

  it("places the settings of ParkraumService in Schließsysteme", () => {
    expect(
      areaAt({ tabKey: "accessLocks", sectionId: "pricing-external" })
    ).toBe("accessLocks");
  });

  it("finds none outside the areas", () => {
    expect(
      areaAt({ tabKey: "permissions", sectionId: "permissions-discounts" })
    ).toBeNull();
    expect(
      areaAt({ tabKey: "pricing", sectionId: "pricing-price" })
    ).toBeNull();
  });
});
