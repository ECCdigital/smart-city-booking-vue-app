import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import EventCard from "@/components/EventCard.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiEventService", () => ({
  default: {
    publicEventCountCheck: vi.fn().mockResolvedValue(true),
    getBookedSeatsCount: vi.fn().mockResolvedValue({ bookedSeats: 0 }),
  },
}));

vi.mock("@/services/permissions/BookablePermissionService", () => ({
  default: {
    allowCreate: () => true,
    allowDelete: () => true,
    allowUpdate: () => true,
  },
}));

function store(supervisionLevel = null) {
  return new Vuex.Store({
    modules: {
      tenants: {
        namespaced: true,
        getters: { currentSupervisionLevel: () => supervisionLevel },
      },
    },
  });
}

function item(overrides = {}) {
  return {
    id: "e-1",
    tenantId: "t-1",
    isPublic: true,
    information: {
      name: "Konzert",
      startDate: "2020-05-01",
      startTime: "18:00",
      endDate: "2020-05-01",
      endTime: "20:00",
      flags: [],
      tags: [],
    },
    eventLocation: {},
    eventOrganizer: {},
    attendees: {},
    ...overrides,
  };
}

async function mountCard(event, supervisionLevel) {
  const wrapper = mountComponent(EventCard, {
    store: store(supervisionLevel),
    propsData: { item: event },
    filters: { date: (value) => value, time: (value) => value },
  });
  await flushPromises();
  return wrapper;
}

const badge = (wrapper) => wrapper.find("[data-test='review-badge']");

describe("EventCard review badge", () => {
  it.each([
    ["supervised", "pending", "Prüfung ausstehend"],
    ["pending", "approved", "Freigegeben"],
    ["supervised", "rejected", "Abgelehnt"],
    ["declined", "rejected", "Abgelehnt"],
  ])(
    "names the review status under a %s tenant (%s)",
    async (supervisionLevel, status, label) => {
      const wrapper = await mountCard(
        item({ review: { status } }),
        supervisionLevel
      );

      expect(badge(wrapper).text()).toBe(label);
    }
  );

  it("stays quiet under a free tenant, whose first publication wish sets a status too", async () => {
    const wrapper = await mountCard(
      item({ review: { status: "pending" } }),
      "free"
    );

    expect(badge(wrapper).exists()).toBe(false);
  });

  it("stays quiet without a review status", async () => {
    const wrapper = await mountCard(
      item({ review: { status: null } }),
      "supervised"
    );

    expect(badge(wrapper).exists()).toBe(false);
  });
});

describe("EventCard price", () => {
  // A dark primary colour (VUE_APP_PRIMARY_COLOR_DARK) all but vanished on
  // the dark card (ECCdigital/tickets#307). The link token lightens it under
  // .theme--dark; the bare Vuetify class `primary--text` cannot.
  it("is drawn in the link colour, not the bare primary colour", async () => {
    const wrapper = await mountCard(
      item({ attendees: { priceCategories: { price: 12 } } })
    );
    const price = wrapper.find(".event-card__price");

    expect(price.exists()).toBe(true);
    expect(price.classes()).not.toContain("primary--text");
  });
});

describe("EventCard text in dark mode", () => {
  // Vuetify's fixed greys (`grey--text text--darken-2`, …) stayed dark under
  // .theme--dark. Labels and values read --scb-text-muted, notes
  // --scb-text-caption; both follow the theme.
  it("uses no fixed Vuetify grey", async () => {
    const wrapper = await mountCard(
      item({
        information: {
          ...item().information,
          teaserText: "<p>Kurz</p>",
          flags: ["a", "b", "c", "d"],
        },
        eventLocation: { name: "Rathaus" },
        attendees: { maxAttendees: 10, priceCategories: { price: 12 } },
      })
    );

    expect(wrapper.find(".event-card__muted").exists()).toBe(true);
    expect(wrapper.find(".event-card__caption").exists()).toBe(true);
    expect(wrapper.findAll(".grey--text")).toHaveLength(0);
  });
});
