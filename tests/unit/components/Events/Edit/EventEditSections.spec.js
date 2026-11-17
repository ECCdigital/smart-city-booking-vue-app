import { describe, expect, it, vi, beforeEach } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: { getBookables: vi.fn() },
}));

import ApiBookablesService from "@/services/api/ApiBookablesService";
import eventsModule from "@/store/modules/events";
import EventEditParticipation from "@/components/Events/Edit/EventEditParticipation.vue";
import EventEditProgram from "@/components/Events/Edit/EventEditProgram.vue";
import EventEditTickets from "@/components/Events/Edit/EventEditTickets.vue";
import { REGISTRATION } from "@/utils/eventEditing";

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

function createStore() {
  return new Vuex.Store({
    modules: {
      events: { ...eventsModule, state: eventsModule.state },
    },
  });
}

async function mount(component, { event, router } = {}) {
  const store = createStore();
  if (event) await store.dispatch("events/restoreFromApi", event);
  const wrapper = mountComponent(component, {
    store,
    mocks: { $router: router || { push: vi.fn() } },
  });
  await flushPromises();
  return { wrapper, store };
}

describe("EventEditParticipation", () => {
  it("asks the portal for places and stores the registration", async () => {
    const { wrapper, store } = await mount(EventEditParticipation);

    wrapper.vm.chooseMode(REGISTRATION.PORTAL);
    await wrapper.vm.$nextTick();

    expect(store.state.events.form.attendees.needsRegistration).toBe(true);
    expect(store.state.events.registrationMode).toBe(REGISTRATION.PORTAL);
    expect(find(wrapper, "event-max-attendees").exists()).toBe(true);
    expect(find(wrapper, "event-external-url").exists()).toBe(false);
  });

  it("keeps „another website“ chosen before an address is typed", async () => {
    const { wrapper, store } = await mount(EventEditParticipation);

    wrapper.vm.chooseMode(REGISTRATION.EXTERNAL);
    await wrapper.vm.$nextTick();

    expect(store.state.events.form.attendees.needsRegistration).toBe(false);
    expect(store.state.events.registrationMode).toBe(REGISTRATION.EXTERNAL);
    expect(find(wrapper, "event-external-url").exists()).toBe(true);
  });

  it("stores the places as a number, an empty field as none", async () => {
    const { wrapper, store } = await mount(EventEditParticipation);

    wrapper.vm.setMax("12");
    expect(store.state.events.form.attendees.maxAttendees).toBe(12);
    wrapper.vm.setMax("");
    expect(store.state.events.form.attendees.maxAttendees).toBe(null);
  });
});

describe("EventEditProgram", () => {
  const event = (schedules) => ({
    information: { startDate: "2026-11-21", endDate: "2026-11-21" },
    schedules,
  });

  it("is without program while there is no point", async () => {
    const { wrapper } = await mount(EventEditProgram, { event: event([]) });

    expect(wrapper.vm.noProgram).toBe(true);
    expect(find(wrapper, "event-add-program-point").exists()).toBe(false);
  });

  it("switching „without program“ on removes every point", async () => {
    const { wrapper, store } = await mount(EventEditProgram, {
      event: event([{ id: "1", date: "2026-11-21", time: "10:00" }]),
    });

    wrapper.vm.setNoProgram(true);
    expect(store.state.events.form.schedules).toEqual([]);
  });

  it("switching it off starts a point on the first day", async () => {
    const { wrapper, store } = await mount(EventEditProgram, {
      event: event([]),
    });

    wrapper.vm.setNoProgram(false);
    expect(store.state.events.form.schedules).toHaveLength(1);
    expect(store.state.events.form.schedules[0].date).toBe("2026-11-21");
  });
});

describe("EventEditTickets", () => {
  beforeEach(() => {
    ApiBookablesService.getBookables.mockReset();
  });

  const event = (patch = {}) => ({
    id: "e-1",
    attendees: { needsRegistration: true },
    ...patch,
  });

  it("lists the tickets that name the event", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [
        { id: "t-1", type: "ticket", eventId: "e-1", title: "Regulär" },
        { id: "t-2", type: "ticket", eventId: "e-2", title: "Andere" },
        { id: "r-1", type: "room", title: "Raum" },
      ],
    });
    const { wrapper } = await mount(EventEditTickets, { event: event() });

    expect(wrapper.vm.tickets.map((t) => t.id)).toEqual(["t-1"]);
    expect(find(wrapper, "tickets-none-bookable").exists()).toBe(true);
  });

  it("opens the ticket editor with the event chosen", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
    const router = { push: vi.fn() };
    const { wrapper } = await mount(EventEditTickets, {
      event: event(),
      router,
    });

    await find(wrapper, "tickets-add").trigger("click");

    expect(router.push).toHaveBeenCalledWith({
      name: "ticket-edit",
      query: { eventId: "e-1" },
    });
  });

  it("needs no ticket without registration in the portal", async () => {
    const { wrapper } = await mount(EventEditTickets, {
      event: event({ attendees: { needsRegistration: false } }),
    });

    expect(find(wrapper, "tickets-not-needed").exists()).toBe(true);
  });

  it("asks a new event to be saved first", async () => {
    const { wrapper } = await mount(EventEditTickets, {
      event: event({ id: null }),
    });

    expect(find(wrapper, "tickets-save-first").exists()).toBe(true);
    expect(ApiBookablesService.getBookables).not.toHaveBeenCalled();
  });
});
