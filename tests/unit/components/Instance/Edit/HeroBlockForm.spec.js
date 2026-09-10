import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import { heroBlock } from "@tests/unit/support/heroLayout";
import HeroBlockForm from "@/components/Instance/Edit/HeroBlockForm.vue";

const THEME_COLORS = { primary: "#123456", secondary: "#654321" };

function formOf(block, options = {}) {
  const {
    blocks = [block],
    locale = "de",
    themeColors = THEME_COLORS,
  } = options;
  return mountComponent(HeroBlockForm, {
    propsData: { block, blocks, locale, themeColors },
  });
}

function sectionTitles(wrapper) {
  return wrapper
    .findAllComponents({ name: "SubSection" })
    .wrappers.map((section) => section.props("title"));
}

function patches(wrapper) {
  return (wrapper.emitted("input") || []).map(([patch]) => patch);
}

function lastPatch(wrapper) {
  return patches(wrapper).at(-1);
}

function textField(wrapper) {
  return wrapper.find(".hero-block-form__text input");
}

function selectByLabel(wrapper, label) {
  const select = wrapper
    .findAllComponents({ name: "v-select" })
    .wrappers.find((entry) => entry.props("label") === label);
  if (!select) {
    throw new Error(`Das Feld „${label}“ fehlt.`);
  }
  return select;
}

/** Picks an option the way a user does: open the select, click the step. */
async function choose(wrapper, label, step) {
  await selectByLabel(wrapper, label).find(".v-input__slot").trigger("click");
  await wrapper.vm.$nextTick();
  await flushPromises();

  const item = Array.from(
    document.querySelectorAll(".menuable__content__active .v-list-item")
  ).find((el) => el.textContent.trim() === step);
  if (!item) {
    throw new Error(`Der Schritt „${step}“ steht nicht zur Wahl.`);
  }
  item.click();
  await wrapper.vm.$nextTick();
  await flushPromises();
}

function switchByLabel(wrapper, label) {
  const entry = wrapper
    .findAllComponents({ name: "v-switch" })
    .wrappers.find((candidate) => candidate.props("label") === label);
  if (!entry) {
    throw new Error(`Der Schalter „${label}“ fehlt.`);
  }
  return entry;
}

async function toggle(wrapper, label) {
  await switchByLabel(wrapper, label).find("input").trigger("click");
  await wrapper.vm.$nextTick();
}

function chips(wrapper) {
  return wrapper
    .findAllComponents({ name: "v-chip" })
    .wrappers.map((chip) => ({ chip, label: chip.text().trim() }));
}

function chipLabels(wrapper) {
  return chips(wrapper).map((entry) => entry.label);
}

async function clickChip(wrapper, label) {
  const entry = chips(wrapper).find((candidate) => candidate.label === label);
  if (!entry) {
    throw new Error(`Der Chip „${label}“ fehlt.`);
  }
  await entry.chip.trigger("click");
  await wrapper.vm.$nextTick();
}

function cell(wrapper, zone) {
  return wrapper
    .findAll(".hero-position-grid__cell")
    .wrappers.find((entry) => entry.attributes("data-zone") === zone);
}

describe("HeroBlockForm", () => {
  it("shows the four sections in the order of the spec", () => {
    expect(sectionTitles(formOf(heroBlock()))).toEqual([
      "Inhalt",
      "Position",
      "Darstellung",
      "Sichtbarkeit",
    ]);
  });
});

