import { describe, expect, it, vi } from "vitest";
import Bookable from "@/entities/bookable";
import BookableFlowPrice from "@/components/Bookable/Flow/BookableFlowPrice.vue";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiHolidaysService", () => ({
  default: { getHolidays: vi.fn().mockResolvedValue({ data: [] }) },
}));

/**
 * Preis, the one component of both modes: the editing page frames it as the
 * card „Preis“ in „Preise & Kapazität“, the guided flow as the step „Preis“.
 * It knows no mode, so each case here covers both.
 */

const category = (priceEur, overrides = {}) => ({
  priceEur,
  interval: { start: null, end: null },
  fixedPrice: false,
  holidays: [],
  weekdays: [],
  ...overrides,
});

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

const TIERS = [
  category(10, { interval: { start: null, end: 2 } }),
  category(8, { interval: { start: 2, end: null } }),
];

function mountPrice(overrides = {}, { expertMode = true, prepare } = {}) {
  const handedIn = bookable(overrides);
  if (prepare) prepare(handedIn);
  const mounted = mountEditing(BookableFlowPrice, {
    bookable: handedIn,
    expertMode,
  });
  return mounted;
}

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const checked = (wrapper, test) =>
  find(wrapper, test).attributes("aria-checked") === "true";
const text = (wrapper, test) =>
  find(wrapper, test).text().replace(/\s+/g, " ").trim();

