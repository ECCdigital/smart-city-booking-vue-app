import Vuex from "vuex";
import VueRouter from "vue-router";
import { createLocalVue } from "@vue/test-utils";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import Bookable from "@/entities/bookable";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import BookableEdit from "@/components/Bookable/BookableEdit.vue";

/*
 * BookableEdit in either mode, for the specs of its frame (loading, saving,
 * switching modes, the way to a field). The spec mocks the API services the
 * mounted tabs and steps call - `ApiBookablesService` with at least
 * `getBookable`, `getBookableTemplate` and `createOrUpdateBookable`; see
 * tests/unit/components/Bookable/BookableEdit.spec.js for the full set.
 */

const localVue = createLocalVue();
localVue.use(VueRouter);

export const stub = (name) => ({
  name,
  render(h) {
    return h("div", { attrs: { "data-test": `stub-${name}` } });
  },
});

// The frame is under test, not the panels around the field: those with their
// own API calls or permission checks stand aside.
export const BOOKABLE_EDIT_STUBS = {
  BookableEditStatus: stub("BookableEditStatus"),
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

export function bookableEditStore() {
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

/** A stored room of tenant t1, as `getBookable` answers it. */
export const storedBookable = (overrides = {}) =>
  new Bookable({
    id: "b1",
    tenantId: "t1",
    title: "Saal",
    amount: 4,
    ...overrides,
  }).toPlain();

/**
 * Mounts BookableEdit on `/edit?…query` with `bookable` as the stored one.
 * `{ id: "b1", mode: "flow" }` opens the guided flow, `{ id: "b1", tab }`
 * a tab of the editing page; without `id` a new bookable is created from
 * `getBookableTemplate`, which the spec answers.
 */
export async function mountBookableEdit({
  query = { id: "b1" },
  bookable = storedBookable(),
  type = "room",
  stubs = {},
} = {}) {
  ApiBookablesService.getBookable.mockResolvedValue({ data: bookable });
  const router = new VueRouter({
    mode: "abstract",
    routes: [{ path: "/edit", name: `${type}-edit`, component: stub("Page") }],
  });
  await router.push({ path: "/edit", query });
  const wrapper = mountComponent(BookableEdit, {
    localVue,
    router,
    store: bookableEditStore(),
    propsData: { type },
    stubs: { ...BOOKABLE_EDIT_STUBS, ...stubs },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

export const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

/** A tab of the editing page's navigation, by its label. */
export const editTab = (wrapper, label) =>
  wrapper
    .findAll(".bookable-edit-nav__tab")
    .wrappers.find((button) => button.text() === label);

/** Whether the hint „Ungespeicherte Änderungen“ shows. */
export const showsUnsavedChanges = (wrapper) =>
  wrapper.text().includes("Ungespeicherte Änderungen");
