import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@tests/unit/support/api";
import {
  resetViewportWidth,
  setViewportWidth,
} from "@tests/unit/support/viewport";
import {
  editTab as tab,
  find,
  mountBookableEdit,
  stub,
  showsUnsavedChanges as unsaved,
  storedBookable as stored,
} from "@tests/unit/support/bookableEdit";
import { IFBS_LOCKER, takenOverBy } from "@tests/unit/support/parkraumService";

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

import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import { FLOW_STEPS } from "@/utils/bookableFlow";

// The flow's last step, whatever steps come before it.
const lastStep = FLOW_STEPS[FLOW_STEPS.length - 1];

const mountEdit = (query, bookable) => mountBookableEdit({ query, bookable });

describe("BookableEdit - loading", () => {
  // Stored as the backend has it, but not as the editor works on it.
  const unnormalized = () =>
    stored({
      amount: 0,
      requiresLogin: false,
      permittedRoles: ["r1"],
      cancellationPolicy: null,
      blockPeriods: [{ label: "Wochenende" }],
    });

  beforeEach(() => {
    ApiBookablesService.getBookable.mockReset();
    ApiBookablesService.createOrUpdateBookable.mockReset();
  });

  it("shows a freshly loaded bookable without unsaved changes", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "pricing" },
      unnormalized()
    );

    expect(unsaved(wrapper)).toBe(false);
  });

  it("changes nothing when a tab opens", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "pricing" },
      unnormalized()
    );

    for (const label of ["Buchungsart", "Berechtigungen", "Öffnungszeiten"]) {
      await tab(wrapper, label).trigger("click");
      await flushPromises();
    }

    expect(unsaved(wrapper)).toBe(false);
  });

  it("shows an Anzahl of 0 as „Unbegrenzt“ in the card „Anzahl“", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "pricing" },
      unnormalized()
    );

    expect(
      find(wrapper, "flow-amount-mode-unlimited").attributes("aria-checked")
    ).toBe("true");
  });

  it("saves the bookable as the editor normalized it", async () => {
    ApiBookablesService.createOrUpdateBookable.mockImplementation(
      async (bookable) => ({ data: { ...unnormalized(), ...bookable } })
    );
    const wrapper = await mountEdit(
      { id: "b1", tab: "pricing" },
      unnormalized()
    );

    await find(wrapper, "save").trigger("click");
    await flushPromises();

    const [saved] = ApiBookablesService.createOrUpdateBookable.mock.calls[0];
    expect(saved).toMatchObject({
      amount: null,
      requiresLogin: true,
      cancellationPolicy: { userCancellable: true },
    });
    expect(saved.blockPeriods[0].id).toEqual(expect.any(String));
    expect(unsaved(wrapper)).toBe(false);
  });
});

describe("BookableEdit - the areas without a step", () => {
  /** The links below the open tab in the navigation, in order. */
  const subNav = (wrapper) =>
    wrapper
      .findAll(".bookable-edit-nav__section")
      .wrappers.map((link) => link.text());
  const cardTitles = (wrapper) =>
    wrapper
      .findAll(".page-content__editor .section-card .section-header")
      .wrappers.map((title) => title.text());

  it("frames the areas of a tab as cards, named as in its navigation", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "relatedBookables" });

    expect(cardTitles(wrapper)).toEqual(["Zusatzobjekte", "Hierarchie"]);
    expect(subNav(wrapper)).toEqual(["Zusatzobjekte", "Hierarchie"]);
  });

  it("names Serienbuchung and Stornierung in Berechtigungen the same way", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "permissions" });

    expect(subNav(wrapper).slice(-2)).toEqual(["Serienbuchung", "Stornierung"]);
    expect(cardTitles(wrapper).slice(-2)).toEqual([
      "Serienbuchung",
      "Stornierung",
    ]);
  });

  it.each([
    [
      "bookingType",
      {
        isLeadTimeRelated: true,
        isBufferRelated: true,
        bufferTimeAfterMinutes: 30,
      },
    ],
    ["bookingType", { isScheduleRelated: false, isTimePeriodRelated: true }],
    ["bookingType", { isScheduleRelated: false, isBlockPeriodRelated: true }],
    ["openingHours", {}],
  ])(
    "names each section of the tab „%s“ in its navigation as its card",
    async (tabKey, overrides) => {
      const wrapper = await mountEdit(
        { id: "b1", tab: tabKey },
        stored(overrides)
      );

      const titles = wrapper
        .findAll(".page-content__editor .section-header .text-h6")
        .wrappers.map((title) => title.text());
      expect(subNav(wrapper)).toEqual(titles);
    }
  );

  it("changes nothing when the tabs of areas open", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "general" },
      stored({
        isScheduleRelated: false,
        isBlockPeriodRelated: true,
        blockPeriods: [{ id: "p1", label: "Wochenende" }],
        groupBooking: { enabled: true, permittedRoles: [] },
        cancellationPolicy: null,
      })
    );

    for (const label of [
      "Schließsysteme",
      "Abhängigkeiten",
      "Berechtigungen",
      "Anhänge",
      "Eigene Felder",
      "Sonstiges",
    ]) {
      await tab(wrapper, label).trigger("click");
      await flushPromises();
    }

    expect(unsaved(wrapper)).toBe(false);
  });

  it("hands a change of an area to the bookable it saves", async () => {
    ApiBookablesService.createOrUpdateBookable.mockImplementation(
      async (bookable) => ({ data: bookable })
    );
    const wrapper = await mountEdit({ id: "b1", tab: "permissions" });

    await wrapper
      .find("#be-section-permissions-cancellation input")
      .trigger("click");
    expect(unsaved(wrapper)).toBe(true);
    // The stub's button takes SaveBar's `disabled` as its own; the bar
    // itself is SaveBar's spec.
    wrapper.findComponent({ name: "SaveBar" }).vm.$emit("submit");
    await flushPromises();

    const [saved] =
      ApiBookablesService.createOrUpdateBookable.mock.calls.at(-1);
    expect(saved.cancellationPolicy).toEqual({ userCancellable: false });
  });
});

