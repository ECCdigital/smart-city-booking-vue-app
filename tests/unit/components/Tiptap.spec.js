import { beforeAll, describe, expect, it } from "vitest";

import Tiptap from "@/components/Tiptap.vue";
import { HERO_COLOR_TOKENS } from "@/utils/heroBlockValidation";
import {
  HERO_ALIGN_TOKENS,
  HERO_SIZE_TOKENS,
} from "@/utils/heroRichtextClasses";
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

/**
 * The size, colour and alignment props of the Hero Editor's „Formatierter
 * Text“ Blocks. The shapes asserted below are the contract's, verbatim.
 *
 * An HTML attribute needs the double quotes the lint rule on quotes will not
 * let a literal spell, so the markup is composed the way `linkHtml` above
 * composes its attributes.
 */
function tag(name, attributes, text) {
  const rendered = Object.entries(attributes)
    .map(([attribute, value]) => ` ${attribute}=${JSON.stringify(value)}`)
    .join("");
  return `<${name}${rendered}>${text}</${name}>`;
}

/** A step of a captioned control, found by the label it shows. */
function groupButton(wrapper, group, label) {
  return wrapper
    .findAll(`${group} button`)
    .wrappers.find((button) => button.text() === label);
}

/** The colour dots carry their name in the tooltip, not as text. */
function colorButton(wrapper, title) {
  return wrapper
    .findAll(".tiptap-color-dots button")
    .wrappers.find((button) => button.attributes("title") === title);
}

/** A step that carries an icon and its German word as the tooltip. */
function titledButton(wrapper, group, title) {
  return wrapper
    .findAll(`${group} button`)
    .wrappers.find((button) => button.attributes("title") === title);
}

/** The pressed buttons of a toggle group, by their tooltip. */
function pressedTitles(wrapper, group) {
  return wrapper
    .findAll(`${group} button`)
    .wrappers.filter((button) => button.classes("v-btn--active"))
    .map((button) => button.attributes("title"));
}

describe("Tiptap with sizes", () => {
  it("keeps a size class on a run of words", async () => {
    const marked = tag("span", { class: "hero-size-lg" }, "großes");
    const html = tag("p", {}, `Ein ${marked} Wort`);
    const wrapper = await mountEditor({ value: html, sizes: true });

    expect(wrapper.vm.editor.getHTML()).toBe(html);
  });
});

describe("Tiptap with colors", () => {
  it("carries size and a colour token in one span", async () => {
    const html = tag(
      "p",
      {},
      tag("span", { class: "hero-size-lg hero-color-primary" }, "Wort")
    );
    const wrapper = await mountEditor({
      value: html,
      sizes: true,
      colors: true,
    });

    expect(wrapper.vm.editor.getHTML()).toBe(html);
  });

  it("keeps a stored colour in an editor that only offers sizes", async () => {
    // The two props switch controls, not schemas: one mark carries both, and
    // it loads as soon as either of them is asked for.
    const html = tag(
      "p",
      {},
      tag("span", { class: "hero-color-secondary" }, "Wort")
    );
    const wrapper = await mountEditor({ value: html, sizes: true });

    expect(wrapper.vm.editor.getHTML()).toBe(html);
  });
});

describe("Tiptap with a custom colour", () => {
  it("paints a stored hex so it is visible while typing", async () => {
    // The backend drops the `style` on save; the editor puts it back, because
    // nothing else would show the author the colour they picked.
    const stored = tag(
      "span",
      { class: "hero-size-lg", "data-color": "#ff0000" },
      "Wort"
    );
    const painted = tag(
      "span",
      {
        class: "hero-size-lg",
        "data-color": "#ff0000",
        style: "color:#ff0000",
      },
      "Wort"
    );
    const wrapper = await mountEditor({
      value: tag("p", {}, stored),
      sizes: true,
      colors: true,
    });

    expect(wrapper.vm.editor.getHTML()).toBe(tag("p", {}, painted));
  });
});

