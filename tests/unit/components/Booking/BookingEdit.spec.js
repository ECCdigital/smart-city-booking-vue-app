import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, lifecycleError } from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    getBooking: vi.fn(),
    createBooking: vi.fn(),
    updateBooking: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: { updateGroupBooking: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenantActivePaymentApps: vi.fn() },
}));
vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookable: vi.fn(), getBookablePrices: vi.fn() },
}));
vi.mock("@/services/api/ApiCheckoutService", () => ({
  default: { validateCheckoutItem: vi.fn() },
}));
vi.mock("@/components/Checkout/CheckoutCalendar.vue", () => ({
  default: {
    name: "CheckoutCalendar",
    render(h) {
      return h("div");
    },
  },
}));

import BookingEdit from "@/components/Booking/BookingEdit.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiTenantService from "@/services/api/ApiTenantService";

const CONFLICT_IN_CANCELLED =
  "Die Buchung ist inzwischen in einem anderen Zustand (Storniert).";

function booking(overrides = {}) {
  return {
    id: "bk-1",
    tenantId: "tenant-1",
    name: "Erika Muster",
    mail: "erika@example.org",
    timeBegin: 1_700_000_000_000,
    timeEnd: 1_700_003_600_000,
    priceEur: 25,
    status: "requested",
    bookableItems: [
      {
        bookableId: "room-1",
        amount: 1,
        _bookableUsed: {
          id: "room-1",
          title: "Raum 1",
          type: "room",
          priceType: "per-hour",
          priceCategories: [{ priceEur: 25, fixedPrice: false }],
        },
      },
    ],
    ...overrides,
  };
}

