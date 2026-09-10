import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import { heroBlock } from "@tests/unit/support/heroLayout";
import HeroBlockList from "@/components/Instance/Edit/HeroBlockList.vue";
import { MAX_HERO_BLOCKS } from "@/utils/heroBlocks";

function listOf(blocks, selectedBlockId = null) {
  return mountComponent(HeroBlockList, {
    propsData: { blocks, selectedBlockId },
  });
}

function rows(wrapper) {
  return wrapper.findAll(".hero-block-row").wrappers;
}

function rowOf(wrapper, id) {
  const row = rows(wrapper).find((entry) => entry.attributes("data-id") === id);
  if (!row) {
    throw new Error(`Block "${id}" is not in the list.`);
  }
  return row;
}

function groupLabels(wrapper) {
  return wrapper
    .findAll(".hero-block-group__label")
    .wrappers.map((label) => label.text());
}

function button(wrapper, label) {
  return wrapper
    .findAll("button")
    .wrappers.find((entry) => entry.text().trim() === label);
}

/** The entries of an overlay menu, read off the document it detaches into. */
function openMenuItems() {
  return Array.from(
    document.querySelectorAll(".menuable__content__active .v-list-item")
  );
}

function menuItem(label) {
  return openMenuItems().find((item) => item.textContent.trim() === label);
}

/** Opens the ⋮ menu of a row the way a user does. */
async function openRowMenu(wrapper, id) {
  await rowOf(wrapper, id)
    .find(".hero-block-row__menu button")
    .trigger("click");
  await wrapper.vm.$nextTick();
  await flushPromises();
}

async function openAddMenu(wrapper) {
  await button(wrapper, "Block hinzufügen").trigger("click");
  await wrapper.vm.$nextTick();
  await flushPromises();
}

async function clickMenuItem(wrapper, label) {
  const item = menuItem(label);
  if (!item) {
    throw new Error(`Menu entry "${label}" is missing.`);
  }
  item.click();
  await wrapper.vm.$nextTick();
  await flushPromises();
}

function lastBlocks(wrapper) {
  return wrapper.emitted("input").at(-1)[0];
}

function lastSelection(wrapper) {
  return wrapper.emitted("update:selectedBlockId").at(-1)[0];
}

function ids(blocks) {
  return blocks.map((block) => block.id);
}

function textBlock(id, zone, overrides = {}) {
  return heroBlock({ id, zone, text: { de: id }, ...overrides });
}

describe("HeroBlockList grouping", () => {
  it("shows one group per Zone that holds a Block, in Zone order", () => {
    const wrapper = listOf([
      textBlock("bottom", "bottom-right"),
      textBlock("top", "top-left"),
    ]);

    expect(groupLabels(wrapper)).toEqual(["Oben links", "Unten rechts"]);
  });

  it("hides the Zones without a Block", () => {
    const wrapper = listOf([textBlock("only", "middle-center")]);

    expect(groupLabels(wrapper)).toEqual(["Mitte zentriert"]);
  });

  it("lists the rows in canonical order, whatever order it was handed", () => {
    const wrapper = listOf([
      textBlock("late", "bottom-left"),
      textBlock("early", "top-right"),
    ]);

    expect(rows(wrapper).map((row) => row.attributes("data-id"))).toEqual([
      "early",
      "late",
    ]);
  });

  it("says so while there is no Block at all", () => {
    const wrapper = listOf([]);

    expect(rows(wrapper)).toHaveLength(0);
    expect(wrapper.text()).toContain("Noch keine Blöcke");
  });

  it("explains the mobile reading order", () => {
    const wrapper = listOf([textBlock("a", "top-left")]);

    expect(wrapper.text()).toContain(
      "Auf Mobilgeräten erscheinen die Blöcke zentriert untereinander"
    );
  });
});

