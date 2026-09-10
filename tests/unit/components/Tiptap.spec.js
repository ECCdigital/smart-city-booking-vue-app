import { beforeAll, describe, expect, it } from "vitest";

import Tiptap from "@/components/Tiptap.vue";
import { mountComponent } from "@tests/unit/support/mount";
import { stubProseMirrorLayout } from "@tests/unit/support/prosemirror";

beforeAll(stubProseMirrorLayout);

// jsdom cannot select or type text in a contenteditable, so the specs place
// the selection and insert text through the editor API and drive everything
// else (toolbar, dialog, inputs) through the DOM.
async function mountEditor(propsData = {}) {
  const wrapper = mountComponent(Tiptap, { propsData });
  await wrapper.vm.$nextTick();
  return wrapper;
}

async function flush(wrapper) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
}

function toolbarIcons(wrapper) {
  return wrapper
    .findAll(".v-sheet button .v-icon")
    .wrappers.map((icon) =>
      Array.from(icon.element.classList).find((name) => name.startsWith("mdi-"))
    );
}

function toolbarButton(wrapper, icon) {
  return wrapper
    .findAll(".v-sheet button")
    .wrappers.find((button) => button.find(`.${icon}`).exists());
}

function lastEmitted(wrapper) {
  const events = wrapper.emitted("input") || [];
  return events.length ? events[events.length - 1][0] : undefined;
}

/** A stored link the way it arrives from the API: bare href, nothing else. */
function storedLink(href, text) {
  return `<a href="${href}">${text}</a>`;
}

/** The HTML the editor emits for a link; a mail address gets no target. */
function linkHtml(href, text) {
  // JSON.stringify yields the double-quoted attribute value the lint rule on
  // quotes would otherwise not let a literal spell.
  const target = href.startsWith("mailto:")
    ? ""
    : `target=${JSON.stringify("_blank")} `;
  return `<a ${target}rel="noopener noreferrer" href="${href}">${text}</a>`;
}

/**
 * Characterisation of the editor as its four existing users get it (bookable
 * description and notes, event teaser and description): no `links`, no
 * `maxLength`. Pinned before the two props were added; must keep passing.
 */
describe("Tiptap without links or maxLength", () => {
  it("renders the five formatting buttons and nothing else in the toolbar", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>" });

    expect(toolbarIcons(wrapper)).toEqual([
      "mdi-format-bold",
      "mdi-format-italic",
      "mdi-format-underline",
      "mdi-format-list-bulleted",
      "mdi-format-list-numbered",
    ]);
  });

  it("shows no counter", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>" });

    expect(wrapper.find(".tiptap-counter").exists()).toBe(false);
  });

  it("emits the formatted HTML after a toolbar action", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo Welt</p>" });

    wrapper.vm.editor.commands.selectAll();
    await toolbarButton(wrapper, "mdi-format-bold").trigger("click");

    expect(lastEmitted(wrapper)).toBe("<p><strong>Hallo Welt</strong></p>");
  });

  it("keeps bold, italic, underline and lists on the way through", async () => {
    const html =
      "<p>Ein <strong>fetter</strong>, <em>kursiver</em> und <u>unterstrichener</u> Satz.</p><ul><li><p>eins</p></li></ul><ol><li><p>zwei</p></li></ol>";
    const wrapper = await mountEditor({ value: html });

    expect(wrapper.vm.editor.getHTML()).toBe(html);
  });

  it("drops a link tag and keeps its text", async () => {
    const wrapper = await mountEditor({
      value: `<p>Siehe ${storedLink("https://example.org", "hier")}.</p>`,
    });

    expect(wrapper.vm.editor.getHTML()).toBe("<p>Siehe hier.</p>");
  });

  it("follows a changed value from outside", async () => {
    const wrapper = await mountEditor({ value: "<p>alt</p>" });

    await wrapper.setProps({ value: "<p>neu</p>" });

    expect(wrapper.vm.editor.getHTML()).toBe("<p>neu</p>");
  });
});

/** The link dialog detaches into `data-app`; reach it through the component tree. */
function linkDialog(wrapper) {
  return wrapper.findComponent({ name: "v-dialog" });
}

function dialogButton(wrapper, label) {
  return wrapper
    .findAll(".tiptap-link-dialog button")
    .wrappers.find((button) => button.text() === label);
}

async function openLinkDialog(wrapper) {
  wrapper.vm.editor.commands.selectAll();
  await toolbarButton(wrapper, "mdi-link").trigger("click");
  await flush(wrapper);
}

async function submitAddress(wrapper, address) {
  await wrapper.find(".tiptap-link-dialog input").setValue(address);
  await dialogButton(wrapper, "Übernehmen").trigger("click");
  await flush(wrapper);
}

