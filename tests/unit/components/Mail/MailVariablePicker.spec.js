import { describe, expect, it } from "vitest";
import MailVariablePicker from "@/components/Mail/MailVariablePicker.vue";
import { mountComponent } from "@tests/unit/support/mount";

const CATALOG = [
  {
    name: "customerName",
    label: "Kundenname",
    description: "Name des buchenden Kunden",
    kind: "text",
    sample: "Max Mustermann",
  },
  {
    name: "bookingStatusUrl",
    label: "Link zur Status-Seite",
    description: "Öffentliche Status-Seite der Buchung",
    kind: "url",
    sample: "https://example.test/booking/status/t1?id=BK-1",
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
    description: "Kontaktdaten des Kunden (HTML)",
    kind: "html",
    expr: "{{{customerContact}}}",
    sample: "<p>Max</p>",
  },
];

async function openPicker(propsData) {
  const wrapper = mountComponent(MailVariablePicker, { propsData });
  await wrapper.find("button").trigger("click");
  await wrapper.vm.$nextTick();
  return wrapper;
}

function menuItems() {
  return [...document.querySelectorAll(".v-list-item")];
}

async function pick(wrapper, label) {
  const item = menuItems().find((el) => el.textContent.includes(label));
  expect(item, `menu entry ${label}`).toBeTruthy();
  item.click();
  await wrapper.vm.$nextTick();
}

describe("MailVariablePicker", () => {
  it("renders the entries a url field offers with label, expression and description", async () => {
    await openPicker({ variables: CATALOG, field: "url", tenant: {} });
    const rows = menuItems().map((el) => [
      el.querySelector(".v-list-item__title").textContent.trim(),
      el.querySelector("code").textContent.trim(),
      el.querySelector(".v-list-item__subtitle span").textContent.trim(),
    ]);
    expect(rows).toEqual([
      ["Kundenname", "{{urlEncode customerName}}", "Name des buchenden Kunden"],
      [
        "Link zur Status-Seite",
        "{{bookingStatusUrl}}",
        "Öffentliche Status-Seite der Buchung",
      ],
    ]);
  });

  it("url field: emits {{urlEncode x}} for a text entry and {{x}} for a url entry", async () => {
    const wrapper = await openPicker({
      variables: CATALOG,
      field: "url",
      tenant: {},
    });
    await pick(wrapper, "Kundenname");
    expect(wrapper.emitted("insert")[0][0]).toBe("{{urlEncode customerName}}");
    expect(wrapper.emitted("insert")[0][1].name).toBe("customerName");

    await wrapper.find("button").trigger("click");
    await wrapper.vm.$nextTick();
    await pick(wrapper, "Link zur Status-Seite");
    expect(wrapper.emitted("insert")[1][0]).toBe("{{bookingStatusUrl}}");
  });

  it("text field: emits the catalog expr, triple braces for an html entry", async () => {
    const wrapper = await openPicker({
      variables: CATALOG,
      field: "text",
      tenant: {},
    });
    expect(menuItems()).toHaveLength(3);
    await pick(wrapper, "Kundenkontakt");
    expect(wrapper.emitted("insert")[0][0]).toBe("{{{customerContact}}}");
  });

  it("an empty catalog keeps the icon, says so in the menu and inserts nothing", async () => {
    const wrapper = await openPicker({
      variables: [],
      field: "text",
      tenant: {},
    });
    expect(wrapper.find("button").exists()).toBe(true);
    expect(document.body.textContent).toContain(
      "Variablen konnten nicht geladen werden"
    );
    for (const item of menuItems()) item.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("insert")).toBeUndefined();
  });

  it("an unloadable catalog (entry without kind) is treated like an empty one", async () => {
    const wrapper = await openPicker({
      variables: [{ name: "tenantName", description: "Mandant" }],
      field: "text",
      tenant: {},
    });
    expect(document.body.textContent).toContain(
      "Variablen konnten nicht geladen werden"
    );
    expect(document.body.textContent).not.toContain("Mandant");
    for (const item of menuItems()) item.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("insert")).toBeUndefined();
  });

  it("a conditional entry shows icon and text per level and follows the live tenant", async () => {
    const wrapper = await openPicker({
      variables: CATALOG,
      field: "url",
      tenant: { enablePublicStatusView: false },
    });
    const row = () =>
      menuItems().find((el) =>
        el.textContent.includes("Link zur Status-Seite")
      );
    const requirement = () =>
      row().querySelector(".mail-variable-picker__requires");

    expect(requirement().querySelector(".v-icon").classList).toContain(
      "mdi-alert-outline"
    );
    expect(requirement().querySelector(".v-icon").classList).toContain(
      "warning--text"
    );
    expect(requirement().querySelector("strong").textContent).toBe(
      "Öffentliche Status-Seite"
    );
    expect(requirement().textContent.replace(/\s+/g, " ").trim()).toBe(
      "Öffentliche Status-Seite ist in den Mandanten-Einstellungen deaktiviert – Link zur Status-Seite bleibt leer."
    );
    expect(
      menuItems()
        .find((el) => el.textContent.includes("Kundenname"))
        .querySelector(".mail-variable-picker__requires")
    ).toBeNull();

    await wrapper.setProps({ tenant: { enablePublicStatusView: true } });
    await wrapper.vm.$nextTick();
    expect(requirement().querySelector(".v-icon").classList).toContain(
      "mdi-information-outline"
    );
    expect(requirement().textContent.trim()).toBe(
      "leer, wenn die öffentliche Status-Seite deaktiviert ist"
    );
  });
});