describe("BookableEdit - the price in both modes", () => {
  const cardTitles = (wrapper) =>
    wrapper
      .findAll(".page-content__editor .section-card .section-header")
      .wrappers.map((title) => title.text());
  const paid = () =>
    stored({
      priceType: "per-hour",
      priceCategories: [
        {
          priceEur: 20,
          interval: { start: null, end: null },
          fixedPrice: true,
          holidays: [],
          weekdays: [],
        },
      ],
    });

  it("frames Preis and Anzahl as cards of „Preise & Kapazität“", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "pricing" }, paid());

    expect(cardTitles(wrapper)).toEqual(["Preis", "Anzahl"]);
    expect(find(wrapper, "flow-price-fixed").text()).toContain(
      "Tagespauschale"
    );
  });

  it("jumps from the note of external prices to Schließsysteme", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [IFBS_LOCKER],
    });
    const wrapper = await mountEdit(
      { id: "b1", tab: "pricing" },
      stored(takenOverBy(["pricing"]))
    );

    await find(wrapper, "flow-price-external-link").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query).toMatchObject({
      tab: "accessLocks",
      section: "pricing-external",
    });
  });

  it("jumps from the note in the step „Preis“ to Schließsysteme in „Weitere Einstellungen“", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [IFBS_LOCKER],
    });
    const wrapper = await mountEdit(
      { id: "b1", mode: "flow" },
      stored(takenOverBy(["pricing"]))
    );

    await find(wrapper, "flow-dot-price").trigger("click");
    await find(wrapper, "flow-price-external-link").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query.mode).toBe("flow");
    expect(find(wrapper, "flow-title-heading").text()).toBe(
      "Weitere Einstellungen"
    );
    expect(
      find(wrapper, "more-area-accessLocks-toggle").attributes("aria-expanded")
    ).toBe("true");
  });

  it("asks for Anzahl and Höchstmenge in the card „Anzahl“ and the step „Anzahl & Kapazität“", async () => {
    const page = await mountEdit(
      { id: "b1", tab: "pricing" },
      stored({ amount: 10, maxAmountPerBooking: 2 })
    );
    const flow = await mountEdit(
      { id: "b1", mode: "flow" },
      stored({ amount: 10, maxAmountPerBooking: 2 })
    );
    await find(flow, "flow-dot-amount").trigger("click");
    await flushPromises();

    for (const wrapper of [page, flow]) {
      expect(find(wrapper, "flow-amount-input").element.value).toBe("10");
      expect(find(wrapper, "flow-max-amount-input").element.value).toBe("2");
    }
  });

  it("jumps from the note of an external Anzahl to Schließsysteme", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [IFBS_LOCKER],
    });
    const wrapper = await mountEdit(
      { id: "b1", tab: "pricing" },
      stored(takenOverBy(["maxAmount"]))
    );

    await find(wrapper, "flow-amount-external-link").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query).toMatchObject({
      tab: "accessLocks",
      section: "pricing-external",
    });
  });

  it("asks the same questions in the step „Preis“", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "pricing", mode: "flow" },
      paid()
    );

    await find(wrapper, "flow-dot-price").trigger("click");
    await flushPromises();

    expect(find(wrapper, "flow-price-type-per-hour").exists()).toBe(true);
    expect(find(wrapper, "flow-price-fixed").text()).toContain(
      "Tagespauschale"
    );
  });
});

