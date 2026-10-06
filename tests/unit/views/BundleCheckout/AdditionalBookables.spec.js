import { beforeEach, describe, expect, it, vi } from "vitest";
import AdditionalBookables from "@/views/BundleCheckout/AdditionalBookables.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getPublicBookable: vi.fn(), getPublicBookables: vi.fn() },
}));

/**
 * The "Ergänzungen" step of the legacy checkout. Since backend 4.3 the
 * public list carries listed offers only (`isPublic`), while a direct link
 * reaches every offer the tenant lets out (ADR 0003 of the backend). An
 * add-on is usually not listed - a caterer, a standing table - so the step
 * has to load the add-ons by their ids, as `CheckoutMain` loads the lead
 * and the subsequent items, and must not depend on the list.
 */
function contextWith(checkoutBookableIds) {
  const emitted = [];
  return {
    leadItem: {
      amount: 2,
      bookable: { id: "lead", tenantId: "t1", checkoutBookableIds },
    },
    items: [],
    emitted,
    $emit(event, payload) {
      emitted.push({ event, payload });
    },
    selectMandatoryItem: AdditionalBookables.methods.selectMandatoryItem,
  };
}

describe("AdditionalBookables.fetchBookables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("loads every add-on by its id, listed or not", async () => {
    const context = contextWith([
      { bookableId: "catering", mandatory: false },
      { bookableId: "table", mandatory: true },
    ]);
    ApiBookablesService.getPublicBookable.mockImplementation((id) =>
      Promise.resolve({
        data: { id, tenantId: "t1", title: id, isPublic: false },
      })
    );

    await AdditionalBookables.methods.fetchBookables.call(context);

    expect(ApiBookablesService.getPublicBookables).not.toHaveBeenCalled();
    expect(ApiBookablesService.getPublicBookable).toHaveBeenCalledWith(
      "catering",
      "t1"
    );
    expect(ApiBookablesService.getPublicBookable).toHaveBeenCalledWith(
      "table",
      "t1"
    );
    expect(context.items.map((item) => item.bookable.id)).toEqual([
      "catering",
      "table",
    ]);
    expect(context.items.map((item) => item.mandatory)).toEqual([false, true]);
    expect(context.items.every((item) => item.isAvailable === null)).toBe(true);
  });

  it("selects the mandatory add-ons with the lead item's amount", async () => {
    const context = contextWith([
      { bookableId: "catering", mandatory: false },
      { bookableId: "table", mandatory: true },
    ]);
    ApiBookablesService.getPublicBookable.mockImplementation((id) =>
      Promise.resolve({ data: { id, tenantId: "t1" } })
    );

    await AdditionalBookables.methods.fetchBookables.call(context);

    expect(context.emitted).toEqual([
      {
        event: "item-selected",
        payload: {
          bookableId: "table",
          amount: 2,
          valid: true,
          mandatory: true,
        },
      },
    ]);
  });

  it("drops an add-on out of reach and keeps the others", async () => {
    const context = contextWith([
      { bookableId: "gone", mandatory: false },
      { bookableId: "table", mandatory: false },
    ]);
    ApiBookablesService.getPublicBookable.mockImplementation((id) =>
      id === "gone"
        ? Promise.reject({ response: { status: 404 } })
        : Promise.resolve({ data: { id, tenantId: "t1" } })
    );

    await AdditionalBookables.methods.fetchBookables.call(context);

    expect(context.items.map((item) => item.bookable.id)).toEqual(["table"]);
  });

  it("has nothing to offer without checkoutBookableIds", async () => {
    const context = contextWith(undefined);

    await AdditionalBookables.methods.fetchBookables.call(context);

    expect(ApiBookablesService.getPublicBookable).not.toHaveBeenCalled();
    expect(context.items).toEqual([]);
  });
});
