import { describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import ToolbarAction from "@/components/commons/ToolbarAction.vue";

describe("ToolbarAction — a further action", () => {
  it("is a text button with its icon and label that hands the click on", async () => {
    const onClick = vi.fn();
    const wrapper = mountComponent(ToolbarAction, {
      propsData: { icon: "mdi-history" },
      attrs: { "data-test": "history" },
      listeners: { click: onClick },
      slots: { default: "Historie" },
    });

    const button = wrapper.find("[data-test='history']");
    expect(button.text()).toBe("Historie");
    expect(button.find(".v-icon").classes()).toContain("mdi-history");
    expect(button.attributes("aria-pressed")).toBeUndefined();
    await button.trigger("click");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("says whether a switch it toggles is on", async () => {
    const wrapper = mountComponent(ToolbarAction, {
      propsData: { icon: "mdi-tray-full", active: false },
      slots: { default: "Backlog" },
    });
    expect(wrapper.attributes("aria-pressed")).toBe("false");

    await wrapper.setProps({ active: true });
    expect(wrapper.attributes("aria-pressed")).toBe("true");
  });

  it("opens a menu, with a chevron after its label", async () => {
    const wrapper = mountComponent({
      render(h) {
        return h(
          "v-menu",
          {
            scopedSlots: {
              activator: ({ on, attrs }) =>
                h(
                  ToolbarAction,
                  { props: { icon: "mdi-download", menu: true }, attrs, on },
                  "Exportieren"
                ),
            },
          },
          [h("div", { attrs: { "data-test": "menu-content" } }, "Excel")]
        );
      },
    });

    const opener = wrapper.find("button");
    expect(opener.findAll(".v-icon").at(1).classes()).toContain(
      "mdi-chevron-down"
    );
    await opener.trigger("click");
    await wrapper.vm.$nextTick();
    expect(document.querySelector("[data-test='menu-content']")).not.toBeNull();
  });
});