describe("HeroBlockList rows", () => {
  it("shows the first German line of a text Block", () => {
    const wrapper = listOf([
      heroBlock({ id: "a", text: { de: "Willkommen", en: "Welcome" } }),
    ]);

    expect(rowOf(wrapper, "a").text()).toContain("Willkommen");
  });

  it("shows the alt text of an image Block", () => {
    const wrapper = listOf([
      heroBlock({
        id: "a",
        type: "image",
        text: undefined,
        alt: { de: "Das Logo" },
        image: null,
      }),
    ]);

    expect(rowOf(wrapper, "a").text()).toContain("Das Logo");
  });

  it("names the type of a Block that has no content yet", () => {
    const wrapper = listOf([
      heroBlock({ id: "a", type: "richtext", text: undefined, html: {} }),
    ]);

    expect(rowOf(wrapper, "a").text()).toContain("Formatierter Text");
  });

  it("carries the icons of „nur Startseite“ and „auf Mobilgeräten ausgeblendet“", () => {
    const wrapper = listOf([
      textBlock("plain", "top-left"),
      textBlock("hidden", "top-left", { homeOnly: true, hideOnMobile: true }),
    ]);

    expect(rowOf(wrapper, "plain").find(".hero-block-row__flag").exists()).toBe(
      false
    );
    expect(
      rowOf(wrapper, "hidden").findAll(".hero-block-row__flag")
    ).toHaveLength(2);
  });

  it("keeps a slot for the warning and error badges", () => {
    const wrapper = mountComponent(HeroBlockList, {
      propsData: {
        blocks: [textBlock("a", "top-left")],
        selectedBlockId: null,
      },
      scopedSlots: {
        badge: "<span class=test-badge>{{ props.block.id }}</span>",
      },
    });

    expect(rowOf(wrapper, "a").find(".test-badge").text()).toBe("a");
  });

  it("marks the selected row", () => {
    const wrapper = listOf(
      [textBlock("a", "top-left"), textBlock("b", "top-left")],
      "b"
    );

    expect(rowOf(wrapper, "a").classes()).not.toContain(
      "hero-block-row--selected"
    );
    expect(rowOf(wrapper, "b").classes()).toContain("hero-block-row--selected");
  });

  it("selects a Block when its row is clicked", async () => {
    const wrapper = listOf([textBlock("a", "top-left")], null);

    await rowOf(wrapper, "a").trigger("click");

    expect(lastSelection(wrapper)).toBe("a");
    // Selecting changes nothing that would be saved.
    expect(wrapper.emitted("input")).toBeUndefined();
  });
});

describe("HeroBlockList row menu", () => {
  it("moves a Block up inside its group", async () => {
    const wrapper = listOf([
      textBlock("a", "top-left"),
      textBlock("b", "top-left"),
    ]);

    await openRowMenu(wrapper, "b");
    await clickMenuItem(wrapper, "Nach oben");

    expect(ids(lastBlocks(wrapper))).toEqual(["b", "a"]);
  });

  it("moves a Block down inside its group", async () => {
    const wrapper = listOf([
      textBlock("a", "top-left"),
      textBlock("b", "top-left"),
    ]);

    await openRowMenu(wrapper, "a");
    await clickMenuItem(wrapper, "Nach unten");

    expect(ids(lastBlocks(wrapper))).toEqual(["b", "a"]);
  });

  it("disables the two moves at the edges of the group", async () => {
    const wrapper = listOf([
      textBlock("a", "top-left"),
      textBlock("b", "top-left"),
    ]);

    await openRowMenu(wrapper, "a");

    expect(menuItem("Nach oben").className).toContain("v-list-item--disabled");
    expect(menuItem("Nach unten").className).not.toContain(
      "v-list-item--disabled"
    );
  });

  it("duplicates a Block behind the original and selects the copy", async () => {
    const wrapper = listOf([textBlock("a", "top-left")]);

    await openRowMenu(wrapper, "a");
    await clickMenuItem(wrapper, "Duplizieren");

    const blocks = lastBlocks(wrapper);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].id).toBe("a");
    expect(blocks[1].id).not.toBe("a");
    expect(blocks[1].zone).toBe("top-left");
    expect(lastSelection(wrapper)).toBe(blocks[1].id);
  });

  it("deletes without asking and selects the next Block of the group", async () => {
    const wrapper = listOf(
      [textBlock("a", "top-left"), textBlock("b", "top-left")],
      "a"
    );

    await openRowMenu(wrapper, "a");
    await clickMenuItem(wrapper, "Löschen");

    expect(ids(lastBlocks(wrapper))).toEqual(["b"]);
    expect(lastSelection(wrapper)).toBe("b");
  });
});

