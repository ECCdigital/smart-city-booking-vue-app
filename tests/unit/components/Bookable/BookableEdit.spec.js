import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@tests/unit/support/api";
import {
  editTab as tab,
  find,
  mountBookableEdit,
  showsUnsavedChanges as unsaved,
  storedBookable as stored,
} from "@tests/unit/support/bookableEdit";

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

import ApiBookablesService from "@/services/api/ApiBookablesService";

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

    for (const label of ["Buchungstyp", "Berechtigungen", "Öffnungszeiten"]) {
      await tab(wrapper, label).trigger("click");
      await flushPromises();
    }

    expect(unsaved(wrapper)).toBe(false);
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
    expect(wrapper.find("#be-section-general-info").exists()).toBe(true);
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
    expect(wrapper.find("#be-section-general-info").exists()).toBe(true);
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

    await wrapper.find(".max-amount-per-booking input").setValue("2");
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

    await find(wrapper, "flow-dot-approval").trigger("click");
    await save(wrapper, "flow-save-only");

    expect(ApiBookablesService.createOrUpdateBookable).not.toHaveBeenCalled();
    expect(find(wrapper, "flow-title-heading").text()).toBe("Identität");
    expect(wrapper.text()).toContain(TITLE_MESSAGE);
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