describe("Tiptap with paragraphAlign", () => {
  it("keeps the alignment of a paragraph", async () => {
    const html = tag("p", { class: "hero-align-center" }, "Mitte");
    const wrapper = await mountEditor({ value: html, paragraphAlign: true });

    expect(wrapper.vm.editor.getHTML()).toBe(html);
  });

  it("drops the alignment in an editor that does not offer it", async () => {
    const wrapper = await mountEditor({
      value: tag("p", { class: "hero-align-center" }, "Mitte"),
    });

    expect(wrapper.vm.editor.getHTML()).toBe("<p>Mitte</p>");
  });
});

describe("Tiptap normalising hand-forged rich text", () => {
  it("repairs every class off the vocabulary and keeps the text", async () => {
    const forged = [
      tag("span", { class: "hero-size-huge" }, "eins"),
      tag("span", { class: "hero-size-sm hero-size-xl" }, "zwei"),
      tag(
        "span",
        { class: "hero-color-primary", "data-color": "#ff0000" },
        "drei"
      ),
      tag("span", { class: "hero-size-md", "data-color": "red" }, "vier"),
      tag("span", { style: "color:#ff0000" }, "fünf"),
      "<b>sechs</b>",
    ].join(" ");
    const wrapper = await mountEditor({
      value: tag("p", { class: "hero-align-nope" }, forged),
      sizes: true,
      colors: true,
      paragraphAlign: true,
    });

    const repaired = [
      "eins",
      tag("span", { class: "hero-size-sm" }, "zwei"),
      tag("span", { class: "hero-color-primary" }, "drei"),
      tag("span", { class: "hero-size-md" }, "vier"),
      "fünf",
      "<strong>sechs</strong>",
    ].join(" ");
    expect(wrapper.vm.editor.getHTML()).toBe(tag("p", {}, repaired));
  });
});

function rowCaptions(wrapper) {
  return wrapper
    .findAll(".tiptap-toolbar__caption")
    .wrappers.map((caption) => caption.text());
}

function rowIcons(wrapper, index) {
  return wrapper
    .findAll(".tiptap-toolbar__row")
    .at(index)
    .findAll("button .v-icon")
    .wrappers.map((icon) =>
      Array.from(icon.element.classList).find((name) => name.startsWith("mdi-"))
    );
}

/**
 * The leiste reads as one grammar: a caption per row, one property per row,
 * every caption in the same column - „Zeichen“, „Schriftgröße“, „Farbe“ and
 * „Absatz“, each present with its prop (hero layout spec §7).
 */
describe("Tiptap's captioned leiste", () => {
  it("captions one row per property, each row present with its prop", async () => {
    expect(
      rowCaptions(await mountEditor({ value: "<p>Hallo</p>", sizes: true }))
    ).toEqual(["Zeichen", "Schriftgröße", "Absatz"]);
    expect(
      rowCaptions(
        await mountEditor({
          value: "<p>Hallo</p>",
          sizes: true,
          colors: true,
          paragraphAlign: true,
        })
      )
    ).toEqual(["Zeichen", "Schriftgröße", "Farbe", "Absatz"]);
  });

  it("puts the character marks in the first row and the paragraph's controls in the last", async () => {
    const wrapper = await mountEditor({
      value: "<p>Hallo</p>",
      sizes: true,
      links: true,
      paragraphAlign: true,
    });

    expect(rowIcons(wrapper, 0)).toEqual([
      "mdi-format-bold",
      "mdi-format-italic",
      "mdi-format-underline",
      "mdi-link",
    ]);
    expect(rowIcons(wrapper, 2)).toEqual([
      "mdi-format-align-left",
      "mdi-format-align-center",
      "mdi-format-align-right",
      "mdi-format-list-bulleted",
      "mdi-format-list-numbered",
    ]);
  });
});

