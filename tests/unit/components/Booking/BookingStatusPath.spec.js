import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import BookingStatusPath from "@/components/Booking/BookingStatusPath.vue";
import { pathOf } from "@/utils/bookingStatus";

const CREATED = new Date(2026, 2, 1, 9, 0).getTime();
const PAID = new Date(2026, 2, 5, 14, 30).getTime();
const CANCELLED_AT = new Date(2026, 2, 7, 8, 15).getTime();

function booking(overrides = {}) {
  return {
    priceEur: 25,
    timeCreated: CREATED,
    status: "requested",
    ...overrides,
  };
}

function mountPath(propsData = {}, options = {}) {
  const shown = propsData.booking || booking();
  return mountComponent(BookingStatusPath, {
    propsData: {
      status: shown.status,
      path: pathOf(shown),
      actions: [],
      ...propsData,
    },
    ...options,
  });
}

function segments(wrapper) {
  return wrapper.findAll(".booking-status-segment").wrappers.map((segment) => ({
    label: segment.find(".booking-status-segment-label").text(),
    state: ["done", "current", "upcoming", "void", "end"].find((state) =>
      segment.classes(`booking-status-segment--${state}`)
    ),
    date: segment.find(".booking-status-segment-date").exists()
      ? segment.find(".booking-status-segment-date").text()
      : null,
  }));
}

function primaryButton(wrapper) {
  return wrapper.find("button.booking-action-primary");
}

function menuButton(wrapper) {
  return wrapper.find("button.booking-action-menu");
}

/** Opens the side-way menu and reads its entries' titles; the menu detaches into `data-app`. */
async function openMenu(wrapper) {
  await menuButton(wrapper).trigger("click");
  await wrapper.vm.$nextTick();
  return Array.from(
    document.querySelectorAll(".v-menu__content .booking-action-secondary")
  );
}

/**
 * The headline of a booking's state (spec N3): the state word beside an
 * avatar in its colour, the primary action as a button and the side ways
 * in a menu, and under it the path as segments with their dates. It draws
 * what `pathOf` hands it and reads neither a booking nor a route.
 */
