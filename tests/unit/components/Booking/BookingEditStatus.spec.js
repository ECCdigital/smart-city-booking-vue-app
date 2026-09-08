import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  clickMenuEntry,
  menuButton,
  offeredActions,
  primaryButton,
} from "@tests/unit/support/statusPath";
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
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    commitGroupBooking: vi.fn(),
    payGroupBooking: vi.fn(),
    rejectGroupBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
  },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowUpdate: vi.fn(() => true) },
}));

import BookingEditStatus from "@/components/Booking/BookingEditStatus.vue";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

const SAVE_FIRST = "Erst speichern";
/** A segment of the chooser, as the keyboard reaches it. */
const RADIO = "[role=radio]";

function booking(overrides = {}) {
  return { id: "bk-1", priceEur: 25, status: "requested", ...overrides };
}

function mountStatus(propsData = {}) {
  const store = new Vuex.Store({ modules: { toasts } });
  const wrapper = mountComponent(BookingEditStatus, {
    store,
    propsData: { booking: booking(), ...propsData },
  });
  return wrapper;
}

function segmentLabels(wrapper) {
  return wrapper
    .findAll(".booking-status-segment-label")
    .wrappers.map((label) => label.text());
}

function actionButtons(wrapper) {
  return wrapper.findAll("button.booking-action").wrappers;
}

/** Spies on the mounted transition module, so that no route is called. */
function spyOnStart(wrapper) {
  return vi
    .spyOn(wrapper.vm.$refs.transitions, "start")
    .mockImplementation(() => {});
}

/**
 * The form's status section as state plus action bar (spec E2, E10): one
 * chip with the state word, one button per transition the state allows,
 * each handed to the mounted `BookingTransitions`, and the buttons locked
 * while the form has unsaved changes. In create mode it asks for the
 * "Anfangszustand" instead. Rewritten from the characterisation of the three
 * switches when the booking strand moved the form off the flags; the switches
 * are gone, and so are "Freigabe zurücknehmen" and "Zahlung zurücknehmen".
 */
