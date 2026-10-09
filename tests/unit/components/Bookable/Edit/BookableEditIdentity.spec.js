import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import { flushPromises } from "@tests/unit/support/api";
import { chooseOption } from "@tests/unit/support/vuetify";
import Bookable from "@/entities/bookable";
import BookableEditIdentity from "@/components/Bookable/Edit/BookableEditIdentity.vue";

vi.mock("@/services/api/ApiEventService", () => ({
  default: { getEvents: vi.fn() },
}));
vi.mock("@/services/api/ApiTagsService", () => ({
  default: { getTags: vi.fn() },
}));

import ApiEventService from "@/services/api/ApiEventService";
import ApiTagsService from "@/services/api/ApiTagsService";

const stub = (name, props = {}) => ({
  name,
  props: { value: null, label: String, ...props },
  render(h) {
    return h("div", { attrs: { "data-test": `stub-${name}` } }, this.label);
  },
});

const STUBS = {
  MediaReferenceList: stub("MediaReferenceList", {
    publicOnly: Boolean,
    publicOnlyReason: String,
  }),
  AddressLookup: stub("AddressLookup"),
  Tiptap: stub("Tiptap", { minHeight: [String, Number] }),
};

const bookable = (overrides = {}) =>
  new Bookable({
    tenantId: "t-own",
    type: "room",
    title: "Saal",
    ...overrides,
  }).toPlain();

/** The Grunddaten as BookableEdit hosts them, in either mode. */
const mountBasics = ({ isNew = false, expertMode, saved, ...overrides } = {}) =>
  mountEditing(BookableEditIdentity, {
    bookable: bookable(overrides),
    expertMode,
    saved: saved && bookable(saved),
    propsData: { isNew },
    stubs: STUBS,
  });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

describe("BookableEditIdentity - the Grunddaten in two groups", () => {
  beforeEach(() => {
    ApiEventService.getEvents.mockReset();
    ApiEventService.getEvents.mockResolvedValue({ data: [] });
    ApiTagsService.getTags.mockReset();
    ApiTagsService.getTags.mockResolvedValue({ data: [] });
  });

  it("shows what Buchende see in the catalog, then what only the administration sees", () => {
    const { wrapper } = mountBasics({ type: "ticket" });

    const catalog = find(wrapper, "basics-catalog");
    const admin = find(wrapper, "basics-admin");
    expect(catalog.text()).toContain("Das sehen Buchende im Katalog");
    for (const label of [
      "Titel",
      "Beschreibung",
      "Merkmale",
      "Bilder",
      "Standort",
    ]) {
      expect(catalog.text()).toContain(label);
    }
    expect(admin.text()).toContain("Nur für die Verwaltung");
    for (const label of ["Typ", "Veranstaltung", "Interne Tags"]) {
      expect(admin.text()).toContain(label);
    }
  });

  it("shows the hint under every field without being asked", () => {
    const { wrapper } = mountBasics({ type: "ticket" });

    for (const hint of [
      "Daran erkennen Buchende das Objekt",
      "Steht auf der Objektseite im Katalog",
      "Kurze Vorteile neben der Beschreibung",
      "Das erste Bild ist das Titelbild im Katalog.",
      "Wo Buchende hin müssen.",
      "Wird beim Anlegen festgelegt.",
      "Verknüpft das Ticket mit einer Veranstaltung",
      "Zum Filtern und Gruppieren in der Verwaltung.",
    ]) {
      expect(wrapper.text()).toContain(hint);
    }
  });

  it("gives the description the same height as everywhere", () => {
    const { wrapper } = mountBasics();

    expect(wrapper.findComponent({ name: "Tiptap" }).props("minHeight")).toBe(
      180
    );
  });
});

