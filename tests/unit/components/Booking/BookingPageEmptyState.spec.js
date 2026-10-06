import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import BookingPageEmptyState from "@/components/Booking/BookingPageEmptyState.vue";

function mountEmptyState(propsData = {}) {
  return mountComponent(BookingPageEmptyState, {
    propsData: {
      icon: "mdi-lock-outline",
      headline: "Kein Zugriff auf diesen Mandanten",
      sentence:
        "Diese Buchung gehört zu einem Mandanten, dem Sie nicht angehören.",
      buttonLabel: "Zur Buchungsübersicht",
      ...propsData,
    },
  });
}

/**
 * The one empty state of the Buchungsseite (spec "The five page states"):
 * icon, headline, one sentence, an optional monospace detail line and one
 * primary button. Never a redirect; the caller decides what the button does.
 */
describe("BookingPageEmptyState", () => {
  it("shows the headline, the sentence and the button", () => {
    const wrapper = mountEmptyState();

    expect(wrapper.text()).toContain("Kein Zugriff auf diesen Mandanten");
    expect(wrapper.text()).toContain(
      "Diese Buchung gehört zu einem Mandanten, dem Sie nicht angehören."
    );
    expect(wrapper.find(".booking-page-empty-state__action").text()).toBe(
      "Zur Buchungsübersicht"
    );
  });

  it("shows the detail line only when one is given", () => {
    const without = mountEmptyState();
    expect(without.find(".booking-page-empty-state__detail").exists()).toBe(
      false
    );

    const withDetail = mountEmptyState({ detail: "tenant-xyz" });
    expect(withDetail.find(".booking-page-empty-state__detail").text()).toBe(
      "tenant-xyz"
    );
  });

  it("emits `action` when the button is clicked", async () => {
    const wrapper = mountEmptyState();

    await wrapper.find(".booking-page-empty-state__action").trigger("click");

    expect(wrapper.emitted("action")).toHaveLength(1);
  });
});
