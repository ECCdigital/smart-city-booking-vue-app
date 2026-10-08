import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import Bookable from "@/entities/bookable";
import BookableFlowSummary from "@/components/Bookable/Flow/BookableFlowSummary.vue";
import { overviewBlocks } from "@/utils/bookableFlow";

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

const mountSummary = (item) =>
  mountComponent(BookableFlowSummary, {
    propsData: {
      blocks: overviewBlocks(item, { visited: ["permission"] }),
      current: "permission",
    },
  });

describe("BookableFlowSummary", () => {
  it("reads a value of several words as one, joined by commas", () => {
    // The Buchungsart is one word since ECCdigital/tickets#357.
    const wrapper = mountSummary(
      bookable({
        requiresLogin: true,
        permittedRoles: ["r1", "r2"],
        permittedUsers: ["u1"],
      })
    );

    expect(
      wrapper.find("[data-test='flow-summary-permission']").text()
    ).toContain("2 Rollen, 1 Person");
  });
});
