import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import {
  button,
  chooseOption as choose,
  selectByLabel,
  switchByLabel,
  toggleSwitch as toggle,
} from "@tests/unit/support/vuetify";
import {
  backgroundFamilyCard as card,
  backgroundIssues as issues,
  chooseBackgroundFamily as chooseFamily,
} from "@tests/unit/support/heroLayout";
import HeroBackgroundForm from "@/components/Instance/Edit/HeroBackgroundForm.vue";

const IMAGE = { source: "media", mediaId: "m1" };

const variantBackground = (overrides = {}) => ({
  version: 1,
  type: "variant",
  variant: "poly",
  orbs: true,
  noise: true,
  intensity: "normal",
  ...overrides,
});

const colorBackground = (overrides = {}) => ({
  version: 1,
  type: "color",
  light: "#f3f4f6",
  ...overrides,
});

const imageBackground = (overrides = {}) => ({
  version: 1,
  type: "image",
  image: IMAGE,
  focalPoint: { x: 50, y: 50 },
  overlay: { light: { color: "#000000", opacity: 40 } },
  ...overrides,
});

/**
 * The section owns no copy of the Background, so a spec that edits twice has
 * to hand the answer back the way the editor does.
 */
function formOf(value) {
  return mountComponent(HeroBackgroundForm, {
    propsData: { value },
    stubs: { MediaReferenceField: true, MediaReferenceImage: true },
  });
}

function emissions(wrapper) {
  return (wrapper.emitted("input") || []).map(([background]) => background);
}

function lastEmission(wrapper) {
  return emissions(wrapper).at(-1);
}

/** Feeds the last answer back as the prop, as the editor's Draft does. */
async function applyLast(wrapper) {
  await wrapper.setProps({ value: lastEmission(wrapper) });
  await wrapper.vm.$nextTick();
}

function hexFieldByLabel(wrapper, label) {
  const field = wrapper
    .findAllComponents({ name: "HeroHexField" })
    .wrappers.find((entry) => entry.props("label") === label);
  if (!field) {
    throw new Error(`Das Farbfeld „${label}“ fehlt.`);
  }
  return field;
}

function hexFieldLabels(wrapper) {
  return wrapper
    .findAllComponents({ name: "HeroHexField" })
    .wrappers.map((entry) => entry.props("label"));
}

async function typeHex(wrapper, label, value) {
  await hexFieldByLabel(wrapper, label).find("input").setValue(value);
  await wrapper.vm.$nextTick();
}

// „End“ puts a slider at its maximum, „Home“ at its minimum. The mouse needs
// a laid-out track, which jsdom has none of; the keyboard is the interaction
// that works here — and one a user has too.
const KEY_END = 35;
const KEY_HOME = 36;

function sliderByLabel(wrapper, label) {
  const slider = wrapper
    .findAllComponents({ name: "v-slider" })
    .wrappers.find((entry) => entry.props("label") === label);
  if (!slider) {
    throw new Error(`Der Regler „${label}“ fehlt.`);
  }
  return slider;
}

async function pressOnSlider(wrapper, label, keyCode) {
  await sliderByLabel(wrapper, label)
    .find(".v-slider__thumb-container")
    .trigger("keydown", { keyCode });
  await wrapper.vm.$nextTick();
}

function surface(wrapper) {
  return wrapper.find(".hero-focal-point__surface");
}

describe("HeroBackgroundForm section", () => {
  /**
   * The heading „Hintergrund“ is the folded row's in the Hero Editor; the
   * section itself carries the hint, its reset and the family cards.
   */
  it("carries the hint, the reset and the three family cards", () => {
    const wrapper = formOf(variantBackground());

    expect(wrapper.text()).toContain("Gilt auch für die Anmeldeseiten.");
    expect(button(wrapper, "Standardhintergrund")).toBeTruthy();
    expect(
      wrapper
        .findAll(".hero-background-form__family")
        .wrappers.map((entry) => entry.text().trim())
    ).toEqual(["Muster", "Farbe", "Bild"]);
  });

  it("marks the family of the Background it was given", () => {
    const wrapper = formOf(imageBackground());

    expect(card(wrapper, "image").attributes("aria-pressed")).toBe("true");
    expect(card(wrapper, "variant").attributes("aria-pressed")).toBe("false");
  });

  it("reads a Background that is not there as the default pattern", () => {
    const wrapper = formOf(null);

    expect(card(wrapper, "variant").attributes("aria-pressed")).toBe("true");
    expect(selectByLabel(wrapper, "Muster").props("value")).toBe("poly");
  });
});