async function mountEdit(propsData = {}) {
  ApiTenantService.getTenantActivePaymentApps.mockResolvedValue({ data: [] });
  const store = new Vuex.Store({
    modules: {
      toasts,
      tenants: {
        namespaced: true,
        getters: {
          tenants: () => [{ id: "tenant-1", name: "Stadt" }],
          currentTenantId: () => "tenant-1",
        },
      },
    },
  });
  const wrapper = mountComponent(BookingEdit, {
    store,
    propsData: {
      booking: booking(),
      bookables: [],
      workflow: {},
      groupBooking: null,
      ...propsData,
    },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return { wrapper, store };
}

/** A booking the form is to create: no id, no state yet. */
function draft() {
  return booking({ id: null, status: undefined, paymentProvider: "invoice" });
}

function inlineError(wrapper) {
  return wrapper.find(".booking-create-error");
}

/** The last toast the form raised; the toasts module keeps one list for every store. */
function lastToast(store) {
  const { collection } = store.state.toasts;
  return collection[collection.length - 1];
}

function nameInput(wrapper) {
  return wrapper
    .findAllComponents({ name: "v-text-field" })
    .wrappers.find((field) => field.props("label") === "Name *")
    .find("input");
}

async function submit(wrapper) {
  wrapper.findComponent({ name: "SaveBar" }).vm.$emit("submit");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/** The two savers: a create is a POST, an update a PUT. */
function savers() {
  return [ApiBookingService.createBooking, ApiBookingService.updateBooking];
}
function saveAnswers(value) {
  savers().forEach((saver) => saver.mockResolvedValue(value));
}
function saveFails(error) {
  savers().forEach((saver) => saver.mockRejectedValue(error));
}
function putBody() {
  return savers().find((saver) => saver.mock.calls.length).mock.calls[0][0];
}

/**
 * The form edits content; the state is moved on the booking page (spec E2).
 * An existing booking has no status section here - no actions, no reason,
 * no refund audit - and the save PUT carries content only (spec E1.1). A
 * create carries the chosen Anfangszustand as `status` (spec E10); a create
 * the backend refuses is named at the Anfangszustand and as a toast (spec
 * E5), an update refused only as a toast. Nothing here sends a flag.
 */
describe("BookingEdit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  describe("an existing booking", () => {
    it.each(["requested", "rejected", "cancelled"])(
      "shows no status section at %s - the booking page runs the transitions",
      async (status) => {
        const { wrapper } = await mountEdit({
          booking: booking({ status, rejectionReason: "Zu spät" }),
        });

        expect(
          wrapper.findComponent({ name: "BookingInitialState" }).exists()
        ).toBe(false);
        expect(wrapper.find(".booking-status-path").exists()).toBe(false);
        expect(wrapper.find("button.booking-action").exists()).toBe(false);
        expect(wrapper.find(".booking-status-reason").exists()).toBe(false);
      }
    );
  });

  describe("the paid date", () => {
    function paymentDateField(wrapper) {
      return wrapper
        .findAllComponents({ name: "v-text-field" })
        .wrappers.find((field) => field.props("label") === "Bezahldatum");
    }

    it("is editable at Bestätigt only, not on a booking cancelled out of it", async () => {
      const confirmed = await mountEdit({
        booking: booking({ status: "confirmed", timePaid: 1_700_000_000_000 }),
      });
      expect(paymentDateField(confirmed.wrapper).props("disabled")).toBe(false);

      const cancelled = await mountEdit({
        booking: booking({
          status: "cancelled",
          timePaid: 1_700_000_000_000,
          cancellationRefund: { cancelledFrom: "confirmed" },
        }),
      });
      expect(paymentDateField(cancelled.wrapper).props("disabled")).toBe(true);
    });
  });

  describe("Speichern", () => {
    it("sends content only on an update - no flag, no status", async () => {
      const { wrapper } = await mountEdit({
        booking: booking({
          _id: "mongo-1",
          status: "confirmed",
          isCommitted: true,
          isPayed: true,
          isRejected: false,
        }),
      });
      saveAnswers({ data: {} });
      await nameInput(wrapper).setValue("Max Muster");

      await submit(wrapper);

      expect(putBody()).toMatchObject({ id: "bk-1", name: "Max Muster" });
      ["_id", "status", "isCommitted", "isPayed", "isRejected"].forEach((key) =>
        expect(putBody()).not.toHaveProperty(key)
      );
      expect(wrapper.emitted("saved")).toHaveLength(1);
    });

    it.each(["rejected", "cancelled"])(
      "saves a %s booking without a reason - the reason is asked where it is rejected or cancelled",
      async (status) => {
        const { wrapper } = await mountEdit({
          booking: booking({ status, rejectionReason: null }),
        });
        saveAnswers({ data: {} });
        await nameInput(wrapper).setValue("Max Muster");

        await submit(wrapper);

        expect(ApiBookingService.updateBooking).toHaveBeenCalledTimes(1);
        expect(putBody()).toMatchObject({ id: "bk-1", name: "Max Muster" });
        expect(wrapper.emitted("saved")).toHaveLength(1);
      }
    );

    it("sends the chosen initial state and no flag on a create", async () => {
      const { wrapper } = await mountEdit({ booking: draft() });
      saveAnswers({ data: {} });
      wrapper
        .findComponent({ name: "BookingInitialState" })
        .vm.$emit("update:initial-state", {
          selection: "paid",
          paymentMethod: "CASH",
          timePaid: 1_700_000_000_000,
        });

      await submit(wrapper);

      expect(putBody()).toMatchObject({
        status: "confirmed",
        paymentMethod: "CASH",
        timePaid: 1_700_000_000_000,
      });
      ["isCommitted", "isPayed", "isRejected"].forEach((key) =>
        expect(putBody()).not.toHaveProperty(key)
      );
      expect(wrapper.emitted("saved")).toHaveLength(1);
    });

    it("creates as Angefragt when nothing else was chosen", async () => {
      const { wrapper } = await mountEdit({ booking: draft() });
      saveAnswers({ data: {} });

      await submit(wrapper);

      expect(putBody().status).toBe("requested");
    });

    it("names the missing payment at the Anfangszustand and as a toast when the create is refused with a 400", async () => {
      const { wrapper, store } = await mountEdit({ booking: draft() });
      const MISSING_PAYMENT =
        "Eine als bezahlt angelegte Buchung braucht Zahlungsart und Zahldatum.";
      saveFails(
        lifecycleError(400, "missing_payment_details", {
          status: "confirmed",
          missing: ["paymentMethod"],
        })
      );

      await submit(wrapper);

      expect(inlineError(wrapper).text()).toBe(MISSING_PAYMENT);
      expect(
        wrapper.findComponent({ name: "BookingInitialState" }).element
          .nextElementSibling
      ).toBe(inlineError(wrapper).element);
      expect(lastToast(store)).toMatchObject({
        type: "error",
        title: "Fehler beim Erstellen",
        message: MISSING_PAYMENT,
      });
      expect(wrapper.emitted("reload")).toBeUndefined();
      expect(wrapper.emitted("saved")).toBeUndefined();
    });

    it("names a refused initial state at the Anfangszustand without a reload on a 400", async () => {
      const { wrapper } = await mountEdit({ booking: draft() });
      saveFails(lifecycleError(400, "invalid_status", { status: "cancelled" }));

      await submit(wrapper);

      expect(inlineError(wrapper).text()).toBe(
        "In diesem Zustand kann keine Buchung angelegt werden."
      );
      expect(wrapper.emitted("reload")).toBeUndefined();
    });

    it("shows a conflict of the create at the Anfangszustand on a 409", async () => {
      const { wrapper, store } = await mountEdit({ booking: draft() });
      const CONFLICT = "Der Vorgang ist in diesem Zustand nicht möglich.";
      saveFails(
        lifecycleError(409, "compartments_unavailable", {
          bookableId: "room-1",
          capacity: 1,
          occupied: 1,
        })
      );

      await submit(wrapper);

      expect(inlineError(wrapper).text()).toBe(CONFLICT);
      expect(lastToast(store)).toMatchObject({ message: CONFLICT });
      expect(wrapper.emitted("saved")).toBeUndefined();
    });

    it("clears the message on the next save", async () => {
      const { wrapper } = await mountEdit({ booking: draft() });
      saveFails(lifecycleError(400, "invalid_status", { status: "cancelled" }));
      await submit(wrapper);
      expect(inlineError(wrapper).exists()).toBe(true);

      saveAnswers({ data: {} });
      await submit(wrapper);

      expect(inlineError(wrapper).exists()).toBe(false);
      expect(wrapper.emitted("saved")).toHaveLength(1);
    });

    it("names a refused update as a toast only and asks for a reload on a 409", async () => {
      const { wrapper, store } = await mountEdit();
      saveFails(
        lifecycleError(409, "invalid_transition", { status: "cancelled" })
      );

      await submit(wrapper);

      expect(lastToast(store)).toMatchObject({
        type: "error",
        title: "Fehler beim Bearbeiten",
        message: CONFLICT_IN_CANCELLED,
      });
      expect(inlineError(wrapper).exists()).toBe(false);
      expect(wrapper.emitted("reload")).toHaveLength(1);
      expect(wrapper.emitted("saved")).toBeUndefined();
    });
  });
});