describe("BookableEditIdentity - Titel", () => {
  const leaveTitle = async (wrapper, value) => {
    const input = find(wrapper, "flow-title").find("input");
    await input.setValue(value);
    await input.trigger("blur");
    await wrapper.vm.$nextTick();
  };

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
  ])("asks for a title once an %s one is left", async (_, value) => {
    const { wrapper } = mountBasics();

    await leaveTitle(wrapper, value);

    expect(wrapper.text()).toContain("Bitte einen Titel eingeben.");
  });

  it("says nothing about a title that is there", async () => {
    const { wrapper, patches } = mountBasics();

    await leaveTitle(wrapper, "Aula");

    expect(wrapper.text()).not.toContain("Bitte einen Titel eingeben.");
    expect(patches).toEqual([{ title: "Aula" }]);
  });
});

describe("BookableEditIdentity - Typ and Veranstaltung", () => {
  beforeEach(() => {
    ApiEventService.getEvents.mockReset();
    ApiEventService.getEvents.mockResolvedValue({
      data: [{ id: "e1", information: { name: "Sommerfest" } }],
    });
    ApiTagsService.getTags.mockResolvedValue({ data: [] });
  });

  const typeField = (wrapper) =>
    wrapper
      .findAllComponents({ name: "v-select" })
      .wrappers.find((select) => select.props("label") === "Typ");

  it("lets the type be chosen while the bookable is created", async () => {
    const { wrapper, patches } = mountBasics({ isNew: true });

    expect(typeField(wrapper).props("readonly")).toBe(false);
    expect(wrapper.text()).not.toContain("Wird beim Anlegen festgelegt.");
    await chooseOption(wrapper, "Typ", "Ticket");

    expect(patches).toEqual([{ type: "ticket" }]);
  });

  it("only shows the type of a bookable that exists, and why", () => {
    const { wrapper } = mountBasics({ type: "ticket" });

    expect(typeField(wrapper).props("readonly")).toBe(true);
    expect(typeField(wrapper).text()).toContain("Ticket");
    expect(typeField(wrapper).text()).toContain(
      "Wird beim Anlegen festgelegt."
    );
  });

  it("offers the events of the bookable's tenant", async () => {
    const { wrapper } = mountBasics({ type: "ticket" });
    await flushPromises();

    expect(ApiEventService.getEvents).toHaveBeenCalledWith("t-own");
    await chooseOption(wrapper, "Veranstaltung", "Sommerfest");
    expect(find(wrapper, "flow-event").exists()).toBe(true);
  });

  it("asks for no events while the bookable is no ticket", async () => {
    const { wrapper } = mountBasics({ type: "room" });
    await flushPromises();

    expect(ApiEventService.getEvents).not.toHaveBeenCalled();
    expect(find(wrapper, "flow-event").exists()).toBe(false);
  });

  it("loads the events again each time the type becomes Ticket", async () => {
    const { wrapper } = mountBasics({ isNew: true, type: "ticket" });
    await flushPromises();

    await chooseOption(wrapper, "Typ", "Raum");
    await chooseOption(wrapper, "Typ", "Ticket");

    expect(ApiEventService.getEvents).toHaveBeenCalledTimes(2);
    expect(ApiEventService.getEvents).toHaveBeenLastCalledWith("t-own");
  });

  it("links the chosen event", async () => {
    const { wrapper, patches } = mountBasics({ type: "ticket" });
    await flushPromises();

    await chooseOption(wrapper, "Veranstaltung", "Sommerfest");
    expect(patches).toEqual([{ eventId: "e1" }]);
  });
});

