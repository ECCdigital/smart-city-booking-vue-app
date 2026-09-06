import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
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

function actionButtons(wrapper) {
  return wrapper.findAll("button.booking-action").wrappers;
}

function actionLabels(wrapper) {
  return actionButtons(wrapper).map((button) => button.text());
}

function actionButton(wrapper, label) {
  return actionButtons(wrapper).find((button) => button.text() === label);
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
    ])("shows %s as %s", (status, word) => {
      const wrapper = mountStatus({ booking: booking({ status }) });
      expect(wrapper.find(".booking-status-chip").text()).toBe(word);
    });

    it("marks a free booking as Kostenfrei beside the state", () => {
      const free = mountStatus({ booking: booking({ priceEur: 0 }) });
      expect(free.find(".booking-status-free").text()).toBe("Kostenfrei");

      const priced = mountStatus();
      expect(priced.find(".booking-status-free").exists()).toBe(false);
    });

    it("names the paid date where the booking carries one", () => {
      const wrapper = mountStatus({
        booking: booking({
          status: "confirmed",
          timePaid: new Date(2026, 2, 5, 14, 30).getTime(),
        }),
      });
      expect(wrapper.find(".booking-status-paid-at").text()).toBe(
        "Bezahlt am 05.03.2026, 14:30"
      );

      const unpaid = mountStatus({ booking: booking({ status: "confirmed" }) });
      expect(unpaid.find(".booking-status-paid-at").exists()).toBe(false);
    });

    it("has no switch anywhere", () => {
      const wrapper = mountStatus();
      expect(wrapper.findAllComponents({ name: "v-switch" })).toHaveLength(0);
    });
  });

  describe("the actions", () => {
    it.each([
      ["requested", ["Freigeben", "Ablehnen"]],
      ["payment_due", ["Als bezahlt markieren", "Stornieren"]],
      ["confirmed", ["Stornieren"]],
      ["rejected", ["Wiederherstellen"]],
      ["cancelled", ["Wiederherstellen"]],
    ])("offers at %s exactly %j", (status, labels) => {
      const wrapper = mountStatus({ booking: booking({ status }) });
      expect(actionLabels(wrapper)).toEqual(labels);
    });

    it("offers none to whoever may not edit the booking", () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);

      const wrapper = mountStatus();

      expect(BookingPermissionService.allowUpdate).toHaveBeenCalledWith(
        booking()
      );
      expect(actionButtons(wrapper)).toHaveLength(0);
      expect(wrapper.find(".booking-status-chip").text()).toBe("Angefragt");
    });

    it("hands a single booking to the transition module", async () => {
      const wrapper = mountStatus();
      const start = spyOnStart(wrapper);

      await actionButton(wrapper, "Freigeben").trigger("click");

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

      await actionButton(wrapper, "Stornieren").trigger("click");

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

      await actionButton(wrapper, "Wiederherstellen").trigger("click");

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
    it("locks every action and says to save first", async () => {
      const wrapper = mountStatus({ dirty: true });
      const start = spyOnStart(wrapper);

      expect(
        actionButtons(wrapper).every((button) => button.element.disabled)
      ).toBe(true);
      expect(wrapper.find(".booking-status-hint").text()).toContain(SAVE_FIRST);

      await actionButton(wrapper, "Freigeben").trigger("click");
      expect(start).not.toHaveBeenCalled();
    });

    it("unlocks them again once the form is clean", async () => {
      const wrapper = mountStatus({ dirty: true });

      await wrapper.setProps({ dirty: false });

      expect(
        actionButtons(wrapper).some((button) => button.element.disabled)
      ).toBe(false);
      expect(wrapper.find(".booking-status-hint").exists()).toBe(false);
    });
  });

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

    /** Opens a Vuetify select by its class and clicks the option with `text`. */
    async function choose(wrapper, selector, text) {
      await wrapper.find(`${selector} .v-input__slot`).trigger("click");
      await wrapper.vm.$nextTick();
      const option = Array.from(
        document.querySelectorAll(
          ".v-menu__content.menuable__content__active .v-list-item"
        )
      ).find((el) => el.textContent.trim() === text);
      option.click();
      await wrapper.vm.$nextTick();
    }

    function selectOptions(wrapper) {
      return wrapper
        .findComponent({ ref: "initialStateSelect" })
        .props("items");
    }

    it("asks for the Anfangszustand instead of showing a state or actions", () => {
      const wrapper = mountCreate();

      expect(wrapper.find(".initial-state-select").exists()).toBe(true);
      expect(wrapper.find(".booking-status-chip").exists()).toBe(false);
      expect(actionButtons(wrapper)).toHaveLength(0);
      expect(wrapper.findAllComponents({ name: "v-switch" })).toHaveLength(0);
      expect(lastInitialState(wrapper)).toEqual({
        selection: "requested",
        paymentMethod: null,
        timePaid: null,
      });
    });

    it("offers Bezahlt only on a priced booking", () => {
      expect(selectOptions(mountCreate(25)).map((item) => item.text)).toEqual([
        "Angefragt",
        "Freigegeben",
        "Bezahlt",
      ]);
      expect(selectOptions(mountCreate(0)).map((item) => item.text)).toEqual([
        "Angefragt",
        "Freigegeben",
      ]);
    });

    it("says which state Freigegeben lands in", async () => {
      const wrapper = mountCreate(25);

      await choose(wrapper, ".initial-state-select", "Freigegeben");

      expect(lastInitialState(wrapper)).toEqual({
        selection: "confirmed",
        paymentMethod: null,
        timePaid: null,
      });
      expect(wrapper.find(".initial-state-hint").text()).toBe(
        "Wird angelegt als: Zahlung offen"
      );
      expect(wrapper.find(".initial-state-payment").exists()).toBe(false);
    });

    it("asks for the payment when Bezahlt is chosen, dated now", async () => {
      const now = new Date(2026, 8, 6, 10, 15);
      vi.useFakeTimers({ now, toFake: ["Date"] });
      try {
        const wrapper = mountCreate(25);

        await choose(wrapper, ".initial-state-select", "Bezahlt");
        expect(wrapper.find(".initial-state-payment").exists()).toBe(true);
        expect(lastInitialState(wrapper)).toEqual({
          selection: "paid",
          paymentMethod: null,
          timePaid: now.getTime(),
        });

        await choose(wrapper, ".initial-state-payment-method", "Überweisung");
        expect(lastInitialState(wrapper)).toEqual({
          selection: "paid",
          paymentMethod: "TRANSFER",
          timePaid: now.getTime(),
        });
        expect(wrapper.find(".initial-state-hint").text()).toBe(
          "Wird angelegt als: Bestätigt"
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("falls back to Freigegeben when the booking turns free", async () => {
      const wrapper = mountCreate(25);
      await choose(wrapper, ".initial-state-select", "Bezahlt");

      await wrapper.setProps({ priceEur: 0 });

      expect(lastInitialState(wrapper)).toMatchObject({
        selection: "confirmed",
      });
      expect(wrapper.find(".initial-state-payment").exists()).toBe(false);
    });
  });

  describe("the rejection reason", () => {
    it("is shown for a rejected or cancelled booking, labelled by state, and edits the booking", async () => {
      const rejected = booking({ status: "rejected", rejectionReason: "" });
      const wrapper = mountStatus({ booking: rejected });
      expect(wrapper.find(".status-reason label").text()).toBe(
        "Ablehnungsgrund"
      );
      await wrapper.find(".status-reason textarea").setValue("Zu spät");
      expect(rejected.rejectionReason).toBe("Zu spät");

      expect(
        mountStatus({ booking: booking({ status: "cancelled" }) })
          .find(".status-reason label")
          .text()
      ).toBe("Stornierungsgrund");
      expect(
        mountStatus({ booking: booking({ status: "confirmed" }) })
          .find(".status-reason")
          .exists()
      ).toBe(false);
    });
  });
});