describe("Tiptap's „Schriftgröße“", () => {
  /**
   * The inherited state has no button: while the words follow the Block the
   * scale stands with nothing pressed (hero layout spec §7).
   */
  it("shows the six steps of the scale, nothing pressed while the words follow the Block", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", sizes: true });

    expect(
      wrapper
        .findAll(".tiptap-size-scale button")
        .wrappers.map((button) => button.text())
    ).toEqual(["XS", "S", "M", "L", "XL", "2XL"]);
    expect(pressedTitles(wrapper, ".tiptap-size-scale")).toEqual([]);
  });

  it("names every step by the word the Block's own scale uses", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", sizes: true });

    expect(
      wrapper
        .findAll(".tiptap-size-scale button")
        .wrappers.map((button) => button.attributes("title"))
    ).toEqual(["Sehr klein", "Klein", "Normal", "Groß", "Sehr groß", "Riesig"]);
  });

  /**
   * The buttons show XS…2XL, so the German word is all a screen reader has to
   * go on — it is `title` **and** `aria-label`, not one of the two (§12).
   */
  it("says every word to a screen reader as well as to a pointer", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", sizes: true });

    wrapper.findAll(".tiptap-size-scale button").wrappers.forEach((button) => {
      expect(button.attributes("aria-label")).toBe(button.attributes("title"));
      expect(button.attributes("aria-label")).toBeTruthy();
    });
  });

  it("marks the step the words under the caret carry", async () => {
    const wrapper = await mountEditor({
      value: tag("p", {}, tag("span", { class: "hero-size-xl" }, "Hallo")),
      sizes: true,
    });

    wrapper.vm.editor.commands.selectAll();
    await flush(wrapper);

    expect(pressedTitles(wrapper, ".tiptap-size-scale")).toEqual(["Sehr groß"]);
  });

  it("writes the step the author picks as a class", async () => {
    const wrapper = await mountEditor({
      value: "<p>Hallo Welt</p>",
      sizes: true,
    });

    wrapper.vm.editor.commands.selectAll();
    await groupButton(wrapper, ".tiptap-size-scale", "L").trigger("click");

    expect(lastEmitted(wrapper)).toBe(
      tag("p", {}, tag("span", { class: "hero-size-lg" }, "Hallo Welt"))
    );
  });

  it("writes the Block's own step out instead of leaving it implicit", async () => {
    // A word set to „Normal“ inside a „Normal“ Block keeps that choice over a
    // reload only because the class is written out.
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", sizes: true });

    wrapper.vm.editor.commands.selectAll();
    await groupButton(wrapper, ".tiptap-size-scale", "M").trigger("click");

    expect(lastEmitted(wrapper)).toBe(
      tag("p", {}, tag("span", { class: "hero-size-md" }, "Hallo"))
    );
  });

  it("lifts the class again when the pressed step is clicked, span and all", async () => {
    const wrapper = await mountEditor({
      value: tag("p", {}, tag("span", { class: "hero-size-lg" }, "Hallo")),
      sizes: true,
    });

    wrapper.vm.editor.commands.selectAll();
    await flush(wrapper);
    expect(pressedTitles(wrapper, ".tiptap-size-scale")).toEqual(["Groß"]);

    await groupButton(wrapper, ".tiptap-size-scale", "L").trigger("click");

    expect(lastEmitted(wrapper)).toBe("<p>Hallo</p>");
  });
});

