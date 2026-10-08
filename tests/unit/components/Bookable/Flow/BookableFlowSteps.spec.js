import { describe, expect, it, vi } from "vitest";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableFlowAvailability from "@/components/Bookable/Flow/BookableFlowAvailability.vue";
import BookableFlowPrice from "@/components/Bookable/Flow/BookableFlowPrice.vue";
import BookableFlowAmount from "@/components/Bookable/Flow/BookableFlowAmount.vue";
import BookableFlowPermission from "@/components/Bookable/Flow/BookableFlowPermission.vue";
import BookableFlowApproval from "@/components/Bookable/Flow/BookableFlowApproval.vue";
import BookableFlowIdentity from "@/components/Bookable/Flow/BookableFlowIdentity.vue";

vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getTenantRoles: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenantUsers: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock("@/services/api/ApiEventService", () => ({
  default: { getEvents: vi.fn().mockResolvedValue({ data: [] }) },
}));

const editorStub = (name) => ({
  name,
  props: { bookable: Object, embedded: Boolean },
  render(h) {
    return h("div", { attrs: { "data-test": `stub-${name}` } });
  },
});

const STUBS = {
  BookableEditBookingType: editorStub("BookableEditBookingType"),
  BookableEditOpeningHours: editorStub("BookableEditOpeningHours"),
  BookableEditPriceTiers: editorStub("BookableEditPriceTiers"),
  MediaReferenceList: editorStub("MediaReferenceList"),
  AddressLookup: editorStub("AddressLookup"),
  Tiptap: editorStub("Tiptap"),
};

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

// A step as BookableEdit hosts it: every patch lands in the next prop, the
// bookable handed in is the stored one.
const editing = (component, overrides, expertMode = true) =>
  mountEditing(component, {
    bookable: bookable(overrides),
    expertMode,
    stubs: STUBS,
  });

const mountStep = (...args) => {
  const { wrapper, patches } = editing(...args);
  wrapper.patches = patches;
  return wrapper;
};

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const lastChange = (wrapper) => lastPatch(wrapper.patches);

describe("the steps of the guided flow", () => {
  it.each([
    ["identity", BookableFlowIdentity],
    ["availability", BookableFlowAvailability],
    ["price", BookableFlowPrice],
    ["amount", BookableFlowAmount],
    ["permission", BookableFlowPermission],
    ["approval", BookableFlowApproval],
  ])("change nothing when the %s step mounts", async (_, component) => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = editing(component, { isScheduleRelated: true });
    await wrapper.vm.$nextTick();

    expect(patches).toEqual([]);
    expect(handedIn).toEqual(stored);
  });

  it("hands on only the field that changed", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = editing(BookableFlowApproval);

    await find(wrapper, "confirmation-auto").trigger("click");

    expect(patches).toEqual([{ autoCommitBooking: true }]);
    expect(handedIn).toEqual(stored);
  });

  it("hands on the title as it is typed", async () => {
    const { wrapper, patches } = editing(BookableFlowIdentity);

    await find(wrapper, "flow-title").find("input").setValue("Aula");

    expect(lastPatch(patches)).toEqual({ title: "Aula" });
  });

  it("hands on only the top-level fields a rule changed", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = editing(BookableFlowPermission, {
      requiresLogin: true,
      permittedRoles: ["r1"],
      permittedUsers: [],
    });

    await find(wrapper, "access-everyone").trigger("click");

    expect(patches).toEqual([{ requiresLogin: false, permittedRoles: [] }]);
    expect(handedIn).toEqual(stored);
  });
});

describe("BookableFlowAvailability", () => {
  it("asks for the Buchungsart with the component of the editing page", () => {
    const wrapper = mountStep(BookableFlowAvailability, {
      isScheduleRelated: false,
    });

    expect(
      wrapper.findComponent({ name: "BookableEditBookingMode" }).exists()
    ).toBe(true);
    expect(find(wrapper, "booking-mode-timed").exists()).toBe(true);
    expect(find(wrapper, "stub-BookableEditBookingType").exists()).toBe(false);
    expect(find(wrapper, "stub-BookableEditOpeningHours").exists()).toBe(false);
  });

  it("hands on an answer as the component's patch", async () => {
    const wrapper = mountStep(BookableFlowAvailability, {
      isScheduleRelated: false,
    });

    await find(wrapper, "booking-mode-timed-yes").trigger("click");

    expect(lastChange(wrapper)).toMatchObject({ isScheduleRelated: true });
  });

  it("follows with the sections of the chosen mode and the opening hours", () => {
    const wrapper = mountStep(BookableFlowAvailability, {
      isScheduleRelated: true,
    });

    expect(find(wrapper, "stub-BookableEditBookingType").exists()).toBe(true);
    expect(
      wrapper.findComponent({ name: "BookableEditOpeningHours" }).props()
    ).toMatchObject({ embedded: true });
  });

  it("shows no opening hours for the long range", () => {
    const wrapper = mountStep(BookableFlowAvailability, {
      isScheduleRelated: false,
      isLongRange: true,
      longRangeOptions: { type: "week" },
    });

    expect(find(wrapper, "stub-BookableEditOpeningHours").exists()).toBe(false);
  });

  it("shows only the note for an external availability and hands on its jump", async () => {
    const wrapper = mountStep(BookableFlowAvailability, {
      isScheduleRelated: true,
      externalProviders: [
        { provider: "ifbs", active: true, handles: ["availability"] },
      ],
    });

    expect(find(wrapper, "booking-mode-external").exists()).toBe(true);
    expect(find(wrapper, "stub-BookableEditBookingType").exists()).toBe(false);
    expect(find(wrapper, "stub-BookableEditOpeningHours").exists()).toBe(false);

    await find(wrapper, "booking-mode-external-link").trigger("click");
    expect(wrapper.emitted("open-section")).toEqual([
      [{ tabKey: "accessLocks", sectionId: "pricing-external" }],
    ]);
  });
});

describe("BookableFlowAmount", () => {
  it("counts from one and stores unlimited as empty", async () => {
    const wrapper = mountStep(BookableFlowAmount, { amount: 1 });

    await find(wrapper, "flow-amount-more").trigger("click");
    expect(lastChange(wrapper).amount).toBe(2);

    await find(wrapper, "flow-amount-mode-unlimited").trigger("click");
    expect(lastChange(wrapper).amount).toBeNull();
  });

  it("questions more than one unit of a room", () => {
    const wrapper = mountStep(BookableFlowAmount, { type: "room", amount: 3 });

    expect(find(wrapper, "flow-amount-warning").text()).toContain(
      "Mehr als eine Einheit für einen Raum"
    );
  });
});

// BookableFlowPermission („Wer darf buchen?“) has its own spec.
