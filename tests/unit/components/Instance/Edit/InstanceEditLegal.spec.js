import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import InstanceEditLegal from "@/components/Instance/Edit/InstanceEditLegal.vue";

const HINT =
  "Nur der Rechteinhaber, z.B. »Stadt Musterstadt« — Jahr und ©-Zeichen ergänzt die Seite selbst.";

function instance(overrides = {}) {
  return {
    id: "instance",
    dataProtection: null,
    legalNotice: null,
    termsAndConditions: null,
    ...overrides,
  };
}

function mountTab(propsData = {}) {
  // The three document pickers open a picker backed by the media API; what is
  // under test is the field beside them.
  return mountComponent(InstanceEditLegal, {
    propsData: { instance: instance(), ...propsData },
    stubs: { MediaReferenceField: true },
  });
}

function copyrightField(wrapper) {
  return wrapper
    .findAll(".v-text-field")
    .wrappers.find((field) => field.find("label").text() === "Copyright");
}

function fieldMessage(field) {
  const message = field.find(".v-messages__message");
  return message.exists() ? message.text() : "";
}

async function settle(wrapper) {
  await wrapper.vm.$nextTick();
  await wrapper.vm.$nextTick();
}

describe("InstanceEditLegal Copyright", () => {
  it("renders the field with its hint, the 200 counter and the maxlength", () => {
    const wrapper = mountTab({
      instance: instance({ copyright: "Stadt Musterstadt" }),
    });
    const field = copyrightField(wrapper);

    expect(field).toBeDefined();
    const input = field.find("input");
    expect(input.element.value).toBe("Stadt Musterstadt");
    expect(input.attributes("maxlength")).toBe("200");
    expect(field.text()).toContain(HINT);
    expect(field.find(".v-counter").text()).toBe("17 / 200");
  });

  it("reads a legacy instance without the field as an empty string", () => {
    const wrapper = mountTab();

    expect(copyrightField(wrapper).find("input").element.value).toBe("");
    expect(wrapper.vm.local.copyright).toBe("");
  });

  it("emits the typed rights holder with the instance", async () => {
    const wrapper = mountTab();

    await copyrightField(wrapper).find("input").setValue("Stadt Musterstadt");
    await settle(wrapper);

    const emitted = wrapper.emitted("update:instance");
    expect(emitted.at(-1)[0].copyright).toBe("Stadt Musterstadt");
  });

  it("emits an empty string, never null, when the field is emptied", async () => {
    const wrapper = mountTab({
      instance: instance({ copyright: "Stadt Musterstadt" }),
    });

    await copyrightField(wrapper).find("input").setValue("");
    await settle(wrapper);

    expect(wrapper.emitted("update:instance").at(-1)[0].copyright).toBe("");
  });

  it.each([
    ["max_length", "Höchstens 200 Zeichen."],
    ["invalid_format", "Darf keinen Zeilenumbruch enthalten."],
    ["invalid_type_string", "Muss ein Text sein."],
  ])("shows the backend's %s error inline at the field", async (code, text) => {
    const wrapper = mountTab();
    const field = copyrightField(wrapper);

    wrapper.vm.showApiErrors([{ field: "copyright", code }]);
    await settle(wrapper);

    expect(fieldMessage(field)).toBe(text);

    await field.find("input").setValue("Stadt Musterstadt");
    await settle(wrapper);

    // Once the error is gone the persistent hint takes the message slot back.
    expect(fieldMessage(field)).toBe(HINT);
  });

  it("ignores details of other fields", async () => {
    const wrapper = mountTab();

    wrapper.vm.showApiErrors([{ field: "contactUrl", code: "invalid_format" }]);
    await settle(wrapper);

    expect(fieldMessage(copyrightField(wrapper))).toBe(HINT);
  });
});