describe("BookableEditIdentity - Merkmale and Interne Tags", () => {
  beforeEach(() => {
    ApiEventService.getEvents.mockResolvedValue({ data: [] });
    ApiTagsService.getTags.mockReset();
    ApiTagsService.getTags.mockResolvedValue({ data: ["Innenstadt", "Saal"] });
  });

  const take = async (wrapper, test, text) => {
    const input = find(wrapper, test).find("input");
    await input.setValue(text);
    await input.trigger("keydown", { key: "Enter", keyCode: 13 });
    await wrapper.vm.$nextTick();
  };

  it("takes a Merkmal as it is typed, without changing the bookable handed in", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountBasics({
      flags: ["WLAN"],
    });

    await take(wrapper, "flow-flags", "Beamer");

    expect(patches).toEqual([{ flags: ["WLAN", "Beamer"] }]);
    expect(handedIn).toEqual(stored);
  });

  it("takes an Interner Tag the same way", async () => {
    const { wrapper, patches } = mountBasics({ tags: ["Saal"] });

    await take(wrapper, "flow-tags", "Nord");

    expect(patches).toEqual([{ tags: ["Saal", "Nord"] }]);
  });

  it("drops a chip with its cross", async () => {
    const { wrapper, patches } = mountBasics({ flags: ["WLAN", "Beamer"] });

    await find(wrapper, "flow-flags")
      .findAll(".v-chip__close")
      .at(0)
      .trigger("click");

    expect(patches).toEqual([{ flags: ["Beamer"] }]);
  });

  it("suggests the tags of the bookable's tenant", async () => {
    const { wrapper } = mountBasics({ tags: [] });
    await flushPromises();

    expect(ApiTagsService.getTags).toHaveBeenCalledWith("t-own");
    const tags = wrapper
      .findAllComponents({ name: "v-combobox" })
      .wrappers.find((field) => field.props("label") === "Interne Tags");
    expect(tags.props("items")).toEqual(["Innenstadt", "Saal"]);
  });

  it("offers no suggestions for the Merkmale", async () => {
    const { wrapper } = mountBasics();
    await flushPromises();

    const flags = wrapper
      .findAllComponents({ name: "v-combobox" })
      .wrappers.find((field) => field.props("label") === "Merkmale");
    expect(flags.props("items")).toEqual([]);
  });

  it.each([
    ["leaves out unused Interne Tags without expert mode", { tags: [] }, false],
    ["shows Interne Tags in use without expert mode", { tags: ["Saal"] }, true],
    [
      "keeps Interne Tags the stored bookable uses",
      { tags: [], saved: { tags: ["Saal"] } },
      true,
    ],
  ])("%s", async (_, overrides, shown) => {
    const { wrapper } = mountBasics({ expertMode: false, ...overrides });
    await flushPromises();

    expect(find(wrapper, "flow-tags").exists()).toBe(shown);
    expect(ApiTagsService.getTags).toHaveBeenCalledTimes(shown ? 1 : 0);
  });
});

describe("BookableEditIdentity - Bilder", () => {
  beforeEach(() => {
    ApiEventService.getEvents.mockResolvedValue({ data: [] });
    ApiTagsService.getTags.mockResolvedValue({ data: [] });
  });

  const LEGACY = "https://example.org/cover.jpg";

  it("names the old cover and takes it over as the first image in one patch", async () => {
    const {
      wrapper,
      patches,
      bookable: handedIn,
      stored,
    } = mountBasics({
      images: [],
      imgUrl: LEGACY,
    });

    expect(find(wrapper, "legacy-cover").text()).toContain(LEGACY);
    await find(wrapper, "legacy-cover-adopt").trigger("click");

    expect(patches).toEqual([
      {
        images: [{ source: "external", mediaId: null, url: LEGACY }],
        imgUrl: "",
      },
    ]);
    expect(handedIn).toEqual(stored);
    expect(find(wrapper, "legacy-cover").exists()).toBe(false);
  });

  it("says nothing of an old cover once images are there", () => {
    const { wrapper } = mountBasics({
      images: [{ source: "external", mediaId: null, url: "x" }],
      imgUrl: LEGACY,
    });

    expect(find(wrapper, "legacy-cover").exists()).toBe(false);
  });

  it("tells a public bookable why it cannot choose internal media", () => {
    const { wrapper } = mountBasics({ isPublic: true });

    const list = wrapper.findComponent({ name: "MediaReferenceList" });
    expect(list.props("publicOnly")).toBe(true);
    expect(list.props("publicOnlyReason")).toBe(
      "Dieses Buchungsobjekt ist öffentlich sichtbar, interne Medien können hier nicht gespeichert werden."
    );
  });
});