describe("Tiptap's „Farbe“", () => {
  it("offers the four tokens, the picker and „Farbe übernehmen“", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", colors: true });

    expect(
      wrapper
        .findAll(".tiptap-color-dots button")
        .wrappers.map((button) => button.attributes("title"))
    ).toEqual([
      "Standard",
      "Primärfarbe",
      "Sekundärfarbe",
      "Weiß",
      "Eigene Farbe…",
      "Farbe übernehmen",
    ]);
  });

  it("writes the token into the same span as the size", async () => {
    const wrapper = await mountEditor({
      value: "<p>Hallo</p>",
      sizes: true,
      colors: true,
    });

    wrapper.vm.editor.commands.selectAll();
    await groupButton(wrapper, ".tiptap-size-scale", "L").trigger("click");
    wrapper.vm.editor.commands.selectAll();
    await colorButton(wrapper, "Primärfarbe").trigger("click");

    expect(lastEmitted(wrapper)).toBe(
      tag(
        "p",
        {},
        tag("span", { class: "hero-size-lg hero-color-primary" }, "Hallo")
      )
    );
  });

  it("says every dot's name to a screen reader as well as to a pointer", async () => {
    const wrapper = await mountEditor({ value: "<p>Hallo</p>", colors: true });

    const named = wrapper
      .findAll(".tiptap-color-dots button")
      .wrappers.map((button) => button.attributes("aria-label"));

    // The four dots, „Eigene Farbe…“ and „Farbe übernehmen“ — every one of
    // them named, in whichever order the group ends up rendering them.
    expect(named.sort()).toEqual(
      [
        "Standard",
        "Primärfarbe",
        "Sekundärfarbe",
        "Weiß",
        "Eigene Farbe…",
        "Farbe übernehmen",
      ].sort()
    );
    wrapper.findAll(".tiptap-color-dots button").wrappers.forEach((button) => {
      expect(button.attributes("aria-label")).toBe(button.attributes("title"));
    });
  });

  it("paints the two token dots with the instance's own colours", async () => {
    const wrapper = await mountEditor({
      value: "<p>Hallo</p>",
      colors: true,
      themeColors: { primary: "#123456", secondary: "#abcdef" },
    });

    expect(
      colorButton(wrapper, "Primärfarbe").find(".tiptap-color-dot").element
        .style.backgroundColor
    ).toBe("rgb(18, 52, 86)");
    expect(
      colorButton(wrapper, "Sekundärfarbe").find(".tiptap-color-dot").element
        .style.backgroundColor
    ).toBe("rgb(171, 205, 239)");
  });

  it("clears the colour at „Farbe übernehmen“ and keeps the size", async () => {
    const wrapper = await mountEditor({
      value: tag(
        "p",
        {},
        tag("span", { class: "hero-size-lg hero-color-primary" }, "Hallo")
      ),
      sizes: true,
      colors: true,
    });

    wrapper.vm.editor.commands.selectAll();
    await colorButton(wrapper, "Farbe übernehmen").trigger("click");

    expect(lastEmitted(wrapper)).toBe(
      tag("p", {}, tag("span", { class: "hero-size-lg" }, "Hallo"))
    );
  });

  it("writes a picked hex without its alpha, painted so it is visible", async () => {
    const wrapper = await mountEditor({
      value: "<p>Hallo</p>",
      sizes: true,
      colors: true,
    });

    wrapper.vm.editor.commands.selectAll();
    await groupButton(wrapper, ".tiptap-size-scale", "L").trigger("click");
    wrapper.vm.editor.commands.selectAll();
    // The picker hangs in the „Eigene Farbe…“ menu and is built when it opens.
    await colorButton(wrapper, "Eigene Farbe…").trigger("click");
    await flush(wrapper);
    wrapper
      .findComponent({ name: "v-color-picker" })
      .vm.$emit("input", "#FF0000FF");
    await flush(wrapper);

    expect(lastEmitted(wrapper)).toBe(
      tag(
        "p",
        {},
        tag(
          "span",
          {
            class: "hero-size-lg",
            "data-color": "#ff0000",
            style: "color:#ff0000",
          },
          "Hallo"
        )
      )
    );
  });
});

