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
});
