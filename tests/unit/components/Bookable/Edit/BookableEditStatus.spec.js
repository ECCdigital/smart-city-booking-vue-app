import { describe, expect, it, vi } from "vitest";
import { lastPatch, mountEditing } from "@tests/unit/support/bookableEditing";
import { switchByLabel, toggleSwitch } from "@tests/unit/support/vuetify";

vi.mock("@/services/api/ApiReviewService", () => ({
  default: { submit: vi.fn(), decide: vi.fn(), getReview: vi.fn() },
}));

vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: {
    reviewViewer: vi.fn(() => ({ tenantOwner: true, instanceOwner: false })),
  },
}));

import BookableEditStatus from "@/components/Bookable/Edit/BookableEditStatus.vue";

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

function mountStatus({ bookable = {}, level = "supervised" } = {}) {
  return mountEditing(BookableEditStatus, {
    bookable: {
      id: "b-1",
      tenantId: "t-1",
      isBookable: true,
      isPublic: false,
      autoCommitBooking: true,
      review: { status: null },
      ...bookable,
    },
    propsData: { level },
  });
}

// The publication itself is BookableEditPublication's spec; the band only
// hosts it (ECCdigital/tickets#362).
describe("BookableEditStatus", () => {
  it("holds the publication with the tenant's level", () => {
    const { wrapper } = mountStatus({
      bookable: { review: { status: "pending" }, isPublic: true },
    });

    expect(find(wrapper, "publication-question").exists()).toBe(true);
    expect(switchByLabel(wrapper, "Im Katalog listen").vm.isActive).toBe(true);
    expect(find(wrapper, "review-status").text()).toBe("Prüfung ausstehend");
    expect(find(wrapper, "publication-wish-hint").exists()).toBe(true);
  });

  it("hands the publication's patches on", async () => {
    const { wrapper, patches } = mountStatus();

    await toggleSwitch(wrapper, "Buchbar");

    expect(lastPatch(patches)).toEqual({ isBookable: false });
  });

  it("keeps a free tenant free of supervision texts", () => {
    const { wrapper } = mountStatus({ level: "free" });

    expect(find(wrapper, "publication-wish-hint").exists()).toBe(false);
    expect(find(wrapper, "review-panel").exists()).toBe(false);
    expect(find(wrapper, "publication-effect").exists()).toBe(true);
  });
});