describe("BookingStatusPath", () => {
  describe("the headline", () => {
    it("shows the state word in the state's colour beside its icon", () => {
      const wrapper = mountPath({
        booking: booking({ status: "payment_due" }),
      });
      const word = wrapper.find(".booking-status-word");
      expect(word.text()).toBe("Zahlung offen");
      expect(word.classes()).toContain("blue--text");
      expect(wrapper.find(".v-avatar").classes()).toContain("blue");
      expect(wrapper.find(".v-avatar .v-icon").classes()).toContain(
        "mdi-cash-clock"
      );
    });

    it("shows the ended state's word for a cancelled booking", () => {
      const wrapper = mountPath({
        booking: booking({
          status: "cancelled",
          cancellationRefund: { cancelledFrom: "confirmed" },
        }),
      });
      expect(wrapper.find(".booking-status-word").text()).toBe("Storniert");
      expect(wrapper.find(".booking-status-word").classes()).toContain(
        "error--text"
      );
    });

    it("marks a free booking as Kostenfrei beside the word", () => {
      const free = mountPath({ booking: booking({ priceEur: 0 }) });
      expect(free.find(".booking-status-free").text()).toBe("Kostenfrei");

      const priced = mountPath();
      expect(priced.find(".booking-status-free").exists()).toBe(false);
    });

    it("puts an optional label before the word", () => {
      const wrapper = mountPath({ label: "Zustand der Serie" });
      expect(wrapper.find(".booking-status-label").text()).toBe(
        "Zustand der Serie"
      );
      expect(mountPath().find(".booking-status-label").exists()).toBe(false);
    });
  });

  describe("the segments", () => {
    it("draws the priced path with the reached steps done, the current one current and the rest upcoming", () => {
      const wrapper = mountPath({
        booking: booking({ status: "payment_due" }),
      });
      expect(segments(wrapper)).toEqual([
        { label: "Angefragt", state: "done", date: "01.03.2026, 09:00" },
        { label: "Zahlung offen", state: "current", date: null },
        { label: "Bestätigt", state: "upcoming", date: null },
      ]);
    });

    it("draws the free path without Zahlung offen", () => {
      const wrapper = mountPath({ booking: booking({ priceEur: 0 }) });
      expect(segments(wrapper).map((segment) => segment.label)).toEqual([
        "Angefragt",
        "Bestätigt",
      ]);
    });

    it("writes the paid date under Bestätigt once the booking is paid", () => {
      const wrapper = mountPath({
        booking: booking({ status: "confirmed", timePaid: PAID }),
      });
      expect(segments(wrapper)[2]).toEqual({
        label: "Bestätigt",
        state: "current",
        date: "bezahlt 05.03.2026, 14:30",
      });
    });

    it("ends a cancelled path with a red end segment and strikes the steps not reached", () => {
      const wrapper = mountPath({
        booking: booking({
          status: "cancelled",
          cancellationRefund: {
            cancelledFrom: "payment_due",
            cancelledAt: CANCELLED_AT,
          },
        }),
      });
      expect(segments(wrapper)).toEqual([
        { label: "Angefragt", state: "done", date: "01.03.2026, 09:00" },
        { label: "Zahlung offen", state: "done", date: null },
        { label: "Bestätigt", state: "void", date: null },
        { label: "Storniert", state: "end", date: "07.03.2026, 08:15" },
      ]);
    });

    it("ends a rejected path right behind Angefragt", () => {
      const wrapper = mountPath({ booking: booking({ status: "rejected" }) });
      expect(segments(wrapper).map((segment) => segment.state)).toEqual([
        "done",
        "void",
        "void",
        "end",
      ]);
      expect(segments(wrapper)[3]).toMatchObject({
        label: "Abgelehnt",
        date: null,
      });
    });
  });

  describe("the actions", () => {
    it("offers the primary action as a button and the side ways in the menu", async () => {
      const wrapper = mountPath({ actions: ["confirm", "cancel"] });
      expect(primaryButton(wrapper).text()).toBe("Freigeben");

      const entries = await openMenu(wrapper);
      expect(entries.map((entry) => entry.textContent.trim())).toEqual([
        "Ablehnen",
      ]);
    });

    it("keeps a lone side way in the menu, without a button", async () => {
      const wrapper = mountPath({
        booking: booking({ status: "confirmed" }),
        actions: ["cancel"],
      });
      expect(primaryButton(wrapper).exists()).toBe(false);

      const entries = await openMenu(wrapper);
      expect(entries.map((entry) => entry.textContent.trim())).toEqual([
        "Stornieren",
      ]);
    });

    it("shows neither button nor menu without actions", () => {
      const wrapper = mountPath({ actions: [] });
      expect(primaryButton(wrapper).exists()).toBe(false);
      expect(menuButton(wrapper).exists()).toBe(false);
    });

    it("shows only the button where there is no side way", () => {
      const wrapper = mountPath({
        booking: booking({ status: "cancelled" }),
        actions: ["reinstate"],
      });
      expect(primaryButton(wrapper).text()).toBe("Wiederherstellen");
      expect(menuButton(wrapper).exists()).toBe(false);
    });

    it("reports the click of the button and of a menu entry", async () => {
      const wrapper = mountPath({ actions: ["confirm", "cancel"] });

      await primaryButton(wrapper).trigger("click");
      expect(wrapper.emitted("action")).toEqual([["confirm"]]);

      const [reject] = await openMenu(wrapper);
      reject.click();
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("action")).toEqual([["confirm"], ["cancel"]]);
    });

    it("locks button and menu while disabled, and says why under the line", () => {
      const wrapper = mountPath({
        actions: ["confirm", "cancel"],
        disabled: true,
        hint: "Erst speichern",
      });
      expect(primaryButton(wrapper).attributes("disabled")).toBe("disabled");
      expect(menuButton(wrapper).attributes("disabled")).toBe("disabled");
      expect(wrapper.find(".booking-status-hint").text()).toBe(
        "Erst speichern"
      );
    });
  });

  describe("the reason", () => {
    it("renders the host's reason block only where the host fills it", () => {
      const filled = mountPath(
        { booking: booking({ status: "rejected" }) },
        {
          scopedSlots: {
            reason: "<div class=the-reason>Ablehnungsgrund: Zu spät</div>",
          },
        }
      );
      expect(filled.find(".booking-status-reason .the-reason").text()).toBe(
        "Ablehnungsgrund: Zu spät"
      );

      const empty = mountPath({ booking: booking({ status: "rejected" }) });
      expect(empty.find(".booking-status-reason").exists()).toBe(false);
    });
  });
});
