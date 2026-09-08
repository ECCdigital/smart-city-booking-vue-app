import { afterEach, describe, expect, it, vi } from "vitest";
import CancellationReceiptsCard from "@/components/Booking/CancellationReceiptsCard.vue";
import { mountComponent } from "@tests/unit/support/mount";

/** A reprint issues a further revision under the same number: two receipts, one title. */
const FIRST = {
  type: "cancellation",
  title: "STORNO-000123.pdf",
  cancellationId: "000123",
  revision: 1,
  timeCreated: 1_700_000_000_000,
};
const REPRINT = { ...FIRST, revision: 2, timeCreated: 1_700_000_100_000 };

describe("CancellationReceiptsCard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists a reprint beside the receipt it revises, each as its own row", () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mountComponent(CancellationReceiptsCard, {
      propsData: { receipts: [REPRINT, FIRST] },
    });

    const rows = wrapper.findAll(".v-list-item");
    expect(rows).toHaveLength(2);
    const issued = rows.wrappers.map((row) =>
      row.find(".v-list-item__subtitle").text()
    );
    expect(issued[0]).not.toBe(issued[1]);
    expect(
      warn.mock.calls.some((args) => String(args[0]).includes("Duplicate keys"))
    ).toBe(false);
  });
});