describe("BookableEdit - Grunddaten", () => {
  const subNav = (wrapper) =>
    wrapper
      .findAll(".bookable-edit-nav__section")
      .wrappers.map((link) => link.text());
  const cardTitles = (wrapper) =>
    wrapper
      .findAll(".page-content__editor .section-card .section-header")
      .wrappers.map((title) => title.text());

  it("frames the Grunddaten as one card, its two groups in the navigation", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "general" });

    expect(cardTitles(wrapper)).toEqual(["Grunddaten"]);
    expect(subNav(wrapper)).toEqual([
      "Das sehen Buchende im Katalog",
      "Nur für die Verwaltung",
    ]);
    expect(wrapper.find("#be-section-general-catalog").exists()).toBe(true);
    expect(wrapper.find("#be-section-general-admin").exists()).toBe(true);
    expect(unsaved(wrapper)).toBe(false);
  });

  it("shows the same Grunddaten in the guided flow", async () => {
    const wrapper = await mountEdit({ id: "b1", mode: "flow" });

    expect(find(wrapper, "basics-catalog").exists()).toBe(true);
    expect(find(wrapper, "basics-admin").text()).toContain(
      "Wird beim Anlegen festgelegt."
    );
  });

  it("keeps a title typed on the editing page in the guided flow", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "general" });

    await find(wrapper, "flow-title").find("input").setValue("Aula");
    await find(wrapper, "flow-enter").trigger("click");
    await flushPromises();

    expect(find(wrapper, "flow-title").find("input").element.value).toBe(
      "Aula"
    );
    expect(unsaved(wrapper)).toBe(true);
  });
});

describe("BookableEdit - the Buchungsart", () => {
  const external = () =>
    stored({ isScheduleRelated: true, ...takenOverBy(["availability"]) });
  const cardTitles = (wrapper) =>
    wrapper
      .findAll(".page-content__editor .section-card .section-header")
      .wrappers.map((title) => title.text());

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [IFBS_LOCKER],
    });
  });

  it("asks the questions of the guided flow in the card „Buchungsart“ of its tab", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "bookingType" });

    expect(tab(wrapper, "Buchungsart")).toBeTruthy();
    expect(tab(wrapper, "Buchungstyp")).toBeUndefined();
    expect(cardTitles(wrapper)[0]).toBe("Buchungsart");
    expect(find(wrapper, "booking-mode-time").exists()).toBe(true);
    expect(wrapper.find("input[type='radio']").exists()).toBe(false);
    expect(find(wrapper, "booking-duration-min").exists()).toBe(true);
  });

  it("hands an answer on and shows the sections of the chosen mode", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "bookingType" });

    await find(wrapper, "booking-mode-time-timePeriod").trigger("click");

    expect(find(wrapper, "time-periods-add").exists()).toBe(true);
    expect(find(wrapper, "booking-duration-min").exists()).toBe(false);
    expect(unsaved(wrapper)).toBe(true);
  });

  it("jumps from the note of an external availability to the provider's setting", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "bookingType" },
      external()
    );

    expect(find(wrapper, "booking-mode-timed").exists()).toBe(false);
    expect(find(wrapper, "booking-duration-min").exists()).toBe(false);
    await find(wrapper, "booking-mode-external-link").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query).toMatchObject({
      tab: "accessLocks",
      section: "pricing-external",
    });
  });

  it("jumps there from the guided flow too, to Schließsysteme in „Weitere Einstellungen“", async () => {
    const wrapper = await mountEdit({ id: "b1", mode: "flow" }, external());

    await find(wrapper, "flow-dot-availability").trigger("click");
    await find(wrapper, "booking-mode-external-link").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query.mode).toBe("flow");
    expect(find(wrapper, "flow-title-heading").text()).toBe(
      "Weitere Einstellungen"
    );
    expect(
      find(wrapper, "more-area-accessLocks-toggle").attributes("aria-expanded")
    ).toBe("true");
  });
});

describe("BookableEdit - Wer darf buchen?", () => {
  const subNav = (wrapper) =>
    wrapper
      .findAll(".bookable-edit-nav__section")
      .wrappers.map((link) => link.text());
  const cardTitles = (wrapper) =>
    wrapper
      .findAll(".page-content__editor .section-card .section-header")
      .wrappers.map((title) => title.text());

  beforeEach(() => {
    ApiBookablesService.createOrUpdateBookable.mockReset();
    ApiBookablesService.createOrUpdateBookable.mockImplementation(
      async (bookable) => ({ data: bookable })
    );
  });

  it("frames the step's component as the first card of Berechtigungen", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "permissions" });

    expect(cardTitles(wrapper)[0]).toBe("Berechtigung");
    expect(subNav(wrapper)).toEqual([
      "Berechtigung",
      "Preisnachlass",
      "Bestätigung",
      "Serienbuchung",
      "Stornierung",
    ]);
    expect(
      wrapper
        .find("#be-section-permissions-access")
        .find("[data-test='permission']")
        .exists()
    ).toBe(true);
    expect(wrapper.text()).not.toContain("Anmeldepflicht");
    expect(wrapper.text()).not.toContain("Individuelle Berechtigungen");
  });

  it("saves the login with the lists the editing page shows as „Nur ausgewählte“", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "permissions" },
      stored({ requiresLogin: false, permittedUsers: ["u1"] })
    );

    expect(find(wrapper, "access-selected").attributes("aria-checked")).toBe(
      "true"
    );

    await find(wrapper, "save").trigger("click");
    await flushPromises();

    const [saved] =
      ApiBookablesService.createOrUpdateBookable.mock.calls.at(-1);
    expect(saved).toMatchObject({
      requiresLogin: true,
      permittedUsers: ["u1"],
    });
  });
});

