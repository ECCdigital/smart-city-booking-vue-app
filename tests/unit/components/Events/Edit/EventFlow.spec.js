import { describe, expect, it } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import eventsModule from "@/store/modules/events";
import EventFlow from "@/components/Events/Edit/EventFlow.vue";

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

// The steps' cards and the overview are tested on their own; here they are
// stand-ins, so the flow shows only its frame.
const STUBS = {
  EventEditBasics: true,
  EventEditDate: true,
  EventEditPlace: true,
  EventEditPeople: true,
  EventEditParticipation: true,
  EventEditProgram: true,
  EventEditMedia: true,
  EventEditTickets: true,
  EventEditPublication: true,
  EventEditOverview: true,
};

function mountFlow(props = {}) {
  const store = new Vuex.Store({
    modules: { events: { ...eventsModule, state: eventsModule.state } },
  });
  return mountComponent(EventFlow, {
    store,
    propsData: { isNew: true, ...props },
    stubs: STUBS,
  });
}

const dotClasses = (wrapper, key) => find(wrapper, `flow-dot-${key}`).classes();

describe("EventFlow", () => {
  it("asks the question of the first step", () => {
    const wrapper = mountFlow();

    expect(find(wrapper, "flow-title-heading").text()).toBe("Worum geht es?");
    expect(dotClasses(wrapper, "general")).toContain(
      "flow-frame__dot--current"
    );
  });

  it("marks a step left forward as done", async () => {
    const wrapper = mountFlow();

    await find(wrapper, "flow-next").trigger("click");

    expect(dotClasses(wrapper, "general")).toContain("flow-frame__dot--done");
    expect(find(wrapper, "flow-title-heading").text()).toBe(
      "Wann findet sie statt?"
    );
  });

  it("turns a visited step with a missing field red", async () => {
    const wrapper = mountFlow({
      issues: [{ field: "name", tab: "general", key: "name" }],
    });

    await find(wrapper, "flow-next").trigger("click");

    expect(dotClasses(wrapper, "general")).toContain("flow-frame__dot--alert");
  });

  it("saves on the last step, the publication", async () => {
    const wrapper = mountFlow();

    wrapper.vm.goTo(8);
    await wrapper.vm.$nextTick();
    await find(wrapper, "flow-save").trigger("click");

    expect(find(wrapper, "flow-title-heading").text()).toBe(
      "Wer kann sie finden?"
    );
    expect(wrapper.emitted("save")).toHaveLength(1);
  });

  it("opens the step of a refused field", async () => {
    const wrapper = mountFlow();

    wrapper.vm.openIssue({ tab: "participation", field: "maxAttendees" });
    await wrapper.vm.$nextTick();

    expect(find(wrapper, "flow-title-heading").text()).toBe(
      "Wie kommt man dazu?"
    );
  });

  it("starts an existing event with every step done", () => {
    const wrapper = mountFlow({ isNew: false });

    expect(dotClasses(wrapper, "date")).toContain("flow-frame__dot--done");
  });
});
