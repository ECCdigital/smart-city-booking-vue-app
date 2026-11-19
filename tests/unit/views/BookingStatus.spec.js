import { describe, expect, it, vi } from "vitest";
import BookingStatus from "@/views/BookingStatus.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookingService", () => ({
  default: { checkPublicBookingStatus: vi.fn() },
}));

describe("BookingStatus — the instance logo", () => {
  // A dark logo all but vanished on the dark card (ECCdigital/tickets#307).
  // The plate is light under .theme--dark and transparent in the light theme.
  it("sits on the logo plate", async () => {
    const wrapper = mountComponent(BookingStatus, {
      mocks: { $route: { query: {} } },
    });
    await flushPromises();
    const logo = wrapper.find("img.booking-status__logo");

    expect(logo.attributes("src")).toBe("/app-logo.png");
  });
});
