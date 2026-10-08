import { beforeEach, describe, expect, it, vi } from "vitest";
import Vue from "vue";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { flushPromises } from "@tests/unit/support/api";
import Bookable from "@/entities/bookable";

vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getTenantRoles: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenantUsers: vi.fn() },
}));

import BookableFlowPermission from "@/components/Bookable/Flow/BookableFlowPermission.vue";
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiTenantService from "@/services/api/ApiTenantService";

const PAID = {
  priceCategories: [{ priceEur: 10, interval: {}, weekdays: [] }],
};

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t2", title: "Saal", ...overrides }).toPlain();

async function mountPermission(overrides, { expertMode = true, saved } = {}) {
  const mounted = mountEditing(BookableFlowPermission, {
    bookable: bookable(overrides),
    expertMode,
    saved: saved && bookable(saved),
  });
  await flushPromises();
  return mounted;
}

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const checked = (wrapper, access) =>
  find(wrapper, `access-${access}`).attributes("aria-checked") === "true";

/** Opens the autocomplete with this label: the entries it offers. */
async function open(wrapper, label) {
  const field = wrapper
    .findAllComponents({ name: "v-autocomplete" })
    .wrappers.find((candidate) => candidate.props("label") === label);
  if (!field) throw new Error(`Das Feld „${label}“ fehlt.`);
  await field.find(".v-input__slot").trigger("click");
  await Vue.nextTick();
  return Array.from(
    document.querySelectorAll(".menuable__content__active .v-list-item")
  );
}

/** Opens the autocomplete with this label and picks the entry reading so. */
async function pick(wrapper, label, entry) {
  const item = (await open(wrapper, label)).find((el) =>
    el.textContent.includes(entry)
  );
  if (!item) throw new Error(`„${entry}“ steht nicht zur Wahl.`);
  item.click();
  await Vue.nextTick();
  await flushPromises();
}

const labels = (wrapper, selector) =>
  wrapper.findAll(selector).wrappers.map((entry) => entry.text());

