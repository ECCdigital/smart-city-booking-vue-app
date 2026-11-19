import { describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiPaymentService", () => ({ default: {} }));

import TenantEditPayments from "@/components/Tenant/Edit/TenantEditPayments.vue";

// GiroCockpit's test mode (ECCdigital/tickets#796): the backend asks
// GiroCheckout for the payment methods in test mode only for
// `paymentMode: "test"`, for live mode otherwise.
function giroCockpit(fields = {}) {
  return {
    type: "payment",
    id: "giroCockpit",
    title: "S-Public Services",
    paymentMerchantId: "",
    paymentProjectId: "",
    paymentSecret: "",
    paymentPurposeSuffix: "",
    active: true,
    ...fields,
  };
}

// The form edits the app in place, as `TenantOverview.vue` hands it over.
// The panel renders its fields once opened, as by a click on its header.
async function mountTab(app) {
  const wrapper = mountComponent(TenantEditPayments, {
    propsData: { tenant: { id: "t-1" }, apps: { giroCockpit: app } },
  });
  await flushPromises();
  await giroCockpitPanel(wrapper)
    .find(".v-expansion-panel-header")
    .trigger("click");
  await flushPromises();
  return wrapper;
}

function giroCockpitPanel(wrapper) {
  return wrapper
    .findAllComponents({ name: "AppPanel" })
    .filter((p) => p.props("title") === "GiroCockpit")
    .at(0);
}

function testModeSwitch(wrapper) {
  return giroCockpitPanel(wrapper)
    .findAll("input[role=switch]")
    .filter((input) => {
      const label = wrapper.find(`label[for="${input.attributes("id")}"]`);
      return label.exists() && label.text() === "Testmodus";
    })
    .at(0);
}

describe("TenantEditPayments, GiroCockpit test mode", () => {
  it("shows an app without paymentMode as live", async () => {
    const wrapper = await mountTab(giroCockpit());

    expect(testModeSwitch(wrapper).element.checked).toBe(false);
  });

  it("shows an app in test mode as such", async () => {
    const wrapper = await mountTab(giroCockpit({ paymentMode: "test" }));

    expect(testModeSwitch(wrapper).element.checked).toBe(true);
  });

  it("turns test mode on and off as paymentMode test and prod", async () => {
    const app = giroCockpit();
    const wrapper = await mountTab(app);

    await testModeSwitch(wrapper).trigger("click");
    expect(app.paymentMode).toBe("test");

    await testModeSwitch(wrapper).trigger("click");
    expect(app.paymentMode).toBe("prod");
  });
});
