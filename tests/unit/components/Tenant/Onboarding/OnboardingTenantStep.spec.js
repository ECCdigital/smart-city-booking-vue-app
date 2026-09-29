import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import OnboardingTenantStep from "@/components/Tenant/Onboarding/OnboardingTenantStep.vue";

const PREFILL = { contactName: "Alex Beispiel", mail: "alex@example.org" };

const mountStep = (propsData = {}) =>
  mountComponent(OnboardingTenantStep, {
    propsData: { prefill: PREFILL, ...propsData },
  });

const find = (wrapper, name) => wrapper.find(`[data-test="${name}"]`);
const input = (wrapper, name) => find(wrapper, name).find("input");

async function submit(wrapper) {
  await find(wrapper, "tenant-step").trigger("submit");
  await flushPromises();
}

describe("OnboardingTenantStep — required contact", () => {
  it("submits name, contact person and mail; phone, website and address stay optional", async () => {
    const wrapper = mountStep();
    await input(wrapper, "tenant-name").setValue("Verein");

    await submit(wrapper);

    expect(wrapper.emitted("submit")[0][0]).toEqual({
      name: "Verein",
      contactName: "Alex Beispiel",
      mail: "alex@example.org",
      phone: "",
      website: "",
      location: "",
    });
  });

  it("keeps the prefilled contact editable", async () => {
    const wrapper = mountStep();
    await input(wrapper, "tenant-name").setValue("Verein");
    await input(wrapper, "tenant-contact-name").setValue("Erika Muster");
    await input(wrapper, "tenant-mail").setValue("kontakt@verein.example");

    await submit(wrapper);

    expect(wrapper.emitted("submit")[0][0]).toMatchObject({
      contactName: "Erika Muster",
      mail: "kontakt@verein.example",
    });
  });

  it.each([
    ["tenant-name", "   "],
    ["tenant-contact-name", ""],
    ["tenant-mail", ""],
    ["tenant-mail", "alex@example"],
  ])("submits nothing with %s set to '%s'", async (field, value) => {
    const wrapper = mountStep();
    await input(wrapper, "tenant-name").setValue("Verein");
    await input(wrapper, field).setValue(value);

    await submit(wrapper);

    expect(wrapper.emitted("submit")).toBeUndefined();
  });
});

describe("OnboardingTenantStep — a refused creation", () => {
  it("marks the field the backend named", () => {
    const wrapper = mountStep({ error: { key: "field", field: "mail" } });

    expect(find(wrapper, "tenant-error").text()).toContain("Angaben");
    expect(wrapper.text()).toContain("Muss gültige E-Mail-Adresse sein.");
    expect(wrapper.text()).not.toContain("Pflichtfeld");
  });

  it("says so when the instance's tenant maximum is reached", () => {
    const wrapper = mountStep({ error: { key: "max-tenants" } });

    expect(find(wrapper, "tenant-error").text()).toContain("maximale Anzahl");
  });

  it("asks to try later when the limit names no wait", () => {
    const wrapper = mountStep({ error: { key: "rate-limited", wait: "" } });

    expect(find(wrapper, "tenant-error").text()).toContain("später erneut");
  });
});
