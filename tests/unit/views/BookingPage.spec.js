import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vue from "vue";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  clickMenuEntry,
  offeredActions,
  primaryButton,
} from "@tests/unit/support/statusPath";
import {
  flushPromises,
  lifecycleError,
  serverError,
} from "@tests/unit/support/api";
import toasts from "@/store/modules/toasts";

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));
vi.mock("@/utils/tenantMembership", () => ({
  isTenantMember: vi.fn(() => true),
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: {
    allowUpdate: vi.fn(() => true),
    allowReadAny: vi.fn(() => true),
    allowReprint: vi.fn(() => true),
  },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    getBooking: vi.fn(),
    getReceipt: vi.fn(),
    getInvoice: vi.fn(),
    getCancellationReceipt: vi.fn(),
    commitBooking: vi.fn(),
    payBooking: vi.fn(),
    rejectBooking: vi.fn(),
    reinstateBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
    downloadBookingIcal: vi.fn(),
    generateReceipt: vi.fn(),
    generateInvoice: vi.fn(),
    reprintCancellationReceipt: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    getGroupBookingByBooking: vi.fn(),
    commitGroupBooking: vi.fn(),
    payGroupBooking: vi.fn(),
    rejectGroupBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
  },
}));
vi.mock("@/utils/fileDownload", () => ({
  saveBlob: vi.fn(),
  openFileUrl: vi.fn(),
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    props: ["title", "scrollBody"],
    render(h) {
      return h("div", [
        h("h1", { class: "admin-layout-title" }, this.title),
        h("div", { class: "admin-layout-header" }, this.$slots["page-header"]),
        h("div", { class: "admin-layout-body" }, this.$slots.default),
      ]);
    },
  },
}));
// The access section loads its projection on mount; it is the Locker strand's.
vi.mock("@/components/Booking/BookingAccessPoints.vue", () => ({
  default: {
    name: "BookingAccessPoints",
    render(h) {
      return h("div", { class: "booking-access-points-double" });
    },
  },
}));

import BookingPage from "@/views/BookingPage.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import { isTenantMember } from "@/utils/tenantMembership";
import { saveBlob } from "@/utils/fileDownload";

const BACK = "Zurück zu Buchungen";
const COPY = "Link kopieren";
const COPIED = "Link kopiert";
const NOT_FOUND_ANY = "Diese Buchung existiert nicht mehr.";
const NOT_FOUND_OWN =
  "Der Eintrag wurde nicht gefunden. Entweder existiert er nicht mehr, oder er liegt außerhalb Ihrer Berechtigung.";

function booking(overrides = {}) {
  return {
    id: "bk-1",
    tenantId: "tenant-1",
    timeCreated: 1_700_000_000_000,
    timeBegin: 1_700_003_600_000,
    timeEnd: 1_700_007_200_000,
    priceEur: 25,
    status: "payment_due",
    paymentMethod: "CASH",
    paymentProvider: "manual",
    name: "Erika Muster",
    mail: "erika@example.org",
    bookableItems: [
      {
        amount: 2,
        userGrossPriceEur: 12.5,
        _bookableUsed: { title: "Raum 1", type: "room" },
      },
    ],
    attachments: [],
    ...overrides,
  };
}

let pending;

/** Holds `getBooking` open until the spec resolves or rejects it. */
function holdBooking() {
  pending = {};
  pending.promise = new Promise((resolve, reject) => {
    pending.resolve = resolve;
    pending.reject = reject;
  });
  ApiBookingService.getBooking.mockReturnValue(pending.promise);
}

