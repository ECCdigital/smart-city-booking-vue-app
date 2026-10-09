import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import OnboardingSetupLinks from "@/components/Tenant/Onboarding/OnboardingSetupLinks.vue";

const mountLinks = (propsData) =>
  mountComponent(OnboardingSetupLinks, {
    propsData,
    stubs: { RouterLink: true },
  });

describe("OnboardingSetupLinks", () => {
  it("offers the payment form for a paid offer only", () => {
    expect(
      mountLinks({ paid: true }).find("[data-test='setup-payment']").exists()
    ).toBe(true);

    const free = mountLinks({ paid: false });
    expect(free.find("[data-test='setup-payment']").exists()).toBe(false);
    expect(free.text()).toContain("kein Zahlungsweg erforderlich");
  });

  // No wizard step to return to any more (ECCdigital/tickets#371).
  it("opens the existing forms on their own, without a way back", () => {
    const wrapper = mountLinks({ paid: true });
    const to = (test) => wrapper.find(`[data-test='${test}']`).vm.$props.to;

    expect(to("setup-legal")).toEqual({
      name: "tenant",
      query: { tab: "legal" },
    });
    expect(to("setup-payment")).toEqual({
      name: "tenant",
      query: { tab: "payments" },
    });
  });

  it("leaves payment out for a free offer when asked to", () => {
    const free = mountLinks({ paid: false, paymentWhenPaidOnly: true });

    expect(free.text()).not.toContain("Zahlung");
    expect(free.find("[data-test='setup-legal']").exists()).toBe(true);
  });
});
