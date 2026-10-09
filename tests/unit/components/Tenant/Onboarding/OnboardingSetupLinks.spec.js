import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import OnboardingSetupLinks from "@/components/Tenant/Onboarding/OnboardingSetupLinks.vue";

const mountLinks = () =>
  mountComponent(OnboardingSetupLinks, { stubs: { RouterLink: true } });

describe("OnboardingSetupLinks", () => {
  // No wizard step to return to any more (ECCdigital/tickets#371).
  it("opens the existing forms on their own, without a way back", () => {
    const wrapper = mountLinks();
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
});