describe("HeroBlockForm, the text Block's Inhalt", () => {
  it("edits the German text and counts to 200", async () => {
    const wrapper = formOf(heroBlock({ text: { de: "Willkommen" } }));

    expect(textField(wrapper).element.value).toBe("Willkommen");
    expect(wrapper.text()).toContain("10 / 200");

    await textField(wrapper).setValue("Herzlich willkommen");

    expect(lastPatch(wrapper)).toEqual({
      text: { de: "Herzlich willkommen" },
    });
  });

  it("marks an empty German text as required", async () => {
    const wrapper = formOf(heroBlock({ text: { de: "Da" } }));

    await textField(wrapper).setValue("");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Pflichtfeld");
  });

  it("refuses a text past 200 characters", async () => {
    const wrapper = formOf(heroBlock());

    await textField(wrapper).setValue("a".repeat(201));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Höchstens 200 Zeichen.");
  });

  it("edits the English text without marking it required", async () => {
    const wrapper = formOf(heroBlock({ text: { de: "Willkommen" } }), {
      locale: "en",
    });

    expect(textField(wrapper).element.value).toBe("");

    await textField(wrapper).setValue("Welcome");
    expect(lastPatch(wrapper)).toEqual({
      text: { de: "Willkommen", en: "Welcome" },
    });

    await textField(wrapper).setValue("");
    await wrapper.vm.$nextTick();

    expect(lastPatch(wrapper)).toEqual({ text: { de: "Willkommen" } });
    expect(wrapper.text()).not.toContain("Pflichtfeld");
  });

  it("offers the six font sizes and writes the chosen one", async () => {
    const wrapper = formOf(heroBlock());

    await choose(wrapper, "Schriftgröße", "Riesig");

    expect(lastPatch(wrapper)).toEqual({ size: "2xl" });
  });

  it("carries the two text switches", async () => {
    const wrapper = formOf(heroBlock());

    await toggle(wrapper, "Fett");
    expect(lastPatch(wrapper)).toEqual({ weight: "bold" });

    await toggle(wrapper, "Schatten für bessere Lesbarkeit");
    expect(lastPatch(wrapper)).toEqual({ shadow: true });
  });

  it("says nothing to edit on a type whose fields have not arrived", () => {
    const wrapper = formOf(heroBlock({ type: "richtext", html: { de: "" } }));

    expect(sectionTitles(wrapper)).toContain("Inhalt");
    expect(textField(wrapper).exists()).toBe(false);
  });
});

describe("HeroBlockForm, the colour control", () => {
  it("offers the five chips", () => {
    expect(chipLabels(formOf(heroBlock()))).toEqual([
      "Standard",
      "Primärfarbe",
      "Sekundärfarbe",
      "Weiß",
      "Eigene…",
    ]);
  });

  it("paints the two branding chips with the instance's colours", () => {
    const wrapper = formOf(heroBlock());
    const swatches = wrapper
      .findAll(".hero-color-field__swatch")
      .wrappers.map((swatch) => swatch.attributes("style"));

    expect(swatches[0]).toContain("rgb(18, 52, 86)");
    expect(swatches[1]).toContain("rgb(101, 67, 33)");
  });

  it("writes the token of the chip that was clicked", async () => {
    const wrapper = formOf(heroBlock());

    await clickChip(wrapper, "Weiß");

    expect(lastPatch(wrapper)).toEqual({ color: "white" });
  });

  it("writes nothing while „Eigene…“ only opens the picker", async () => {
    const wrapper = formOf(heroBlock());

    await clickChip(wrapper, "Eigene…");
    await flushPromises();

    expect(patches(wrapper)).toEqual([]);
    expect(wrapper.findComponent({ name: "v-color-picker" }).exists()).toBe(
      true
    );
  });

  it("shows the picked value on the chip", async () => {
    const wrapper = formOf(heroBlock({ color: "#1a2b3c" }));

    expect(chipLabels(wrapper)).toContain("#1a2b3c");
    expect(chipLabels(wrapper)).not.toContain("Eigene…");
  });

  it("reads a Block without a colour as „Standard“ and finds nothing wrong", () => {
    const block = heroBlock();
    delete block.color;
    const wrapper = formOf(block);

    expect(wrapper.text()).not.toContain("Hex-Wert");
    expect(
      wrapper
        .findAllComponents({ name: "v-chip" })
        .wrappers.find((chip) => chip.text().trim() === "Standard")
        .props("outlined")
    ).toBe(false);
  });

  it("drops the alpha the picker offers, which the contract has no room for", async () => {
    const wrapper = formOf(heroBlock({ color: "#1a2b3c" }));

    // The picker hangs in the „Eigene…“ menu and is built when it opens.
    await clickChip(wrapper, "#1a2b3c");
    await flushPromises();
    wrapper
      .findComponent({ name: "v-color-picker" })
      .vm.$emit("input", "#aabbcc80");
    await wrapper.vm.$nextTick();

    expect(lastPatch(wrapper)).toEqual({ color: "#aabbcc" });
  });

  it("says so when the stored colour is neither a token nor a hex value", () => {
    const wrapper = formOf(heroBlock({ color: "#12345" }));

    expect(wrapper.text()).toContain(
      "Bitte eine Farbe als Hex-Wert angeben, z. B. #1a2b3c."
    );
  });
});

