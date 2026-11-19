import { describe, expect, it } from "vitest";
import CheckoutQuickSummary from "@/views/BundleCheckout/CheckoutQuickSummary.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

function item(bookableId, amount, bookable = {}) {
  return {
    bookableId,
    amount,
    valid: true,
    userPriceEur: 0,
    regularPriceEur: 0,
    bookable: {
      id: bookableId,
      title: bookableId,
      priceType: "per-item",
      amount: null,
      maxAmountPerBooking: null,
      checkoutBookableIds: [],
      attachments: [],
      ...bookable,
    },
  };
}

async function mountSummary(leadItem, subsequentItems = []) {
  const wrapper = mountComponent(CheckoutQuickSummary, {
    propsData: { leadItem, subsequentItems },
  });
  await flushPromises();
  return wrapper;
}

function plusOf(wrapper, index) {
  return wrapper.findAll("button.increase-amount").at(index);
}

/**
 * The sidebar lets the customer raise the amount of every item, so the lead
 * item stops there too at the stricter of capacity and Höchstmenge je
 * Buchung. An add-on keeps its old behaviour: the backend refuses it.
 */
describe("CheckoutQuickSummary - the lead item's amount", () => {
  it("stops raising the lead item at its Höchstmenge je Buchung", async () => {
    const lead = item("room", 2, { amount: 10, maxAmountPerBooking: 3 });
    const wrapper = await mountSummary(lead);

    await plusOf(wrapper, 0).trigger("click");
    expect(lead.amount).toBe(3);

    await flushPromises();
    expect(plusOf(wrapper, 0).attributes("disabled")).toBe("disabled");
    await plusOf(wrapper, 0).trigger("click");
    expect(lead.amount).toBe(3);
    expect(wrapper.emitted("validate-items")).toHaveLength(1);
  });

  it("stops at the capacity when it is the stricter limit", async () => {
    const lead = item("room", 2, { amount: 2, maxAmountPerBooking: 5 });
    const wrapper = await mountSummary(lead);

    expect(plusOf(wrapper, 0).attributes("disabled")).toBe("disabled");
  });

  it("raises without a limit while neither limits", async () => {
    const lead = item("room", 7, { amount: 0, maxAmountPerBooking: null });
    const wrapper = await mountSummary(lead);

    await plusOf(wrapper, 0).trigger("click");

    expect(lead.amount).toBe(8);
  });

  it("leaves an add-on's limit to the backend", async () => {
    const lead = item("room", 1, { amount: 10 });
    const addOn = item("beamer", 2, { amount: 2, maxAmountPerBooking: 2 });
    const wrapper = await mountSummary(lead, [addOn]);

    await plusOf(wrapper, 1).trigger("click");

    expect(addOn.amount).toBe(3);
  });
});

/** Private or business booking: shown in the summary and sent with the booking. */
describe("CheckoutQuickSummary — Buchungsart", () => {
  async function mountWithContact(contactDetails) {
    const wrapper = mountComponent(CheckoutQuickSummary, {
      propsData: {
        leadItem: item("room", 1),
        subsequentItems: [],
        finalCheck: true,
        contactDetails: { name: "Erika Muster", ...contactDetails },
      },
    });
    await flushPromises();
    return wrapper;
  }

  it.each([
    [{ company: "" }, "Privat", false],
    [{ company: "ACME" }, "Geschäftlich", true],
    [{ company: "ACME", isBusiness: false }, "Privat", false],
  ])("reads %j as %s and sends isBusiness %s", async (contact, label, sent) => {
    const wrapper = await mountWithContact(contact);

    expect(wrapper.text()).toMatch(new RegExp(`Buchungsart:\\s*${label}`));
    expect(wrapper.vm.compileBooking().isBusiness).toBe(sent);
  });
});