describe("Tiptap with links", () => {
  it("adds a link button to the toolbar", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", links: true });

    expect(toolbarIcons(wrapper)).toEqual([
      "mdi-format-bold",
      "mdi-format-italic",
      "mdi-format-underline",
      "mdi-format-list-bulleted",
      "mdi-format-list-numbered",
      "mdi-link",
    ]);
  });

  it("sets an https link on the selection with rel and target", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", links: true });

    await openLinkDialog(wrapper);
    await submitAddress(wrapper, "https://example.org/seite");

    expect(lastEmitted(wrapper)).toBe(
      `<p>${linkHtml("https://example.org/seite", "Hallo")}</p>`
    );
    expect(linkDialog(wrapper).props("value")).toBe(false);
  });

  it("sets a mailto link without a target", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", links: true });

    await openLinkDialog(wrapper);
    await submitAddress(wrapper, "mailto:info@example.org");

    expect(lastEmitted(wrapper)).toBe(
      `<p>${linkHtml("mailto:info@example.org", "Hallo")}</p>`
    );
  });

  it("changes the address of an existing link", async () => {
    const wrapper = await mountEditor({
      value: `<p>${storedLink("https://alt.example.org", "Hallo")}</p>`,
      links: true,
    });

    await openLinkDialog(wrapper);
    await submitAddress(wrapper, "https://neu.example.org");

    expect(lastEmitted(wrapper)).toBe(
      `<p>${linkHtml("https://neu.example.org", "Hallo")}</p>`
    );
  });

  it("re-emits a stored mailto link without a target and a stored web link with one", async () => {
    const wrapper = await mountEditor({
      value: `<p>${storedLink("mailto:info@example.org", "Mail")} ${storedLink(
        "https://example.org",
        "Web"
      )}</p>`,
      links: true,
    });

    expect(wrapper.vm.editor.getHTML()).toBe(
      `<p>${linkHtml("mailto:info@example.org", "Mail")} ${linkHtml(
        "https://example.org",
        "Web"
      )}</p>`
    );
  });

  it("refuses a javascript: address with a message and keeps the dialog open", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", links: true });

    await openLinkDialog(wrapper);
    await submitAddress(wrapper, "javascript:alert(1)");

    expect(wrapper.find(".tiptap-link-dialog").text()).toContain(
      "Nur Adressen mit http://, https:// oder mailto: sind erlaubt."
    );
    expect(linkDialog(wrapper).props("value")).toBe(true);
    expect(wrapper.emitted("input")).toBeUndefined();
    expect(wrapper.vm.editor.getHTML()).toBe("<p>Hallo</p>");
  });

  it("refuses a relative address", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", links: true });

    await openLinkDialog(wrapper);
    await submitAddress(wrapper, "/intern/seite");

    expect(linkDialog(wrapper).props("value")).toBe(true);
    expect(wrapper.vm.editor.getHTML()).toBe("<p>Hallo</p>");
  });

  it("removes an existing link from the dialog", async () => {
    const wrapper = await mountEditor({
      value: `<p>${storedLink("https://example.org", "Hallo")}</p>`,
      links: true,
    });

    await openLinkDialog(wrapper);
    await dialogButton(wrapper, "Link entfernen").trigger("click");
    await flush(wrapper);

    expect(lastEmitted(wrapper)).toBe("<p>Hallo</p>");
  });

  it("opens the dialog with the current address of a link", async () => {
    const wrapper = await mountEditor({
      value: `<p>${storedLink("https://example.org", "Hallo")}</p>`,
      links: true,
    });

    await openLinkDialog(wrapper);

    expect(wrapper.find(".tiptap-link-dialog input").element.value).toBe(
      "https://example.org"
    );
  });

  it("strips a stored link with a forbidden scheme on the way in", async () => {
    const wrapper = await mountEditor({
      value: `<p>${storedLink("javascript:alert(1)", "Hallo")}</p>`,
      links: true,
    });

    expect(wrapper.vm.editor.getHTML()).toBe("<p>Hallo</p>");
  });

  it("autolinks a typed https address", async () => {
    const wrapper = await mountEditor({ value: "<p></p>", links: true });

    wrapper.vm.editor.commands.insertContent("https://example.org ");
    await flush(wrapper);

    expect(lastEmitted(wrapper)).toBe(
      `<p>${linkHtml("https://example.org", "https://example.org")} </p>`
    );
  });

  it("configures the link extension not to open links on click", async () => {
    const wrapper = await mountEditor({
      value: `<p>${storedLink("https://example.org", "Hallo")}</p>`,
      links: true,
    });

    const link = wrapper.vm.editor.extensionManager.extensions.find(
      (extension) => extension.name === "link"
    );
    expect(link.options.openOnClick).toBe(false);
    expect(link.options.autolink).toBe(true);
  });
});

describe("Tiptap with maxLength", () => {
  it("shows the HTML length against the limit", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", maxLength: 20 });

    const counter = wrapper.find(".tiptap-counter");
    expect(counter.text()).toBe("12 / 20");
    expect(counter.classes()).not.toContain("error--text");
  });

  it("stays neutral exactly at the limit", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", maxLength: 12 });

    const counter = wrapper.find(".tiptap-counter");
    expect(counter.text()).toBe("12 / 12");
    expect(counter.classes()).not.toContain("error--text");
  });

  it("turns to the error colour above the limit and does not truncate", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", maxLength: 12 });

    wrapper.vm.editor.chain().focus("end").insertContent(" Welt").run();
    await flush(wrapper);

    const counter = wrapper.find(".tiptap-counter");
    expect(counter.text()).toBe("17 / 12");
    expect(counter.classes()).toContain("error--text");
    expect(lastEmitted(wrapper)).toBe("<p>Hallo Welt</p>");
  });

  it("follows a value set from outside", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", maxLength: 12 });

    await wrapper.setProps({ value: "<p>Hallo Welt und mehr</p>" });

    expect(wrapper.find(".tiptap-counter").text()).toBe("26 / 12");
  });
});
