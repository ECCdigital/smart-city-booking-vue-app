import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import Bookable from "@/entities/bookable";
import BookableFlowSummary from "@/components/Bookable/Flow/BookableFlowSummary.vue";
import { applyBookingMode, overviewBlocks } from "@/utils/bookableFlow";

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

const mountSummary = (item) =>
  mountComponent(BookableFlowSummary, {
    propsData: {
      blocks: overviewBlocks(item, { visited: ["availability"] }),
      current: "availability",
    },
  });

describe("BookableFlowSummary", () => {
  it("reads a value of several words as one, joined by commas", () => {
    const wrapper = mountSummary(applyBookingMode(bookable(), "week"));

    expect(
      wrapper.find("[data-test='flow-summary-availability']").text()
    ).toContain("Langzeit, Wochen");
  });
});