describe("HeroBlockList adding", () => {
  it("offers the three types", async () => {
    const wrapper = listOf([]);

    await openAddMenu(wrapper);

    expect(openMenuItems().map((item) => item.textContent.trim())).toEqual([
      "Text",
      "Formatierter Text",
      "Bild",
    ]);
  });

  it("puts a new Block into „Mitte zentriert“ without a selection", async () => {
    const wrapper = listOf([], null);

    await openAddMenu(wrapper);
    await clickMenuItem(wrapper, "Text");

    const blocks = lastBlocks(wrapper);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "text", zone: "middle-center" });
    expect(lastSelection(wrapper)).toBe(blocks[0].id);
  });

  it("puts it behind the selected Block, in its Zone", async () => {
    const wrapper = listOf(
      [textBlock("a", "top-left"), textBlock("b", "top-left")],
      "a"
    );

    await openAddMenu(wrapper);
    await clickMenuItem(wrapper, "Bild");

    const blocks = lastBlocks(wrapper);
    expect(blocks[1]).toMatchObject({ type: "image", zone: "top-left" });
    expect(ids(blocks)[0]).toBe("a");
    expect(ids(blocks)[2]).toBe("b");
  });

  it("gives the new Block a uuid v4", async () => {
    const wrapper = listOf([]);

    await openAddMenu(wrapper);
    await clickMenuItem(wrapper, "Formatierter Text");

    expect(lastBlocks(wrapper)[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("stops at twelve Blocks and says why", () => {
    const blocks = Array.from({ length: MAX_HERO_BLOCKS }, (_, index) =>
      textBlock(`b${index}`, "top-left")
    );

    const wrapper = listOf(blocks);

    expect(button(wrapper, "Block hinzufügen").attributes("disabled")).toBe(
      "disabled"
    );
    expect(wrapper.text()).toContain("Mehr als 12 Blöcke");
  });
});

describe("HeroBlockList dragging", () => {
  /** The `change` event `vuedraggable` fires for the group of a Zone. */
  function draggableOf(wrapper, zone) {
    return wrapper
      .findAllComponents({ name: "draggable" })
      .wrappers.find((entry) => entry.attributes("data-zone") === zone);
  }

  it("reorders inside a group", async () => {
    const wrapper = listOf([
      textBlock("a", "top-left"),
      textBlock("b", "top-left"),
    ]);

    draggableOf(wrapper, "top-left").vm.$emit("change", {
      moved: { element: { id: "b" }, oldIndex: 1, newIndex: 0 },
    });
    await wrapper.vm.$nextTick();

    expect(ids(lastBlocks(wrapper))).toEqual(["b", "a"]);
  });

  it("sets the Zone at the drop position when it lands in another group", async () => {
    const wrapper = listOf([
      textBlock("a", "top-left"),
      textBlock("b", "top-left"),
      textBlock("moved", "bottom-right"),
    ]);

    draggableOf(wrapper, "top-left").vm.$emit("change", {
      added: { element: { id: "moved" }, newIndex: 1 },
    });
    await wrapper.vm.$nextTick();

    const blocks = lastBlocks(wrapper);
    expect(ids(blocks)).toEqual(["a", "moved", "b"]);
    expect(blocks[1].zone).toBe("top-left");
  });

  it("leaves the array alone when a Block only left a group", async () => {
    const wrapper = listOf([
      textBlock("a", "top-left"),
      textBlock("b", "bottom-right"),
    ]);

    draggableOf(wrapper, "top-left").vm.$emit("change", {
      removed: { element: { id: "a" }, oldIndex: 0 },
    });
    await wrapper.vm.$nextTick();

    // The group it landed in reports the drop; a removal on its own would
    // delete the Block.
    expect(wrapper.emitted("input")).toBeUndefined();
  });
});
