import { describe, expect, it } from "vitest";
import { catalogForSave } from "@/utils/instanceCatalog";

/**
 * The Hero Editor owns the Hero Layout (hero layout spec, "Stale-overwrite
 * guard"). The Portal tab's global save must never carry `heroLayout` back:
 * a tab save after an editor save would otherwise overwrite the stored layout
 * with the stale copy the tab loaded earlier.
 */
describe("catalogForSave", () => {
  it("drops the hero layout so the tab save cannot overwrite the editor's", () => {
    const payload = catalogForSave({
      type: "instance",
      name: "Marktplatz",
      visibility: "public",
      heroLayout: { version: 1, blocks: [] },
    });

    expect(payload).not.toHaveProperty("heroLayout");
    expect(payload.name).toBe("Marktplatz");
    expect(payload.visibility).toBe("public");
  });

  it("does not touch the catalog it was handed", () => {
    const catalog = { name: "Marktplatz", heroLayout: null };

    catalogForSave(catalog);

    expect(catalog).toHaveProperty("heroLayout");
  });

  it("passes an empty catalog through", () => {
    expect(catalogForSave(null)).toBeNull();
    expect(catalogForSave(undefined)).toBeUndefined();
  });
});
