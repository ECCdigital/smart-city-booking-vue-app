import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import OnboardingSetupLinks from "@/components/Tenant/Onboarding/OnboardingSetupLinks.vue";

const mountLinks = (propsData) =>
  mountComponent(OnboardingSetupLinks, {
    propsData: { returnStep: "setup", bookableId: "b-1", ...propsData },
    stubs: { RouterLink: true },
  });

describe("OnboardingSetupLinks", () => {
  it("opens the existing legal form and names the step to return to", () => {
    const wrapper = mountLinks({ returnStep: "overview" });

    expect(wrapper.vm.formRoute("legal")).toEqual({
      name: "tenant",
      query: {
        tab: "legal",
        onboardingStep: "overview",
        onboardingBookable: "b-1",
      },
    });
  });

  it("offers the payment form for a paid offer only", () => {
    expect(
      mountLinks({ paid: true }).find("[data-test='setup-payment']").exists()
    ).toBe(true);

    const free = mountLinks({ paid: false });
    expect(free.find("[data-test='setup-payment']").exists()).toBe(false);
    expect(free.text()).toContain("kein Zahlungsweg erforderlich");
  });

  it("opens the forms without a way back outside the guided setup", () => {
    const wrapper = mountLinks({ returnStep: null });

    expect(wrapper.vm.formRoute("legal")).toEqual({
      name: "tenant",
      query: { tab: "legal" },
    });
  });

  it("leaves payment out for a free offer when asked to", () => {
    const free = mountLinks({ paid: false, paymentWhenPaidOnly: true });

    expect(free.text()).not.toContain("Zahlung");
    expect(free.find("[data-test='setup-legal']").exists()).toBe(true);
  });
});
