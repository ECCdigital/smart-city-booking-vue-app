import { describe, expect, it } from "vitest";
import MailVariableTextField from "@/components/Mail/MailVariableTextField.vue";
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

describe("MailVariableTextField", () => {
  it("registers the Vuetify field components it renders through `:is`", () => {
    // The app loads Vuetify a-la-carte: vuetify-loader only auto-registers
    // literal tags, so a dynamic `:is` needs explicit registration or the
    // field renders as an unknown element. The test setup registers all of
    // Vuetify globally and cannot see that difference, hence this pin.
    expect(MailVariableTextField.components.VTextField).toBeDefined();
    expect(MailVariableTextField.components.VTextarea).toBeDefined();
  });

  it("renders the field with its label and the picker icon in the append slot", () => {
    const wrapper = mountComponent(MailVariableTextField, {
      propsData: { value: "", field: "line", variables: CATALOG },
      attrs: { label: "Beschriftung" },
    });
    expect(wrapper.find("label").text()).toBe("Beschriftung");
    expect(wrapper.find("input").exists()).toBe(true);
    expect(
      wrapper
        .find(".v-input__append-inner .mail-variable-picker-activator")
        .exists()
    ).toBe(true);
  });

  it("emits input with the expression inserted at the caret", async () => {
    const wrapper = mountComponent(MailVariableTextField, {
      propsData: {
        value: "https://x.test/?n=",
        field: "url",
        variables: CATALOG,
      },
    });
    const input = wrapper.find("input");
    input.element.focus();
    input.element.setSelectionRange(8, 8);
    await wrapper.find(".mail-variable-picker-activator").trigger("click");
    await wrapper.vm.$nextTick();
    const item = [...document.querySelectorAll(".v-list-item")].find((el) =>
      el.textContent.includes("Kundenname")
    );
    item.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("input")[0][0]).toBe(
      "https://{{urlEncode customerName}}x.test/?n="
    );
  });

  it("multiline renders a textarea and inserts there too", async () => {
    const wrapper = mountComponent(MailVariableTextField, {
      propsData: {
        value: "<p></p>",
        field: "html",
        multiline: true,
        variables: CATALOG,
      },
    });
    const textarea = wrapper.find("textarea");
    expect(textarea.exists()).toBe(true);
    textarea.element.setSelectionRange(3, 3);
    await wrapper.find(".mail-variable-picker-activator").trigger("click");
    await wrapper.vm.$nextTick();
    [...document.querySelectorAll(".v-list-item")]
      .find((el) => el.textContent.includes("Kundenname"))
      .click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("input")[0][0]).toBe("<p>{{customerName}}</p>");
  });

  it("shows the alert for a warning-level variable in the value and follows the tenant", async () => {
    const wrapper = mountComponent(MailVariableTextField, {
      propsData: {
        value: "{{bookingStatusUrl}}",
        field: "url",
        variables: CATALOG,
        tenant: { enablePublicStatusView: false },
      },
    });
    expect(wrapper.find(".mail-variable-alert").text()).toContain(
      "Status-Link bleibt leer"
    );
    await wrapper.setProps({ tenant: { enablePublicStatusView: true } });
    expect(wrapper.find(".mail-variable-alert").exists()).toBe(false);
  });

  it("passes the default slot below the alert, append beside the picker and other slots through", () => {
    const wrapper = mountComponent(MailVariableTextField, {
      propsData: { value: "", field: "line", variables: CATALOG },
      slots: { default: "<div class='hint'>Hinweis</div>" },
      scopedSlots: {
        append: "<button class='extra'>x</button>",
        "append-outer": "<button class='outer'>y</button>",
      },
    });
    expect(wrapper.find(".hint").text()).toBe("Hinweis");
    expect(wrapper.find(".v-input__append-inner .extra").exists()).toBe(true);
    expect(wrapper.find(".v-input__append-outer .outer").exists()).toBe(true);
  });
});
