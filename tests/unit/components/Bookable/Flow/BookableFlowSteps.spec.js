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
  props: { bookable: Object, embedded: Boolean, tiersOnly: Boolean },
  render(h) {
    return h("div", { attrs: { "data-test": `stub-${name}` } });
  },
});

const STUBS = {
  BookableEditBookingType: editorStub("BookableEditBookingType"),
  BookableEditOpeningHours: editorStub("BookableEditOpeningHours"),
  BookableEditPrice: editorStub("BookableEditPrice"),
  UserRoleSelector: editorStub("UserRoleSelector"),
  BookingDiscountEditor: editorStub("BookingDiscountEditor"),
  MediaReferenceList: editorStub("MediaReferenceList"),
  AddressLookup: editorStub("AddressLookup"),
  Tiptap: editorStub("Tiptap"),
};

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

// A step as BookableEdit hosts it: every patch lands in the next prop.
const editing = (component, overrides, expertMode = true) =>
  mountEditing(component, {
    bookable: bookable(overrides),
    provide: { bookableExpertMode: { enabled: expertMode } },
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

    await find(wrapper, "flow-approval-auto").trigger("click");

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

    await find(wrapper, "flow-access-everyone").trigger("click");

    expect(patches).toEqual([{ requiresLogin: false, permittedRoles: [] }]);
    expect(handedIn).toEqual(stored);
  });
});

describe("BookableFlowAvailability", () => {
  it("asks whether a time is booked and books none without the editor's sections", () => {
    const wrapper = mountStep(BookableFlowAvailability, {
      isScheduleRelated: false,
    });

    expect(find(wrapper, "flow-timed-no").attributes("aria-checked")).toBe(
      "true"
    );
    expect(find(wrapper, "flow-untimed").exists()).toBe(true);
    expect(find(wrapper, "stub-BookableEditBookingType").exists()).toBe(false);
  });

  it("starts a timed bookable with the free choice of time", async () => {
    const wrapper = mountStep(BookableFlowAvailability, {
      isScheduleRelated: false,
    });

    await find(wrapper, "flow-timed-yes").trigger("click");

    expect(wrapper.props("bookable")).toMatchObject({
      isScheduleRelated: true,
      isLongRange: false,
    });
  });

  it("shows the editor's settings and opening hours for the chosen type", () => {
    const wrapper = mountStep(BookableFlowAvailability, {
      isScheduleRelated: true,
    });

    expect(
      wrapper.findComponent({ name: "BookableEditBookingType" }).props()
    ).toMatchObject({ embedded: true });
    expect(find(wrapper, "stub-BookableEditOpeningHours").exists()).toBe(true);
  });

  it("asks weeks or months for the long range", async () => {
    const wrapper = mountStep(BookableFlowAvailability, {
      isScheduleRelated: true,
    });

    await find(wrapper, "flow-time-mode-longRange").trigger("click");
    expect(lastChange(wrapper).longRangeOptions).toEqual({ type: "week" });

    await find(wrapper, "flow-long-range-month").trigger("click");
    expect(lastChange(wrapper).longRangeOptions).toEqual({ type: "month" });
  });

  it("offers Zeiträume and Langzeit in expert mode only", () => {
    const simple = mountStep(
      BookableFlowAvailability,
      { isScheduleRelated: true },
      false
    );
    expect(find(simple, "flow-time-mode-longRange").exists()).toBe(false);
    expect(find(simple, "flow-time-mode-blockPeriod").exists()).toBe(false);

    const expert = mountStep(BookableFlowAvailability, {
      isScheduleRelated: true,
    });
    expect(find(expert, "flow-time-mode-longRange").exists()).toBe(true);
  });

  it("leaves an externally handled availability alone", () => {
    const wrapper = mountStep(BookableFlowAvailability, {
      externalProviders: [
        { provider: "ifbs", active: true, handles: ["availability"] },
      ],
    });

    expect(wrapper.text()).toContain("externen Anbieter");
    expect(find(wrapper, "flow-timed").exists()).toBe(false);
  });
});

