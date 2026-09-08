import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  clickMenuEntry,
  offeredActions,
  segments,
} from "@tests/unit/support/statusPath";
import { flushPromises, lifecycleError } from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    commitBooking: vi.fn(),
    payBooking: vi.fn(),
    rejectBooking: vi.fn(),
    reinstateBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
    getInvoice: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    commitGroupBooking: vi.fn(),
    payGroupBooking: vi.fn(),
    rejectGroupBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
    reprintGroupCancellationReceipt: vi.fn(),
    updateGroupBooking: vi.fn(),
  },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: {
    allowUpdate: vi.fn(() => true),
    allowDelete: vi.fn(() => true),
    allowReprint: vi.fn(() => true),
  },
}));

import GroupBookingDetails from "@/components/Booking/GroupBookingDetails.vue";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

const REPRINT = "Stornobeleg erneut ausstellen";

function member(overrides = {}) {
  return {
    id: "bk-1",
    name: "Erika Muster",
    timeCreated: 1_700_000_000_000,
    bookableItems: [{ _bookableUsed: { title: "Raum 1" } }],
    priceEur: 25,
    status: "requested",
    paymentProvider: "manual",
    attachments: [],
    ...overrides,
  };
}

const CREATED = new Date(2026, 2, 1, 9, 0).getTime();

/** A series of members at `statuses`; a member given as an object carries its own fields. */
function series(statuses) {
  const bookings = statuses.map((status, index) =>
    member({
      id: `bk-${index + 1}`,
      ...(typeof status === "string" ? { status } : status),
    })
  );
  return {
    id: "grp-1",
    tenantId: "tenant-1",
    timeCreated: CREATED,
    bookingIds: bookings.map((b) => b.id),
    bookings,
  };
}

function cancelledFrom(from, overrides = {}) {
  return {
    status: "cancelled",
    cancellationRefund: {
      cancelledFrom: from,
      cancelledAt: new Date(2026, 2, 7, 8, 15).getTime(),
    },
    ...overrides,
  };
}

function mountDetails(groupBooking) {
  const store = new Vuex.Store({ modules: { toasts } });
  return mountComponent(GroupBookingDetails, {
    store,
    propsData: { groupBooking },
  });
}

function button(wrapper, label) {
  return wrapper
    .findAll("button")
    .wrappers.find((button) => button.text() === label);
}

function hint(wrapper) {
  const line = wrapper.find(".booking-status-hint");
  return line.exists() ? line.text() : null;
}

function toastMessages(wrapper) {
  return wrapper.vm.$store.getters["toasts/all"].map((toast) => toast.message);
}

/**
 * The series drawer shows the series as a booking (spec E9, N5): the
 * members' shared state as a headline over the series' path, or Gemischt
 * with a count per state; it offers a series-wide action, worded with
 * "Serie", only where the shared state allows it, hands a member row's
 * action to the same module, and offers the aggregated cancellation
 * receipt's reprint once every member is cancelled (spec E8). There is no
 * series-wide Wiederherstellen.
 */
