import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutSeriesBooking from "@/views/BundleCheckout/CheckoutSeriesBooking.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

// Wednesday, 07.10.2026, noon local time.
const NOW = new Date(2026, 9, 7, 12, 0, 0);

function mountSeries() {
  return mountComponent(CheckoutSeriesBooking, {
    propsData: {
      leadItem: {
        bookableId: "room",
        amount: 1,
        valid: true,
        bookable: { id: "room", title: "Raum", isScheduleRelated: true },
      },
      bookingAttempts: [],
      dateBeginModel: "2026-10-14",
      timeBeginModel: "10:00",
      dateEndModel: "2026-10-14",
      timeEndModel: "12:00",
      firstBookingDate: "2026-10-14",
    },
    stubs: { CheckoutTimeSelector: true },
  });
}

/** The series' date field under its label, e.g. „Startdatum“. */
function field(wrapper, label) {
  return wrapper
    .findAll(".v-text-field")
    .filter(
      (w) =>
        w.find("label").exists() &&
        w.find("label").text() === label &&
        w.find("input[type=date]").exists()
    )
    .at(0);
}

async function type(wrapper, label, value) {
  const input = field(wrapper, label).find("input");
  await input.setValue(value);
  await input.trigger("blur");
  await flushPromises();
}

function generateButton(wrapper) {
  return wrapper
    .findAll("button")
    .filter((b) => b.text().includes("Serie generieren"))
    .at(0);
}

/**
 * The series of the old checkout takes no typed start date before today
 * (ECCdigital/tickets#188); its native date field had no minimum.
 */
describe("CheckoutSeriesBooking - typed dates", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refuses a typed start date before today", async () => {
    const wrapper = mountSeries();

    await type(wrapper, "Startdatum", "2024-06-14");

    expect(field(wrapper, "Startdatum").find(".v-messages").text()).toBe(
      "Das Datum darf nicht vor heute liegen"
    );
    expect(generateButton(wrapper).attributes("disabled")).toBe("disabled");
  });

  it("generates a series from today on", async () => {
    const wrapper = mountSeries();

    await type(wrapper, "Startdatum", "2026-10-07");

    expect(field(wrapper, "Startdatum").find(".v-messages").text()).toBe("");
    expect(generateButton(wrapper).attributes("disabled")).toBeUndefined();
  });
});
