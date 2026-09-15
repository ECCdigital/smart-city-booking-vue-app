import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vue from "vue";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  clickMenuEntry,
  offeredActions,
  segments,
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
    allowRead: vi.fn(() => true),
    allowUpdate: vi.fn(() => true),
    allowDelete: vi.fn(() => true),
    allowReadAny: vi.fn(() => true),
    allowReprint: vi.fn(() => true),
  },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: {
    commitBooking: vi.fn(),
    payBooking: vi.fn(),
    rejectBooking: vi.fn(),
    reinstateBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
    getReceipt: vi.fn(),
    getInvoice: vi.fn(),
    getCancellationReceipt: vi.fn(),
    downloadGroupBookingIcal: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: {
    getGroupBooking: vi.fn(),
    commitGroupBooking: vi.fn(),
    payGroupBooking: vi.fn(),
    rejectGroupBooking: vi.fn(),
    getCancellationRefundPreview: vi.fn(),
    reprintGroupCancellationReceipt: vi.fn(),
    generateGroupInvoice: vi.fn(),
    updateGroupBooking: vi.fn(),
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

import GroupBookingPage from "@/views/GroupBookingPage.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import { isTenantMember } from "@/utils/tenantMembership";
import { saveBlob } from "@/utils/fileDownload";

const BACK = "Zurück zu Buchungen";
const COPY = "Link kopieren";
const COPIED = "Link kopiert";
const NOT_FOUND_ANY = "Diese Serienbuchung existiert nicht mehr.";
const NOT_FOUND_OWN =
  "Der Eintrag wurde nicht gefunden. Entweder existiert er nicht mehr, oder er liegt außerhalb Ihrer Berechtigung.";
const REPRINT = "Neu ausstellen";
const CREATED = new Date(2026, 2, 1, 9, 0).getTime();

function member(overrides = {}) {
  return {
    id: "bk-1",
    tenantId: "tenant-1",
    name: "Erika Muster",
    mail: "erika@example.org",
    timeCreated: 1_700_000_000_000,
    timeBegin: new Date(2026, 2, 10, 10, 0).getTime(),
    timeEnd: new Date(2026, 2, 10, 12, 0).getTime(),
    bookableItems: [{ _bookableUsed: { title: "Raum 1" } }],
    priceEur: 25,
    status: "requested",
    paymentMethod: "CASH",
    paymentProvider: "manual",
    attachments: [],
    ...overrides,
  };
}

/** A series of members at `statuses`; a member given as an object carries its own fields. */
function series(statuses, overrides = {}) {
  const bookings = statuses.map((status, index) =>
    member({
      id: `bk-${index + 1}`,
      timeBegin: new Date(2026, 2, 10 + index, 10, 0).getTime(),
      timeEnd: new Date(2026, 2, 10 + index, 12, 0).getTime(),
      ...(typeof status === "string" ? { status } : status),
    })
  );
  return {
    id: "grp-1",
    tenantId: "tenant-1",
    timeCreated: CREATED,
    bookingIds: bookings.map((b) => b.id),
    bookings,
    ...overrides,
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

let pending;

/** Holds `getGroupBooking` open until the spec resolves or rejects it. */
function holdGroupBooking() {
  pending = {};
  pending.promise = new Promise((resolve, reject) => {
    pending.resolve = resolve;
    pending.reject = reject;
  });
  ApiGroupBookingService.getGroupBooking.mockReturnValue(pending.promise);
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
  const route = Vue.observable({
    name: "group-booking-details",
    fullPath: `/group-bookings/grp-1?tenant=${tenant}`,
    params: { groupBookingId: "grp-1" },
    query,
  });
  const wrapper = mountComponent(GroupBookingPage, {
    store,
    mocks: { $route: route, $router: { push, back } },
  });
  GroupBookingPage.beforeRouteEnter(route, from ? { name: from } : {}, (cb) =>
    cb(wrapper.vm)
  );
  return { wrapper, store, push, back, route };
}

/** Mounts the page over `groupBooking` and lets it load. */
async function mountLoaded(groupBooking, options) {
  ApiGroupBookingService.getGroupBooking.mockResolvedValue({
    data: groupBooking,
  });
  const mounted = mountPage(options);
  await settle(mounted.wrapper);
  return mounted;
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

function spyOnStart(wrapper) {
  return vi
    .spyOn(wrapper.vm.$refs.transitions, "start")
    .mockImplementation(() => {});
}

function toolbar(wrapper) {
  return wrapper.find(".admin-layout-header");
}

function buttonLabelled(wrapper, label) {
  return wrapper
    .findAll("button")
    .filter((button) => button.text().includes(label)).wrappers[0];
}

function hint(wrapper) {
  const line = wrapper.find(".booking-status-hint");
  return line.exists() ? line.text() : null;
}

describe("GroupBookingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTenantMember.mockReturnValue(true);
    BookingPermissionService.allowUpdate.mockReturnValue(true);
    BookingPermissionService.allowReadAny.mockReturnValue(true);
    BookingPermissionService.allowReprint.mockReturnValue(true);
    ApiGroupBookingService.getGroupBooking.mockResolvedValue({
      data: series(["requested", "requested"]),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("the five states", () => {
    it("loading: the toolbar offers only „Zurück“ over a skeleton body", async () => {
      holdGroupBooking();
      const { wrapper } = mountPage();
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".admin-layout-title").text()).toBe(
        "Serienbuchung #grp-1"
      );
      expect(toolbar(wrapper).text()).toContain(BACK);
      expect(toolbar(wrapper).text()).not.toContain(COPY);
      expect(wrapper.find(".v-skeleton-loader").exists()).toBe(true);
    });

    it("ready: shows the body once the series answered, and reloads on a new URL", async () => {
      const { wrapper, route } = mountPage();
      await settle(wrapper);

      expect(wrapper.find(".v-skeleton-loader").exists()).toBe(false);
      expect(wrapper.find(".group-booking-page__body").exists()).toBe(true);
      expect(wrapper.text()).toContain("Erika Muster");
      expect(ApiGroupBookingService.getGroupBooking).toHaveBeenCalledWith(
        "grp-1",
        undefined,
        true
      );

      ApiGroupBookingService.getGroupBooking.mockResolvedValue({
        data: series([{ status: "requested", name: "Max Muster" }]),
      });
      route.fullPath = "/group-bookings/grp-1?tenant=tenant-2";
      await settle(wrapper);

      expect(wrapper.text()).toContain("Max Muster");
    });

    it("non-member: sends no request, names the tenant of the URL and leads to the list", async () => {
      isTenantMember.mockReturnValue(false);
      const { wrapper, push } = mountPage({ tenant: "tenant-foreign" });
      await settle(wrapper);

      expect(isTenantMember).toHaveBeenCalledWith("tenant-foreign");
      expect(ApiGroupBookingService.getGroupBooking).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain("Kein Zugriff auf diesen Mandanten");
      expect(wrapper.text()).toContain(
        "Diese Serienbuchung gehört zu einem Mandanten, dem Sie nicht angehören."
      );
      expect(wrapper.find(".booking-page-empty-state__detail").text()).toBe(
        "tenant-foreign"
      );

      await wrapper.find(".booking-page-empty-state__action").trigger("click");
      expect(push).toHaveBeenCalledWith({ name: "bookings" });
    });

    it("not found: reads „existiert nicht mehr“ for Reichweite any", async () => {
      ApiGroupBookingService.getGroupBooking.mockRejectedValue(
        lifecycleError(404, "group_booking_not_found")
      );
      const { wrapper, push } = mountPage();
      await settle(wrapper);

      expect(wrapper.text()).toContain("Serienbuchung nicht gefunden");
      expect(wrapper.text()).toContain(NOT_FOUND_ANY);
      expect(wrapper.text()).not.toContain(NOT_FOUND_OWN);

      await wrapper.find(".booking-page-empty-state__action").trigger("click");
      expect(push).toHaveBeenCalledWith({ name: "bookings" });
    });

    it("not found: reads the not-found-or-forbidden text for Reichweite own", async () => {
      BookingPermissionService.allowReadAny.mockReturnValue(false);
      ApiGroupBookingService.getGroupBooking.mockRejectedValue(
        serverError(404)
      );
      const { wrapper } = mountPage();
      await settle(wrapper);

      expect(wrapper.text()).toContain("Serienbuchung nicht gefunden");
      expect(wrapper.text()).toContain(NOT_FOUND_OWN);
      expect(wrapper.text()).not.toContain(NOT_FOUND_ANY);
    });

    it("error: any other failure offers „Erneut versuchen“, which loads again", async () => {
      ApiGroupBookingService.getGroupBooking.mockRejectedValue(
        serverError(500)
      );
      const { wrapper } = mountPage();
      await settle(wrapper);

      expect(wrapper.text()).toContain(
        "Serienbuchung konnte nicht geladen werden"
      );
      expect(wrapper.text()).toContain(
        "Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
      );

      ApiGroupBookingService.getGroupBooking.mockResolvedValue({
        data: series(["requested"]),
      });
      const retry = wrapper.find(".booking-page-empty-state__action");
      expect(retry.text()).toBe("Erneut versuchen");
      await retry.trigger("click");
      await settle(wrapper);

      expect(ApiGroupBookingService.getGroupBooking).toHaveBeenCalledTimes(2);
      expect(wrapper.find(".group-booking-page__body").exists()).toBe(true);
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

    it("names the current tenant and offers no „Bearbeiten“", async () => {
      const { wrapper } = mountPage();
      await settle(wrapper);

      expect(toolbar(wrapper).text()).toContain("Mandant: Dev Tenant");
      expect(toolbar(wrapper).text()).not.toContain("Bearbeiten");
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

    it("„Link kopieren“ is present in the empty states, not while loading", async () => {
      holdGroupBooking();
      const loading = mountPage();
      await loading.wrapper.vm.$nextTick();
      expect(buttonLabelled(loading.wrapper, COPY)).toBeUndefined();

      isTenantMember.mockReturnValue(false);
      const nonMember = mountPage({ tenant: "tenant-foreign" });
      await settle(nonMember.wrapper);
      expect(buttonLabelled(nonMember.wrapper, COPY).exists()).toBe(true);
    });
  });

  /**
   * The series as a booking (spec E9, N5): the members' shared state as a
   * headline over the series' path, or Gemischt with a count per state; a
   * series-wide action, worded with "Serie", only where the shared state
   * allows it; a member row's action handed to the same module. There is no
   * series-wide Wiederherstellen.
   */
  describe("the series' state", () => {
    it("shows the members' shared state in the headline, captioned as the series' state", async () => {
      const { wrapper } = await mountLoaded(series(["confirmed", "confirmed"]));
      expect(wrapper.find(".booking-status-label").text()).toBe(
        "Zustand der Serie"
      );
      expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
    });

    it("draws the path from the total price, dated by the series' request only", async () => {
      const priced = await mountLoaded(
        series([
          { status: "confirmed", timePaid: 1_700_100_000_000 },
          { status: "confirmed", timePaid: 1_700_100_000_000 },
        ])
      );
      expect(segments(priced.wrapper)).toEqual([
        { label: "Angefragt", state: "done", date: "01.03.2026, 09:00" },
        { label: "Zahlung offen", state: "done", date: null },
        { label: "Bestätigt", state: "current", date: null },
      ]);
      expect(priced.wrapper.find(".booking-status-free").exists()).toBe(false);

      const free = await mountLoaded(
        series([
          { status: "requested", priceEur: 0 },
          { status: "requested", priceEur: 0 },
        ])
      );
      expect(segments(free.wrapper).map((segment) => segment.label)).toEqual([
        "Angefragt",
        "Bestätigt",
      ]);
      expect(free.wrapper.find(".booking-status-free").text()).toBe(
        "Kostenfrei"
      );
    });

    it("cuts a cancelled series behind the step every member reached, without a date", async () => {
      const { wrapper } = await mountLoaded(
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

    it("shows the reason under the path only where every member gives the same one", async () => {
      const agreed = await mountLoaded(
        series([
          cancelledFrom("confirmed", { rejectionReason: "Krank" }),
          cancelledFrom("confirmed", { rejectionReason: "Krank" }),
        ])
      );
      const block = agreed.wrapper.find(".booking-status-reason");
      expect(block.text()).toContain("Stornierungsgrund");
      expect(block.text()).toContain("Krank");

      const differing = await mountLoaded(
        series([
          cancelledFrom("confirmed", { rejectionReason: "Krank" }),
          cancelledFrom("confirmed", { rejectionReason: "Umzug" }),
        ])
      );
      expect(differing.wrapper.find(".booking-status-reason").exists()).toBe(
        false
      );
    });

    it("says Gemischt where the members disagree, counts them per state and points at the list", async () => {
      const { wrapper } = await mountLoaded(
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
        const { wrapper } = await mountLoaded(series(statuses));
        expect(await offeredActions(wrapper)).toEqual({ button, menu });
      }
    );

    it("offers nothing to a reader without the update right, and no hint either", async () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);

      const uniform = await mountLoaded(series(["requested", "requested"]));
      expect(await offeredActions(uniform.wrapper)).toEqual({
        button: null,
        menu: null,
      });
      expect(hint(uniform.wrapper)).toBeNull();

      const mixed = await mountLoaded(series(["requested", "confirmed"]));
      expect(mixed.wrapper.find(".booking-status-word").text()).toBe(
        "Gemischt"
      );
      expect(hint(mixed.wrapper)).toBeNull();
    });

    it("hands the whole series to the transition module, with no single-member option", async () => {
      const groupBooking = series(["confirmed", "confirmed"]);
      const { wrapper } = await mountLoaded(groupBooking);
      const start = spyOnStart(wrapper);

      await clickMenuEntry(wrapper, "Serie stornieren");

      expect(start).toHaveBeenCalledWith("cancel", {
        booking: groupBooking.bookings[0],
        groupBooking,
        bookings: groupBooking.bookings,
        seriesOnly: true,
      });
    });

    it("reloads the series after a transition, and after a stale failure", async () => {
      const { wrapper } = await mountLoaded(series(["requested", "requested"]));
      const transitions = wrapper.findComponent({ name: "BookingTransitions" });

      transitions.vm.$emit("transitioned", {
        action: "confirm",
        groupBookingId: "grp-1",
      });
      await settle(wrapper);
      expect(ApiGroupBookingService.getGroupBooking).toHaveBeenCalledTimes(2);

      transitions.vm.$emit("failed", { action: "confirm", refetch: false });
      await settle(wrapper);
      expect(ApiGroupBookingService.getGroupBooking).toHaveBeenCalledTimes(2);

      transitions.vm.$emit("failed", { action: "confirm", refetch: true });
      await settle(wrapper);
      expect(ApiGroupBookingService.getGroupBooking).toHaveBeenCalledTimes(3);
      expect(wrapper.find(".v-skeleton-loader").exists()).toBe(false);
    });
  });

  describe("the strip", () => {
    it("shows the overall range with the number of dates, the customer and the series' price", async () => {
      const { wrapper } = await mountLoaded(
        series(["confirmed", "confirmed", "confirmed"])
      );

      const labels = wrapper
        .findAll(".group-booking-page__fact-label")
        .wrappers.map((label) => label.text());
      expect(labels).toEqual(["Zeitraum"]);
      const strip = wrapper.find(".group-booking-page__strip").text();
      expect(strip).toContain("10.03.26, 10:00 – 12.03.26, 12:00");
      expect(strip).toContain("3 Termine");
      expect(strip).toContain("erika@example.org");
      const payment = wrapper.find(".group-booking-page__payment").text();
      expect(payment).toMatch(/75,00\s€/);
      expect(payment).toContain("Ja");
    });

    it("reads the range off date strings as well", async () => {
      const { wrapper } = await mountLoaded(
        series([
          {
            status: "requested",
            timeBegin: "2026-03-10T09:00:00.000Z",
            timeEnd: "2026-03-10T11:00:00.000Z",
          },
          { status: "requested", timeBegin: null, timeEnd: null },
        ])
      );

      const strip = wrapper.find(".group-booking-page__strip").text();
      expect(strip).toContain("10.03.26");
      expect(strip).toContain("2 Termine");
    });

    it("downloads the calendar file of every member", async () => {
      ApiBookingService.downloadGroupBookingIcal.mockResolvedValue({
        data: "BEGIN:VCALENDAR",
      });
      const { wrapper } = await mountLoaded(series(["requested", "requested"]));

      const icon = wrapper.find(".group-booking-page__ical");
      expect(icon.attributes("title")).toBe(
        "Termine aller Buchungen herunterladen"
      );
      await icon.trigger("click");
      await settle(wrapper);

      expect(ApiBookingService.downloadGroupBookingIcal).toHaveBeenCalledWith([
        "bk-1",
        "bk-2",
      ]);
      const [blob, filename] = saveBlob.mock.calls[0];
      expect(blob.type).toBe("text/calendar;charset=utf-8");
      expect(filename).toBe("serienbuchung-grp-1.ics");
    });

    it("toasts when the calendar file cannot be generated", async () => {
      ApiBookingService.downloadGroupBookingIcal.mockRejectedValue(
        serverError()
      );
      const { wrapper, store } = await mountLoaded(series(["requested"]));

      await wrapper.find(".group-booking-page__ical").trigger("click");
      await settle(wrapper);

      expect(saveBlob).not.toHaveBeenCalled();
      expect(toastMessages(store)).toContainEqual(
        expect.stringContaining("iCal-Datei")
      );
    });
  });

  describe("the members", () => {
    it("lists every member with period, object, state and price", async () => {
      const { wrapper } = await mountLoaded(
        series(["requested", { status: "confirmed", priceEur: 0 }])
      );

      const rows = wrapper.findAll(".group-booking-page__member");
      expect(rows.length).toBe(2);
      expect(rows.at(0).text()).toContain("bk-1");
      expect(rows.at(0).text()).toContain("10.03.26, 10:00");
      expect(rows.at(0).text()).toContain("Raum 1");
      expect(rows.at(0).text()).toContain("Angefragt");
      expect(rows.at(0).text()).toMatch(/25,00\s€/);
      expect(rows.at(1).text()).toContain("Bestätigt");
      expect(rows.at(1).text()).toContain("Kostenfrei");
    });

    it("leads to the member's Buchungsseite with ?tenant=", async () => {
      const { wrapper, push } = await mountLoaded(
        series(["requested", "requested"])
      );

      await wrapper
        .findAll(".group-booking-page__member-link")
        .at(1)
        .trigger("click");

      expect(push).toHaveBeenCalledWith({
        name: "booking-details",
        params: { bookingId: "bk-2" },
        query: { tenant: "tenant-1" },
      });
    });

    it("keeps the plain verbs in the members' rows and hands the member with its series to the module", async () => {
      const groupBooking = series(["requested", "confirmed"]);
      const { wrapper } = await mountLoaded(groupBooking);
      const start = spyOnStart(wrapper);
      expect(wrapper.text()).not.toContain("Serie stornieren");

      await wrapper
        .findAll(".group-booking-page__member-menu")
        .at(1)
        .trigger("click");
      await wrapper.vm.$nextTick();
      const entries = Array.from(
        document.querySelectorAll(
          ".v-menu__content .group-booking-page__member-action"
        )
      );
      expect(entries.map((entry) => entry.textContent.trim())).toEqual([
        "Stornieren",
      ]);
      entries[0].click();
      await wrapper.vm.$nextTick();

      expect(start).toHaveBeenCalledWith("cancel", {
        booking: groupBooking.bookings[1],
        groupBooking,
        bookings: groupBooking.bookings,
      });
    });

    it("offers no row menu to a reader without the update right", async () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);
      const { wrapper } = await mountLoaded(series(["requested"]));
      expect(wrapper.find(".group-booking-page__member-menu").exists()).toBe(
        false
      );
    });
  });

  describe("the Bemerkungen", () => {
    it("shows no pencil to a reader without the update right on every member", async () => {
      BookingPermissionService.allowUpdate.mockReturnValue(false);
      const { wrapper } = await mountLoaded(
        series(["requested"], { internalComments: "Alt" })
      );

      expect(wrapper.find(".group-booking-page__comments").text()).toContain(
        "Alt"
      );
      expect(wrapper.find(".group-booking-page__comment-edit").exists()).toBe(
        false
      );
    });

    it("saves the internal comment through the series and reloads", async () => {
      ApiGroupBookingService.updateGroupBooking.mockResolvedValue({});
      const groupBooking = series(["requested"], {
        internalComments: "Alt",
      });
      const { wrapper, store } = await mountLoaded(groupBooking);
      expect(wrapper.find(".group-booking-page__comments").text()).toContain(
        "Alt"
      );

      await wrapper.find(".group-booking-page__comment-edit").trigger("click");
      await wrapper.find("textarea").setValue("Neu");
      await buttonLabelled(wrapper, "Speichern").trigger("click");
      await settle(wrapper);

      expect(ApiGroupBookingService.updateGroupBooking).toHaveBeenCalledWith(
        "tenant-1",
        "grp-1",
        expect.objectContaining({ id: "grp-1", internalComments: "Neu" })
      );
      expect(ApiGroupBookingService.getGroupBooking).toHaveBeenCalledTimes(2);
      expect(wrapper.find("textarea").exists()).toBe(false);
      expect(toastMessages(store)).toContain(
        "Die Serienbuchung wurde erfolgreich aktualisiert."
      );
    });

    it("„Abbrechen“ drops the edit without a request", async () => {
      const { wrapper } = await mountLoaded(series(["requested"]));
      expect(wrapper.find(".group-booking-page__comments").text()).toContain(
        "Kein Kommentar vorhanden"
      );

      await wrapper.find(".group-booking-page__comment-edit").trigger("click");
      await wrapper.find("textarea").setValue("Neu");
      await buttonLabelled(wrapper, "Abbrechen").trigger("click");

      expect(wrapper.find("textarea").exists()).toBe(false);
      expect(ApiGroupBookingService.updateGroupBooking).not.toHaveBeenCalled();
    });

    it("toasts and keeps the edit open when the save fails", async () => {
      ApiGroupBookingService.updateGroupBooking.mockRejectedValue(
        serverError()
      );
      const { wrapper, store } = await mountLoaded(series(["requested"]));

      await wrapper.find(".group-booking-page__comment-edit").trigger("click");
      await wrapper.find("textarea").setValue("Neu");
      await buttonLabelled(wrapper, "Speichern").trigger("click");
      await settle(wrapper);

      expect(wrapper.find("textarea").exists()).toBe(true);
      expect(toastMessages(store)).toContain(
        "Die Serienbuchung konnte nicht aktualisiert werden."
      );
    });
  });

  describe("the Dokumente", () => {
    it("lists the series' invoices and cancellation receipts once and downloads them over the member's route", async () => {
      const invoice = { type: "invoice", name: "RE-1.pdf", timeCreated: 3 };
      const cancellation = { type: "cancellation", title: "STORNO-1.pdf" };
      ApiBookingService.getInvoice.mockResolvedValue({ data: new Blob() });
      const { wrapper } = await mountLoaded(
        series([
          cancelledFrom("confirmed", { attachments: [invoice, cancellation] }),
          cancelledFrom("confirmed", { attachments: [invoice, cancellation] }),
        ])
      );

      const documents = wrapper.find(".group-booking-page__documents").text();
      expect(documents).toContain("Rechnungen (1)");
      expect(documents).toContain("Stornobelege (1)");
      expect(documents).not.toContain("Anhänge");

      await wrapper.find(".booking-documents__download").trigger("click");
      expect(ApiBookingService.getInvoice).toHaveBeenCalledWith(
        "bk-1",
        "RE-1.pdf"
      );
    });

    it("reissues the aggregated cancellation receipt and reloads the page", async () => {
      ApiGroupBookingService.reprintGroupCancellationReceipt.mockResolvedValue({
        success: true,
      });
      const { wrapper } = await mountLoaded(series(["cancelled", "cancelled"]));

      await buttonLabelled(wrapper, REPRINT).trigger("click");
      await settle(wrapper);

      expect(
        ApiGroupBookingService.reprintGroupCancellationReceipt
      ).toHaveBeenCalledWith(undefined, "grp-1");
      expect(ApiGroupBookingService.getGroupBooking).toHaveBeenCalledTimes(2);
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
      route.fullPath = "/group-bookings/grp-1?tenant=tenant-2";
      store.commit("tenants/select", "tenant-2");
      await settle(wrapper);

      expect(push).not.toHaveBeenCalled();
      expect(ApiGroupBookingService.getGroupBooking).toHaveBeenCalledTimes(2);
    });
  });
});