describe("BookableEdit - Bestätigung", () => {
  const cardTitles = (wrapper) =>
    wrapper
      .findAll(".page-content__editor .section-card .section-header")
      .wrappers.map((title) => title.text());
  const sent = () =>
    ApiBookablesService.createOrUpdateBookable.mock.calls.at(-1)[0];

  beforeEach(() => {
    ApiBookablesService.createOrUpdateBookable.mockReset();
    ApiBookablesService.createOrUpdateBookable.mockImplementation(
      async (bookable) => ({ data: bookable })
    );
  });

  it("frames the component as the card after „Wer darf buchen?“ in Berechtigungen", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "permissions" });

    expect(cardTitles(wrapper).slice(0, 2)).toEqual([
      "Berechtigung",
      "Bestätigung",
    ]);
    expect(
      wrapper
        .find("#be-section-permissions-confirmation")
        .find("[data-test='confirmation']")
        .exists()
    ).toBe(true);
  });

  it("saves the choice of the card", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "permissions" },
      stored({ autoCommitBooking: false })
    );

    await find(wrapper, "confirmation-auto").trigger("click");
    expect(unsaved(wrapper)).toBe(true);
    await find(wrapper, "save").trigger("click");
    await flushPromises();

    expect(sent()).toMatchObject({ autoCommitBooking: true });
  });

  it("asks the same in the guided flow's step Bestätigung", async () => {
    const wrapper = await mountEdit(
      { id: "b1", mode: "flow" },
      stored({ autoCommitBooking: true })
    );

    await find(wrapper, "flow-dot-approval").trigger("click");

    expect(find(wrapper, "flow-title-heading").text()).toBe("Bestätigung");
    expect(find(wrapper, "confirmation-auto").attributes("aria-checked")).toBe(
      "true"
    );
  });

  it("leaves the status band to the publication", async () => {
    const wrapper = await mountBookableEdit({
      query: { id: "b1" },
      bookable: stored({ autoCommitBooking: false }),
      stubs: { BookableEditStatus: false },
    });

    expect(find(wrapper, "publication").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Manuelle Freigabe");
    expect(find(wrapper, "confirmation").exists()).toBe(false);
  });
});

describe("BookableEdit - switching between the modes", () => {
  it("keeps what was typed on the editing page in the guided flow", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "pricing" });

    const amount = wrapper
      .findAll("input")
      .wrappers.find((input) => input.element.value === "4");
    await amount.setValue("7");
    await find(wrapper, "flow-enter").trigger("click");
    await flushPromises();
    await find(wrapper, "flow-dot-amount").trigger("click");

    expect(find(wrapper, "flow-amount-input").element.value).toBe("7");
    expect(unsaved(wrapper)).toBe(true);
  });

  it("keeps what was chosen in the guided flow on the editing page", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "pricing", mode: "flow" });

    await find(wrapper, "flow-dot-amount").trigger("click");
    await find(wrapper, "flow-amount-more").trigger("click");
    await find(wrapper, "flow-leave").trigger("click");
    await flushPromises();

    const values = wrapper
      .findAll("input")
      .wrappers.map((input) => input.element.value);
    expect(values).toContain("5");
    expect(unsaved(wrapper)).toBe(true);
  });

  it("names the other mode on the buttons between them", async () => {
    const wrapper = await mountEdit({ id: "b1" });

    expect(find(wrapper, "flow-enter").text()).toBe("Zum geführten Ablauf");
    await find(wrapper, "flow-enter").trigger("click");
    await flushPromises();

    expect(find(wrapper, "flow-leave").text()).toBe("Zur Bearbeitungsseite");
  });

  it("says at the flow's save that inputs survive the switch, not leaving the bookable", async () => {
    const wrapper = await mountEdit({ id: "b1", mode: "flow" });

    await find(wrapper, `flow-dot-${lastStep}`).trigger("click");

    expect(find(wrapper, "flow-save-hint").text()).toBe(
      "Gespeichert wird erst hier. Ihre Eingaben bleiben erhalten, wenn Sie " +
        "zur Bearbeitungsseite wechseln, und gehen erst verloren, wenn Sie " +
        "das Buchungsobjekt verlassen."
    );
  });

  it("says at the save of a new bookable only that leaving it loses the inputs", async () => {
    ApiBookablesService.getBookableTemplate.mockResolvedValue({
      data: stored({ id: undefined }),
    });
    const wrapper = await mountBookableEdit({ query: {} });

    await find(wrapper, `flow-dot-${lastStep}`).trigger("click");

    expect(find(wrapper, "flow-save-hint").text()).toBe(
      "Gespeichert wird erst hier. Wer das Buchungsobjekt vorher verlässt, " +
        "verliert die Eingaben."
    );
  });

  it("leads from the confirmation „Zur Bearbeitungsseite“ to the editing page", async () => {
    ApiBookablesService.createOrUpdateBookable.mockImplementation(
      async (bookable) => ({ data: bookable })
    );
    const wrapper = await mountBookableEdit({
      query: { id: "b1", mode: "flow" },
      stubs: { TenantReadinessCheck: stub("TenantReadinessCheck") },
    });
    await find(wrapper, `flow-dot-${lastStep}`).trigger("click");
    await find(wrapper, "flow-save").trigger("click");
    await flushPromises();

    const leave = find(wrapper, "flow-done-leave");
    expect(leave.text()).toBe("Zur Bearbeitungsseite");
    await leave.trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query.mode).toBeUndefined();
    expect(find(wrapper, "flow-enter").exists()).toBe(true);
  });
});