describe("BookingEditStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    BookingPermissionService.allowUpdate.mockReturnValue(true);
  });

  describe("the state", () => {
    it.each([
      ["requested", "Angefragt"],
      ["payment_due", "Zahlung offen"],
      ["confirmed", "Bestätigt"],
      ["rejected", "Abgelehnt"],
      ["cancelled", "Storniert"],
    ])("shows %s as %s in the headline", (status, word) => {
      const wrapper = mountStatus({ booking: booking({ status }) });
      expect(wrapper.find(".booking-status-word").text()).toBe(word);
    });

    it("draws the path under the headline, cut where the booking ended", () => {
      const onPath = mountStatus({
        booking: booking({ status: "payment_due" }),
      });
      expect(segmentLabels(onPath)).toEqual([
        "Angefragt",
        "Zahlung offen",
        "Bestätigt",
      ]);

      const cancelled = mountStatus({
        booking: booking({
          status: "cancelled",
          cancellationRefund: { cancelledFrom: "payment_due" },
        }),
      });
      expect(segmentLabels(cancelled)).toEqual([
        "Angefragt",
        "Zahlung offen",
        "Bestätigt",
        "Storniert",
      ]);
      expect(cancelled.find(".booking-status-segment--void").text()).toBe(
        "Bestätigt"
      );
    });

    it("marks a free booking as Kostenfrei beside the state", () => {
      const free = mountStatus({ booking: booking({ priceEur: 0 }) });
      expect(free.find(".booking-status-free").text()).toBe("Kostenfrei");

      const priced = mountStatus();
      expect(priced.find(".booking-status-free").exists()).toBe(false);
    });

    it("names the paid date under Bestätigt where the booking carries one", () => {
      const paid = mountStatus({
        booking: booking({
          status: "confirmed",
          timePaid: new Date(2026, 2, 5, 14, 30).getTime(),
        }),
      });
      expect(paid.text()).toContain("bezahlt 05.03.2026, 14:30");

      const unpaid = mountStatus({ booking: booking({ status: "confirmed" }) });
      expect(unpaid.text()).not.toContain("bezahlt");
    });

    it("has no switch anywhere", () => {
      const wrapper = mountStatus();
      expect(wrapper.findAllComponents({ name: "v-switch" })).toHaveLength(0);
    });
  });

  describe("the actions", () => {
    it.each([
      ["requested", "Freigeben", ["Ablehnen"]],
      ["payment_due", "Als bezahlt markieren", ["Stornieren"]],
      ["confirmed", null, ["Stornieren"]],
      ["rejected", "Wiederherstellen", null],
      ["cancelled", "Wiederherstellen", null],
    ])(
      "offers at %s the button %s and the menu %j",
      async (status, button, menu) => {
        const wrapper = mountStatus({ booking: booking({ status }) });
        expect(await offeredActions(wrapper)).toEqual({ button, menu });
      }
    );

    it("offers none to whoever may not edit the booking", async () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);

      const wrapper = mountStatus();

      expect(BookingPermissionService.allowUpdate).toHaveBeenCalledWith(
        booking()
      );
      expect(await offeredActions(wrapper)).toEqual({
        button: null,
        menu: null,
      });
      expect(wrapper.find(".booking-status-word").text()).toBe("Angefragt");
    });

    it("hands a single booking to the transition module", async () => {
      const wrapper = mountStatus();
      const start = spyOnStart(wrapper);

      await primaryButton(wrapper).trigger("click");

      expect(start).toHaveBeenCalledWith("confirm", { booking: booking() });
    });

    it("hands a series member with its series and members", async () => {
      const members = [booking(), booking({ id: "bk-2" })];
      const groupBooking = {
        id: "grp-1",
        bookingIds: ["bk-1", "bk-2"],
        bookings: members,
      };
      const wrapper = mountStatus({
        booking: booking({ status: "confirmed" }),
        groupBooking,
      });
      const start = spyOnStart(wrapper);

      await clickMenuEntry(wrapper, "Stornieren");

      expect(start).toHaveBeenCalledWith("cancel", {
        booking: booking({ status: "confirmed" }),
        groupBooking,
        bookings: members,
      });
    });

    it("acts on a member alone when the series' members are not at hand", async () => {
      const wrapper = mountStatus({
        booking: booking({ status: "rejected" }),
        groupBooking: { id: "grp-1", bookingIds: ["bk-1", "bk-2"] },
      });
      const start = spyOnStart(wrapper);

      await primaryButton(wrapper).trigger("click");

      expect(start).toHaveBeenCalledWith("reinstate", {
        booking: booking({ status: "rejected" }),
      });
    });

    it("passes the module's answer on to the form", async () => {
      const wrapper = mountStatus();
      const transitions = wrapper.findComponent({ name: "BookingTransitions" });

      transitions.vm.$emit("transitioned", {
        action: "confirm",
        bookingId: "bk-1",
      });
      transitions.vm.$emit("failed", {
        action: "confirm",
        error: null,
        message: "Nein",
        refetch: true,
      });

      expect(wrapper.emitted("transitioned")).toEqual([
        [{ action: "confirm", bookingId: "bk-1" }],
      ]);
      expect(wrapper.emitted("failed")).toEqual([
        [{ action: "confirm", error: null, message: "Nein", refetch: true }],
      ]);
    });
  });

  describe("while the form has unsaved changes", () => {
    it("locks the button and the menu and says to save first under the path", async () => {
      const wrapper = mountStatus({ dirty: true });
      const start = spyOnStart(wrapper);

      expect(primaryButton(wrapper).element.disabled).toBe(true);
      expect(menuButton(wrapper).element.disabled).toBe(true);
      expect(wrapper.find(".booking-status-hint").text()).toContain(SAVE_FIRST);

      await primaryButton(wrapper).trigger("click");
      expect(start).not.toHaveBeenCalled();
    });

    it("unlocks them again once the form is clean", async () => {
      const wrapper = mountStatus({ dirty: true });

      await wrapper.setProps({ dirty: false });

      expect(primaryButton(wrapper).element.disabled).toBe(false);
      expect(menuButton(wrapper).element.disabled).toBe(false);
      expect(wrapper.find(".booking-status-hint").exists()).toBe(false);
    });

    it("says nothing to whoever has no action to lock", () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);
      const wrapper = mountStatus({ dirty: true });
      expect(wrapper.find(".booking-status-hint").exists()).toBe(false);
    });
  });

  /**
   * Create mode (spec E10, N6): the headline is the choice of the
   * Anfangszustand - the draft's path with the segments as radios, named
   * with the state words. The choice stays the act underneath: Angefragt
   * is `requested`, Zahlung offen is `confirmed`, Bestätigt is `paid` on a
   * priced draft and `confirmed` on a free one; the wire the form hears is
   * unchanged. Rewritten from the select of the first cut.
   */
  describe("in create mode", () => {
    const PAYMENT_METHODS = [
      { type: "CASH", title: "Bar" },
      { type: "TRANSFER", title: "Überweisung" },
    ];

    function mountCreate(priceEur = 25) {
      return mountStatus({
        booking: { id: null, priceEur: 0, status: undefined },
        priceEur,
        paymentMethods: PAYMENT_METHODS,
      });
    }

    function lastInitialState(wrapper) {
      const emitted = wrapper.emitted("update:initial-state");
      return emitted[emitted.length - 1][0];
    }

    /** The segments as the admin reads them: word, checked, and how the line draws them. */
    function choices(wrapper) {
      return wrapper.findAll(RADIO).wrappers.map((segment) => ({
        label: segment.find(".booking-status-segment-label").text(),
        checked: segment.attributes("aria-checked") === "true",
        state: ["done", "current", "upcoming"].find((state) =>
          segment.classes(`booking-status-segment--${state}`)
        ),
      }));
    }

    function segment(wrapper, label) {
      return wrapper
        .findAll(RADIO)
        .wrappers.find(
          (candidate) =>
            candidate.find(".booking-status-segment-label").text() === label
        );
    }

    async function pick(wrapper, label) {
      await segment(wrapper, label).trigger("click");
      await wrapper.vm.$nextTick();
    }

    function paymentFields(wrapper) {
      return wrapper.findAll(".initial-state-payment").wrappers;
    }

    /** Opens the payment method select and clicks the option with `text`. */
    async function chooseMethod(wrapper, text) {
      await wrapper
        .find(".initial-state-payment-method .v-input__slot")
        .trigger("click");
      await wrapper.vm.$nextTick();
      const option = Array.from(
        document.querySelectorAll(
          ".v-menu__content.menuable__content__active .v-list-item"
        )
      ).find((el) => el.textContent.trim() === text);
      option.click();
      await wrapper.vm.$nextTick();
    }

    it("offers the Anfangszustand as the segments of the draft's path, Angefragt chosen, without actions", () => {
      const wrapper = mountCreate();

      expect(wrapper.find(".booking-status-label").text()).toBe(
        "Anfangszustand"
      );
      expect(wrapper.find(".booking-status-word").text()).toBe("Angefragt");
      expect(choices(wrapper)).toEqual([
        { label: "Angefragt", checked: true, state: "current" },
        { label: "Zahlung offen", checked: false, state: "upcoming" },
        { label: "Bestätigt", checked: false, state: "upcoming" },
      ]);
      expect(actionButtons(wrapper)).toHaveLength(0);
      expect(menuButton(wrapper).exists()).toBe(false);
      expect(wrapper.find(".booking-status-hint").exists()).toBe(false);
      expect(paymentFields(wrapper)).toHaveLength(0);
      expect(lastInitialState(wrapper)).toEqual({
        selection: "requested",
        paymentMethod: null,
        timePaid: null,
      });
    });

    it("offers a free draft the path without Zahlung offen, marked Kostenfrei", () => {
      const wrapper = mountCreate(0);

      expect(choices(wrapper).map((choice) => choice.label)).toEqual([
        "Angefragt",
        "Bestätigt",
      ]);
      expect(wrapper.find(".booking-status-free").text()).toBe("Kostenfrei");
    });

    it("reads Zahlung offen as the act of releasing, without payment", async () => {
      const wrapper = mountCreate(25);

      await pick(wrapper, "Zahlung offen");

      expect(lastInitialState(wrapper)).toEqual({
        selection: "confirmed",
        paymentMethod: null,
        timePaid: null,
      });
      expect(wrapper.find(".booking-status-word").text()).toBe("Zahlung offen");
      expect(choices(wrapper)).toEqual([
        { label: "Angefragt", checked: false, state: "done" },
        { label: "Zahlung offen", checked: true, state: "current" },
        { label: "Bestätigt", checked: false, state: "upcoming" },
      ]);
      expect(paymentFields(wrapper)).toHaveLength(0);
    });

    it("reads Bestätigt on a free draft as releasing, chosen by keyboard", async () => {
      const wrapper = mountCreate(0);

      await segment(wrapper, "Bestätigt").trigger("keydown.enter");
      await wrapper.vm.$nextTick();

      expect(lastInitialState(wrapper)).toEqual({
        selection: "confirmed",
        paymentMethod: null,
        timePaid: null,
      });
      expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
      expect(paymentFields(wrapper)).toHaveLength(0);

      await segment(wrapper, "Angefragt").trigger("keydown.space");
      await wrapper.vm.$nextTick();
      expect(lastInitialState(wrapper)).toMatchObject({
        selection: "requested",
      });
    });

    it("asks for the payment under the line when Bestätigt is chosen with a price, dated now", async () => {
      const now = new Date(2026, 8, 6, 10, 15);
      vi.useFakeTimers({ now, toFake: ["Date"] });
      try {
        const wrapper = mountCreate(25);

        await pick(wrapper, "Bestätigt");

        expect(lastInitialState(wrapper)).toEqual({
          selection: "paid",
          paymentMethod: null,
          timePaid: now.getTime(),
        });
        expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
        expect(wrapper.find(".booking-status-payment").exists()).toBe(true);
        expect(paymentFields(wrapper)).toHaveLength(3);
        expect(
          segment(wrapper, "Bestätigt")
            .find(".booking-status-segment-date")
            .text()
        ).toBe("bezahlt 06.09.2026, 10:15");

        await chooseMethod(wrapper, "Überweisung");
        expect(lastInitialState(wrapper)).toEqual({
          selection: "paid",
          paymentMethod: "TRANSFER",
          timePaid: now.getTime(),
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it("moves the mark with the price while the choice stays the act", async () => {
      const wrapper = mountCreate(25);
      await pick(wrapper, "Zahlung offen");

      await wrapper.setProps({ priceEur: 0 });

      expect(lastInitialState(wrapper)).toMatchObject({
        selection: "confirmed",
      });
      expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
      expect(choices(wrapper)).toEqual([
        { label: "Angefragt", checked: false, state: "done" },
        { label: "Bestätigt", checked: true, state: "current" },
      ]);

      await wrapper.setProps({ priceEur: 40 });
      expect(wrapper.find(".booking-status-word").text()).toBe("Zahlung offen");
    });

    it("falls back to releasing when a paid draft turns free", async () => {
      const wrapper = mountCreate(25);
      await pick(wrapper, "Bestätigt");
      expect(paymentFields(wrapper)).toHaveLength(3);

      await wrapper.setProps({ priceEur: 0 });

      expect(lastInitialState(wrapper)).toMatchObject({
        selection: "confirmed",
      });
      expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
      expect(paymentFields(wrapper)).toHaveLength(0);
      expect(wrapper.find(".booking-status-segment-date").exists()).toBe(false);
    });
  });

  describe("the rejection reason", () => {
    function reasonBlock(wrapper) {
      return wrapper.find(".booking-status-path .booking-status-reason");
    }

    it.each([
      ["rejected", "Ablehnungsgrund"],
      ["cancelled", "Stornierungsgrund"],
    ])(
      "is asked for under the path of a %s booking, captioned %s, without a label of its own",
      (status, caption) => {
        const wrapper = mountStatus({
          booking: booking({ status, rejectionReason: "" }),
        });

        const block = reasonBlock(wrapper);
        expect(block.text()).toContain(caption);
        expect(block.find("textarea").exists()).toBe(true);
        expect(block.find("label").exists()).toBe(false);
      }
    );

    it("is not asked for while the booking is on its path", () => {
      const wrapper = mountStatus({
        booking: booking({ status: "confirmed", rejectionReason: "alt" }),
      });
      expect(reasonBlock(wrapper).exists()).toBe(false);
      expect(wrapper.find("textarea").exists()).toBe(false);
    });

    it("shows the booking's reason and reports an edit to the form instead of writing the booking", async () => {
      const rejected = booking({ status: "rejected", rejectionReason: "Alt" });
      const wrapper = mountStatus({ booking: rejected });
      const textarea = reasonBlock(wrapper).find("textarea");
      expect(textarea.element.value).toBe("Alt");

      await textarea.setValue("Zu spät");

      expect(wrapper.emitted("update:rejection-reason")).toEqual([["Zu spät"]]);
      expect(rejected.rejectionReason).toBe("Alt");
    });

    it("insists on a reason", async () => {
      const wrapper = mountStatus({
        booking: booking({ status: "cancelled", rejectionReason: "Alt" }),
      });
      const textarea = reasonBlock(wrapper).find("textarea");

      await textarea.setValue("");
      await wrapper.vm.$nextTick();

      expect(reasonBlock(wrapper).text()).toContain(
        "Begründung ist erforderlich"
      );
    });

    it("keeps the refund audit as a sheet of its own under the headline", () => {
      const wrapper = mountStatus({
        booking: booking({
          status: "cancelled",
          rejectionReason: "Alt",
          cancellationRefund: {
            cancelledFrom: "confirmed",
            originalAmountEur: 25,
            refundAmountEur: 20,
            cancellationFeeEur: 5,
            appliedRefundPercentage: 80,
            daysBeforeStart: 3,
          },
        }),
      });

      const audit = wrapper.findComponent({ name: "CancellationRefundAudit" });
      expect(audit.exists()).toBe(true);
      expect(wrapper.find(".booking-status-path").text()).not.toContain(
        audit.text()
      );
    });
  });
});
