import { describe, expect, it } from "vitest";
import TextBlock from "@/components/Mail/BlockEditor/blocks/TextBlock.vue";
import { mountComponent } from "@tests/unit/support/mount";

const CATALOG = [
  { name: "customerName", label: "Kundenname", kind: "text", description: "" },
  {
    name: "bookingStatusUrl",
    label: "Status-Link",
    kind: "url",
    description: "",
    requires: {
      text: "leer, wenn die öffentliche Status-Seite deaktiviert ist",
      tenantSetting: {
        key: "enablePublicStatusView",
        label: "Öffentliche Status-Seite",
      },
    },
  },
];

const chip = (name, label) =>
  `<span data-variable="${name}" data-label="${label}"></span>`;
const HTML = `<p>Hallo ${chip("customerName", "Kundenname")}, ${chip(
  "bookingStatusUrl",
  "Status-Link"
)}</p>`;

describe("TextBlock variable chips", () => {
  it("marks the chip of a conditional variable in warning level and follows the live tenant", async () => {
    const wrapper = mountComponent(TextBlock, {
      propsData: {
        block: { id: "t1", type: "text", html: HTML },
        variables: CATALOG,
        tenant: { enablePublicStatusView: false },
      },
    });
    await wrapper.vm.$nextTick();
    const chip = (name) =>
      wrapper.find(`.mail-variable-chip[data-variable="${name}"]`);

    expect(chip("bookingStatusUrl").classes()).toContain(
      "mail-variable-chip--warning"
    );
    expect(chip("bookingStatusUrl").attributes("title")).toBe(
      "Öffentliche Status-Seite ist in den Mandanten-Einstellungen deaktiviert – Status-Link bleibt leer."
    );
    expect(chip("customerName").classes()).not.toContain(
      "mail-variable-chip--warning"
    );
    expect(chip("customerName").attributes("title")).toBeUndefined();

    await wrapper.setProps({ tenant: { enablePublicStatusView: true } });
    await wrapper.vm.$nextTick();
    expect(chip("bookingStatusUrl").classes()).not.toContain(
      "mail-variable-chip--warning"
    );
    expect(chip("bookingStatusUrl").attributes("title")).toBeUndefined();
    // The warning never lands in the stored HTML.
    expect(wrapper.vm.editor.getHTML()).not.toContain("warning");
  });
});