describe("BookableFlowPermission („Wer darf buchen?“ and Preisnachlass)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiRolesService.getTenantRoles.mockResolvedValue({
      data: [
        { id: "r1", name: "Vereine" },
        { id: "r2", name: "Schulen" },
      ],
    });
    ApiTenantService.getTenantUsers.mockResolvedValue({
      users: [{ userId: "anna@example.org" }, { userId: "ben@example.org" }],
      userDetails: [
        { id: "anna@example.org", firstName: "Anna", lastName: "Schmidt" },
      ],
    });
  });

  it("changes nothing when it mounts, lists without login included", async () => {
    const {
      patches,
      bookable: handed,
      stored,
    } = await mountPermission({
      requiresLogin: false,
      permittedRoles: ["r1"],
      bookingDiscounts: { users: [], roles: [] },
    });

    expect(patches).toEqual([]);
    expect(handed).toEqual(stored);
  });

  it("asks „Wer darf buchen?“ with three tiles, each with a hint", async () => {
    const { wrapper } = await mountPermission();

    expect(wrapper.text()).toContain("Wer darf buchen?");
    expect(wrapper.text()).toContain(
      "Gilt für jede Buchung, auch über einen direkten Link."
    );
    expect(labels(wrapper, ".choice-tile__title")).toEqual([
      "Alle",
      "Alle mit Konto",
      "Nur ausgewählte Rollen und Personen",
    ]);
    expect(labels(wrapper, ".choice-tile__description")).toHaveLength(3);
  });

  it("reads lists without the login requirement as „Nur ausgewählte“ and saves the login with the next pick", async () => {
    const {
      wrapper,
      patches,
      bookable: handed,
      stored,
    } = await mountPermission({
      requiresLogin: false,
      permittedRoles: ["r1"],
    });

    expect(checked(wrapper, "selected")).toBe(true);

    await pick(wrapper, "Rollen", "Schulen");

    expect(patches).toEqual([
      { requiresLogin: true, permittedRoles: ["r1", "r2"] },
    ]);
    expect(handed).toEqual(stored);
  });

  it("opens the bookable to everyone: no login, no lists", async () => {
    const { wrapper, patches } = await mountPermission({
      requiresLogin: true,
      permittedRoles: ["r1"],
      permittedUsers: ["anna@example.org"],
    });

    await find(wrapper, "access-everyone").trigger("click");

    expect(patches).toEqual([
      { requiresLogin: false, permittedRoles: [], permittedUsers: [] },
    ]);
  });

  it("keeps the login for „Alle mit Konto“ and drops the lists", async () => {
    const { wrapper, patches } = await mountPermission({
      requiresLogin: true,
      permittedUsers: ["anna@example.org"],
    });

    await find(wrapper, "access-signedIn").trigger("click");

    expect(patches).toEqual([{ permittedUsers: [] }]);
    expect(checked(wrapper, "signedIn")).toBe(true);
  });

  it("sets the login for „Nur ausgewählte“ and says who books until someone is named", async () => {
    const { wrapper, patches } = await mountPermission();

    await find(wrapper, "access-selected").trigger("click");

    expect(patches).toEqual([{ requiresLogin: true }]);
    expect(checked(wrapper, "selected")).toBe(true);
    expect(find(wrapper, "selected-empty").text()).toBe(
      "Noch niemand gewählt. Bis dahin darf jede Person mit Konto buchen."
    );
  });

  it("stays at „Nur ausgewählte“ when the last person is removed", async () => {
    const { wrapper, patches } = await mountPermission({
      requiresLogin: true,
      permittedUsers: ["anna@example.org"],
    });

    await find(wrapper, "permitted-users")
      .find(".v-chip__close")
      .trigger("click");

    expect(lastPatch(patches)).toEqual({ permittedUsers: [] });
    expect(checked(wrapper, "selected")).toBe(true);
    expect(find(wrapper, "selected-empty").exists()).toBe(true);
  });

  it("offers roles first, then people with name and id", async () => {
    const { wrapper, patches } = await mountPermission({
      requiresLogin: true,
      permittedRoles: ["r1"],
    });

    expect(
      wrapper
        .findAllComponents({ name: "v-autocomplete" })
        .wrappers.map((field) => field.props("label"))
        .slice(0, 2)
    ).toEqual(["Rollen", "Personen"]);

    const person = (await open(wrapper, "Personen")).find((el) =>
      el.textContent.includes("Anna Schmidt")
    );
    expect(person.textContent).toContain("anna@example.org");

    person.click();
    await flushPromises();

    expect(lastPatch(patches)).toEqual({
      permittedUsers: ["anna@example.org"],
    });
    expect(find(wrapper, "permitted-users").text()).toContain("Anna Schmidt");
  });

  it("shows ids the tenant no longer knows and removes them", async () => {
    const { wrapper, patches } = await mountPermission({
      requiresLogin: true,
      permittedRoles: ["r1", "gone-role"],
    });
    const roles = find(wrapper, "permitted-roles");

    expect(roles.text()).toContain("Vereine");
    expect(roles.text()).toContain("gone-role");

    const unknown = roles
      .findAll(".v-chip")
      .wrappers.find((chip) => chip.text().includes("gone-role"));
    await unknown.find(".v-chip__close").trigger("click");

    expect(lastPatch(patches)).toEqual({ permittedRoles: ["r1"] });
  });

  it("loads roles and people once, of the bookable's tenant", async () => {
    const { wrapper } = await mountPermission();

    await find(wrapper, "access-selected").trigger("click");
    await find(wrapper, "access-everyone").trigger("click");
    await flushPromises();

    expect(ApiRolesService.getTenantRoles).toHaveBeenCalledTimes(1);
    expect(ApiRolesService.getTenantRoles).toHaveBeenCalledWith(true, "t2");
    expect(ApiTenantService.getTenantUsers).toHaveBeenCalledTimes(1);
    expect(ApiTenantService.getTenantUsers).toHaveBeenCalledWith("t2");
  });
});