describe("HeroBlockForm, the Position grid", () => {
  const crowd = [
    heroBlock({ id: "here", zone: "middle-center" }),
    heroBlock({ id: "mate", zone: "middle-center" }),
    heroBlock({ id: "far-1", zone: "top-left" }),
    heroBlock({ id: "far-2", zone: "top-left" }),
  ];

  it("shows all nine Zones and highlights the Block's own", () => {
    const wrapper = formOf(crowd[0], { blocks: crowd });

    expect(wrapper.findAll(".hero-position-grid__cell")).toHaveLength(9);
    expect(cell(wrapper, "middle-center").classes()).toContain("primary");
    expect(cell(wrapper, "top-left").classes()).not.toContain("primary");
  });

  it("counts the other Blocks of a cell, never the moved one", () => {
    const wrapper = formOf(crowd[0], { blocks: crowd });

    expect(cell(wrapper, "middle-center").text().trim()).toBe("1");
    expect(cell(wrapper, "top-left").text().trim()).toBe("2");
    expect(cell(wrapper, "bottom-right").text().trim()).toBe("");
  });

  it("asks for the move when another cell is clicked", async () => {
    const wrapper = formOf(crowd[0], { blocks: crowd });

    await cell(wrapper, "bottom-right").trigger("click");

    expect(wrapper.emitted("update:zone")).toEqual([["bottom-right"]]);
  });

  it("does nothing when the Block's own cell is clicked", async () => {
    const wrapper = formOf(crowd[0], { blocks: crowd });

    await cell(wrapper, "middle-center").trigger("click");

    expect(wrapper.emitted("update:zone")).toBeUndefined();
  });

  it("explains the mobile reading order", () => {
    expect(formOf(heroBlock()).text()).toContain(
      "Auf Mobilgeräten werden alle Blöcke zentriert untereinander gezeigt"
    );
  });
});

describe("HeroBlockForm, Darstellung and Sichtbarkeit", () => {
  it("edits the two spacings and the width", async () => {
    const wrapper = formOf(heroBlock());

    await choose(wrapper, "Außenabstand", "Sehr groß");
    expect(lastPatch(wrapper)).toEqual({ outerSpacing: "xl" });

    await choose(wrapper, "Innenabstand", "Klein");
    expect(lastPatch(wrapper)).toEqual({ innerSpacing: "sm" });

    await choose(wrapper, "Breite", "Volle Breite");
    expect(lastPatch(wrapper)).toEqual({ width: "full" });
  });

  it("turns the translucent panel on and off", async () => {
    const wrapper = formOf(heroBlock());
    const label = "Halbtransparente Fläche hinter dem Block";

    await toggle(wrapper, label);
    expect(lastPatch(wrapper)).toEqual({ panel: "translucent" });

    await wrapper.setProps({ block: heroBlock({ panel: "translucent" }) });
    await toggle(wrapper, label);
    expect(lastPatch(wrapper)).toEqual({ panel: "none" });
  });

  it("carries the two visibility switches", async () => {
    const wrapper = formOf(heroBlock());

    await toggle(wrapper, "Nur auf der Startseite anzeigen");
    expect(lastPatch(wrapper)).toEqual({ homeOnly: true });

    await toggle(wrapper, "Auf Mobilgeräten ausblenden");
    expect(lastPatch(wrapper)).toEqual({ hideOnMobile: true });
  });
});
