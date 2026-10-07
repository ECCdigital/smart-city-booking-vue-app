import { describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiRuleEngineService", () => ({
  default: {
    getMeta: vi.fn(),
    getRule: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
  },
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
  },
}));

import RuleEngineEdit from "@/views/Management/RuleEngineEdit.vue";
import ApiRuleEngineService from "@/services/api/ApiRuleEngineService";

const SCHEDULE_ERROR =
  "Bitte einen Zeitplan wählen bzw. einen gültigen Cron-Ausdruck eingeben.";

const DATE_SUBTRACT_UNITS = ["minute", "hour", "day", "week", "month"];

// The parts of `GET /api/rule-engine/meta` the editor reads, in the shape
// `ruleMetadata.js` of the 4.3.x backend sends them.
const META = {
  engineEnabled: true,
  allowedResources: ["Booking"],
  allowedActions: ["test"],
  resources: [
    {
      name: "Booking",
      label: "Buchungen",
      fields: [
        { name: "id", label: "Buchungs-ID", type: "string" },
        { name: "isPayed", label: "Bezahlt", type: "boolean" },
        { name: "timeBegin", label: "Buchungsbeginn", type: "datetime" },
        { name: "timeCreated", label: "Erstellt am", type: "datetime" },
      ],
    },
  ],
  actions: [{ type: "test", label: "Test", description: "", params: [] }],
  conditionOperators: [],
  queryOperators: [],
  computedFacts: [{ name: "now", label: "Jetzt", type: "datetime" }],
  placeholders: [
    { token: "$$NOW", label: "Aktueller Zeitpunkt" },
    {
      token: "$$DATE_SUBTRACT",
      label: "Jetzt minus Zeitspanne",
      valueShape: { unit: "day", amount: 14, as: "millis" },
      units: DATE_SUBTRACT_UNITS,
    },
    {
      token: "$$TENANT_MAIL",
      label: "E-Mail des Mandanten",
      context: "actionParams",
    },
  ],
};

async function mountNewRule() {
  ApiRuleEngineService.getMeta.mockResolvedValue(META);
  ApiRuleEngineService.createRule.mockResolvedValue({ id: "rule-1" });
  const store = new Vuex.Store({
    modules: {
      toasts: { namespaced: true, actions: { add: vi.fn() } },
    },
  });
  const wrapper = mountComponent(RuleEngineEdit, {
    store,
    mocks: {
      $route: { params: {} },
      $router: { push: vi.fn() },
    },
    stubs: { RouterLink: true },
  });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

async function fillName(wrapper, name) {
  await wrapper.find("input[type=text]").setValue(name);
}

async function save(wrapper) {
  const button = wrapper
    .findAll("button")
    .filter((b) => b.text().includes("Speichern"))
    .at(0);
  await button.trigger("click");
  await flushPromises();
}

/** Opens the select labelled `label` and clicks the entry `entry`. */
async function choose(wrapper, label, entry) {
  const select = wrapper
    .findAll(".v-select")
    .filter((s) => s.find("label").exists() && s.find("label").text() === label)
    .at(-1);
  await select.find(".v-input__slot").trigger("click");
  await wrapper.vm.$nextTick();
  const item = Array.from(
    document.querySelectorAll(".menuable__content__active .v-list-item")
  ).find((el) => el.textContent.trim() === entry);
  if (!item) throw new Error(`no entry "${entry}" in "${label}"`);
  item.click();
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * Findings 5 and 6 from ECCdigital/tickets#140 (ticket #267): a new rule
 * showed „Täglich“ with `0 9 * * *` but did not save until the frequency was
 * chosen again, and choosing „Erstellt am“ in a new filter row hung the page
 * on ibus. The hang does not reproduce here; the second spec pins the path a
 * user takes so that it stays usable and saves.
 */
describe("RuleEngineEdit, new rule", () => {
  it("saves the schedule it shows by default", async () => {
    const wrapper = await mountNewRule();
    expect(wrapper.text()).toContain("0 9 * * *");

    await fillName(wrapper, "Erinnerung");
    await save(wrapper);

    expect(wrapper.text()).not.toContain(SCHEDULE_ERROR);
    expect(ApiRuleEngineService.createRule).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Erinnerung", schedule: "0 9 * * *" })
    );
  });

  it("lets a new filter row filter and save by „Erstellt am“", async () => {
    const wrapper = await mountNewRule();
    await fillName(wrapper, "Alte Anfragen");

    const addFilter = wrapper
      .findAll("button")
      .filter((b) => b.text().includes("Filter hinzufügen"))
      .at(0);
    await addFilter.trigger("click");
    await choose(wrapper, "Feld", "Erstellt am");
    await choose(wrapper, "Operator", "kleiner als");
    await choose(wrapper, "Wert", "Jetzt minus Zeitspanne");
    await save(wrapper);

    expect(ApiRuleEngineService.createRule).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          timeCreated: {
            $lt: { $$DATE_SUBTRACT: { unit: "day", amount: 14 } },
          },
        },
      })
    );
  });
});
