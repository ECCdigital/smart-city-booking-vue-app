import { describe, expect, it } from "vitest";
import RawHtmlBlock from "@/components/Mail/BlockEditor/blocks/RawHtmlBlock.vue";
import { mountComponent } from "@tests/unit/support/mount";

const CATALOG = [
  { name: "customerName", label: "Kundenname", kind: "text", description: "" },
  {
    name: "hasRefundPreview",
    label: "Erstattung",
    kind: "flag",
    expr: "{{#if hasRefundPreview}}…{{/if}}",
    description: "",
  },
  {
    name: "customerContact",
    label: "Kundenkontakt",
    kind: "html",
    expr: "{{{customerContact}}}",
    description: "",
  },
];

describe("RawHtmlBlock variable picker", () => {
  it("offers every kind and inserts the expression as plain text at the caret", async () => {
    const wrapper = mountComponent(RawHtmlBlock, {
      propsData: {
        block: { id: "r1", type: "rawHtml", html: "<p></p>" },
        variables: CATALOG,
      },
    });
    const textarea = wrapper.find("textarea");
    textarea.element.setSelectionRange(3, 3);
    await wrapper.find(".mail-variable-picker-activator").trigger("click");
    await wrapper.vm.$nextTick();
    const items = [...document.querySelectorAll(".v-list-item")];
    expect(items.map((el) => el.querySelector("code").textContent)).toEqual([
      "{{customerName}}",
      "{{#if hasRefundPreview}}…{{/if}}",
      "{{{customerContact}}}",
    ]);
    items[2].click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update")[0][0].html).toBe(
      "<p>{{{customerContact}}}</p>"
    );
  });

  it("shows the static table hint", () => {
    const wrapper = mountComponent(RawHtmlBlock, {
      propsData: { block: { id: "r1", type: "rawHtml", html: "" } },
    });
    expect(wrapper.text()).toContain(
      "Bedingungen ({{#if}}) nicht zwischen <table>-Tags setzen"
    );
  });
});