describe("BookableEdit - ParkraumService takes over a field", () => {
  // ParkraumService handles the prices; `locker` assigns its locker system.
  const taken = ({ locker = true } = {}) =>
    stored({
      ...takenOverBy(["pricing"]),
      ...(locker ? {} : { accessPointDetails: null }),
    });

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    ApiAccessPointService.getAccessPoints.mockResolvedValue({
      data: [IFBS_LOCKER],
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  const withoutExpertMode = () => {
    vi.stubEnv("VUE_APP_BOOKABLE_EXPERT_MODE_DEFAULT", "false");
    sessionStorage.clear();
  };

  it("keeps the price editable while no locker system of the provider is assigned", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "pricing" },
      taken({ locker: false })
    );

    expect(find(wrapper, "flow-price-external").exists()).toBe(false);
    expect(find(wrapper, "flow-price-mode-simple").exists()).toBe(true);
  });

  it("shows Schließsysteme without expert mode while the provider is on", async () => {
    withoutExpertMode();
    const wrapper = await mountEdit({ id: "b1" }, taken({ locker: false }));

    expect(tab(wrapper, "Schließsysteme")).toBeDefined();
  });

  it("lands on the provider's setting from the note, without expert mode", async () => {
    withoutExpertMode();
    const wrapper = await mountEdit({ id: "b1", tab: "pricing" }, taken());

    await find(wrapper, "flow-price-external-link").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query).toMatchObject({
      tab: "accessLocks",
      section: "pricing-external",
    });
    expect(wrapper.find("#be-section-pricing-external").exists()).toBe(true);
  });

  it("lands on the provider's setting from the step „Preis“, without expert mode", async () => {
    withoutExpertMode();
    const wrapper = await mountEdit({ id: "b1", mode: "flow" }, taken());

    await find(wrapper, "flow-dot-price").trigger("click");
    await find(wrapper, "flow-price-external-link").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query.mode).toBe("flow");
    expect(
      find(wrapper, "more-area-accessLocks-toggle").attributes("aria-expanded")
    ).toBe("true");
    expect(wrapper.find("#be-section-pricing-external").exists()).toBe(true);
  });

  it("reads the tenant's access points once for the whole page", async () => {
    ApiAccessPointService.getAccessPoints.mockClear();
    await mountEdit({ id: "b1", tab: "accessLocks" }, taken());

    expect(ApiAccessPointService.getAccessPoints).toHaveBeenCalledTimes(1);
    expect(ApiAccessPointService.getAccessPoints).toHaveBeenCalledWith("t1");
  });

  it("checks the prices on save while no locker system is assigned", async () => {
    ApiBookablesService.createOrUpdateBookable.mockReset();
    const wrapper = await mountEdit(
      { id: "b1", tab: "general" },
      stored({
        ...takenOverBy(["pricing"]),
        accessPointDetails: null,
        priceCategories: [
          {
            priceEur: "",
            interval: { start: null, end: null },
            fixedPrice: false,
            holidays: [],
            weekdays: [],
          },
        ],
      })
    );

    await find(wrapper, "save").trigger("click");
    await flushPromises();

    expect(ApiBookablesService.createOrUpdateBookable).not.toHaveBeenCalled();
    expect(wrapper.vm.$route.query.tab).toBe("pricing");
  });
});

