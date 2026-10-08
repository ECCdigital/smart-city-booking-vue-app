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