describe("BookableFlowPrice - the price form", () => {
  it("starts free and says so", () => {
    const { wrapper } = mountPrice();

    expect(checked(wrapper, "flow-price-mode-free")).toBe(true);
    expect(find(wrapper, "flow-free").exists()).toBe(true);
  });

  it("changes nothing when it mounts", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountPrice({
      priceType: "per-hour",
      priceCategories: TIERS,
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(patches).toEqual([]);
    expect(handedIn).toEqual(stored);
  });

  it("reads the form from the bookable alone, a missing bound being no tier", () => {
    const legacy = mountPrice({
      priceCategories: [category(10, { interval: { start: undefined } })],
    });
    const tiers = mountPrice({ priceCategories: TIERS });

    expect(checked(legacy.wrapper, "flow-price-mode-simple")).toBe(true);
    expect(checked(tiers.wrapper, "flow-price-mode-tiers")).toBe(true);
  });

  it("reads the form again when the bookable changes elsewhere", async () => {
    const { wrapper } = mountPrice();

    await wrapper.setProps({
      bookable: bookable({
        priceType: "per-hour",
        priceCategories: [category(10)],
      }),
    });

    expect(checked(wrapper, "flow-price-mode-simple")).toBe(true);
  });

  it("keeps a chosen simple price while it is still 0 €", async () => {
    const { wrapper } = mountPrice({ isScheduleRelated: true });

    await find(wrapper, "flow-price-mode-simple").trigger("click");

    expect(checked(wrapper, "flow-price-mode-simple")).toBe(true);
  });

  it("prefills the Preisart from the Buchungsart when leaving free", async () => {
    const { wrapper, patches } = mountPrice({ isScheduleRelated: true });

    await find(wrapper, "flow-price-mode-simple").trigger("click");

    expect(lastPatch(patches).priceType).toBe("per-hour");
    expect(text(wrapper, "flow-prefilled")).toContain(
      "Vorbelegt, weil Buchende im Kalender eine Zeit wählen"
    );
  });

  it("offers Tarife unused in expert mode only, and in use always", () => {
    const unused = mountPrice({}, { expertMode: false });
    const used = mountPrice({ priceCategories: TIERS }, { expertMode: false });

    expect(find(unused.wrapper, "flow-price-mode-tiers").exists()).toBe(false);
    expect(find(used.wrapper, "flow-price-mode-tiers").exists()).toBe(true);
  });

  it("edits Tarife as the Staffel instead of one amount", async () => {
    const { wrapper } = mountPrice({
      priceType: "per-hour",
      priceCategories: [category(10)],
    });

    await find(wrapper, "flow-price-mode-tiers").trigger("click");

    expect(find(wrapper, "price-tiers").exists()).toBe(true);
    expect(find(wrapper, "flow-price-amount").exists()).toBe(false);
    expect(wrapper.text()).toContain("Wonach richten sich die Tarife?");
  });
});

describe("BookableFlowPrice - the Preisart", () => {
  const paid = (priceType, fixedPrice = false) => ({
    priceType,
    priceCategories: [category(20, { fixedPrice })],
  });

  it("offers the four Preisarten of the backend, without „Fester Preis“", () => {
    const { wrapper } = mountPrice(paid("per-item"));

    expect(text(wrapper, "flow-price-type")).toBe(
      "Pro Stunde Pro Tag Stück m²"
    );
    expect(checked(wrapper, "flow-price-type-per-item")).toBe(true);
  });

  it("shows an hour price with fixedPrice as „Tagespauschale“", () => {
    const { wrapper } = mountPrice(paid("per-hour", true));

    const fixed = find(wrapper, "flow-price-fixed");
    expect(fixed.text()).toContain("Tagespauschale");
    expect(fixed.text()).toContain(
      "Jeder angefangene Tag kostet den Preis einmal"
    );
    expect(fixed.find("input").attributes("aria-checked")).toBe("true");
  });

  it.each([
    ["per-day", "Angefangene Tage zählen voll", "anteilig nach Minuten"],
    ["per-item", "Gilt einmal je Buchung", "gebuchte Menge"],
    ["per-square-meter", "Gilt einmal je Buchung", "gebuchte Fläche"],
  ])("names the fixed price of %s by what it does", (type, label, hint) => {
    const { wrapper } = mountPrice(paid(type));

    const fixed = find(wrapper, "flow-price-fixed");
    expect(fixed.text()).toContain(label);
    expect(fixed.text()).toContain(hint);
  });

  it("offers the fixed price for a single unit too", () => {
    const { wrapper } = mountPrice({ ...paid("per-item"), amount: 1 });

    expect(find(wrapper, "flow-price-fixed").exists()).toBe(true);
  });

  it("sets the fixed price to the new Preisart's default on a change", async () => {
    const { wrapper, patches } = mountPrice(paid("per-hour", true));

    await find(wrapper, "flow-price-type-per-item").trigger("click");
    expect(lastPatch(patches)).toEqual({
      priceType: "per-item",
      priceCategories: [category(20, { fixedPrice: false })],
    });

    await find(wrapper, "flow-price-type-per-day").trigger("click");
    expect(lastPatch(patches)).toEqual({
      priceType: "per-day",
      priceCategories: [category(20, { fixedPrice: true })],
    });
  });

  it("hands on the fixed price as the rebuilt categories", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountPrice(paid("per-hour"));

    await find(wrapper, "flow-price-fixed").find("input").trigger("click");

    expect(lastPatch(patches)).toEqual({
      priceCategories: [category(20, { fixedPrice: true })],
    });
    expect(handedIn).toEqual(stored);
  });

  it("explains the price as the backend reckons it", () => {
    const hourly = mountPrice(paid("per-hour"));
    const daily = mountPrice(paid("per-hour", true));

    expect(text(hourly.wrapper, "flow-price-explain")).toContain("50,00");
    expect(text(daily.wrapper, "flow-price-explain")).toContain("60,00");
  });
});

describe("BookableFlowPrice - the amount", () => {
  it("hands on a typed amount as the rebuilt categories", async () => {
    const { wrapper, patches } = mountPrice({
      priceType: "per-hour",
      priceCategories: [category(10)],
    });

    await find(wrapper, "flow-price-amount").find("input").setValue("12.5");

    expect(lastPatch(patches)).toEqual({
      priceCategories: [category("12.5")],
    });
  });

  it("asks for a price once the field is left empty", async () => {
    const { wrapper } = mountPrice({
      priceType: "per-hour",
      priceCategories: [category(10)],
    });

    const input = find(wrapper, "flow-price-amount").find("input");
    await input.setValue("");
    await input.trigger("blur");
    await flushPromises();

    expect(text(wrapper, "flow-price-amount")).toContain(
      "Bitte einen Preis eingeben."
    );
  });
});

