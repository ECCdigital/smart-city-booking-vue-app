import { beforeEach, describe, expect, it, vi } from "vitest";
import { forbiddenError, serverError } from "@tests/unit/support/api";

const storeDouble = vi.hoisted(() => ({
  permissions: {},
  tenants: [],
  currentTenantId: null,
  dispatch: vi.fn(),
}));

vi.mock("@/store", () => ({
  default: {
    // `tenants/select` takes effect on the double, as it does on the store.
    dispatch: (...args) => {
      if (args[0] === "tenants/select") {
        storeDouble.currentTenantId = args[1];
      }
      return storeDouble.dispatch(...args);
    },
    get state() {
      return { user: { data: { permissions: storeDouble.permissions } } };
    },
    getters: {
      get "tenants/tenants"() {
        return storeDouble.tenants;
      },
      get "tenants/currentTenantId"() {
        return storeDouble.currentTenantId;
      },
    },
  },
}));

const routerDouble = vi.hoisted(() => ({
  currentRoute: { name: "rooms" },
  push: null,
}));

vi.mock("@/router", () => ({
  default: {
    get currentRoute() {
      return routerDouble.currentRoute;
    },
    push: (...args) => routerDouble.push(...args),
  },
}));

vi.mock("@/services/api/ApiAuthService", () => ({
  default: { me: vi.fn() },
}));

import ApiAuthService from "@/services/api/ApiAuthService";
import { handleTenantDeclined } from "@/services/api/tenantDeclined";

const RELOADED = {
  user: { id: "u-1" },
  permissions: {
    tenants: [{ tenantId: "tenant-b", supervisionLevel: "declined" }],
  },
};

/** The backend's `403 tenant_declined`, as the management gate answers it. */
function tenantDeclined(tenantId = "tenant-b") {
  const error = forbiddenError("tenant_declined");
  error.response.data.params = {
    tenantId,
    supervisionLevel: "declined",
    supervisionChangedAt: "2026-09-24T10:00:00.000Z",
    supervisionReason: "Kein Impressum",
  };
  return error;
}

const dispatched = (action) =>
  storeDouble.dispatch.mock.calls.filter(([name]) => name === action);

beforeEach(() => {
  vi.clearAllMocks();
  storeDouble.permissions = {
    tenants: [{ tenantId: "tenant-b", supervisionLevel: "free" }],
  };
  storeDouble.tenants = [
    { id: "tenant-a", name: "Volkshochschule" },
    { id: "tenant-b", name: "Makerspace Nord" },
  ];
  storeDouble.currentTenantId = "tenant-b";
  storeDouble.dispatch = vi.fn();
  routerDouble.currentRoute = { name: "rooms" };
  routerDouble.push = vi.fn(async () => {});
  ApiAuthService.me.mockResolvedValue({ data: RELOADED });
});

describe("handleTenantDeclined", () => {
  it("clears the selection, reloads the permissions and leads to „Meine Mandanten“", async () => {
    await handleTenantDeclined(tenantDeclined());

    expect(storeDouble.currentTenantId).toBeNull();
    expect(ApiAuthService.me).toHaveBeenCalledTimes(1);
    expect(storeDouble.dispatch).toHaveBeenCalledWith("user/update", RELOADED);
    expect(routerDouble.push).toHaveBeenCalledWith({ name: "dashboard" });
  });

  it("says which tenant the operator declined, named from the store", async () => {
    await handleTenantDeclined(tenantDeclined());

    expect(dispatched("toasts/add")).toEqual([
      [
        "toasts/add",
        expect.objectContaining({
          type: "error",
          message:
            "Der Mandant ‚Makerspace Nord‘ wurde vom Betreiber abgewiesen. " +
            "Du hast keinen Verwaltungszugriff mehr.",
        }),
      ],
    ]);
  });

  it("names the tenant by its id when the store does not know it", async () => {
    storeDouble.tenants = [];

    await handleTenantDeclined(tenantDeclined());

    expect(dispatched("toasts/add")[0][1].message).toContain("‚tenant-b‘");
  });

  it("stays on „Meine Mandanten“ when it is already there", async () => {
    routerDouble.currentRoute = { name: "dashboard" };

    await handleTenantDeclined(tenantDeclined());

    expect(storeDouble.currentTenantId).toBeNull();
    expect(routerDouble.push).not.toHaveBeenCalled();
  });

  it("leads away even when the permissions cannot be reloaded", async () => {
    ApiAuthService.me.mockRejectedValue(serverError());

    await handleTenantDeclined(tenantDeclined());

    expect(dispatched("user/update")).toEqual([]);
    expect(dispatched("toasts/add")).toHaveLength(1);
    expect(routerDouble.push).toHaveBeenCalledWith({ name: "dashboard" });
  });

  it("acts once for a page whose requests are refused together", async () => {
    await Promise.all([
      handleTenantDeclined(tenantDeclined()),
      handleTenantDeclined(tenantDeclined()),
      handleTenantDeclined(tenantDeclined()),
    ]);

    expect(ApiAuthService.me).toHaveBeenCalledTimes(1);
    expect(dispatched("toasts/add")).toHaveLength(1);
    expect(routerDouble.push).toHaveBeenCalledTimes(1);
  });

  it("leaves the selection alone when the refusal is about another tenant", async () => {
    storeDouble.currentTenantId = "tenant-a";

    await handleTenantDeclined(tenantDeclined("tenant-b"));

    expect(storeDouble.currentTenantId).toBe("tenant-a");
    expect(storeDouble.dispatch).not.toHaveBeenCalled();
    expect(routerDouble.push).not.toHaveBeenCalled();
  });

  it("leaves an instance owner alone", async () => {
    storeDouble.permissions = { instanceOwner: true, tenants: [] };

    await handleTenantDeclined(tenantDeclined());

    expect(storeDouble.currentTenantId).toBe("tenant-b");
    expect(storeDouble.dispatch).not.toHaveBeenCalled();
    expect(ApiAuthService.me).not.toHaveBeenCalled();
  });

  it("ignores every other refusal and failure", async () => {
    const otherStatus = tenantDeclined();
    otherStatus.response.status = 404;
    otherStatus.response.data.statusCode = 404;
    const contradicting = tenantDeclined();
    contradicting.response.data.statusCode = 404;

    for (const error of [
      forbiddenError(),
      otherStatus,
      contradicting,
      serverError(),
      new Error("Network Error"),
    ]) {
      await handleTenantDeclined(error);
    }

    expect(storeDouble.currentTenantId).toBe("tenant-b");
    expect(storeDouble.dispatch).not.toHaveBeenCalled();
    expect(ApiAuthService.me).not.toHaveBeenCalled();
  });
});
