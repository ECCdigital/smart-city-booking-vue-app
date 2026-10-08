import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@tests/unit/support/api";
import {
  resetViewportWidth,
  setViewportWidth,
} from "@tests/unit/support/viewport";
import {
  find,
  mountBookableEdit,
  storedBookable,
  stub,
} from "@tests/unit/support/bookableEdit";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { FLOW_STEPS } from "@/utils/bookableFlow";
import {
  restoreLocale,
  unmarkedTexts,
  usePseudoLocale,
} from "@tests/unit/support/pseudoLocale";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: {
    getBookable: vi.fn(),
    getBookableTemplate: vi.fn(),
    createOrUpdateBookable: vi.fn(),
    getBookablePrices: vi.fn(),
    getBookables: vi.fn().mockResolvedValue({ data: [] }),
  },
}));
vi.mock("@/services/api/ApiAccessPointService", () => ({
  default: { getAccessPoints: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock("@/services/api/ApiHolidaysService", () => ({
  default: { getHolidays: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock("@/services/api/ApiEventService", () => ({
  default: { getEvents: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock("@/services/api/ApiTagsService", () => ({
  default: { getTags: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getTenantRoles: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenantUsers: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock("@/services/permissions/BookablePermissionService", () => ({
  default: { allowCreate: () => true, allowUpdate: () => true },
}));
vi.mock("@/services/api/ApiInstanceService", () => ({
  default: { getBookableCustomFields: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: {
    reviewViewer: vi.fn(() => ({ tenantOwner: true, instanceOwner: false })),
  },
}));

/*
 * Every fixed text of the editing page comes from the catalogue, as the
 * guided flow's do (ECCdigital/tickets#365). Under a pseudo locale that marks
 * each catalogue text, a text built into a component reads unmarked. The
 * bookable carries no text of its own, so whatever reads is the page's.
 *
 * The shared components of other areas the page embeds - media and their
 * lists, the address lookup, the editor of custom fields - stand aside, as
 * in the other specs of the page: their copy is theirs, not the bookable's.
 */

const time = { startTime: "08:00", endTime: "18:00" };

/** A stored bookable without a word of its own; `overrides` set the rest. */
const bookable = (overrides = {}) =>
  storedBookable({
    id: "42",
    title: "",
    amount: 4,
    requiredFields: ["address", "zipCode", "city"],
    ...overrides,
  });

/** The editing page at `tab`, with the status band, overview and SaveBar. */
async function mountTab(tab, overrides) {
  const wrapper = await mountBookableEdit({
    query: { id: "42", tab },
    bookable: bookable(overrides),
    stubs: {
      BookableEditStatus: false,
      BookableFlowSummary: false,
      SaveBar: false,
      MediaAttachmentList: stub("MediaAttachmentList"),
    },
  });
  await flushPromises();
  return wrapper;
}

/** Each tab, and the sections a tab shows only for some data. */
const TAB_CASES = [
  ["general", {}],
  ["pricing", {}],
  [
    "pricing",
    {
      priceType: "per-day",
      priceCategories: [{ priceEur: 10, interval: { start: null, end: null } }],
    },
  ],
  [
    "pricing",
    {
      priceCategories: [
        { priceEur: 10, interval: { start: 0, end: 2 }, fixedPrice: false },
        { priceEur: 8, interval: { start: 2, end: null }, fixedPrice: false },
      ],
    },
  ],
  [
    "bookingType",
    {
      isScheduleRelated: true,
      isLeadTimeRelated: true,
      preparationLeadTimeMinutes: 90,
      serviceHours: [{ weekdays: [1], ...time }],
      isBufferRelated: true,
      bufferTimeBeforeMinutes: 15,
    },
  ],
  [
    "bookingType",
    {
      isScheduleRelated: false,
      isTimePeriodRelated: true,
      timePeriods: [{ weekdays: [1, 2], ...time }, { weekdays: [] }],
    },
  ],
  [
    "bookingType",
    {
      isScheduleRelated: false,
      isBlockPeriodRelated: true,
      blockPeriods: [
        { id: "p1", label: "", startWeekday: 5, endWeekday: 1, ...time },
      ],
    },
  ],
  ["bookingType", { isScheduleRelated: false, blockPeriods: [] }],
  [
    "openingHours",
    {
      isOpeningHoursRelated: true,
      openingHours: [{ weekdays: [1], ...time }],
      isSpecialOpeningHoursRelated: true,
      specialOpeningHours: [{ date: "2026-12-24", ...time }],
    },
  ],
  ["openingHours", { isScheduleRelated: false }],
  ["accessLocks", {}],
  ["relatedBookables", {}],
  ["permissions", {}],
  ["attachments", {}],
  ["customFields", {}],
  ["additional", {}],
];

describe("BookableEdit - every fixed text from the catalogue", () => {
  beforeEach(() => {
    setViewportWidth(1264);
    usePseudoLocale();
  });

  afterEach(() => {
    restoreLocale();
    resetViewportWidth();
  });

  it.each(TAB_CASES)(
    "reads no built-in text at the tab „%s“",
    async (tab, overrides) => {
      const wrapper = await mountTab(tab, overrides);

      expect(find(wrapper, "flow-summary").exists()).toBe(true);
      expect(unmarkedTexts(wrapper.element)).toEqual([]);
    }
  );

  it("reads no built-in text at the settings of ParkraumService", async () => {
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [{ id: "ap1", provider: "ifbs", type: "locker", externalId: "7" }],
    });
    const wrapper = await mountTab("accessLocks", {
      accessPointDetails: { active: true, accessPointIds: ["ap1"] },
      externalProviders: [
        { provider: "ifbs", active: true, handles: ["availability"] },
      ],
    });

    expect(find(wrapper, "stub-MediaAttachmentList").exists()).toBe(false);
    expect(wrapper.find("#be-section-pricing-external").exists()).toBe(true);
    // The provider's own name is the access point's data.
    expect(unmarkedTexts(wrapper.element).filter((t) => t !== "ifbs")).toEqual(
      []
    );
  });

  it("reads no built-in text at chosen Zusatzobjekte and Kinderobjekte", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [
        { id: "2", title: "2", type: "room" },
        { id: "3", title: "3", type: "resource" },
      ],
    });
    const wrapper = await mountTab("relatedBookables", {
      checkoutBookableIds: [{ bookableId: "2", mandatory: false }],
      relatedBookableIds: ["3"],
    });

    expect(unmarkedTexts(wrapper.element)).toEqual([]);
  });

  it("reads no built-in text at „Felder definieren“", async () => {
    const wrapper = await mountBookableEdit({
      query: {
        id: "42",
        tab: "customFields",
        section: "customFields-definitions",
      },
      bookable: bookable(),
      stubs: { SaveBar: false, CustomFieldList: stub("CustomFieldList") },
    });
    await flushPromises();

    expect(find(wrapper, "stub-CustomFieldList").exists()).toBe(true);
    expect(unmarkedTexts(wrapper.element)).toEqual([]);
  });

  it("reads no built-in text in a step of the guided flow", async () => {
    const wrapper = await mountBookableEdit({
      query: { id: "42", mode: "flow" },
      bookable: bookable(),
      stubs: { BookableFlowSummary: false },
    });

    for (const step of FLOW_STEPS) {
      await find(wrapper, `flow-dot-${step}`).trigger("click");
      await flushPromises();
      expect([step, ...unmarkedTexts(wrapper.element)]).toEqual([step]);
    }
  });

  it("reads no built-in text in the SaveBar with unsaved changes", async () => {
    const wrapper = await mountTab("general");

    await find(wrapper, "flow-title").setValue("1");
    await flushPromises();

    expect(unmarkedTexts(wrapper.element).filter((t) => t !== "1")).toEqual([]);
  });
});

/*
 * The words the unification retired (ECCdigital/tickets#348, the glossary's
 * „nicht verwenden“) read nowhere in either mode. „Zugangspunkt“, „Rabattcodes“
 * and „Freigabe durch den Betreiber“ (the decision on the Prüfstatus) stay.
 */
const RETIRED = [
  /\bZugang\b/,
  /\bRabatte?\b/,
  /\bPreisrabatt/,
  /\bBenutzer/,
  /\bFreigabe\b(?! durch)/,
  /\bEditor\b/,
  /(?<!geführte[nmr]? )\bAblauf\b/i,
  /Zur Übersicht/,
  /Gutschein/,
  /Anmeldepflicht/,
  /Angemeldete Nutzer/,
  /\bÖffentlich\b/,
  /\bStorno\b/,
  /Pflichtangaben/,
  /Zusatzoption/,
  /Dokumente & Einwilligungen/,
  /Hinweise zur Buchung/,
  /Buchungstyp/,
  /Verfügbare Anzahl/,
  /Max\. Anzahl/,
  /Pauschalpreis/,
  /Staffelpreis/,
  /Feste Zeiten\b/,
  /Wochenbuchung/,
  /Monatsbuchung/,
  /Zeitunabhängig/,
  /Manuell prüfen/,
];

const retiredIn = (text) =>
  RETIRED.filter((word) => word.test(text)).map((word) => word.source);

/** A bookable that uses every area, so each shows its copy. */
const everyArea = {
  checkoutBookableIds: [{ bookableId: "2", mandatory: true }],
  relatedBookableIds: ["3"],
  groupBooking: { enabled: true, permittedRoles: [] },
  cancellationPolicy: { userCancellable: false },
  attachments: [{ id: "a1", type: "agreement", title: "AGB" }],
  requiredFields: ["phone"],
  bookingNotes: "<p>Schlüssel abholen</p>",
  accessPointDetails: { active: true, accessPointIds: ["ap1"] },
  bookingDiscounts: { roles: [{ roleId: "r1", discount: 10 }], users: [] },
  enableCoupons: false,
  autoCommitBooking: false,
};

describe("BookableEdit - no retired word in either mode", () => {
  beforeEach(() => setViewportWidth(1264));
  afterEach(() => resetViewportWidth());

  it.each(TAB_CASES)("reads none at the tab „%s“", async (tab, overrides) => {
    const wrapper = await mountTab(tab, { ...everyArea, ...overrides });

    expect(retiredIn(wrapper.text())).toEqual([]);
  });

  it("reads none in a step of the guided flow", async () => {
    const wrapper = await mountBookableEdit({
      query: { id: "42", mode: "flow" },
      bookable: bookable(everyArea),
      stubs: {
        BookableFlowSummary: false,
        MediaAttachmentList: stub("MediaAttachmentList"),
      },
    });

    for (const step of FLOW_STEPS) {
      await find(wrapper, `flow-dot-${step}`).trigger("click");
      await flushPromises();
      expect([step, ...retiredIn(wrapper.text())]).toEqual([step]);
    }
  });

  it("reads none on the confirmation", async () => {
    ApiBookablesService.createOrUpdateBookable.mockImplementation(
      async (saved) => ({ data: saved })
    );
    const wrapper = await mountBookableEdit({
      query: { id: "42", mode: "flow" },
      bookable: bookable({
        ...everyArea,
        title: "1",
        isBookable: true,
        isPublic: true,
      }),
      stubs: { TenantReadinessCheck: stub("TenantReadinessCheck") },
    });
    await find(
      wrapper,
      `flow-dot-${FLOW_STEPS[FLOW_STEPS.length - 1]}`
    ).trigger("click");
    await find(wrapper, "flow-save").trigger("click");
    await flushPromises();

    expect(find(wrapper, "flow-done-leave").exists()).toBe(true);
    expect(retiredIn(wrapper.text())).toEqual([]);
  });
});
