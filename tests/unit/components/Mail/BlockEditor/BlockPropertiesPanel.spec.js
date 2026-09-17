import { describe, expect, it } from "vitest";
import BlockPropertiesPanel from "@/components/Mail/BlockEditor/BlockPropertiesPanel.vue";
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
  {
    name: "customerContact",
    label: "Kundenkontakt",
    kind: "html",
    expr: "{{{customerContact}}}",
    description: "",
  },
];

async function pickFromMenu(wrapper, label) {
  const item = [...document.querySelectorAll(".v-list-item")].find((el) =>
    el.textContent.includes(label)
  );
  expect(item, `menu entry ${label}`).toBeTruthy();
  item.click();
  await wrapper.vm.$nextTick();
}

describe("BlockPropertiesPanel variable picker", () => {
  it("button link: replaces the selection with {{urlEncode customerName}} and keeps the caret behind it", async () => {
    const wrapper = mountComponent(BlockPropertiesPanel, {
      propsData: {
        selectedBlock: {
          id: "b1",
          type: "button",
          href: "https://x.test/?n=NAME",
        },
        variables: CATALOG,
      },
    });
    const field = wrapper
      .findAll(".v-input")
      .wrappers.find((w) => w.find("label").text() === "Link-Ziel");
    const input = field.find("input");
    input.element.focus();
    input.element.setSelectionRange(18, 22);
    await field.find(".mail-variable-picker-activator").trigger("click");
    await wrapper.vm.$nextTick();
    await pickFromMenu(wrapper, "Kundenname");

    const updated = wrapper.emitted("update").at(-1)[0];
    expect(updated.href).toBe("https://x.test/?n={{urlEncode customerName}}");
    expect(document.body.textContent).not.toContain("Kundenkontakt");
    await wrapper.setProps({ selectedBlock: updated });
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(input.element);
    expect(input.element.selectionStart).toBe(
      18 + "{{urlEncode customerName}}".length
    );
  });

  it("every text- or url-bearing field of image, button, callout and quote carries the picker", async () => {
    const cases = [
      [{ type: "image" }, 3],
      [{ type: "button" }, 2],
      [{ type: "callout" }, 1],
      [{ type: "quote" }, 1],
      [{ type: "text" }, 0],
    ];
    for (const [block, count] of cases) {
      const wrapper = mountComponent(BlockPropertiesPanel, {
        propsData: { selectedBlock: { id: "b", ...block }, variables: CATALOG },
      });
      expect(
        wrapper.findAll(".mail-variable-picker-activator").length,
        block.type
      ).toBe(count);
    }
  });

  it("warns under a field whose value names a conditional variable in warning level, and follows the live tenant", async () => {
    const wrapper = mountComponent(BlockPropertiesPanel, {
      propsData: {
        selectedBlock: {
          id: "b1",
          type: "button",
          href: "{{bookingStatusUrl}}",
          label: "{{customerName}}",
        },
        variables: CATALOG,
        tenant: { enablePublicStatusView: false },
      },
    });
    const alerts = () => wrapper.findAll(".mail-variable-alert").wrappers;
    expect(alerts()).toHaveLength(1);
    expect(alerts()[0].classes()).toContain("warning--text");
    expect(alerts()[0].text().replace(/\s+/g, " ")).toContain(
      "Öffentliche Status-Seite ist in den Mandanten-Einstellungen deaktiviert – Status-Link bleibt leer."
    );

    await wrapper.setProps({ tenant: { enablePublicStatusView: true } });
    expect(alerts()).toHaveLength(0);
  });
});
