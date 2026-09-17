import { describe, expect, it } from "vitest";
import MailtoLinkDialog from "@/components/Mail/BlockEditor/MailtoLinkDialog.vue";
import { mountComponent } from "@tests/unit/support/mount";

const CATALOG = [
  { name: "customerName", label: "Kundenname", kind: "text", description: "" },
  {
    name: "supportEmail",
    label: "Support-E-Mail",
    kind: "text",
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

describe("MailtoLinkDialog", () => {
  it("keeps its quick-pick chips for email variables and uses the shared picker as a url field", async () => {
    const wrapper = mountComponent(MailtoLinkDialog, {
      propsData: { open: true, variables: CATALOG, initialHref: "" },
    });
    await wrapper.vm.$nextTick();
    const chips = [...document.querySelectorAll(".v-chip")].map((el) =>
      el.textContent.trim()
    );
    expect(chips).toEqual(["Support-E-Mail"]);

    document.querySelector(".mail-variable-picker-activator").click();
    await wrapper.vm.$nextTick();
    const items = [...document.querySelectorAll(".v-list-item")];
    expect(items.map((el) => el.querySelector("code").textContent)).toEqual([
      "{{urlEncode customerName}}",
      "{{urlEncode supportEmail}}",
    ]);
    items[0].click();
    await wrapper.vm.$nextTick();
    expect(wrapper.find("input").element.value).toBe(
      "{{urlEncode customerName}}"
    );
    expect(wrapper.find(".mailto-preview").text()).toBe(
      "mailto:{{urlEncode customerName}}"
    );
  });

  it("a chip sets the address to the plain variable", async () => {
    const wrapper = mountComponent(MailtoLinkDialog, {
      propsData: { open: true, variables: CATALOG, initialHref: "" },
    });
    await wrapper.vm.$nextTick();
    document.querySelector(".v-chip").click();
    await wrapper.vm.$nextTick();
    expect(wrapper.find("input").element.value).toBe("{{supportEmail}}");
    expect(wrapper.find(".mailto-preview").text()).toBe(
      "mailto:{{supportEmail}}"
    );

    const apply = wrapper
      .findAll("button")
      .wrappers.find((b) => b.text() === "Übernehmen");
    await apply.trigger("click");
    expect(wrapper.emitted("apply")[0][0]).toEqual({
      href: "mailto:{{supportEmail}}",
      linkText: "kontaktieren",
    });
  });
});
