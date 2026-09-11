import { describe, expect, it, vi } from "vitest";
import Instances from "@/views/Management/Instances.vue";

vi.mock("@/services/api/ApiInstanceService", () => ({
  default: { getInstance: vi.fn(), updateInstance: vi.fn() },
}));
vi.mock("@/services/api/ApiCatalogService", () => ({
  default: { getCatalog: vi.fn(), updateCatalog: vi.fn() },
}));
vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getRoles: vi.fn() },
}));
vi.mock("@/services/api/ApiUsersService", () => ({
  default: { getUsers: vi.fn() },
}));
vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getTenants: vi.fn() },
}));

/**
 * The stale-overwrite guard of the hero layout spec: the Hero Editor owns
 * `branding.background` and `catalog.heroLayout`, and the Portal tab's global
 * save carries neither back. The view is a route-level component with a
 * router, a store and nine tabs; the two payload builders are exercised with
 * a stand-in context rather than by mounting all of that.
 */
describe("Instances save payloads", () => {
  it("sends the instance without the background", () => {
    const context = {
      instance: {
        id: "i1",
        portalUrl: "https://portal.example.org",
        branding: {
          active: true,
          background: { version: 1, type: "variant", variant: "poly" },
          theme: { colors: { primary: "#111111", secondary: "#222222" } },
        },
      },
    };

    const payload = Instances.methods.instancePayload.call(context);

    expect(payload.branding).not.toHaveProperty("background");
    expect(payload.branding.active).toBe(true);
    expect(payload.portalUrl).toBe("https://portal.example.org");
  });

  it("sends the catalog without the hero layout", () => {
    const context = {
      catalog: {
        type: "instance",
        name: "Marktplatz",
        heroLayout: { version: 1, blocks: [] },
      },
    };

    const payload = Instances.methods.catalogPayload.call(context);

    expect(payload).not.toHaveProperty("heroLayout");
    expect(payload.name).toBe("Marktplatz");
  });

  it("no longer falls back to a catalog with the removed hero fields", () => {
    const data = Instances.data.call({});

    expect(data.catalog).not.toHaveProperty("hero");
  });
});