describe("Tiptap's „Ausrichtung“", () => {
  /**
   * Three icons in the „Absatz“ row, the German word as their tooltip and
   * their name to a screen reader; nothing pressed while the paragraph
   * follows the Block (hero layout spec §7).
   */
  it("shows the three alignments as icons, nothing pressed at first", async () => {
    const wrapper = await mountEditor({
      value: "<p>Hallo</p>",
      paragraphAlign: true,
    });
    const buttons = wrapper.findAll(".tiptap-align-segment button").wrappers;

    expect(
      buttons.map((button) =>
        Array.from(button.find(".v-icon").element.classList).find((name) =>
          name.startsWith("mdi-")
        )
      )
    ).toEqual([
      "mdi-format-align-left",
      "mdi-format-align-center",
      "mdi-format-align-right",
    ]);
    expect(buttons.map((button) => button.attributes("title"))).toEqual([
      "Links",
      "Zentriert",
      "Rechts",
    ]);
    buttons.forEach((button) => {
      expect(button.attributes("aria-label")).toBe(button.attributes("title"));
    });
    expect(pressedTitles(wrapper, ".tiptap-align-segment")).toEqual([]);
  });

  it("aligns the paragraph the caret sits in", async () => {
    const wrapper = await mountEditor({
      value: "<p>Hallo</p>",
      paragraphAlign: true,
    });

    wrapper.vm.editor.commands.selectAll();
    await titledButton(wrapper, ".tiptap-align-segment", "Zentriert").trigger(
      "click"
    );

    expect(lastEmitted(wrapper)).toBe(
      tag("p", { class: "hero-align-center" }, "Hallo")
    );
  });

  it("lifts the alignment again when the pressed icon is clicked", async () => {
    const wrapper = await mountEditor({
      value: tag("p", { class: "hero-align-right" }, "Hallo"),
      paragraphAlign: true,
    });

    wrapper.vm.editor.commands.selectAll();
    await flush(wrapper);
    expect(pressedTitles(wrapper, ".tiptap-align-segment")).toEqual(["Rechts"]);

    await titledButton(wrapper, ".tiptap-align-segment", "Rechts").trigger(
      "click"
    );

    expect(lastEmitted(wrapper)).toBe("<p>Hallo</p>");
  });
});

/**
 * The editor's `parseHTML` rules are the admin's copy of the contract's class
 * vocabulary. These two pin them against the exported lists, so a token added
 * to a list the editor was not taught - or the other way round - fails here.
 */
describe("Tiptap against the exported token lists", () => {
  it("keeps every size and every colour the lists name", async () => {
    const marked = [
      ...HERO_SIZE_TOKENS.map((token) =>
        tag("span", { class: `hero-size-${token}` }, token)
      ),
      ...HERO_COLOR_TOKENS.map((token) =>
        tag("span", { class: `hero-color-${token}` }, token)
      ),
    ].join(" ");
    const html = tag("p", {}, marked);
    const wrapper = await mountEditor({
      value: html,
      sizes: true,
      colors: true,
    });

    expect(wrapper.vm.editor.getHTML()).toBe(html);
  });

  it("keeps every alignment the list names", async () => {
    const html = HERO_ALIGN_TOKENS.map((token) =>
      tag("p", { class: `hero-align-${token}` }, token)
    ).join("");
    const wrapper = await mountEditor({ value: html, paragraphAlign: true });

    expect(wrapper.vm.editor.getHTML()).toBe(html);
  });

  it("keeps nothing beside them", async () => {
    // `black` is Panel-only and `huge` is off the scale, so both parse to no
    // class at all - which leaves the spans with nothing and unwraps them.
    const marked =
      tag("span", { class: "hero-color-black" }, "eins") +
      tag("span", { class: "hero-size-huge" }, "zwei");
    const wrapper = await mountEditor({
      value:
        tag("p", {}, marked) +
        tag("p", { class: "hero-align-justify" }, "drei"),
      sizes: true,
      colors: true,
      paragraphAlign: true,
    });

    expect(wrapper.vm.editor.getHTML()).toBe("<p>einszwei</p><p>drei</p>");
  });
});
