import { describe, expect, it } from "vitest";
import Bookable from "@/entities/bookable";
import BookableFlowAmount from "@/components/Bookable/Flow/BookableFlowAmount.vue";
import { normalizeBookable } from "@/utils/normalizeBookable";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import { flushPromises } from "@tests/unit/support/api";

/**
 * Anzahl and Höchstmenge je Buchung, the one component of both modes: the
 * editing page frames it as the card „Anzahl“ in „Preise & Kapazität“, the
 * guided flow as the step „Anzahl & Kapazität“. It knows no mode, so each
 * case here covers both.
 */

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

const mountAmount = (overrides = {}) =>
  mountEditing(BookableFlowAmount, { bookable: bookable(overrides) });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);
const checked = (wrapper, test) =>
  find(wrapper, test).attributes("aria-checked") === "true";
const text = (wrapper, test) =>
  find(wrapper, test).text().replace(/\s+/g, " ").trim();

const IFBS_AMOUNT = {
  provider: "ifbs",
  active: true,
  handles: ["maxAmount"],
};

describe("BookableFlowAmount - mounting", () => {
  it.each([
    ["an unlimited", { amount: null }],
    ["a zero", { amount: 0 }],
    ["a limited", { amount: 4, maxAmountPerBooking: 2 }],
    ["an invalid Höchstmenge", { amount: 4, maxAmountPerBooking: 0 }],
  ])("changes nothing for %s Anzahl", async (_, overrides) => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountAmount(overrides);
    await wrapper.vm.$nextTick();

    expect(patches).toEqual([]);
    expect(handedIn).toEqual(stored);
  });

  it("names both questions and their answers", () => {
    const { wrapper } = mountAmount({ amount: 3 });

    expect(text(wrapper, "flow-amount-box")).toContain("Anzahl / Kapazität");
    expect(text(wrapper, "flow-max-amount")).toContain(
      "Höchstmenge je Buchung"
    );
    expect(text(wrapper, "flow-amount-mode")).toBe("Begrenzt Unbegrenzt");
    expect(text(wrapper, "flow-max-amount-mode")).toBe("Begrenzt Unbegrenzt");
  });
});

describe("BookableFlowAmount - Anzahl", () => {
  it("shows an Anzahl of 0 as „Unbegrenzt“, saved as null", () => {
    const { wrapper, bookable: handedIn } = mountAmount({ amount: 0 });

    expect(checked(wrapper, "flow-amount-mode-unlimited")).toBe(true);
    expect(find(wrapper, "flow-amount-input").exists()).toBe(false);
    expect(text(wrapper, "flow-amount-box")).toContain(
      "Es gibt keine feste Anzahl"
    );
    // What BookableEdit saves: the bookable as normalizeBookable left it.
    expect(normalizeBookable(handedIn).amount).toBeNull();
  });

  it("shows an empty Anzahl as „Unbegrenzt“ and stores „Unbegrenzt“ as null", async () => {
    const { wrapper, patches } = mountAmount({ amount: 3 });

    await find(wrapper, "flow-amount-mode-unlimited").trigger("click");

    expect(lastPatch(patches)).toEqual({ amount: null });
    expect(checked(wrapper, "flow-amount-mode-unlimited")).toBe(true);

    const empty = mountAmount({ amount: "" });
    expect(checked(empty.wrapper, "flow-amount-mode-unlimited")).toBe(true);
  });

  it("starts „Begrenzt“ at 1 and counts from there", async () => {
    const { wrapper, patches } = mountAmount({ amount: null });

    await find(wrapper, "flow-amount-mode-limited").trigger("click");
    expect(lastPatch(patches)).toEqual({ amount: 1 });
    expect(find(wrapper, "flow-amount-input").element.value).toBe("1");
    expect(
      find(wrapper, "flow-amount-less").attributes("disabled")
    ).toBeDefined();

    await find(wrapper, "flow-amount-more").trigger("click");
    expect(lastPatch(patches)).toEqual({ amount: 2 });

    await find(wrapper, "flow-amount-less").trigger("click");
    expect(lastPatch(patches)).toEqual({ amount: 1 });
  });

  it("keeps a typed Anzahl a whole number from 1", async () => {
    const { wrapper, patches } = mountAmount({ amount: 4 });
    const input = find(wrapper, "flow-amount-input");

    await input.setValue("7");
    expect(lastPatch(patches)).toEqual({ amount: 7 });

    await input.setValue("2.5");
    expect(lastPatch(patches)).toEqual({ amount: 2 });

    await input.setValue("0");
    expect(lastPatch(patches)).toEqual({ amount: 1 });
  });

  it("reads an emptied Anzahl as „Unbegrenzt“ once the field is left", async () => {
    const { wrapper, patches } = mountAmount({ amount: 4 });
    const input = find(wrapper, "flow-amount-input");

    await input.setValue("");
    expect(lastPatch(patches)).toEqual({ amount: null });
    expect(checked(wrapper, "flow-amount-mode-limited")).toBe(true);

    await input.trigger("blur");
    expect(checked(wrapper, "flow-amount-mode-unlimited")).toBe(true);
  });

  it("names the unit the bookable is booked in", () => {
    expect(
      text(mountAmount({ amount: 3 }).wrapper, "flow-amount-box")
    ).toContain("Einheiten");
    expect(
      text(
        mountAmount({ amount: 3, priceType: "per-square-meter" }).wrapper,
        "flow-amount-box"
      )
    ).toContain("m²");
  });

  it("questions more than one unit of a room without refusing it", async () => {
    const { wrapper, patches } = mountAmount({ type: "room", amount: 1 });
    expect(find(wrapper, "flow-amount-warning").exists()).toBe(false);

    await find(wrapper, "flow-amount-more").trigger("click");

    expect(lastPatch(patches)).toEqual({ amount: 2 });
    expect(text(wrapper, "flow-amount-warning")).toBe(
      "Mehr als eine Einheit für einen Raum – sicher?"
    );
  });

  it("does not question more than one unit of a resource", () => {
    const { wrapper } = mountAmount({ type: "resource", amount: 5 });

    expect(find(wrapper, "flow-amount-warning").exists()).toBe(false);
  });
});

