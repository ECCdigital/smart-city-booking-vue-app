import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import SecretField, { SECRET_MASK } from "@/components/commons/SecretField.vue";

function mountField(propsData = {}, attrs = {}) {
  return mountComponent(SecretField, {
    propsData,
    attrs: { label: "Passwort", ...attrs },
  });
}

const input = (wrapper) => wrapper.find("input");
const removeButton = (wrapper) => wrapper.find('[data-test="secret-remove"]');

/** The values the field has handed on so far, oldest first. */
const handedOn = (wrapper) =>
  (wrapper.emitted("input") || []).map(([value]) => value);

describe("SecretField", () => {
  it("never puts a stored secret into the page", () => {
    const wrapper = mountField({ value: "geheim-123" });

    expect(input(wrapper).element.value).toBe("");
    expect(wrapper.html()).not.toContain("geheim-123");
  });

  it("shows the same dots for every stored secret, whatever its length", () => {
    const short = mountField({ value: "a" });
    const long = mountField({ value: "x".repeat(64) });

    expect(input(short).attributes("placeholder")).toBe(SECRET_MASK);
    expect(input(long).attributes("placeholder")).toBe(SECRET_MASK);
  });

  it("offers no switch to show the secret", () => {
    const wrapper = mountField({ value: "geheim-123" });

    expect(input(wrapper).attributes("type")).toBe("password");
    expect(wrapper.html()).not.toContain("mdi-eye");
  });

  it("keeps the page's own placeholder while nothing is stored", async () => {
    const wrapper = mountField({ value: "" }, { placeholder: "Bearer-Token" });
    await input(wrapper).trigger("focus");

    expect(input(wrapper).attributes("placeholder")).toBe("Bearer-Token");
    expect(removeButton(wrapper).exists()).toBe(false);
  });

  it("hands on what the admin types as the new secret", async () => {
    const wrapper = mountField({ value: "alt" });

    await input(wrapper).setValue("neu");

    expect(handedOn(wrapper)).toEqual(["neu"]);
  });

  it("keeps the stored secret when the admin empties the input again", async () => {
    const wrapper = mountField({ value: "alt" });

    await input(wrapper).setValue("n");
    await input(wrapper).setValue("");

    expect(handedOn(wrapper)).toEqual(["n", "alt"]);
    expect(input(wrapper).attributes("placeholder")).toBe(SECRET_MASK);
  });

  it("removes the stored secret through the cross", async () => {
    const wrapper = mountField({ value: "alt" });

    await removeButton(wrapper).trigger("click");

    expect(handedOn(wrapper)).toEqual([""]);
    expect(input(wrapper).attributes("placeholder")).toBeUndefined();
    expect(removeButton(wrapper).exists()).toBe(false);
  });

  it("offers no cross while disabled", () => {
    const wrapper = mountField({ value: "alt", disabled: true });

    expect(removeButton(wrapper).exists()).toBe(false);
  });

  it("starts over when the page hands in another stored secret", async () => {
    const wrapper = mountField({ value: "alt" });
    await input(wrapper).setValue("getippt");

    await wrapper.setProps({ value: "anderes" });

    expect(input(wrapper).element.value).toBe("");
    expect(input(wrapper).attributes("placeholder")).toBe(SECRET_MASK);
  });
});
