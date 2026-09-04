import { describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, forbiddenError } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));

import BookableEditRelatedBookables from "@/components/Bookable/Edit/BookableEditRelatedBookables.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";

const FORBIDDEN_NOTICE =
  "Keine Auswahl möglich – Sie haben keinen Zugriff auf Buchungsobjekte.";

async function mountSection() {
  const wrapper = mountComponent(BookableEditRelatedBookables, {
    propsData: {
      bookable: {
        id: "b1",
        checkoutBookableIds: [],
        relatedBookableIds: [],
      },
    },
    stubs: {
      BookableCheckoutBookables: true,
      SortableList: true,
    },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * `fetchBookables` had no `catch` at all, so the 403 that 4.3.x sends a user
 * without reach left `mounted()` as an unhandled promise rejection and the two
 * pickers silently empty. The denial is caught and named now; the fields stay
 * where they are - this is a form section, not a dialog, so nothing pops up.
 */
describe("BookableEditRelatedBookables", () => {
  it("does not reject out of `mounted` when the bookable list is forbidden", async () => {
    ApiBookablesService.getBookables.mockRejectedValue(forbiddenError());
    const wrapper = await mountSection();
    expect(wrapper.vm.bookables).toEqual([]);
  });

  it("names the denial next to the pickers", async () => {
    ApiBookablesService.getBookables.mockRejectedValue(forbiddenError());
    const wrapper = await mountSection();
    expect(wrapper.text()).toContain(FORBIDDEN_NOTICE);
  });

  it("says nothing when the list comes back empty but permitted", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
    const wrapper = await mountSection();
    expect(wrapper.text()).not.toContain(FORBIDDEN_NOTICE);
    expect(wrapper.vm.bookables).toEqual([]);
  });

  it("keeps the list usable when the response carries no data", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({});
    const wrapper = await mountSection();
    expect(wrapper.vm.bookablesWithoutSelf).toEqual([]);
  });

  it("drops the edited bookable from the offered items", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [
        { id: "b1", title: "Self" },
        { id: "b2", title: "Other" },
      ],
    });
    const wrapper = await mountSection();
    expect(wrapper.vm.bookablesWithoutSelf.map((b) => b.id)).toEqual(["b2"]);
  });
});
