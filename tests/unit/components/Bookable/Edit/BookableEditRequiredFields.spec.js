import { describe, expect, it } from "vitest";
import { mountEditing, lastPatch } from "@tests/unit/support/bookableEditing";
import Bookable from "@/entities/bookable";
import BookableEditRequiredFields from "@/components/Bookable/Edit/BookableEditRequiredFields.vue";

const DEFAULT_FIELDS = ["address", "zipCode", "city"];

const mountArea = (requiredFields = DEFAULT_FIELDS) =>
  mountEditing(BookableEditRequiredFields, {
    bookable: new Bookable({
      tenantId: "t1",
      title: "Saal",
      requiredFields,
    }).toPlain(),
  });

const field = (wrapper, id) =>
  wrapper.find(`[data-test='required-field-${id}']`);

describe("BookableEditRequiredFields (Pflichtfelder)", () => {
  it("changes nothing when it mounts", () => {
    const { patches, bookable, stored } = mountArea();

    expect(patches).toEqual([]);
    expect(bookable).toEqual(stored);
  });

  it("names the fields chosen", () => {
    const { wrapper } = mountArea(["phone"]);

    expect(wrapper.text()).toContain("Ausgewählte Pflichtfelder:");
    expect(wrapper.text()).toContain("Telefonnummer");
  });

  it("adds a field with only the list as the patch", async () => {
    const { wrapper, patches, bookable, stored } = mountArea();

    await field(wrapper, "phone").trigger("click");

    expect(patches).toEqual([{ requiredFields: [...DEFAULT_FIELDS, "phone"] }]);
    expect(bookable).toEqual(stored);
  });

  it("drops a chosen field", async () => {
    const { wrapper, patches } = mountArea();

    await field(wrapper, "zipCode").trigger("click");

    expect(lastPatch(patches)).toEqual({ requiredFields: ["address", "city"] });
  });

  it("drops a chosen field by its chip", async () => {
    const { wrapper, patches } = mountArea(["phone", "city"]);

    await wrapper.find(".v-chip__close").trigger("click");

    expect(lastPatch(patches)).toEqual({ requiredFields: ["city"] });
  });

  it("reads a bookable without the list as one without Pflichtfelder", async () => {
    const { wrapper, patches } = mountArea(null);

    await field(wrapper, "comment").trigger("click");

    expect(lastPatch(patches)).toEqual({ requiredFields: ["comment"] });
  });
});