describe("HeroBackgroundForm family switch", () => {
  it("switches to another family with that family's own defaults", async () => {
    const wrapper = formOf(variantBackground());

    await chooseFamily(wrapper, "color");

    expect(lastEmission(wrapper).type).toBe("color");
    expect(lastEmission(wrapper).light).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("answers nothing when the family it is already on is chosen", async () => {
    const wrapper = formOf(variantBackground());

    await chooseFamily(wrapper, "variant");

    expect(wrapper.emitted("input")).toBeUndefined();
  });

  it("restores the last values of a family it has been on this session", async () => {
    const wrapper = formOf(imageBackground({ focalPoint: { x: 20, y: 80 } }));

    await chooseFamily(wrapper, "color");
    await applyLast(wrapper);
    await chooseFamily(wrapper, "image");

    expect(lastEmission(wrapper)).toEqual(
      imageBackground({ focalPoint: { x: 20, y: 80 } })
    );
  });

  it("remembers what was edited in a family, not what it started from", async () => {
    const wrapper = formOf(variantBackground());

    await choose(wrapper, "Muster", "Raster");
    await applyLast(wrapper);
    await chooseFamily(wrapper, "color");
    await applyLast(wrapper);
    await chooseFamily(wrapper, "variant");

    expect(lastEmission(wrapper).variant).toBe("grid");
  });

  it("starts a family it has never been on from its defaults", async () => {
    const wrapper = formOf(variantBackground());

    await chooseFamily(wrapper, "image");

    expect(lastEmission(wrapper)).toEqual(
      imageBackground({ image: null, focalPoint: { x: 50, y: 50 } })
    );
  });
});

describe("HeroBackgroundForm reset", () => {
  it("sets the default pattern Background", async () => {
    const wrapper = formOf(colorBackground({ light: "#123456" }));

    await button(wrapper, "Standardhintergrund").trigger("click");

    expect(lastEmission(wrapper)).toEqual(variantBackground());
  });

  it("resets a pattern that was edited away from the default", async () => {
    const wrapper = formOf(
      variantBackground({
        variant: "minimal",
        orbs: false,
        intensity: "strong",
      })
    );

    await button(wrapper, "Standardhintergrund").trigger("click");

    expect(lastEmission(wrapper)).toEqual(variantBackground());
  });
});

describe("HeroBackgroundForm pattern family", () => {
  it("offers the five patterns and the three intensities in German", () => {
    const wrapper = formOf(variantBackground());

    expect(
      selectByLabel(wrapper, "Muster")
        .props("items")
        .map((item) => item.text)
    ).toEqual(["Farbverlauf", "Nordlicht", "Polygone", "Raster", "Schlicht"]);
    expect(
      selectByLabel(wrapper, "Intensität")
        .props("items")
        .map((item) => item.text)
    ).toEqual(["Dezent", "Normal", "Kräftig"]);
  });

  it("edits the pattern and the intensity", async () => {
    const wrapper = formOf(variantBackground());

    await choose(wrapper, "Muster", "Nordlicht");
    await applyLast(wrapper);
    await choose(wrapper, "Intensität", "Kräftig");

    expect(lastEmission(wrapper)).toEqual(
      variantBackground({ variant: "aurora", intensity: "strong" })
    );
  });

  it("edits Leuchtkreise and Körnung", async () => {
    const wrapper = formOf(variantBackground());

    await toggle(wrapper, "Leuchtkreise");
    await applyLast(wrapper);
    await toggle(wrapper, "Körnung");

    expect(lastEmission(wrapper)).toEqual(
      variantBackground({ orbs: false, noise: false })
    );
  });

  it("fills the defaults of a stored Background that predates them", async () => {
    const wrapper = formOf({ version: 1, type: "variant", variant: "mesh" });

    expect(switchByLabel(wrapper, "Leuchtkreise").props("inputValue")).toBe(
      true
    );
    expect(selectByLabel(wrapper, "Intensität").props("value")).toBe("normal");
  });
});

describe("HeroBackgroundForm colour family", () => {
  it("offers the colour and the optional dark one", () => {
    const wrapper = formOf(colorBackground());

    expect(hexFieldLabels(wrapper)).toEqual(["Farbe", "Farbe im Dunkelmodus"]);
    expect(hexFieldByLabel(wrapper, "Farbe").props("optional")).toBe(false);
    expect(
      hexFieldByLabel(wrapper, "Farbe im Dunkelmodus").props("optional")
    ).toBe(true);
  });

  it("edits the colour as a hex value", async () => {
    const wrapper = formOf(colorBackground());

    await typeHex(wrapper, "Farbe", "#1a2b3c");

    expect(lastEmission(wrapper)).toEqual(
      colorBackground({ light: "#1a2b3c" })
    );
  });

  it("adds the dark colour and drops the key again when it is cleared", async () => {
    const wrapper = formOf(colorBackground());

    await typeHex(wrapper, "Farbe im Dunkelmodus", "#111827");
    await applyLast(wrapper);

    expect(lastEmission(wrapper).dark).toBe("#111827");

    await typeHex(wrapper, "Farbe im Dunkelmodus", "");

    expect("dark" in lastEmission(wrapper)).toBe(false);
  });

  it("says at the section what the backend would refuse", async () => {
    const wrapper = formOf(colorBackground({ light: "" }));

    expect(issues(wrapper)).toHaveLength(1);
    expect(issues(wrapper)[0]).toContain("Farbe");
  });
});

describe("HeroBackgroundForm image family", () => {
  it("picks a public image of the instance library and nothing external", () => {
    const wrapper = formOf(imageBackground());
    const field = wrapper.findComponent({ name: "MediaReferenceField" });

    expect(field.props()).toMatchObject({
      label: "Bild",
      kind: "image",
      publicOnly: true,
      allowExternal: false,
      scope: "instance",
    });
    expect(field.props("value")).toEqual(IMAGE);
  });

  it("asks for an image at the section while there is none", () => {
    const wrapper = formOf(imageBackground({ image: null }));

    expect(issues(wrapper)).toEqual([
      "Es ist kein Bild aus der Mediathek ausgewählt.",
    ]);
  });

  it("shows the focal point on the thumbnail with its percentages", () => {
    const wrapper = formOf(imageBackground({ focalPoint: { x: 30, y: 70 } }));

    expect(surface(wrapper).exists()).toBe(true);
    expect(
      wrapper.find(".hero-focal-point__crosshair").attributes("style")
    ).toContain("left: 30%");
    expect(
      wrapper.findComponent({ name: "HeroFocalPointField" }).text()
    ).toContain("70 %");
  });

  it("has no thumbnail to click while no image is chosen", () => {
    const wrapper = formOf(imageBackground({ image: null }));

    expect(surface(wrapper).exists()).toBe(false);
  });

  it("sets the focal point where the thumbnail was clicked", async () => {
    const wrapper = formOf(imageBackground());
    const thumbnail = surface(wrapper);
    thumbnail.element.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      width: 200,
      height: 100,
    });

    await thumbnail.trigger("click", { clientX: 60, clientY: 45 });

    expect(lastEmission(wrapper).focalPoint).toEqual({ x: 25, y: 25 });
  });

  it("edits the light overlay colour and its darkening", async () => {
    const wrapper = formOf(imageBackground());

    await typeHex(wrapper, "Farbe", "#112233");
    await applyLast(wrapper);
    await pressOnSlider(wrapper, "Abdunklung", KEY_END);

    expect(lastEmission(wrapper).overlay).toEqual({
      light: { color: "#112233", opacity: 100 },
    });
  });

  it("adds an own dark overlay, starting from the light one", async () => {
    const wrapper = formOf(
      imageBackground({ overlay: { light: { color: "#112233", opacity: 20 } } })
    );

    await toggle(wrapper, "Im Dunkelmodus eigene Werte");

    expect(lastEmission(wrapper).overlay.dark).toEqual({
      color: "#112233",
      opacity: 20,
    });
  });

  it("edits the dark overlay on its own and drops it again", async () => {
    const wrapper = formOf(
      imageBackground({
        overlay: {
          light: { color: "#000000", opacity: 40 },
          dark: { color: "#000000", opacity: 40 },
        },
      })
    );

    await pressOnSlider(wrapper, "Abdunklung im Dunkelmodus", KEY_HOME);
    await applyLast(wrapper);

    // The light overlay stays where it was: the two are edited apart.
    expect(lastEmission(wrapper).overlay).toEqual({
      light: { color: "#000000", opacity: 40 },
      dark: { color: "#000000", opacity: 0 },
    });

    await toggle(wrapper, "Im Dunkelmodus eigene Werte");

    expect(lastEmission(wrapper).overlay).toEqual({
      light: { color: "#000000", opacity: 40 },
    });
  });

  it("keeps the darkening a whole percentage between 0 and 100", () => {
    const wrapper = formOf(imageBackground());
    const slider = sliderByLabel(wrapper, "Abdunklung");

    expect(slider.props("min")).toBe("0");
    expect(slider.props("max")).toBe("100");
    expect(slider.props("step")).toBe("1");
  });
});
