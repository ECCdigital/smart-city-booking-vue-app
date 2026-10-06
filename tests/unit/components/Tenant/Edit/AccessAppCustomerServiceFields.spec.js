import { describe, expect, it } from "vitest";
import AccessAppCustomerServiceFields from "@/components/Tenant/Edit/AccessAppCustomerServiceFields.vue";
import { mountComponent } from "@tests/unit/support/mount";

function mountFields(value = { name: "", email: "", phone: "" }) {
  return mountComponent(AccessAppCustomerServiceFields, {
    propsData: { value },
  });
}

function inputs(wrapper) {
  return wrapper.findAll("input").wrappers;
}

/**
 * The same three fields serve iFBS and Nuki: the storefront shows them to a
 * booker who stands at a door or box that will not open. The component owns
 * the copy, the mail and phone rules and the "all optional" hint, so the two
 * provider panels cannot drift apart.
 */
describe("AccessAppCustomerServiceFields", () => {
  it("renders name, email and phone with the optional hint", () => {
    const wrapper = mountFields({
      name: "Service",
      email: "help@example.com",
      phone: "+49 30 1234",
    });

    expect(wrapper.text()).toContain("Kundenservice");
    expect(wrapper.text()).toContain("Alle Felder sind optional");
    expect(inputs(wrapper).map((input) => input.element.value)).toEqual([
      "Service",
      "help@example.com",
      "+49 30 1234",
    ]);
  });

  it("emits the edited contact as a new object, leaving the prop alone", async () => {
    const value = { name: "", email: "", phone: "" };
    const wrapper = mountFields(value);

    await inputs(wrapper)[0].setValue("Hausmeisterei");
    await inputs(wrapper)[2].setValue("030 1234");

    const emitted = wrapper.emitted("input");
    expect(emitted[0][0]).toEqual({
      name: "Hausmeisterei",
      email: "",
      phone: "",
    });
    expect(emitted[1][0]).toMatchObject({ phone: "030 1234" });
    expect(value).toEqual({ name: "", email: "", phone: "" });
  });

  it("rejects a malformed email and phone, accepts empty ones", async () => {
    const wrapper = mountFields();

    await inputs(wrapper)[1].setValue("not-a-mail");
    await inputs(wrapper)[2].setValue("ab");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Muss eine gültige Email-Adresse sein.");
    expect(wrapper.text()).toContain("Muss eine gültige Telefonnummer sein.");

    await inputs(wrapper)[1].setValue("");
    await inputs(wrapper)[2].setValue("");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain("Muss eine gültige");
  });
});
