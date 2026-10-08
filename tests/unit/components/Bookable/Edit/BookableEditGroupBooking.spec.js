import { beforeEach, describe, expect, it, vi } from "vitest";
import Vue from "vue";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { flushPromises } from "@tests/unit/support/api";
import { switchByLabel, toggleSwitch } from "@tests/unit/support/vuetify";
import Bookable from "@/entities/bookable";

vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getTenantRoles: vi.fn() },
}));

import BookableEditGroupBooking from "@/components/Bookable/Edit/BookableEditGroupBooking.vue";
import ApiRolesService from "@/services/api/ApiRolesService";

const ALLOW = "Serienbuchung erlauben";
const ROLES = "Rollen, die eine Buchungsserie erstellen dürfen";

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

async function mountArea(overrides) {
  const mounted = mountEditing(BookableEditGroupBooking, {
    bookable: bookable(overrides),
  });
  await flushPromises();
  return mounted;
}

const ON = { groupBooking: { enabled: true, permittedRoles: ["r1"] } };

describe("BookableEditGroupBooking (Serienbuchung)", () => {
  beforeEach(() => {
    ApiRolesService.getTenantRoles.mockResolvedValue({
      data: [
        { id: "r1", name: "Vereine" },
        { id: "r2", name: "Schulen" },
      ],
    });
  });

  it("changes nothing when it mounts, with Zeiträume as well", async () => {
    const {
      patches,
      bookable: handed,
      stored,
    } = await mountArea({
      ...ON,
      isScheduleRelated: false,
      isBlockPeriodRelated: true,
    });

    expect(patches).toEqual([]);
    expect(handed).toEqual(stored);
  });

  it("allows Serienbuchung with only groupBooking as the patch", async () => {
    const { wrapper, patches, bookable: handed, stored } = await mountArea();

    await toggleSwitch(wrapper, ALLOW);

    expect(patches).toEqual([
      { groupBooking: { enabled: true, permittedRoles: [] } },
    ]);
    expect(handed).toEqual(stored);
  });

  it("offers the roles once allowed, and names them", async () => {
    const { wrapper } = await mountArea(ON);

    expect(wrapper.text()).toContain(ROLES);
    expect(wrapper.text()).toContain("Vereine");
  });

  it("limits Serienbuchung to another role", async () => {
    const { wrapper, patches } = await mountArea(ON);

    await wrapper
      .findComponent({ name: "v-combobox" })
      .find(".v-input__slot")
      .trigger("click");
    await Vue.nextTick();
    const schulen = Array.from(
      document.querySelectorAll(".menuable__content__active .v-list-item")
    ).find((item) => item.textContent.includes("Schulen"));
    schulen.click();
    await Vue.nextTick();

    expect(lastPatch(patches)).toEqual({
      groupBooking: { enabled: true, permittedRoles: ["r1", "r2"] },
    });
  });

  it("drops a role by its chip", async () => {
    const { wrapper, patches } = await mountArea(ON);

    await wrapper.find(".v-chip__close").trigger("click");

    expect(lastPatch(patches)).toEqual({
      groupBooking: { enabled: true, permittedRoles: [] },
    });
  });

  it("is not offered with Zeiträume", async () => {
    const { wrapper } = await mountArea({
      isScheduleRelated: false,
      isBlockPeriodRelated: true,
    });

    expect(switchByLabel(wrapper, ALLOW).props("disabled")).toBe(true);
    expect(wrapper.text()).toContain(
      "Serienbuchungen sind bei Zeiträumen nicht verfügbar."
    );
  });
});