describe("BookableFlowAmount - Höchstmenge je Buchung", () => {
  it.each([
    ["the Anzahl is unlimited", { amount: null }, true],
    ["the Anzahl is more than 1", { amount: 3 }, true],
    ["the Anzahl is 1", { amount: 1 }, false],
    [
      "the Anzahl is 1 but a Höchstmenge is set",
      { amount: 1, maxAmountPerBooking: 2 },
      true,
    ],
  ])("shows while %s", (_, overrides, shown) => {
    const { wrapper } = mountAmount(overrides);

    expect(find(wrapper, "flow-max-amount").exists()).toBe(shown);
  });

  it("stores „Unbegrenzt“ as null and starts „Begrenzt“ at 1", async () => {
    const { wrapper, patches } = mountAmount({
      amount: 10,
      maxAmountPerBooking: 3,
    });

    await find(wrapper, "flow-max-amount-mode-unlimited").trigger("click");
    expect(lastPatch(patches)).toEqual({ maxAmountPerBooking: null });
    expect(text(wrapper, "flow-max-amount")).toContain(
      "Eine Buchung darf alle freien Einheiten nehmen."
    );

    await find(wrapper, "flow-max-amount-mode-limited").trigger("click");
    expect(lastPatch(patches)).toEqual({ maxAmountPerBooking: 1 });

    await find(wrapper, "flow-max-amount-more").trigger("click");
    expect(lastPatch(patches)).toEqual({ maxAmountPerBooking: 2 });
  });

  it("keeps a typed Höchstmenge as a number", async () => {
    const { wrapper, patches } = mountAmount({ amount: 10 });
    await find(wrapper, "flow-max-amount-mode-limited").trigger("click");

    await find(wrapper, "flow-max-amount-input").setValue("3");

    expect(lastPatch(patches)).toEqual({ maxAmountPerBooking: 3 });
  });

  it.each(["0", "2.5"])(
    "shows the Meldung for %s once the field is left",
    async (value) => {
      const { wrapper, patches } = mountAmount({
        amount: 10,
        maxAmountPerBooking: 3,
      });
      const input = find(wrapper, "flow-max-amount-input");

      await input.setValue(value);
      await input.trigger("blur");
      await flushPromises();

      expect(lastPatch(patches)).toEqual({
        maxAmountPerBooking: Number(value),
      });
      expect(text(wrapper, "flow-max-amount")).toContain(
        "Bitte eine ganze Zahl ab 1 eingeben oder Unbegrenzt wählen."
      );
    }
  );

  it("keeps a stored invalid Höchstmenge as a limit to fix", () => {
    const { wrapper } = mountAmount({ amount: 1, maxAmountPerBooking: 0 });

    expect(checked(wrapper, "flow-max-amount-mode-limited")).toBe(true);
    expect(find(wrapper, "flow-max-amount-input").element.value).toBe("0");
  });

  it("saves an emptied Höchstmenge as null, „Unbegrenzt“ once left", async () => {
    const { wrapper, patches } = mountAmount({
      amount: 1,
      maxAmountPerBooking: 3,
    });
    const input = find(wrapper, "flow-max-amount-input");

    await input.setValue("");
    expect(lastPatch(patches)).toEqual({ maxAmountPerBooking: null });
    expect(checked(wrapper, "flow-max-amount-mode-limited")).toBe(true);

    await input.trigger("blur");
    // Anzahl 1 and no Höchstmenge: there is nothing left to limit.
    expect(find(wrapper, "flow-max-amount").exists()).toBe(false);
  });
});

describe("BookableFlowAmount - Anzahl from a provider", () => {
  it("shows only the note instead of the Anzahl", () => {
    const { wrapper } = mountAmount({
      amount: 4,
      externalProviders: [IFBS_AMOUNT],
    });

    expect(text(wrapper, "flow-amount-external")).toContain(
      "ParkraumService führt die Anzahl"
    );
    expect(find(wrapper, "flow-amount-mode").exists()).toBe(false);
    expect(find(wrapper, "flow-amount-input").exists()).toBe(false);
  });

  it("jumps to the provider's setting", async () => {
    const { wrapper } = mountAmount({ externalProviders: [IFBS_AMOUNT] });

    await find(wrapper, "flow-amount-external-link").trigger("click");

    expect(wrapper.emitted("open-section")).toEqual([
      [{ tabKey: "accessLocks", sectionId: "pricing-external" }],
    ]);
  });

  it("keeps the Höchstmenge editable, as both limits apply", async () => {
    const { wrapper, patches } = mountAmount({
      amount: 4,
      maxAmountPerBooking: 2,
      externalProviders: [IFBS_AMOUNT],
    });

    const input = find(wrapper, "flow-max-amount-input");
    expect(input.attributes("disabled")).toBeUndefined();
    await input.setValue("3");

    expect(lastPatch(patches)).toEqual({ maxAmountPerBooking: 3 });
  });

  it("asks for the Anzahl again when the provider entry is inactive", () => {
    const { wrapper } = mountAmount({
      amount: 4,
      externalProviders: [{ ...IFBS_AMOUNT, active: false }],
    });

    expect(find(wrapper, "flow-amount-external").exists()).toBe(false);
    expect(find(wrapper, "flow-amount-input").element.value).toBe("4");
  });
});
