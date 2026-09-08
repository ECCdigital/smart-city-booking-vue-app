import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));
vi.mock("@/services/api/ApiEventService", () => ({
  default: { getEvents: vi.fn() },
}));
vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));

const NOTICE = "Titel der verknüpften Buchungsobjekte nicht abrufbar";

/**
 * The title map lives in a module-level cache, so every case loads a fresh
 * copy of the module - otherwise the first case's answer would decide the
 * rest. `titles` is what `getBookables` does: an array resolves, an error
 * rejects.
 */
async function mountOverview(bookable, titles) {
  vi.resetModules();

  const ApiBookablesService = (
    await import("@/services/api/ApiBookablesService")
  ).default;
  if (titles instanceof Error) {
    ApiBookablesService.getBookables.mockRejectedValue(titles);
  } else {
    ApiBookablesService.getBookables.mockResolvedValue({ data: titles });
  }
  const ApiEventService = (await import("@/services/api/ApiEventService"))
    .default;
  ApiEventService.getEvents.mockResolvedValue({ data: [] });

  const component = (
    await import("@/components/Bookable/Edit/BookableEditOverview.vue")
  ).default;
  const wrapper = mountComponent(component, {
    propsData: { bookable, variant: "sidebar" },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * The overview names related bookables by title, resolved through a shared
 * title map. A denied map used to be indistinguishable from an empty one, and
 * the overview quietly printed raw ids instead of titles. It says so now - but
 * only where the missing titles would actually have named something.
 */
describe("BookableEditOverview", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("says the titles are not readable when the list was denied", async () => {
    const wrapper = await mountOverview(
      { id: "b1", relatedBookableIds: ["b2"] },
      forbiddenError()
    );
    expect(wrapper.text()).toContain(NOTICE);
  });

  it("stays quiet when there is no related bookable to name", async () => {
    const wrapper = await mountOverview(
      { id: "b1", relatedBookableIds: [], checkoutBookableIds: [] },
      forbiddenError()
    );
    expect(wrapper.text()).not.toContain(NOTICE);
  });

  it("stays quiet when the titles were readable", async () => {
    const wrapper = await mountOverview(
      { id: "b1", relatedBookableIds: ["b2"] },
      [{ id: "b2", title: "Second room" }]
    );
    expect(wrapper.text()).not.toContain(NOTICE);
    expect(wrapper.text()).toContain("Second room");
  });
});