function mountPage({
  tenant = "tenant-1",
  query = { tenant },
  from = null,
  currentTenantId = "tenant-1",
} = {}) {
  const push = vi.fn(() => Promise.resolve());
  const back = vi.fn();
  const tenantState = { currentTenantId };
  const store = new Vuex.Store({
    modules: {
      toasts,
      tenants: {
        namespaced: true,
        state: tenantState,
        getters: {
          currentTenantId: (state) => state.currentTenantId,
          tenants: () => [
            { id: "tenant-1", name: "Dev Tenant" },
            { id: "tenant-2", name: "Other Tenant" },
          ],
          currentTenant: (state, getters) =>
            getters.tenants.find((t) => t.id === state.currentTenantId),
        },
        mutations: {
          select(state, id) {
            state.currentTenantId = id;
          },
        },
      },
    },
  });
  // Observable, so that the page's `$route.fullPath` watcher sees a change
  // the way it does behind the real router.
  const route = Vue.observable({
    name: "booking-details",
    fullPath: `/bookings/bk-1?tenant=${tenant}`,
    params: { bookingId: "bk-1" },
    query,
  });
  const wrapper = mountComponent(BookingPage, {
    store,
    mocks: { $route: route, $router: { push, back } },
  });
  // The router calls the guard before the instance exists; the spec hands it
  // the mounted one.
  BookingPage.beforeRouteEnter(route, from ? { name: from } : {}, (cb) =>
    cb(wrapper.vm)
  );
  return { wrapper, store, push, back, route };
}

async function settle(wrapper) {
  await flushPromises();
  // The tenant watcher decides one macrotask later.
  await flushPromises();
  await wrapper.vm.$nextTick();
}

function toastMessages(store) {
  return store.getters["toasts/all"].map((toast) => toast.message);
}

/** Spies on the mounted transition module, so that no route is called. */
function spyOnStart(wrapper) {
  return vi
    .spyOn(wrapper.vm.$refs.transitions, "start")
    .mockImplementation(() => {});
}

function toolbar(wrapper) {
  return wrapper.find(".admin-layout-header");
}

/** The first button reading `label`, or `undefined` when there is none. */
function buttonLabelled(wrapper, label) {
  return wrapper
    .findAll("button")
    .filter((button) => button.text().includes(label)).wrappers[0];
}