describe("BookableFlowPrice - Mehrwertsteuer", () => {
  const paid = (rate) => ({
    priceType: "per-hour",
    priceValueAddedTax: rate,
    priceCategories: [category(10)],
  });

  it("sets 19 % and 7 % as shortcuts of the one number", async () => {
    const { wrapper, patches } = mountPrice(paid(19));

    await find(wrapper, "flow-vat-7").trigger("click");
    expect(lastPatch(patches)).toEqual({ priceValueAddedTax: 7 });

    await find(wrapper, "flow-vat-19").trigger("click");
    expect(lastPatch(patches)).toEqual({ priceValueAddedTax: 19 });
  });

  it("takes any other rate as a number, without a field of its own", async () => {
    const { wrapper, patches } = mountPrice(paid(19));

    expect(wrapper.text()).not.toContain("anderer Satz");
    await find(wrapper, "flow-vat-rate").find("input").setValue("10.7");

    expect(lastPatch(patches)).toEqual({ priceValueAddedTax: 10.7 });
    expect(find(wrapper, "flow-vat-rate").find("input").element.value).toBe(
      "10.7"
    );
  });

  it("stores „aus“ as 0 %", async () => {
    const { wrapper, patches } = mountPrice(paid(7));

    await find(wrapper, "flow-vat-switch").find("input").trigger("click");

    expect(lastPatch(patches)).toEqual({ priceValueAddedTax: 0 });
    expect(find(wrapper, "flow-vat-rate").exists()).toBe(false);
  });

  it("shows the gross sum", () => {
    const { wrapper } = mountPrice(paid(19));

    expect(text(wrapper, "flow-vat-summary")).toContain("11,90");
  });
});

describe("BookableFlowPrice - Rabattcodes", () => {
  const paid = { priceType: "per-hour", priceCategories: [category(10)] };

  it("shows a value never stored as switched on, as the backend treats it", () => {
    const { wrapper } = mountPrice(paid, {
      prepare: (handedIn) => delete handedIn.enableCoupons,
    });

    const coupons = find(wrapper, "flow-coupons");
    expect(coupons.text()).toContain("Rabattcodes");
    expect(coupons.text()).not.toContain("Gutschein");
    expect(coupons.find("input").attributes("aria-checked")).toBe("true");
  });

  it("shows them without expert mode only while switched off", () => {
    const off = mountPrice(
      { ...paid, enableCoupons: false },
      { expertMode: false }
    );
    const on = mountPrice(paid, { expertMode: false });

    expect(find(off.wrapper, "flow-coupons").exists()).toBe(true);
    expect(find(on.wrapper, "flow-coupons").exists()).toBe(false);
  });

  it("hands on the switch", async () => {
    const { wrapper, patches } = mountPrice(paid);

    await find(wrapper, "flow-coupons").find("input").trigger("click");

    expect(patches).toEqual([{ enableCoupons: false }]);
  });
});

describe("BookableFlowPrice - prices of ParkraumService", () => {
  it("shows only the note while the provider handles the prices", () => {
    const { wrapper } = mountPrice({
      priceType: "per-hour",
      priceCategories: [category(10)],
      externalProviders: [
        { provider: "ifbs", active: true, handles: ["pricing"] },
      ],
    });

    expect(find(wrapper, "flow-price-external").text()).toContain(
      "Schließsysteme"
    );
    expect(find(wrapper, "flow-price-mode").exists()).toBe(false);
    expect(find(wrapper, "flow-price-amount").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Empfohlene Einstellungen");
  });
});