describe("BookableEdit - expert options without expert mode", () => {
  beforeEach(() => {
    vi.stubEnv("VUE_APP_BOOKABLE_EXPERT_MODE_DEFAULT", "false");
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  it("leaves out the tabs of unused expert options", async () => {
    const wrapper = await mountEdit({ id: "b1" }, stored());

    expect(tab(wrapper, "Schließsysteme")).toBeUndefined();
    expect(tab(wrapper, "Abhängigkeiten")).toBeUndefined();
  });

  it("shows the tab of an expert option the bookable uses", async () => {
    const wrapper = await mountEdit(
      { id: "b1" },
      stored({ checkoutBookableIds: ["b2"] })
    );

    expect(tab(wrapper, "Abhängigkeiten")).toBeDefined();
    expect(tab(wrapper, "Schließsysteme")).toBeUndefined();
  });

  it("opens a linked tab of an expert option in use", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "relatedBookables" },
      stored({ relatedBookableIds: ["b3"] })
    );

    expect(wrapper.find("#be-section-related-hierarchy").exists()).toBe(true);
    expect(wrapper.find("#be-section-related-checkout").exists()).toBe(false);
  });

  it("opens the first tab for a linked tab of unused expert options", async () => {
    const wrapper = await mountEdit({ id: "b1", tab: "relatedBookables" });

    expect(wrapper.find("#be-section-related-hierarchy").exists()).toBe(false);
    expect(wrapper.find("#be-section-general-catalog").exists()).toBe(true);
  });

  it("hands the stored bookable to the tabs", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "openingHours" },
      stored({
        isOpeningHoursRelated: true,
        isSpecialOpeningHoursRelated: true,
        specialOpeningHours: [{ date: "2026-12-24", startTime: "08:00" }],
      })
    );

    // Emptied and switched off without saving: the stored bookable still
    // uses them.
    await find(wrapper, "special-opening-hours-remove").trigger("click");
    await find(wrapper, "special-opening-hours-switch")
      .find("input")
      .trigger("click");

    expect(find(wrapper, "special-opening-hours-switch").exists()).toBe(true);
  });
});

describe("BookableEdit - saving with issues", () => {
  const TITLE_MESSAGE = "Bitte einen Titel eingeben.";
  const MAX_AMOUNT_MESSAGE =
    "Bitte eine ganze Zahl ab 1 eingeben oder Unbegrenzt wählen.";

  beforeEach(() => {
    ApiBookablesService.createOrUpdateBookable.mockReset();
    ApiBookablesService.createOrUpdateBookable.mockImplementation(
      async (bookable) => ({ data: bookable })
    );
    // jsdom does not scroll; the way to a section ends in it.
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    delete Element.prototype.scrollIntoView;
  });

  const save = async (wrapper, test = "save") => {
    await find(wrapper, test).trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();
  };

  it("saves nothing and opens the first tab with an issue", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "openingHours" },
      stored({ title: " ", maxAmountPerBooking: 0 })
    );

    await save(wrapper);

    expect(ApiBookablesService.createOrUpdateBookable).not.toHaveBeenCalled();
    expect(wrapper.find("#be-section-general-catalog").exists()).toBe(true);
    expect(wrapper.text()).toContain(TITLE_MESSAGE);
  });

  it("shows every message after a refused save, also in a tab opened later", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "general" },
      stored({ title: "", maxAmountPerBooking: 0 })
    );

    await save(wrapper);
    await tab(wrapper, "Preise & Kapazität").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(MAX_AMOUNT_MESSAGE);
  });

  it("saves once the issue is gone", async () => {
    const wrapper = await mountEdit(
      { id: "b1", tab: "pricing" },
      stored({ maxAmountPerBooking: 0 })
    );

    await save(wrapper);
    expect(ApiBookablesService.createOrUpdateBookable).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(MAX_AMOUNT_MESSAGE);

    await find(wrapper, "flow-max-amount-input").setValue("2");
    await save(wrapper);

    expect(ApiBookablesService.createOrUpdateBookable).toHaveBeenCalledWith(
      expect.objectContaining({ maxAmountPerBooking: 2 })
    );
  });

  it("saves nothing in the guided flow and opens the first step with an issue", async () => {
    const wrapper = await mountEdit(
      { id: "b1", mode: "flow" },
      stored({ title: "" })
    );

    await find(wrapper, `flow-dot-${lastStep}`).trigger("click");
    await save(wrapper, "flow-save");

    expect(ApiBookablesService.createOrUpdateBookable).not.toHaveBeenCalled();
    expect(find(wrapper, "flow-title-heading").text()).toBe("Identität");
    expect(wrapper.text()).toContain(TITLE_MESSAGE);
  });

  it("opens the Schließsysteme in „Weitere Einstellungen“ for an issue there", async () => {
    const wrapper = await mountEdit(
      { id: "b1", mode: "flow" },
      stored({
        accessPointDetails: {
          active: true,
          accessBuffer: { before: -1, after: 0 },
          accessPointIds: [],
        },
      })
    );

    await find(wrapper, `flow-dot-${lastStep}`).trigger("click");
    await save(wrapper, "flow-save");
    await wrapper.vm.$nextTick();

    expect(ApiBookablesService.createOrUpdateBookable).not.toHaveBeenCalled();
    expect(find(wrapper, "flow-title-heading").text()).toBe(
      "Weitere Einstellungen"
    );
    expect(
      find(wrapper, "more-area-accessLocks-toggle").attributes("aria-expanded")
    ).toBe("true");
  });

  it("goes on in the guided flow without a title", async () => {
    const wrapper = await mountEdit(
      { id: "b1", mode: "flow" },
      stored({ title: "" })
    );

    await find(wrapper, "flow-next").trigger("click");

    expect(find(wrapper, "flow-title-heading").text()).toBe("Verfügbarkeit");
  });
});

