import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Vue from "vue";
import VueTheMask from "vue-the-mask";
import CheckoutTimeSelector from "@/views/BundleCheckout/CheckoutTimeSelector.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

Vue.use(VueTheMask);

// Wednesday, 07.10.2026, noon local time.
const NOW = new Date(2026, 9, 7, 12, 0, 0);

function leadItem() {
  return {
    bookableId: "room",
    amount: 1,
    valid: true,
    bookable: {
      id: "room",
      tenantId: "t1",
      title: "Raum",
      isScheduleRelated: true,
      minBookingDuration: 0,
      maxBookingDuration: null,
    },
  };
}

function mountSelector() {
  return mountComponent(CheckoutTimeSelector, {
    propsData: { leadItem: leadItem() },
    stubs: { CheckoutCalendar: true, TimezoneWarning: true },
  });
}

/** The text field under its label, e.g. „Startdatum“. */
function field(wrapper, label) {
  const found = wrapper
    .findAll(".v-text-field")
    .filter((w) => w.find("label").text() === label);
  return found.at(0);
}

async function type(wrapper, label, value) {
  const input = field(wrapper, label).find("input");
  await input.setValue(value);
  await input.trigger("blur");
  await flushPromises();
}

function messages(wrapper, label) {
  return field(wrapper, label).find(".v-messages").text();
}

/**
 * The old checkout takes no typed date before today (ECCdigital/tickets#188):
 * the date picker had a minimum, the typed field had none. The end date
 * carries „Enddatum muss nach dem Startdatum liegen“ again.
 */
describe("CheckoutTimeSelector - typed dates", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses a typed start date before today and keeps it out of the booking", async () => {
    const wrapper = mountSelector();

    await type(wrapper, "Startdatum", "14.06.2024");

    expect(messages(wrapper, "Startdatum")).toBe(
      "Das Datum darf nicht vor heute liegen"
    );
    const selected = wrapper.emitted("booking-time-selected") || [];
    expect(selected).toHaveLength(0);
  });

  it("takes today and a later date", async () => {
    const wrapper = mountSelector();

    await type(wrapper, "Startdatum", "07.10.2026");
    expect(messages(wrapper, "Startdatum")).toBe("");

    await type(wrapper, "Startdatum", "21.10.2026");
    expect(messages(wrapper, "Startdatum")).toBe("");
  });

  it("refuses a typed end date before today", async () => {
    const wrapper = mountSelector();

    await type(wrapper, "Enddatum", "01.01.2025");

    expect(messages(wrapper, "Enddatum")).toBe(
      "Das Datum darf nicht vor heute liegen"
    );
  });

  it("refuses an end date before the start date", async () => {
    const wrapper = mountSelector();

    await type(wrapper, "Startdatum", "21.10.2026");
    await type(wrapper, "Enddatum", "14.10.2026");

    expect(messages(wrapper, "Enddatum")).toBe(
      "Enddatum muss nach dem Startdatum liegen"
    );
  });
});
