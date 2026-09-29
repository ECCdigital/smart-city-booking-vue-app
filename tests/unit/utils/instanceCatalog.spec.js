import { describe, expect, it } from "vitest";
import {
  catalogForSave,
  isTenantInCatalog,
  withTenantInCatalog,
} from "@/utils/instanceCatalog";

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

/**
 * The tenant list switches a tenant into or out of the catalog by the one
 * field the Portal tab edits: `excludedTenantIds`. A tenant the catalog does
 * not name is in it.
 */
describe("isTenantInCatalog", () => {
  it("reads a tenant the catalog does not exclude as in it", () => {
    expect(isTenantInCatalog({ excludedTenantIds: ["t-2"] }, "t-1")).toBe(true);
    expect(isTenantInCatalog({ excludedTenantIds: ["t-2"] }, "t-2")).toBe(
      false
    );
  });

  it("reads every tenant as in it while no catalog or no list is stored", () => {
    expect(isTenantInCatalog(null, "t-1")).toBe(true);
    expect(isTenantInCatalog({}, "t-1")).toBe(true);
    expect(isTenantInCatalog({ excludedTenantIds: null }, "t-1")).toBe(true);
  });
});

describe("withTenantInCatalog", () => {
  it("takes a tenant out once and puts it back", () => {
    const catalog = { name: "Marktplatz", excludedTenantIds: ["t-2"] };

    const out = withTenantInCatalog(catalog, "t-1", false);
    expect(out.excludedTenantIds).toEqual(["t-2", "t-1"]);
    expect(out.name).toBe("Marktplatz");

    const again = withTenantInCatalog(out, "t-1", false);
    expect(again.excludedTenantIds).toEqual(["t-2", "t-1"]);

    expect(withTenantInCatalog(out, "t-1", true).excludedTenantIds).toEqual([
      "t-2",
    ]);
  });

  it("starts the list where the catalog has none and leaves the given catalog alone", () => {
    const catalog = { name: "Marktplatz" };

    const next = withTenantInCatalog(catalog, "t-1", false);

    expect(next.excludedTenantIds).toEqual(["t-1"]);
    expect(catalog).not.toHaveProperty("excludedTenantIds");
  });
});
