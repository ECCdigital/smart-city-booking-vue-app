import { describe, expect, it, vi, beforeEach } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiBookablesService", () => ({
  default: {
    getBookables: vi.fn(),
    getBookable: vi.fn(),
    createOrUpdateBookable: vi.fn(),
    deleteBookable: vi.fn(),
  },
}));

import ApiBookablesService from "@/services/api/ApiBookablesService";
import eventsModule from "@/store/modules/events";
import EventEditParticipation from "@/components/Events/Edit/EventEditParticipation.vue";
import EventEditProgram from "@/components/Events/Edit/EventEditProgram.vue";
import EventEditDate from "@/components/Events/Edit/EventEditDate.vue";
import EventEditTickets from "@/components/Events/Edit/EventEditTickets.vue";
import { REGISTRATION } from "@/utils/eventEditing";

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

function createStore() {
  return new Vuex.Store({
    modules: {
      events: { ...eventsModule, state: eventsModule.state },
      toasts: { namespaced: true, actions: { add: () => {} } },
    },
  });
}

async function mount(component, { event, router, page } = {}) {
  const store = createStore();
  if (event) await store.dispatch("events/restoreFromApi", event);
  const wrapper = mountComponent(component, {
    store,
    mocks: { $router: router || { push: vi.fn() } },
    ...(page ? { provide: { eventEditPage: page } } : {}),
    // The ticket dialog is tested through its rules (`eventTickets`).
    stubs: { EventTicketDialog: true },
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

describe("EventEditParticipation: changed places", () => {
  const event = {
    id: "e-1",
    attendees: { needsRegistration: true, maxAttendees: 20 },
  };
  // The page as saved: 20 places.
  const page = { stored: () => 20 };

  it("notes it under the field when a ticket limits its own number", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [{ id: "t-1", type: "ticket", eventId: "e-1", amount: 5 }],
    });
    const { wrapper } = await mount(EventEditParticipation, { event, page });
    expect(find(wrapper, "places-changed").exists()).toBe(false);

    wrapper.vm.setMax("25");
    await wrapper.vm.$nextTick();

    expect(find(wrapper, "places-changed").text()).toContain(
      "Sie haben die Anzahl der Teilnahmeplätze geändert."
    );
  });

  it("drops the note once the places are the saved ones again", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [{ id: "t-1", type: "ticket", eventId: "e-1", amount: 5 }],
    });
    const { wrapper } = await mount(EventEditParticipation, { event, page });

    wrapper.vm.setMax("25");
    wrapper.vm.setMax("20");
    await wrapper.vm.$nextTick();

    expect(find(wrapper, "places-changed").exists()).toBe(false);
  });

  it("notes nothing when no ticket limits its number", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [{ id: "t-1", type: "ticket", eventId: "e-1", amount: null }],
    });
    const { wrapper } = await mount(EventEditParticipation, { event, page });

    wrapper.vm.setMax("25");
    await wrapper.vm.$nextTick();

    expect(find(wrapper, "places-changed").exists()).toBe(false);
  });
});

describe("EventEditDate: duration", () => {
  const event = (endDate, endTime) => ({
    information: {
      startDate: "2026-12-21",
      startTime: "11:00",
      endDate,
      endTime,
    },
  });
  const summary = (wrapper) => find(wrapper, "event-date-summary").text();

  it.each([
    ["2026-12-21", "19:00", "Dauer 8 Std."],
    ["2026-12-21", "12:30", "Dauer 1 Std. 30 Min."],
    ["2026-12-22", "13:00", "Dauer 1 Tag 2 Std."],
    ["2026-12-23", "11:00", "Dauer 2 Tage"],
    ["2026-12-24", "11:45", "Dauer 3 Tage 45 Min."],
  ])("ends %s at %s: %s", async (endDate, endTime, expected) => {
    const { wrapper } = await mount(EventEditDate, {
      event: event(endDate, endTime),
    });
    expect(summary(wrapper)).toContain(expected);
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

  const page = (dirty, saved = true) => ({
    isDirty: () => dirty,
    saveAndStay: vi.fn().mockResolvedValue(saved),
  });

  it("opens the short ticket form for a saved event", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
    const { wrapper } = await mount(EventEditTickets, {
      event: event(),
      page: page(false),
    });

    await find(wrapper, "tickets-add").trigger("click");

    expect(wrapper.vm.dialogTicket).toBe("");
    expect(wrapper.vm.askSave).toBe(false);
  });

  it("asks to save an event with unsaved changes first", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
    const saving = page(true);
    const { wrapper } = await mount(EventEditTickets, {
      event: event(),
      page: saving,
    });

    await find(wrapper, "tickets-add").trigger("click");
    expect(wrapper.vm.askSave).toBe(true);
    expect(wrapper.vm.dialogTicket).toBe(null);

    await wrapper.vm.saveAndAdd();
    expect(saving.saveAndStay).toHaveBeenCalled();
    expect(wrapper.vm.askSave).toBe(false);
    expect(wrapper.vm.dialogTicket).toBe("");
  });

  it("keeps the form closed when the save is refused", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({ data: [] });
    const { wrapper } = await mount(EventEditTickets, {
      event: event(),
      page: page(true, false),
    });

    await find(wrapper, "tickets-add").trigger("click");
    await wrapper.vm.saveAndAdd();

    expect(wrapper.vm.dialogTicket).toBe(null);
  });

  it("edits a listed ticket in the short form", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [{ id: "t-1", type: "ticket", eventId: "e-1", title: "Regulär" }],
    });
    const { wrapper } = await mount(EventEditTickets, { event: event() });

    await find(wrapper, "ticket-edit-t-1").trigger("click");

    expect(wrapper.vm.dialogTicket).toBe("t-1");
  });

  it("hides a bookable ticket: it is saved as not bookable", async () => {
    const stored = {
      id: "t-1",
      type: "ticket",
      eventId: "e-1",
      title: "Regulär",
      isBookable: true,
    };
    ApiBookablesService.getBookables.mockResolvedValue({ data: [stored] });
    ApiBookablesService.getBookable.mockResolvedValue({ data: stored });
    ApiBookablesService.createOrUpdateBookable.mockResolvedValue({});
    const { wrapper } = await mount(EventEditTickets, { event: event() });

    await find(wrapper, "ticket-toggle-t-1").trigger("click");
    await flushPromises();

    expect(ApiBookablesService.createOrUpdateBookable).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t-1", isBookable: false })
    );
  });

  it("deletes a ticket only once the question is confirmed", async () => {
    ApiBookablesService.getBookables.mockResolvedValue({
      data: [{ id: "t-1", type: "ticket", eventId: "e-1", title: "Regulär" }],
    });
    ApiBookablesService.deleteBookable.mockResolvedValue({});
    const { wrapper } = await mount(EventEditTickets, { event: event() });

    await find(wrapper, "ticket-delete-t-1").trigger("click");
    expect(wrapper.vm.deleteTicket.id).toBe("t-1");
    expect(ApiBookablesService.deleteBookable).not.toHaveBeenCalled();

    await wrapper.vm.confirmDelete();

    expect(ApiBookablesService.deleteBookable).toHaveBeenCalledWith("t-1");
    expect(wrapper.vm.deleteTicket).toBe(null);
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
