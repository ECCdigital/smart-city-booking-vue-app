import { beforeEach, describe, expect, it, vi } from "vitest";

const storeDouble = vi.hoisted(() => ({
  instanceOwner: false,
  memberships: [],
  tenants: [],
  currentTenantId: null,
  dispatch: vi.fn(),
}));

vi.mock("@/store", () => ({
  default: {
    dispatch: (...args) => {
      if (args[0] === "tenants/select") {
        storeDouble.currentTenantId = args[1];
      }
      return storeDouble.dispatch(...args);
    },
    getters: {
      get "tenants/tenants"() {
        return storeDouble.tenants;
      },
      get "tenants/currentTenantId"() {
        return storeDouble.currentTenantId;
      },
      // As the real getter: an instance owner is never closed out.
      get "user/declinedMembership"() {
        return (tenantId) =>
          (!storeDouble.instanceOwner &&
            storeDouble.memberships.find(
              (m) =>
                m.tenantId === tenantId && m.supervisionLevel === "declined"
            )) ||
          null;
      },
    },
  },
}));

const { rejectDeclinedTenant } = await import(
  "@/router/middlewares/declinedTenant"
);

const ROOMS = { requiresAuth: true, interfaceName: "rooms" };
const MY_TENANTS = {
  requiresAuth: true,
  interfaceName: "dashboard",
  public: true,
};

function navigate(meta) {
  const next = vi.fn();
  return rejectDeclinedTenant({ to: { meta, query: {} }, next }).then(
    () => next
  );
}

const toasts = () =>
  storeDouble.dispatch.mock.calls.filter(([name]) => name === "toasts/add");

beforeEach(() => {
  storeDouble.instanceOwner = false;
  // Restored from the local storage: the tenant chosen before the decline.
  storeDouble.currentTenantId = "tenant-b";
  storeDouble.memberships = [
    { tenantId: "tenant-a", supervisionLevel: "free" },
    { tenantId: "tenant-b", supervisionLevel: "declined" },
  ];
  storeDouble.tenants = [{ id: "tenant-b", name: "Makerspace Nord" }];
  storeDouble.dispatch = vi.fn();
});

describe("rejectDeclinedTenant", () => {
  it("leads away from a restored declined tenant before its page renders", async () => {
    const next = await navigate(ROOMS);

    expect(storeDouble.currentTenantId).toBeNull();
    expect(next).toHaveBeenCalledWith({ name: "dashboard" });
    expect(toasts()).toEqual([
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

  it("drops the declined selection on a page of no tenant as well, and stays there", async () => {
    const next = await navigate(MY_TENANTS);

    expect(storeDouble.currentTenantId).toBeNull();
    expect(toasts()).toHaveLength(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("leaves an instance owner on a declined tenant", async () => {
    storeDouble.instanceOwner = true;

    const next = await navigate(ROOMS);

    expect(storeDouble.currentTenantId).toBe("tenant-b");
    expect(storeDouble.dispatch).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it("passes an open tenant, no tenant and a route without sign-in untouched", async () => {
    for (const [tenantId, meta] of [
      ["tenant-a", ROOMS],
      [null, ROOMS],
      ["tenant-b", { requiresAuth: false }],
    ]) {
      storeDouble.currentTenantId = tenantId;

      const next = await navigate(meta);

      expect(next).toHaveBeenCalledWith();
    }
    expect(storeDouble.dispatch).not.toHaveBeenCalled();
  });
});
