import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vue from "vue";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
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
  },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    getBooking: vi.fn(),
    getReceipt: vi.fn(),
    getInvoice: vi.fn(),
    getCancellationReceipt: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: { getGroupBookingByBooking: vi.fn() },
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