describe("BookableFlowPrice", () => {
  it("starts free and says so", () => {
    const wrapper = mountStep(BookableFlowPrice);

    expect(
      find(wrapper, "flow-price-mode-free").attributes("aria-checked")
    ).toBe("true");
    expect(find(wrapper, "flow-free").exists()).toBe(true);
  });

  it("prefills the unit from the availability when a price is set", async () => {
    const wrapper = mountStep(BookableFlowPrice, { isScheduleRelated: true });

    await find(wrapper, "flow-price-mode-simple").trigger("click");

    expect(lastChange(wrapper).priceType).toBe("per-hour");
    expect(find(wrapper, "flow-prefilled").text()).toContain(
      "weil Buchende im Kalender eine Zeit wählen"
    );
  });

  it("explains the price and adds VAT on top", () => {
    const wrapper = mountStep(BookableFlowPrice, {
      priceType: "per-hour",
      priceValueAddedTax: 19,
      priceCategories: [{ priceEur: 10, interval: {}, weekdays: [] }],
    });

    expect(find(wrapper, "flow-price-explain").text()).toContain("25,00");
    expect(find(wrapper, "flow-vat-summary").text()).toContain("11,90");
  });

  it("hands tiers to the price editor's graduated prices", async () => {
    const wrapper = mountStep(BookableFlowPrice, {
      priceType: "per-hour",
      priceCategories: [{ priceEur: 10, interval: {}, weekdays: [] }],
    });

    await find(wrapper, "flow-price-mode-tiers").trigger("click");

    expect(
      wrapper.findComponent({ name: "BookableEditPrice" }).props()
    ).toMatchObject({ tiersOnly: true });
  });

  it("reads the price form from a bookable changed elsewhere", async () => {
    const wrapper = mountStep(BookableFlowPrice);

    await wrapper.setProps({
      bookable: bookable({
        priceCategories: [{ priceEur: 10, interval: {}, weekdays: [] }],
        priceType: "per-hour",
      }),
    });

    expect(
      find(wrapper, "flow-price-mode-free").attributes("aria-checked")
    ).toBe("false");
  });

  it("keeps a chosen simple price while it is still 0 €", async () => {
    const wrapper = mountStep(BookableFlowPrice, { isScheduleRelated: true });

    await find(wrapper, "flow-price-mode-simple").trigger("click");

    expect(
      find(wrapper, "flow-price-mode-simple").attributes("aria-checked")
    ).toBe("true");
  });

  it("offers tiers in expert mode only", () => {
    const wrapper = mountStep(BookableFlowPrice, {}, false);

    expect(find(wrapper, "flow-price-mode-tiers").exists()).toBe(false);
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

describe("BookableFlowPermission", () => {
  it("opens the bookable to everyone without an account", async () => {
    const wrapper = mountStep(BookableFlowPermission, {
      requiresLogin: true,
      permittedRoles: ["r1"],
    });

    await find(wrapper, "flow-access-everyone").trigger("click");

    expect(wrapper.props("bookable")).toMatchObject({
      requiresLogin: false,
      permittedRoles: [],
      permittedUsers: [],
    });
  });

  it("keeps the selection open until roles or people are named", async () => {
    const wrapper = mountStep(BookableFlowPermission);

    await find(wrapper, "flow-access-selected").trigger("click");

    expect(lastChange(wrapper).requiresLogin).toBe(true);
    expect(
      find(wrapper, "flow-access-selected").attributes("aria-checked")
    ).toBe("true");
    expect(find(wrapper, "flow-selected-empty").exists()).toBe(true);
  });

  it("reads the choice from a bookable changed elsewhere", async () => {
    const wrapper = mountStep(BookableFlowPermission);

    await wrapper.setProps({
      bookable: bookable({ requiresLogin: true, permittedRoles: ["r1"] }),
    });

    expect(
      find(wrapper, "flow-access-selected").attributes("aria-checked")
    ).toBe("true");
  });

  it("hands on a removed price exception as rebuilt discounts", async () => {
    const discounts = {
      users: [{ userId: "u1", discountPercent: 50 }],
      roles: [{ roleId: "r1", discountPercent: 100 }],
    };
    // The real list, to remove an entry from.
    const stubs = { ...STUBS, BookingDiscountEditor: false };
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountEditing(BookableFlowPermission, {
      bookable: bookable({
        bookingDiscounts: discounts,
        priceCategories: [{ priceEur: 10, interval: {}, weekdays: [] }],
      }),
      provide: { bookableExpertMode: { enabled: true } },
      stubs,
    });

    await wrapper.find("[title='Entfernen'] button").trigger("click");

    expect(patches).toEqual([
      { bookingDiscounts: { users: [], roles: discounts.roles } },
    ]);
    expect(handedIn).toEqual(stored);
  });

  it("names price exceptions only once there is a price", () => {
    expect(
      find(mountStep(BookableFlowPermission), "flow-free-not-paid").exists()
    ).toBe(true);
  });
});