describe("BookableEdit - publication", () => {
  const COMBINATIONS = [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ];

  beforeEach(() => {
    ApiBookablesService.createOrUpdateBookable.mockReset();
    ApiBookablesService.createOrUpdateBookable.mockImplementation(
      async (bookable) => ({ data: bookable })
    );
  });

  const sent = () =>
    ApiBookablesService.createOrUpdateBookable.mock.calls.slice(-1)[0][0];
  const publicationOf = ({ isBookable, isPublic }) => ({
    isBookable,
    isPublic,
  });

  const saveFlow = async (wrapper) => {
    await find(wrapper, `flow-dot-${lastStep}`).trigger("click");
    await find(wrapper, "flow-save").trigger("click");
    await flushPromises();
  };

  const flip = async (wrapper, test) => {
    await find(wrapper, test).find("input").trigger("click");
    await wrapper.vm.$nextTick();
  };

  it.each(COMBINATIONS)(
    "keeps Buchbar %s and Im Katalog %s through loading and saving the editing page",
    async (isBookable, isPublic) => {
      const wrapper = await mountEdit(
        { id: "b1" },
        stored({ isBookable, isPublic })
      );

      await find(wrapper, "save").trigger("click");
      await flushPromises();

      expect(publicationOf(sent())).toEqual({ isBookable, isPublic });
      expect(unsaved(wrapper)).toBe(false);
    }
  );

  it.each(COMBINATIONS)(
    "keeps Buchbar %s and Im Katalog %s through loading and saving the guided flow",
    async (isBookable, isPublic) => {
      const wrapper = await mountEdit(
        { id: "b1", mode: "flow" },
        stored({ isBookable, isPublic })
      );

      await saveFlow(wrapper);

      expect(publicationOf(sent())).toEqual({ isBookable, isPublic });
      expect(find(wrapper, "flow-done-title").text()).toBe("Gespeichert");
    }
  );

  it("shows the publication in the status band of the editing page", async () => {
    const wrapper = await mountBookableEdit({
      query: { id: "b1" },
      bookable: stored({ isBookable: true, isPublic: false }),
      stubs: { BookableEditStatus: false },
    });

    await flip(wrapper, "publication-public");

    expect(find(wrapper, "publication-effect").text()).toBe(
      "Das Buchungsobjekt steht im Katalog und ist buchbar."
    );
    expect(unsaved(wrapper)).toBe(true);
    await find(wrapper, "save").trigger("click");
    await flushPromises();
    expect(publicationOf(sent())).toEqual({ isBookable: true, isPublic: true });
  });

  it("starts a new bookable with both switches off, whatever the template says", async () => {
    ApiBookablesService.getBookableTemplate.mockResolvedValue({
      data: { tenantId: "t1", isBookable: true, isPublic: true },
    });
    const wrapper = await mountEdit({}, undefined);

    await find(wrapper, `flow-dot-${lastStep}`).trigger("click");

    expect(find(wrapper, "publication-effect").text()).toBe(
      "Das Buchungsobjekt steht nicht im Katalog und ist nicht buchbar."
    );
  });

  it("confirms the publication the switches made, not a button", async () => {
    const wrapper = await mountEdit(
      { id: "b1", mode: "flow" },
      stored({ isBookable: false, isPublic: false })
    );

    await find(wrapper, `flow-dot-${lastStep}`).trigger("click");
    await flip(wrapper, "publication-bookable");
    await flip(wrapper, "publication-public");
    await saveFlow(wrapper);

    expect(publicationOf(sent())).toEqual({ isBookable: true, isPublic: true });
    expect(find(wrapper, "flow-done-title").text()).toBe("Veröffentlicht");
  });

  it("confirms a withdrawn publication as saved, not published", async () => {
    const wrapper = await mountEdit(
      { id: "b1", mode: "flow" },
      stored({ isBookable: true, isPublic: true })
    );

    await find(wrapper, `flow-dot-${lastStep}`).trigger("click");
    await flip(wrapper, "publication-public");
    await saveFlow(wrapper);

    expect(publicationOf(sent())).toEqual({
      isBookable: true,
      isPublic: false,
    });
    expect(find(wrapper, "flow-done-title").text()).toBe(
      "Als Entwurf gespeichert"
    );
  });
});

