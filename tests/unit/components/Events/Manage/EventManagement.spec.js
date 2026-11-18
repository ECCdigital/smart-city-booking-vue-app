import { describe, expect, it, vi, beforeEach } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));
vi.mock("@/services/api/ApiEventService", () => ({
  default: { getEventBookings: vi.fn() },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowRead: vi.fn(() => true) },
}));

import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiEventService from "@/services/api/ApiEventService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";
import EventManagement from "@/components/Events/Manage/EventManagement.vue";

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

function createStore() {
  return new Vuex.Store({
    modules: {
      events: {
        namespaced: true,
        getters: { form: () => ({ attendees: { maxAttendees: 20 } }) },
      },
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "tenant" },
      },
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
}

async function mount() {
  const router = { push: vi.fn() };
  const wrapper = mountComponent(EventManagement, {
    store: createStore(),
    propsData: { eventId: "event-1" },
    mocks: { $router: router },
    stubs: { BookingExportButton: true },
  });
  await flushPromises();
  return { wrapper, router };
}

describe("EventManagement", () => {
  beforeEach(() => {
    BookingPermissionService.allowRead.mockReturnValue(true);
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [
        { id: "t1", type: "ticket", eventId: "event-1", title: "Regulär" },
        { id: "t2", type: "ticket", eventId: "other", title: "Fremd" },
      ],
    });
    ApiEventService.getEventBookings.mockResolvedValue({
      data: [
        {
          id: "b1",
          status: "confirmed",
          name: "Ada Lovelace",
          mail: "ada@example.org",
          timeCreated: 2000,
          bookableItems: [{ bookableId: "t1", amount: 3 }],
        },
        {
          id: "b2",
          status: "cancelled",
          name: "Grace Hopper",
          timeCreated: 1000,
          bookableItems: [{ bookableId: "t1", amount: 1 }],
        },
      ],
    });
  });

  it("shows the occupancy against the Teilnahmeplätze", async () => {
    const { wrapper } = await mount();

    expect(ApiEventService.getEventBookings).toHaveBeenCalledWith("event-1");
    expect(find(wrapper, "manage-headline").text()).toBe(
      "3 von 20 Plätzen belegt"
    );
    expect(find(wrapper, "manage-tickets").text()).toContain("Regulär");
    expect(find(wrapper, "manage-tickets").text()).not.toContain("Fremd");
  });

  it("lists every booking, whatever its state, until a state is picked", async () => {
    const { wrapper } = await mount();
    const table = () => find(wrapper, "manage-participants").text();

    expect(table()).toContain("Ada Lovelace");
    expect(table()).toContain("Grace Hopper");

    wrapper
      .findComponent({ name: "SearchBar" })
      .vm.$emit("filter", "status", ["confirmed"]);
    await wrapper.vm.$nextTick();
    expect(table()).toContain("Ada Lovelace");
    expect(table()).not.toContain("Grace Hopper");
  });

  it("offers the states holding tickets behind the funnel", async () => {
    const { wrapper } = await mount();

    const bar = wrapper.findComponent({ name: "SearchBar" });
    const [section] = bar.props("filters");
    expect(section.key).toBe("status");
    expect(section.options.map((option) => option.value)).toEqual([
      "requested",
      "payment_due",
      "confirmed",
    ]);
  });

  it("lists everyone again once the search is cleared", async () => {
    const { wrapper } = await mount();
    const table = () => find(wrapper, "manage-participants").text();

    wrapper.findComponent({ name: "SearchBar" }).vm.$emit("input", "nobody");
    await wrapper.vm.$nextTick();
    expect(table()).not.toContain("Ada Lovelace");
    expect(table()).toContain("Keine Buchung passt zu Suche und Filter.");

    wrapper.findComponent({ name: "SearchBar" }).vm.$emit("input", "");
    await wrapper.vm.$nextTick();
    expect(table()).toContain("Ada Lovelace");
  });

  it("opens the booking page of a participant", async () => {
    const { wrapper, router } = await mount();

    await find(wrapper, "manage-participants")
      .find("tbody tr")
      .trigger("click");

    expect(router.push).toHaveBeenCalledWith({
      name: "booking-details",
      params: { bookingId: "b1" },
      query: { tenant: "tenant" },
    });
  });

  it("jumps to the booking with the button at the row's end", async () => {
    const { wrapper, router } = await mount();

    await find(wrapper, "manage-open-b1").trigger("click");

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      name: "booking-details",
      params: { bookingId: "b1" },
      query: { tenant: "tenant" },
    });
  });

  it("leads to the tickets while the event has none", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
    const { wrapper } = await mount();

    await find(wrapper, "manage-to-tickets").trigger("click");

    expect(wrapper.emitted("go")).toEqual([[{ tab: "tickets" }]]);
  });

  it("lists the bookings it may not open, without the way to them", async () => {
    BookingPermissionService.allowRead.mockReturnValue(false);
    const { wrapper, router } = await mount();
    const table = find(wrapper, "manage-participants");

    expect(table.text()).toContain("Ada Lovelace");
    expect(find(wrapper, "manage-open-b1").exists()).toBe(false);
    await table.find("tbody tr").trigger("click");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("offers to load again after a failure", async () => {
    ApiEventService.getEventBookings.mockRejectedValue(new Error("down"));
    const { wrapper } = await mount();

    expect(find(wrapper, "manage-load-failed").exists()).toBe(true);
  });
});