describe("BookingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTenantMember.mockReturnValue(true);
    BookingPermissionService.allowUpdate.mockReturnValue(true);
    BookingPermissionService.allowReadAny.mockReturnValue(true);
    ApiBookingService.getBooking.mockResolvedValue({ data: booking() });
    ApiGroupBookingService.getGroupBookingByBooking.mockRejectedValue(
      lifecycleError(404, "group_booking_not_found")
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("the five states", () => {
    it("loading: the toolbar offers only „Zurück“ over a skeleton body", async () => {
      holdBooking();
      const { wrapper } = mountPage();
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".admin-layout-title").text()).toBe("Buchung #bk-1");
      expect(toolbar(wrapper).text()).toContain(BACK);
      expect(toolbar(wrapper).text()).not.toContain(COPY);
      expect(toolbar(wrapper).text()).not.toContain("Bearbeiten");
      expect(wrapper.find(".v-skeleton-loader").exists()).toBe(true);
    });

    it("ready: shows the body once the booking answered, and reloads on a new URL", async () => {
      const { wrapper, route } = mountPage();
      await settle(wrapper);

      expect(wrapper.find(".v-skeleton-loader").exists()).toBe(false);
      expect(wrapper.find(".booking-page__body").exists()).toBe(true);
      expect(wrapper.text()).toContain("Erika Muster");
      expect(ApiBookingService.getBooking).toHaveBeenCalledWith(
        "bk-1",
        undefined,
        true
      );

      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({ name: "Max Muster" }),
      });
      route.fullPath = "/bookings/bk-1?tenant=tenant-2";
      await settle(wrapper);

      expect(wrapper.text()).toContain("Max Muster");
    });

    it("forgets the previous booking's series when a new URL fails to load", async () => {
      ApiGroupBookingService.getGroupBookingByBooking.mockResolvedValue({
        data: { id: "G-1", bookingIds: ["bk-1"] },
      });
      const { wrapper, route } = mountPage();
      await settle(wrapper);
      expect(wrapper.find(".booking-page__series").exists()).toBe(true);

      ApiBookingService.getBooking.mockRejectedValue(serverError(404));
      route.fullPath = "/bookings/bk-1?tenant=tenant-1&x=1";
      await settle(wrapper);

      expect(wrapper.find(".booking-page__series").exists()).toBe(false);
    });

    it("non-member: sends no request, names the tenant of the URL and leads to the list", async () => {
      isTenantMember.mockReturnValue(false);
      const { wrapper, push } = mountPage({ tenant: "tenant-foreign" });
      await settle(wrapper);

      expect(isTenantMember).toHaveBeenCalledWith("tenant-foreign");
      expect(ApiBookingService.getBooking).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain("Kein Zugriff auf diesen Mandanten");
      expect(wrapper.text()).toContain(
        "Diese Buchung gehört zu einem Mandanten, dem Sie nicht angehören."
      );
      expect(wrapper.find(".booking-page-empty-state__detail").text()).toBe(
        "tenant-foreign"
      );

      await wrapper.find(".booking-page-empty-state__action").trigger("click");
      expect(push).toHaveBeenCalledWith({ name: "bookings" });
    });

    it("not found: reads „existiert nicht mehr“ for Reichweite any", async () => {
      ApiBookingService.getBooking.mockRejectedValue(
        lifecycleError(404, "booking_not_found")
      );
      const { wrapper, push } = mountPage();
      await settle(wrapper);

      expect(wrapper.text()).toContain("Buchung nicht gefunden");
      expect(wrapper.text()).toContain(NOT_FOUND_ANY);
      expect(wrapper.text()).not.toContain(NOT_FOUND_OWN);

      await wrapper.find(".booking-page-empty-state__action").trigger("click");
      expect(push).toHaveBeenCalledWith({ name: "bookings" });
    });

    it("not found: reads the not-found-or-forbidden text for Reichweite own", async () => {
      BookingPermissionService.allowReadAny.mockReturnValue(false);
      ApiBookingService.getBooking.mockRejectedValue(serverError(404));
      const { wrapper } = mountPage();
      await settle(wrapper);

      expect(wrapper.text()).toContain("Buchung nicht gefunden");
      expect(wrapper.text()).toContain(NOT_FOUND_OWN);
      expect(wrapper.text()).not.toContain(NOT_FOUND_ANY);
    });

    it("error: any other failure offers „Erneut versuchen“, which loads again", async () => {
      ApiBookingService.getBooking.mockRejectedValue(serverError(500));
      const { wrapper } = mountPage();
      await settle(wrapper);

      expect(wrapper.text()).toContain("Buchung konnte nicht geladen werden");
      expect(wrapper.text()).toContain(
        "Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
      );

      ApiBookingService.getBooking.mockResolvedValue({ data: booking() });
      const retry = wrapper.find(".booking-page-empty-state__action");
      expect(retry.text()).toBe("Erneut versuchen");
      await retry.trigger("click");
      await settle(wrapper);

      expect(ApiBookingService.getBooking).toHaveBeenCalledTimes(2);
      expect(wrapper.find(".booking-page__body").exists()).toBe(true);
    });
  });

  describe("the toolbar", () => {
    it("„Zurück“ goes back when the list was the previous route, and pushes it otherwise", async () => {
      const fromList = mountPage({ from: "bookings" });
      await settle(fromList.wrapper);
      await buttonLabelled(fromList.wrapper, BACK).trigger("click");
      expect(fromList.back).toHaveBeenCalledTimes(1);
      expect(fromList.push).not.toHaveBeenCalled();

      const pasted = mountPage();
      await settle(pasted.wrapper);
      await buttonLabelled(pasted.wrapper, BACK).trigger("click");
      expect(pasted.back).not.toHaveBeenCalled();
      expect(pasted.push).toHaveBeenCalledWith({ name: "bookings" });
    });

    it("names the current tenant", async () => {
      const { wrapper } = mountPage();
      await settle(wrapper);

      expect(toolbar(wrapper).text()).toContain("Mandant: Dev Tenant");
    });

    it("offers „Bearbeiten“ only to whoever may update, leading to the editor", async () => {
      const { wrapper, push } = mountPage();
      await settle(wrapper);
      await buttonLabelled(wrapper, "Bearbeiten").trigger("click");
      expect(push).toHaveBeenCalledWith({
        name: "booking-edit",
        params: { bookingId: "bk-1" },
      });

      BookingPermissionService.allowUpdate.mockReturnValue(false);
      const readOnly = mountPage();
      await settle(readOnly.wrapper);
      expect(toolbar(readOnly.wrapper).text()).not.toContain("Bearbeiten");
    });

    it("shows the series chip only for a series member, linking with ?tenant=", async () => {
      const single = mountPage();
      await settle(single.wrapper);
      expect(single.wrapper.find(".booking-page__series").exists()).toBe(false);

      ApiGroupBookingService.getGroupBookingByBooking.mockResolvedValue({
        data: { id: "G-1", bookingIds: ["bk-1", "bk-2"] },
      });
      const member = mountPage();
      await settle(member.wrapper);
      const chip = member.wrapper.find(".booking-page__series");
      expect(chip.text()).toContain("Teil der Serie #G-1");
      await chip.trigger("click");
      expect(member.push).toHaveBeenCalledWith({
        name: "group-booking-details",
        params: { groupBookingId: "G-1" },
        query: { tenant: "tenant-1" },
      });
    });

    it("„Link kopieren“ copies the address and reads „Link kopiert“ for two seconds", async () => {
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
      const { wrapper } = mountPage();
      await settle(wrapper);

      vi.useFakeTimers();
      try {
        await buttonLabelled(wrapper, COPY).trigger("click");
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        expect(writeText).toHaveBeenCalledWith(window.location.href);
        expect(buttonLabelled(wrapper, COPIED).exists()).toBe(true);

        vi.advanceTimersByTime(2000);
        await wrapper.vm.$nextTick();
        expect(buttonLabelled(wrapper, COPIED)).toBeUndefined();
        expect(buttonLabelled(wrapper, COPY).exists()).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it("„Link kopieren“ toasts when the clipboard refuses", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn(() => Promise.reject(new Error("denied"))) },
        configurable: true,
      });
      const { wrapper, store } = mountPage();
      await settle(wrapper);

      await buttonLabelled(wrapper, COPY).trigger("click");
      await settle(wrapper);

      expect(store.getters["toasts/all"].map((t) => t.type)).toEqual(["error"]);
      expect(buttonLabelled(wrapper, COPIED)).toBeUndefined();
    });

    it("„Link kopieren“ is present in the empty states, not while loading", async () => {
      holdBooking();
      const loading = mountPage();
      await loading.wrapper.vm.$nextTick();
      expect(buttonLabelled(loading.wrapper, COPY)).toBeUndefined();

      isTenantMember.mockReturnValue(false);
      const nonMember = mountPage({ tenant: "tenant-foreign" });
      await settle(nonMember.wrapper);
      expect(buttonLabelled(nonMember.wrapper, COPY).exists()).toBe(true);
    });
  });

  describe("the body", () => {
    it("shows exactly Zeitraum, Kunde and Preis / Zahlungsstatus in the strip", async () => {
      const { wrapper } = mountPage();
      await settle(wrapper);

      const labels = wrapper
        .findAll(".booking-page__fact-label")
        .wrappers.map((label) => label.text());
      expect(labels).toEqual(["Zeitraum", "Kunde", "Preis / Zahlungsstatus"]);
      const strip = wrapper.find(".booking-page__strip").text();
      expect(strip).toContain("erika@example.org");
      expect(strip).toMatch(/25,00\s€/);
      expect(strip).toContain("Nein");
    });

    it("lists the objects with type, amount and unit price", async () => {
      const { wrapper } = mountPage();
      await settle(wrapper);

      const row = wrapper.find(".booking-page__objects tbody tr").text();
      expect(row).toContain("Raum 1");
      expect(row).toContain("2");
      expect(row).toMatch(/12,50\s€/);
    });

    it("shows customer fields, custom fields and remarks only where filled", async () => {
      const bare = mountPage();
      await settle(bare.wrapper);
      const customer = bare.wrapper.find(".booking-page__customer").text();
      expect(customer).toContain("Name");
      expect(customer).not.toContain("Firma");
      expect(bare.wrapper.find(".booking-page__custom-fields").exists()).toBe(
        false
      );
      expect(bare.wrapper.find(".booking-page__comments").exists()).toBe(false);

      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({
          company: "ACME",
          customFieldDefinitions: [
            { id: "f1", caption: "Teilnehmer", inputType: "numeric" },
            { id: "f2", caption: "Catering", inputType: "boolean" },
          ],
          customFieldValues: [{ fieldId: "f1", value: 12 }],
          internalComments: "Schlüssel liegt am Empfang",
        }),
      });
      const filled = mountPage();
      await settle(filled.wrapper);
      expect(filled.wrapper.find(".booking-page__customer").text()).toContain(
        "ACME"
      );
      const fields = filled.wrapper.find(".booking-page__custom-fields").text();
      expect(fields).toContain("Teilnehmer");
      expect(fields).toContain("12");
      expect(fields).not.toContain("Catering");
      const comments = filled.wrapper.find(".booking-page__comments").text();
      expect(comments).toContain("Interne Bemerkung");
      expect(comments).toContain("Schlüssel liegt am Empfang");
    });

    it("leaves out the objects and the customer block when they are empty", async () => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({ bookableItems: {}, name: "", mail: null }),
      });
      const { wrapper } = mountPage();
      await settle(wrapper);

      expect(wrapper.find(".booking-page__objects").exists()).toBe(false);
      expect(wrapper.find(".booking-page__customer").exists()).toBe(false);
    });

    it("shows Zahlung and Details", async () => {
      const { wrapper } = mountPage();
      await settle(wrapper);

      const payment = wrapper.find(".booking-page__payment").text();
      expect(payment).toMatch(/25,00\s€/);
      expect(payment).toContain("Bar");
      expect(payment).toContain("Manuelle Zahlung");

      const details = wrapper.find(".booking-page__details").text();
      expect(details).toContain("bk-1");
      expect(details).toContain("Selbststornierung erlaubt");
      expect(details).toContain("Serie");
    });

    it("offers the Zahlungslink while an online payment is pending, and the refund audit once cancelled", async () => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({
          status: "payment_due",
          paymentProvider: "giroCockpit",
        }),
      });
      const pending = mountPage();
      await settle(pending.wrapper);
      expect(pending.wrapper.find(".booking-page__payment").text()).toContain(
        "Zahlungslink"
      );
      expect(pending.wrapper.text()).not.toContain(
        "Erstattung bei Stornierung"
      );

      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({
          status: "cancelled",
          cancellationRefund: {
            originalAmountEur: 25,
            refundAmountEur: 20,
            cancellationFeeEur: 5,
            appliedRefundPercentage: 80,
            daysBeforeStart: 3,
          },
        }),
      });
      const cancelled = mountPage();
      await settle(cancelled.wrapper);
      const payment = cancelled.wrapper.find(".booking-page__payment").text();
      expect(payment).not.toContain("Zahlungslink");
      expect(payment).toContain("Erstattung bei Stornierung");
      expect(payment).toMatch(/20,00\s€/);
    });

    it("lists the Dokumente in four groups and downloads a receipt", async () => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({
          attachments: [{ type: "receipt", title: "BELEG-1.pdf" }],
        }),
      });
      ApiBookingService.getReceipt.mockResolvedValue({ data: new Blob() });
      const { wrapper } = mountPage();
      await settle(wrapper);

      const documents = wrapper.find(".booking-page__documents").text();
      expect(documents).toContain("Belege (1)");
      expect(documents).toContain("Rechnungen (0)");
      expect(documents).toContain("Stornobelege (0)");
      expect(documents).toContain("Anhänge (0)");
      expect(documents).toContain("keine");

      await wrapper.find(".booking-documents__download").trigger("click");
      expect(ApiBookingService.getReceipt).toHaveBeenCalledWith(
        "bk-1",
        "BELEG-1.pdf"
      );
    });
  });

  describe("the state block", () => {
    it.each([
      ["requested", "Angefragt"],
      ["confirmed", "Bestätigt"],
      ["cancelled", "Storniert"],
    ])("shows %s as %s in the headline", async (status, word) => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({ status }),
      });
      const { wrapper } = mountPage();
      await settle(wrapper);
      expect(wrapper.find(".booking-status-word").text()).toBe(word);
    });

    it("marks a free booking as Kostenfrei beside the state", async () => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({ priceEur: 0 }),
      });
      const free = mountPage();
      await settle(free.wrapper);
      expect(free.wrapper.find(".booking-status-free").text()).toBe(
        "Kostenfrei"
      );

      ApiBookingService.getBooking.mockResolvedValue({ data: booking() });
      const priced = mountPage();
      await settle(priced.wrapper);
      expect(priced.wrapper.find(".booking-status-free").exists()).toBe(false);
    });

    it("names the paid date under Bestätigt where the booking carries one", async () => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({
          status: "confirmed",
          timePaid: new Date(2026, 2, 5, 14, 30).getTime(),
        }),
      });
      const { wrapper } = mountPage();
      await settle(wrapper);
      expect(wrapper.text()).toContain("bezahlt 05.03.2026, 14:30");
    });

    it("shows the reason of a cancelled booking under the path", async () => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({ status: "cancelled", rejectionReason: "Zu spät" }),
      });
      const { wrapper } = mountPage();
      await settle(wrapper);
      const block = wrapper.find(".booking-status-reason");
      expect(block.text()).toContain("Stornierungsgrund");
      expect(block.text()).toContain("Zu spät");
    });
  });

  describe("the Dokumente actions", () => {
    it("offers „Beleg erstellen“ beside Belege and reloads the page after it", async () => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({ status: "confirmed" }),
      });
      ApiBookingService.generateReceipt.mockResolvedValue({ success: true });
      const { wrapper } = mountPage();
      await settle(wrapper);

      await buttonLabelled(wrapper, "Beleg erstellen").trigger("click");
      await settle(wrapper);

      expect(ApiBookingService.generateReceipt).toHaveBeenCalledWith("bk-1");
      expect(ApiBookingService.getBooking).toHaveBeenCalledTimes(2);
      expect(wrapper.find(".v-skeleton-loader").exists()).toBe(false);
    });
  });

  describe("the iCal on Zeitraum", () => {
    it("downloads the booking's calendar file, as the list's „Termin herunterladen“ does", async () => {
      ApiBookingService.downloadBookingIcal.mockResolvedValue({
        data: "BEGIN:VCALENDAR",
      });
      const { wrapper } = mountPage();
      await settle(wrapper);

      const icon = wrapper.find(".booking-page__ical");
      expect(icon.attributes("title")).toBe("Termin herunterladen");
      await icon.trigger("click");
      await settle(wrapper);

      expect(ApiBookingService.downloadBookingIcal).toHaveBeenCalledWith(
        "bk-1"
      );
      expect(saveBlob).toHaveBeenCalledTimes(1);
      const [blob, filename] = saveBlob.mock.calls[0];
      expect(blob.type).toBe("text/calendar;charset=utf-8");
      expect(filename).toBe("buchung-bk-1.ics");
    });

    it("offers no iCal without a period", async () => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({ timeBegin: null, timeEnd: null }),
      });
      const { wrapper } = mountPage();
      await settle(wrapper);
      expect(wrapper.find(".booking-page__ical").exists()).toBe(false);
    });

    it("toasts when the calendar file cannot be generated", async () => {
      ApiBookingService.downloadBookingIcal.mockRejectedValue(serverError());
      const { wrapper, store } = mountPage();
      await settle(wrapper);

      await wrapper.find(".booking-page__ical").trigger("click");
      await settle(wrapper);

      expect(saveBlob).not.toHaveBeenCalled();
      expect(toastMessages(store)).toContainEqual(
        expect.stringContaining("iCal-Datei")
      );
    });
  });

  /**
   * The page is a host of `BookingTransitions` (spec E3): the state as a
   * headline over its path with the state's transitions, handed to the
   * mounted module; every transition ends in `reload()`, and so does a
   * refused one that says the screen is stale (spec E5).
   */
  describe("the transitions", () => {
    it.each([
      ["requested", "Freigeben", ["Ablehnen"]],
      ["payment_due", "Als bezahlt markieren", ["Stornieren"]],
      ["confirmed", null, ["Stornieren"]],
      ["rejected", "Wiederherstellen", null],
      ["cancelled", "Wiederherstellen", null],
    ])(
      "offers at %s the button %s and the menu %j",
      async (status, button, menu) => {
        ApiBookingService.getBooking.mockResolvedValue({
          data: booking({ status }),
        });
        const { wrapper } = mountPage();
        await settle(wrapper);
        expect(await offeredActions(wrapper)).toEqual({ button, menu });
      }
    );

    it("offers nothing to a reader without the update right", async () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);
      const { wrapper } = mountPage();
      await settle(wrapper);
      expect(await offeredActions(wrapper)).toEqual({
        button: null,
        menu: null,
      });
    });

    it("hands a single booking to the transition module", async () => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({ status: "requested" }),
      });
      const { wrapper } = mountPage();
      await settle(wrapper);
      const start = spyOnStart(wrapper);

      await primaryButton(wrapper).trigger("click");

      expect(start).toHaveBeenCalledWith("confirm", {
        booking: booking({ status: "requested" }),
      });
    });

    it("hands a series member with its series and members", async () => {
      const members = [
        booking({ status: "confirmed" }),
        booking({ id: "bk-2", status: "confirmed" }),
      ];
      const groupBooking = {
        id: "grp-1",
        bookingIds: ["bk-1", "bk-2"],
        bookings: members,
      };
      ApiBookingService.getBooking.mockResolvedValue({ data: members[0] });
      ApiGroupBookingService.getGroupBookingByBooking.mockResolvedValue({
        data: groupBooking,
      });
      const { wrapper } = mountPage();
      await settle(wrapper);
      const start = spyOnStart(wrapper);

      await clickMenuEntry(wrapper, "Stornieren");

      expect(start).toHaveBeenCalledWith("cancel", {
        booking: members[0],
        groupBooking,
        bookings: members,
      });
    });

    it("reloads the booking after a transition, and after a stale failure", async () => {
      const { wrapper } = mountPage();
      await settle(wrapper);
      const transitions = wrapper.findComponent({ name: "BookingTransitions" });

      transitions.vm.$emit("transitioned", {
        action: "confirm",
        bookingId: "bk-1",
      });
      await settle(wrapper);
      expect(ApiBookingService.getBooking).toHaveBeenCalledTimes(2);

      transitions.vm.$emit("failed", {
        action: "confirm",
        error: null,
        message: "Nein",
        refetch: false,
      });
      await settle(wrapper);
      expect(ApiBookingService.getBooking).toHaveBeenCalledTimes(2);

      transitions.vm.$emit("failed", {
        action: "confirm",
        error: null,
        message: "Weg",
        refetch: true,
      });
      await settle(wrapper);
      expect(ApiBookingService.getBooking).toHaveBeenCalledTimes(3);
    });

    it("toasts the mapped message on a 409 and reloads, keeping the body in place", async () => {
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({ status: "requested" }),
      });
      ApiBookingService.commitBooking.mockRejectedValue(
        lifecycleError(409, "invalid_transition", { status: "confirmed" })
      );
      const { wrapper, store } = mountPage();
      await settle(wrapper);
      ApiBookingService.getBooking.mockResolvedValue({
        data: booking({ status: "confirmed" }),
      });

      await primaryButton(wrapper).trigger("click");
      await settle(wrapper);

      expect(toastMessages(store)).toContainEqual(
        expect.stringContaining("inzwischen in einem anderen Zustand")
      );
      expect(ApiBookingService.getBooking).toHaveBeenCalledTimes(2);
      expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
      expect(wrapper.find(".v-skeleton-loader").exists()).toBe(false);
    });
  });

  describe("a tenant switch while on the page", () => {
    it("leaves for the list when the navbar picks a tenant the URL does not name", async () => {
      const { wrapper, store, push } = mountPage();
      await settle(wrapper);

      store.commit("tenants/select", "tenant-2");
      await settle(wrapper);

      expect(push).toHaveBeenCalledWith({ name: "bookings" });
    });

    it("stays when the switch came from the URL of a new Buchungslink", async () => {
      const { wrapper, store, push, route } = mountPage();
      await settle(wrapper);

      route.query = { tenant: "tenant-2" };
      route.fullPath = "/bookings/bk-1?tenant=tenant-2";
      store.commit("tenants/select", "tenant-2");
      await settle(wrapper);

      expect(push).not.toHaveBeenCalled();
      expect(ApiBookingService.getBooking).toHaveBeenCalledTimes(2);
    });
  });
});