describe("GroupBookingDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BookingPermissionService.allowUpdate.mockReturnValue(true);
    BookingPermissionService.allowReprint.mockReturnValue(true);
  });

  describe("the series' state", () => {
    it("shows the members' shared state in the headline, captioned as the series' state", () => {
      const wrapper = mountDetails(series(["confirmed", "confirmed"]));
      expect(wrapper.find(".booking-status-label").text()).toBe(
        "Zustand der Serie"
      );
      expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
    });

    it("draws the path from the total price, dated by the series' request only", () => {
      const priced = mountDetails(
        series([
          { status: "confirmed", timePaid: 1_700_100_000_000 },
          { status: "confirmed", timePaid: 1_700_100_000_000 },
        ])
      );
      expect(segments(priced)).toEqual([
        { label: "Angefragt", state: "done", date: "01.03.2026, 09:00" },
        { label: "Zahlung offen", state: "done", date: null },
        { label: "Bestätigt", state: "current", date: null },
      ]);
      expect(priced.find(".booking-status-free").exists()).toBe(false);

      const free = mountDetails(
        series([
          { status: "requested", priceEur: 0 },
          { status: "requested", priceEur: 0 },
        ])
      );
      expect(segments(free).map((segment) => segment.label)).toEqual([
        "Angefragt",
        "Bestätigt",
      ]);
      expect(free.find(".booking-status-free").text()).toBe("Kostenfrei");
    });

    it("cuts a cancelled series behind the step every member reached, without a date", () => {
      const wrapper = mountDetails(
        series([cancelledFrom("payment_due"), cancelledFrom("confirmed")])
      );
      expect(wrapper.find(".booking-status-word").text()).toBe("Storniert");
      expect(segments(wrapper)).toEqual([
        { label: "Angefragt", state: "done", date: "01.03.2026, 09:00" },
        { label: "Zahlung offen", state: "done", date: null },
        { label: "Bestätigt", state: "void", date: null },
        { label: "Storniert", state: "end", date: null },
      ]);
    });

    it("shows the reason under the path only where every member gives the same one", () => {
      const agreed = mountDetails(
        series([
          cancelledFrom("confirmed", { rejectionReason: "Krank" }),
          cancelledFrom("confirmed", { rejectionReason: "Krank" }),
        ])
      );
      const block = agreed.find(".booking-status-reason");
      expect(block.text()).toContain("Stornierungsgrund");
      expect(block.text()).toContain("Krank");

      const differing = mountDetails(
        series([
          cancelledFrom("confirmed", { rejectionReason: "Krank" }),
          cancelledFrom("confirmed", { rejectionReason: "Umzug" }),
        ])
      );
      expect(differing.find(".booking-status-reason").exists()).toBe(false);
    });

    it("says Gemischt where the members disagree, counts them per state and points at the list", async () => {
      const wrapper = mountDetails(
        series(["confirmed", "requested", "confirmed", "cancelled"])
      );

      expect(wrapper.find(".booking-status-word").text()).toBe("Gemischt");
      expect(
        wrapper
          .findAll(".series-status-count")
          .wrappers.map((count) => count.text())
      ).toEqual(["1 Angefragt", "2 Bestätigt", "1 Storniert"]);
      expect(hint(wrapper)).toBe("Aktionen je Buchung in der Liste unten");
      expect(wrapper.find(".booking-status-segment").exists()).toBe(false);
      expect(await offeredActions(wrapper)).toEqual({
        button: null,
        menu: null,
      });
    });
  });

  describe("the series' actions", () => {
    it.each([
      [["requested", "requested"], "Serie freigeben", ["Serie ablehnen"]],
      [
        ["payment_due", "payment_due"],
        "Serie als bezahlt markieren",
        ["Serie stornieren"],
      ],
      [["confirmed", "confirmed"], null, ["Serie stornieren"]],
      [["rejected", "rejected"], null, null],
      [["cancelled", "cancelled"], null, null],
      [["requested", "confirmed"], null, null],
    ])(
      "offers for members %j the button %s and the menu %j",
      async (statuses, button, menu) => {
        const wrapper = mountDetails(series(statuses));
        expect(await offeredActions(wrapper)).toEqual({ button, menu });
      }
    );

    it("keeps the plain verbs in the members' rows", async () => {
      const wrapper = mountDetails(series(["confirmed", "confirmed"]));
      expect(wrapper.text()).not.toContain("Serie stornieren");
      await wrapper.find("td.controls-cell button").trigger("click");
      await wrapper.vm.$nextTick();
      const rowEntries = Array.from(
        document.querySelectorAll(".v-menu__content .v-list-item__title")
      ).map((entry) => entry.textContent.trim());
      expect(rowEntries).toContain("Stornieren");
      expect(rowEntries).not.toContain("Serie stornieren");
    });

    it("offers nothing to a reader without the update right, and no hint either", async () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);

      const uniform = mountDetails(series(["requested", "requested"]));
      expect(await offeredActions(uniform)).toEqual({
        button: null,
        menu: null,
      });
      expect(hint(uniform)).toBeNull();

      const mixed = mountDetails(series(["requested", "confirmed"]));
      expect(mixed.find(".booking-status-word").text()).toBe("Gemischt");
      expect(hint(mixed)).toBeNull();
    });

    it("hands the whole series to the transition module, with no single-member option", async () => {
      const groupBooking = series(["confirmed", "confirmed"]);
      const wrapper = mountDetails(groupBooking);
      const start = vi
        .spyOn(wrapper.vm.$refs.transitions, "start")
        .mockImplementation(() => {});

      await clickMenuEntry(wrapper, "Serie stornieren");

      expect(start).toHaveBeenCalledWith("cancel", {
        booking: groupBooking.bookings[0],
        groupBooking,
        bookings: groupBooking.bookings,
        seriesOnly: true,
      });
    });

    it("hands a member row's action to the module with its series, so a mixed series acts per member", async () => {
      const groupBooking = series(["requested", "confirmed"]);
      const wrapper = mountDetails(groupBooking);
      const start = vi
        .spyOn(wrapper.vm.$refs.transitions, "start")
        .mockImplementation(() => {});
      expect(await offeredActions(wrapper)).toEqual({
        button: null,
        menu: null,
      });

      wrapper
        .findComponent({ name: "BookingTable" })
        .vm.$emit("transition", "cancel", "bk-2");

      expect(start).toHaveBeenCalledWith("cancel", {
        booking: groupBooking.bookings[1],
        groupBooking,
        bookings: groupBooking.bookings,
      });
    });

    it("asks the host to reload after a transition, and after a stale failure", () => {
      const wrapper = mountDetails(series(["requested", "requested"]));
      const transitions = wrapper.findComponent({ name: "BookingTransitions" });

      transitions.vm.$emit("transitioned", {
        action: "confirm",
        groupBookingId: "grp-1",
      });
      transitions.vm.$emit("failed", { action: "confirm", refetch: false });
      transitions.vm.$emit("failed", { action: "confirm", refetch: true });

      expect(wrapper.emitted("update")).toHaveLength(2);
    });
  });

  describe("the cancellation receipt", () => {
    it("offers the reprint once every member is cancelled or rejected", () => {
      expect(
        button(mountDetails(series(["cancelled", "rejected"])), REPRINT)
      ).toBeDefined();
      expect(
        button(mountDetails(series(["cancelled", "confirmed"])), REPRINT)
      ).toBeUndefined();
    });

    it("keeps the reprint from a reader without the reprint right", () => {
      BookingPermissionService.allowReprint.mockReturnValue(false);
      const wrapper = mountDetails(series(["cancelled", "cancelled"]));
      expect(button(wrapper, REPRINT)).toBeUndefined();
    });

    it("reprints over the series' route and asks the host to reload", async () => {
      ApiGroupBookingService.reprintGroupCancellationReceipt.mockResolvedValue({
        success: true,
        data: series(["cancelled", "cancelled"]),
        errors: [],
      });
      const wrapper = mountDetails(series(["cancelled", "cancelled"]));

      await button(wrapper, REPRINT).trigger("click");
      await flushPromises();

      expect(
        ApiGroupBookingService.reprintGroupCancellationReceipt
      ).toHaveBeenCalledWith(undefined, "grp-1");
      expect(wrapper.emitted("update")).toHaveLength(1);
      expect(toastMessages(wrapper)).toContain(
        "Der Stornobeleg der Serie wurde erneut ausgestellt."
      );
    });

    it("shows the reader's message on a 409 and reloads", async () => {
      ApiGroupBookingService.reprintGroupCancellationReceipt.mockRejectedValue(
        lifecycleError(409, "not_cancelled", {
          groupBookingId: "grp-1",
          bookingId: "bk-2",
        })
      );
      const wrapper = mountDetails(series(["cancelled", "cancelled"]));

      await button(wrapper, REPRINT).trigger("click");
      await flushPromises();

      expect(wrapper.text()).toContain("Die Buchung ist nicht storniert.");
      expect(wrapper.emitted("update")).toHaveLength(1);
    });
  });
});
