import { describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";

import BookingInitialState from "@/components/Booking/BookingInitialState.vue";

/** A segment of the chooser, as the keyboard reaches it. */
const RADIO = "[role=radio]";

const PAYMENT_METHODS = [
  { type: "CASH", title: "Bar" },
  { type: "TRANSFER", title: "Überweisung" },
];

function mountChooser(priceEur = 25) {
  return mountComponent(BookingInitialState, {
    propsData: { priceEur, paymentMethods: PAYMENT_METHODS },
  });
}

function lastInitialState(wrapper) {
  const emitted = wrapper.emitted("update:initial-state");
  return emitted[emitted.length - 1][0];
}

/** The segments as the admin reads them: word, checked, and how the line draws them. */
function choices(wrapper) {
  return wrapper.findAll(RADIO).wrappers.map((segment) => ({
    label: segment.find(".booking-status-segment-label").text(),
    checked: segment.attributes("aria-checked") === "true",
    state: ["done", "current", "upcoming"].find((state) =>
      segment.classes(`booking-status-segment--${state}`)
    ),
  }));
}

function segment(wrapper, label) {
  return wrapper
    .findAll(RADIO)
    .wrappers.find(
      (candidate) =>
        candidate.find(".booking-status-segment-label").text() === label
    );
}

async function pick(wrapper, label) {
  await segment(wrapper, label).trigger("click");
  await wrapper.vm.$nextTick();
}

function paymentFields(wrapper) {
  return wrapper.findAll(".initial-state-payment").wrappers;
}

/** Opens the payment method select and clicks the option with `text`. */
async function chooseMethod(wrapper, text) {
  await wrapper
    .find(".initial-state-payment-method .v-input__slot")
    .trigger("click");
  await wrapper.vm.$nextTick();
  const option = Array.from(
    document.querySelectorAll(
      ".v-menu__content.menuable__content__active .v-list-item"
    )
  ).find((el) => el.textContent.trim() === text);
  option.click();
  await wrapper.vm.$nextTick();
}

/**
 * The Anfangszustand of the create form (spec E10, N6): the headline is the
 * choice - the draft's path with the segments as radios, named with the
 * state words. The choice stays the act underneath: Angefragt is
 * `requested`, Zahlung offen is `confirmed`, Bestätigt is `paid` on a priced
 * draft and `confirmed` on a free one; the form hears it as
 * `update:initial-state`.
 */
describe("BookingInitialState", () => {
  it("offers the Anfangszustand as the segments of the draft's path, Angefragt chosen", () => {
    const wrapper = mountChooser();

    expect(wrapper.find(".booking-status-label").text()).toBe("Anfangszustand");
    expect(wrapper.find(".booking-status-word").text()).toBe("Angefragt");
    expect(choices(wrapper)).toEqual([
      { label: "Angefragt", checked: true, state: "current" },
      { label: "Zahlung offen", checked: false, state: "upcoming" },
      { label: "Bestätigt", checked: false, state: "upcoming" },
    ]);
    expect(paymentFields(wrapper)).toHaveLength(0);
    expect(lastInitialState(wrapper)).toEqual({
      selection: "requested",
      paymentMethod: null,
      timePaid: null,
    });
  });

  it("offers a free draft the path without Zahlung offen, marked Kostenfrei", () => {
    const wrapper = mountChooser(0);

    expect(choices(wrapper).map((choice) => choice.label)).toEqual([
      "Angefragt",
      "Bestätigt",
    ]);
    expect(wrapper.find(".booking-status-free").text()).toBe("Kostenfrei");
  });

  it("reads Zahlung offen as the act of releasing, without payment", async () => {
    const wrapper = mountChooser(25);

    await pick(wrapper, "Zahlung offen");

    expect(lastInitialState(wrapper)).toEqual({
      selection: "confirmed",
      paymentMethod: null,
      timePaid: null,
    });
    expect(wrapper.find(".booking-status-word").text()).toBe("Zahlung offen");
    expect(choices(wrapper)).toEqual([
      { label: "Angefragt", checked: false, state: "done" },
      { label: "Zahlung offen", checked: true, state: "current" },
      { label: "Bestätigt", checked: false, state: "upcoming" },
    ]);
    expect(paymentFields(wrapper)).toHaveLength(0);
  });

  it("reads Bestätigt on a free draft as releasing, chosen by keyboard", async () => {
    const wrapper = mountChooser(0);

    await segment(wrapper, "Bestätigt").trigger("keydown.enter");
    await wrapper.vm.$nextTick();

    expect(lastInitialState(wrapper)).toEqual({
      selection: "confirmed",
      paymentMethod: null,
      timePaid: null,
    });
    expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
    expect(paymentFields(wrapper)).toHaveLength(0);

    await segment(wrapper, "Angefragt").trigger("keydown.space");
    await wrapper.vm.$nextTick();
    expect(lastInitialState(wrapper)).toMatchObject({
      selection: "requested",
    });
  });

  it("asks for the payment under the line when Bestätigt is chosen with a price, dated now", async () => {
    const now = new Date(2026, 8, 6, 10, 15);
    vi.useFakeTimers({ now, toFake: ["Date"] });
    try {
      const wrapper = mountChooser(25);

      await pick(wrapper, "Bestätigt");

      expect(lastInitialState(wrapper)).toEqual({
        selection: "paid",
        paymentMethod: null,
        timePaid: now.getTime(),
      });
      expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
      expect(wrapper.find(".booking-status-payment").exists()).toBe(true);
      expect(paymentFields(wrapper)).toHaveLength(3);
      expect(
        segment(wrapper, "Bestätigt")
          .find(".booking-status-segment-date")
          .text()
      ).toBe("bezahlt 06.09.2026, 10:15");

      await chooseMethod(wrapper, "Überweisung");
      expect(lastInitialState(wrapper)).toEqual({
        selection: "paid",
        paymentMethod: "TRANSFER",
        timePaid: now.getTime(),
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves the mark with the price while the choice stays the act", async () => {
    const wrapper = mountChooser(25);
    await pick(wrapper, "Zahlung offen");

    await wrapper.setProps({ priceEur: 0 });

    expect(lastInitialState(wrapper)).toMatchObject({
      selection: "confirmed",
    });
    expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
    expect(choices(wrapper)).toEqual([
      { label: "Angefragt", checked: false, state: "done" },
      { label: "Bestätigt", checked: true, state: "current" },
    ]);

    await wrapper.setProps({ priceEur: 40 });
    expect(wrapper.find(".booking-status-word").text()).toBe("Zahlung offen");
  });

  it("falls back to releasing when a paid draft turns free", async () => {
    const wrapper = mountChooser(25);
    await pick(wrapper, "Bestätigt");
    expect(paymentFields(wrapper)).toHaveLength(3);

    await wrapper.setProps({ priceEur: 0 });

    expect(lastInitialState(wrapper)).toMatchObject({
      selection: "confirmed",
    });
    expect(wrapper.find(".booking-status-word").text()).toBe("Bestätigt");
    expect(paymentFields(wrapper)).toHaveLength(0);
    expect(wrapper.find(".booking-status-segment-date").exists()).toBe(false);
  });
});
