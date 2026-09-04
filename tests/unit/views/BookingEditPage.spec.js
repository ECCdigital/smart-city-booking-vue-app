import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import {
  flushPromises,
  forbiddenError,
  serverError,
} from "@tests/unit/support/api";

const { userState } = vi.hoisted(() => ({
  userState: {
    data: { user: { id: "u1" }, permissions: { instanceOwner: true } },
  },
}));

vi.mock("@/store/modules/user", () => ({ default: { state: userState } }));
vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));
vi.mock("@/services/api/ApiWorkflowService", () => ({
  default: { getWorkflowStates: vi.fn() },
}));
vi.mock("@/services/api/ApiBookingService", () => ({
  default: { getBooking: vi.fn() },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: { getGroupBookings: vi.fn() },
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));
vi.mock("@/components/Booking/BookingEdit.vue", () => ({
  default: {
    name: "BookingEdit",
    props: ["booking", "bookables", "workflow", "groupBooking"],
    render(h) {
      return h("div", { class: "booking-edit-stub" });
    },
  },
}));

import BookingEditPage from "@/views/BookingEditPage.vue";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";
import ApiWorkflowService from "@/services/api/ApiWorkflowService";

const FORBIDDEN_NOTICE = "Sie haben keinen Zugriff auf Buchungsobjekte.";

async function mountPage() {
  const push = vi.fn();
  const store = new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "tenant-1" },
      },
    },
  });
  const wrapper = mountComponent(BookingEditPage, {
    store,
    mocks: {
      $route: {
        name: "booking-edit",
        fullPath: "/bookings/b1/edit",
        params: { bookingId: "b1" },
      },
      $router: { push },
    },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return { wrapper, push };
}

/**
 * `GET /bookables` answers a signed-in user without reach with 403 from 4.3.x
 * on. The screen used to hand every failure of its `Promise.all` to
 * `goBack()`, so a denied bookable list threw the user out of the booking
 * editor without a word. A denial now keeps the user on the screen and says
 * so; every other failure still leaves.
 */
describe("BookingEditPage", () => {
  it("stays on the screen and names the denial when the bookable list is forbidden", async () => {
    ApiBookablesService.getBookables.mockRejectedValue(forbiddenError());
    ApiWorkflowService.getWorkflowStates.mockResolvedValue({});
    ApiBookingService.getBooking.mockResolvedValue({ data: { id: "b1" } });
    ApiGroupBookingService.getGroupBookings.mockResolvedValue({ data: [] });

    const { wrapper, push } = await mountPage();

    expect(push).not.toHaveBeenCalled();
    expect(wrapper.find(".booking-edit-stub").exists()).toBe(true);
    expect(wrapper.text()).toContain(FORBIDDEN_NOTICE);
  });

  it("hands the editor an empty bookable list when it is forbidden", async () => {
    ApiBookablesService.getBookables.mockRejectedValue(forbiddenError());
    ApiWorkflowService.getWorkflowStates.mockResolvedValue({});
    ApiBookingService.getBooking.mockResolvedValue({ data: { id: "b1" } });
    ApiGroupBookingService.getGroupBookings.mockResolvedValue({ data: [] });

    const { wrapper } = await mountPage();

    expect(
      wrapper.findComponent({ name: "BookingEdit" }).props("bookables")
    ).toEqual([]);
  });

  it("still leaves the screen when the bookable list fails for another reason", async () => {
    ApiBookablesService.getBookables.mockRejectedValue(serverError());
    ApiWorkflowService.getWorkflowStates.mockResolvedValue({});
    ApiBookingService.getBooking.mockResolvedValue({ data: { id: "b1" } });
    ApiGroupBookingService.getGroupBookings.mockResolvedValue({ data: [] });

    const { push } = await mountPage();

    expect(push).toHaveBeenCalledWith({ name: "bookings" });
  });

  it("still leaves the screen when the workflow states fail", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
    ApiWorkflowService.getWorkflowStates.mockRejectedValue(serverError());
    ApiBookingService.getBooking.mockResolvedValue({ data: { id: "b1" } });
    ApiGroupBookingService.getGroupBookings.mockResolvedValue({ data: [] });

    const { push } = await mountPage();

    expect(push).toHaveBeenCalledWith({ name: "bookings" });
  });

  it("shows no notice when an empty bookable list comes back legitimately", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
    ApiWorkflowService.getWorkflowStates.mockResolvedValue({});
    ApiBookingService.getBooking.mockResolvedValue({ data: { id: "b1" } });
    ApiGroupBookingService.getGroupBookings.mockResolvedValue({ data: [] });

    const { wrapper, push } = await mountPage();

    expect(push).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain(FORBIDDEN_NOTICE);
  });
});
