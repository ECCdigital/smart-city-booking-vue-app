import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import VueRouter from "vue-router";
import { createLocalVue } from "@vue/test-utils";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import Bookable from "@/entities/bookable";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: {
    getBookable: vi.fn(),
    getBookableTemplate: vi.fn(),
    createOrUpdateBookable: vi.fn(),
    getBookablePrices: vi.fn(),
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
import BookableEdit from "@/components/Bookable/BookableEdit.vue";

const localVue = createLocalVue();
localVue.use(VueRouter);

// The frame is under test, not the panels around the field: those with their
// own API calls stand aside.
const stub = (name) => ({
  name,
  render(h) {
    return h("div", { attrs: { "data-test": `stub-${name}` } });
  },
});

const STUBS = {
  BookableEditStatus: stub("BookableEditStatus"),
  BookableEditOverview: stub("BookableEditOverview"),
  BookableFlowSummary: stub("BookableFlowSummary"),
  // The bar's own look is SaveBar's spec; here it only saves.
  SaveBar: {
    name: "SaveBar",
    render(h) {
      return h(
        "button",
        {
          attrs: { "data-test": "save" },
          on: { click: () => this.$emit("submit") },
        },
        "Speichern"
      );
    },
  },
  MediaReferenceList: stub("MediaReferenceList"),
  AddressLookup: stub("AddressLookup"),
  Tiptap: stub("Tiptap"),
};

function store() {
  return new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: {
          currentTenant: () => ({ id: "t1" }),
          currentTenantId: () => "t1",
          currentSupervisionLevel: () => null,
        },
      },
      user: {
        namespaced: true,
        getters: { supervisionLevelOf: () => () => null },
      },
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
}

const stored = (overrides = {}) =>
  new Bookable({
    id: "b1",
    tenantId: "t1",
    title: "Saal",
    amount: 4,
    ...overrides,
  }).toPlain();

async function mountEdit(query, bookable = stored()) {
  ApiBookablesService.getBookable.mockResolvedValue({ data: bookable });
  const router = new VueRouter({
    mode: "abstract",
    routes: [{ path: "/edit", name: "room-edit", component: stub("Page") }],
  });
  await router.push({ path: "/edit", query });
  const wrapper = mountComponent(BookableEdit, {
    localVue,
    router,
    store: store(),
    propsData: { type: "room" },
    stubs: STUBS,
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const tab = (wrapper, label) =>
  wrapper
    .findAll(".bookable-edit-nav__tab")
    .wrappers.find((button) => button.text() === label);
const unsaved = (wrapper) =>
  wrapper.text().includes("Ungespeicherte Änderungen");

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