describe("BookableFlowPermission - Preisnachlass", () => {
  const DISCOUNTS = {
    users: [{ userId: "anna@example.org", discountPercent: 50 }],
    roles: [{ roleId: "r1", discountPercent: 100 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ApiRolesService.getTenantRoles.mockResolvedValue({
      data: [
        { id: "r1", name: "Vereine" },
        { id: "r2", name: "Schulen" },
      ],
    });
    ApiTenantService.getTenantUsers.mockResolvedValue({
      users: [{ userId: "anna@example.org" }],
      userDetails: [
        { id: "anna@example.org", firstName: "Anna", lastName: "Schmidt" },
      ],
    });
  });

  const rows = (wrapper) =>
    wrapper
      .findAll("[data-test='discount-row']")
      .wrappers.map((row) => [
        row.find("[data-test='discount-name']").text(),
        row.find("input").element.value,
      ]);

  it("lists roles, then people: name and percent, with the rule as a hint", async () => {
    const { wrapper } = await mountPermission({
      ...PAID,
      bookingDiscounts: DISCOUNTS,
    });
    const discounts = find(wrapper, "discounts");

    expect(discounts.text()).toContain("Preisnachlass");
    expect(discounts.text()).toContain("100 % heißt kostenfrei");
    expect(discounts.text()).toContain("gilt der höchste");
    expect(rows(wrapper)).toEqual([
      ["Vereine", "100"],
      ["Anna Schmidt", "50"],
    ]);
    expect(find(wrapper, "discounts-not-paid").exists()).toBe(false);
  });

  it("rebuilds the Preisnachlass as a whole for a changed percent", async () => {
    const {
      wrapper,
      patches,
      bookable: handed,
      stored,
    } = await mountPermission({ ...PAID, bookingDiscounts: DISCOUNTS });

    await wrapper
      .findAll("[data-test='discount-row'] input")
      .at(1)
      .setValue("25");

    expect(lastPatch(patches)).toEqual({
      bookingDiscounts: {
        roles: DISCOUNTS.roles,
        users: [{ userId: "anna@example.org", discountPercent: 25 }],
      },
    });
    expect(handed).toEqual(stored);
  });

  it("removes an entry without a dialog", async () => {
    const { wrapper, patches } = await mountPermission({
      ...PAID,
      bookingDiscounts: DISCOUNTS,
    });

    await wrapper
      .findAll("[data-test='discount-row'] [data-test='discount-remove']")
      .at(0)
      .trigger("click");

    expect(patches).toEqual([
      { bookingDiscounts: { roles: [], users: DISCOUNTS.users } },
    ]);
  });

  it("adds a role at 100 %", async () => {
    const { wrapper, patches } = await mountPermission({
      ...PAID,
      bookingDiscounts: { users: [], roles: [] },
    });

    await pick(wrapper, "Rolle hinzufügen", "Schulen");

    expect(patches).toEqual([
      {
        bookingDiscounts: {
          roles: [{ roleId: "r2", discountPercent: 100 }],
          users: [],
        },
      },
    ]);
  });

  it("keeps it editable on a free bookable and says when it acts", async () => {
    const { wrapper, patches } = await mountPermission({
      bookingDiscounts: DISCOUNTS,
    });

    expect(find(wrapper, "discounts-not-paid").text()).toContain(
      "sobald das Objekt einen Preis hat"
    );
    expect(rows(wrapper)).toHaveLength(2);
    expect(patches).toEqual([]);
  });

  it("asks for a whole number from 0 to 100 once the field is left", async () => {
    const { wrapper } = await mountPermission({
      ...PAID,
      bookingDiscounts: DISCOUNTS,
    });
    const input = wrapper.find("[data-test='discount-row'] input");

    await input.setValue("12.5");
    await input.trigger("blur");

    expect(find(wrapper, "discounts").text()).toContain(
      "Bitte eine ganze Zahl von 0 bis 100 eingeben."
    );
  });

  it("leaves it out without expert mode while unused", async () => {
    const { wrapper } = await mountPermission({}, { expertMode: false });

    expect(find(wrapper, "discounts").exists()).toBe(false);
  });

  it("shows it without expert mode while it is set or stored", async () => {
    const set = await mountPermission(
      { bookingDiscounts: DISCOUNTS },
      { expertMode: false }
    );
    const stored = await mountPermission(
      {},
      { expertMode: false, saved: { bookingDiscounts: DISCOUNTS } }
    );

    expect(find(set.wrapper, "discounts").exists()).toBe(true);
    expect(find(stored.wrapper, "discounts").exists()).toBe(true);
  });
});