describe("BookableEdit - the confirmation leads to „Weitere Einstellungen“", () => {
  beforeEach(() => {
    ApiBookablesService.createOrUpdateBookable.mockReset();
    ApiBookablesService.createOrUpdateBookable.mockImplementation(
      async (bookable) => ({ data: bookable })
    );
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    delete Element.prototype.scrollIntoView;
  });

  it("opens the step at the area linked, in the guided flow", async () => {
    const wrapper = await mountBookableEdit({
      query: { id: "b1", mode: "flow" },
      stubs: { TenantReadinessCheck: stub("TenantReadinessCheck") },
    });
    await find(wrapper, `flow-dot-${lastStep}`).trigger("click");
    await find(wrapper, "flow-save").trigger("click");
    await flushPromises();
    expect(find(wrapper, "flow-done").exists()).toBe(true);

    await find(wrapper, "flow-done-area-groupBooking").trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(find(wrapper, "flow-done").exists()).toBe(false);
    expect(wrapper.vm.$route.query.mode).toBe("flow");
    expect(find(wrapper, "flow-title-heading").text()).toBe(
      "Weitere Einstellungen"
    );
    expect(
      find(wrapper, "more-area-groupBooking-toggle").attributes("aria-expanded")
    ).toBe("true");
  });
});

// ECCdigital/tickets#364: one overview beside the form in both modes, each
// row leading to its field.
describe("BookableEdit - the overview", () => {
  let scrolled;

  beforeEach(() => {
    setViewportWidth(1264);
    scrolled = [];
    Element.prototype.scrollIntoView = function () {
      scrolled.push(this);
    };
  });

  afterEach(() => {
    resetViewportWidth();
    delete Element.prototype.scrollIntoView;
  });

  const mountWithOverview = (query, bookable, stubs = {}) =>
    mountBookableEdit({
      query,
      bookable,
      stubs: { BookableFlowSummary: false, ...stubs },
    });
  /** The field last scrolled to, by its anchor. */
  const lastField = () =>
    scrolled
      .map((element) => element.getAttribute("data-field"))
      .filter(Boolean)
      .pop();

  it("stands beside the form of the editing page, as in the flow", async () => {
    const wrapper = await mountWithOverview({ id: "b1" }, stored());

    const overview = find(wrapper, "flow-summary");
    expect(overview.exists()).toBe(true);
    expect(overview.text()).toContain("Wer darf buchen?");
    // No step is current on the editing page, no tab marked.
    expect(overview.find("[aria-current]").exists()).toBe(false);
  });

  it("leads a row to the tab of its field and there to the field", async () => {
    const wrapper = await mountWithOverview({ id: "b1" }, stored());

    await find(wrapper, "overview-row-confirmation").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query).toMatchObject({
      tab: "permissions",
      section: "permissions-confirmation",
    });
    expect(lastField()).toBe("confirmation");
  });

  it("leads a heading to the first field of its block", async () => {
    const wrapper = await mountWithOverview({ id: "b1" }, stored());

    await find(wrapper, "overview-heading-amount").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query.tab).toBe("pricing");
    expect(lastField()).toBe("amount");
  });

  it("leads a row of the Veröffentlichung to the status band", async () => {
    const wrapper = await mountWithOverview(
      { id: "b1", tab: "pricing" },
      stored(),
      { BookableEditStatus: false }
    );

    await find(wrapper, "overview-row-isPublic").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query.tab).toBe("pricing");
    expect(lastField()).toBe("isPublic");
  });

  it("leads „Nicht festgelegt“ of Weitere Einstellungen to the first area's tab", async () => {
    const wrapper = await mountWithOverview(
      { id: "b1" },
      stored({ requiredFields: ["address", "zipCode", "city"] })
    );

    await find(wrapper, "overview-row-more").trigger("click");
    await flushPromises();

    expect(wrapper.vm.$route.query.tab).toBe("accessLocks");
  });

  it("leads a row in the flow to its step and there to the field", async () => {
    const wrapper = await mountWithOverview(
      { id: "b1", mode: "flow" },
      stored()
    );

    await find(wrapper, "overview-row-maxAmountPerBooking").trigger("click");
    await flushPromises();

    expect(find(wrapper, "flow-title-heading").text()).toBe(
      "Anzahl & Kapazität"
    );
    expect(wrapper.vm.$route.query.mode).toBe("flow");
    expect(lastField()).toBe("maxAmountPerBooking");
  });

  it("shows an issue of the check at its row, in both modes", async () => {
    for (const mode of [undefined, "flow"]) {
      const wrapper = await mountWithOverview(
        { id: "b1", mode },
        stored({ title: "" })
      );

      expect(
        find(wrapper, "overview-row-title")
          .find("[data-test='overview-issue']")
          .text()
      ).toBe("Bitte einen Titel eingeben.");
    }
  });

  it("is gone below 1264px, in both modes", async () => {
    setViewportWidth(1263);
    for (const mode of [undefined, "flow"]) {
      const wrapper = await mountWithOverview({ id: "b1", mode }, stored());

      expect(find(wrapper, "flow-summary").exists()).toBe(false);
    }
  });
});
