import { describe, expect, it, vi } from "vitest";

const userState = { data: null };

vi.mock("@/store/modules/user", () => ({
  default: { state: userState },
}));

vi.mock("@/store", () => ({
  default: { getters: { "tenants/currentTenantId": "tenant-1" } },
}));

const UserPermissionService = (
  await import("@/services/permissions/UserPermissionService")
).default;

const TENANT_ID = "tenant-1";

function signIn({ instanceOwner = false, tenants = [] } = {}) {
  userState.data = {
    user: { id: "user-1" },
    permissions: { instanceOwner, tenants },
  };
}

/**
 * „Mitgliedschaft beenden“ (ECCdigital/tickets#633): the tenant's
 * `remove-user`, whose rights stay the user manager's; only a tenant owner
 * ends a tenant owner's membership.
 */
describe("UserPermissionService.allowEndMembership", () => {
  const member = { userId: "erika@example.de", owner: false };
  const owner = { userId: "olga@example.de", owner: true };

  it("lets a user manager end a member's membership, not an owner's", () => {
    signIn({
      tenants: [{ tenantId: TENANT_ID, manageUsers: { updateAny: true } }],
    });

    expect(UserPermissionService.allowEndMembership(member, TENANT_ID)).toBe(
      true
    );
    expect(UserPermissionService.allowEndMembership(owner, TENANT_ID)).toBe(
      false
    );
  });

  it("lets a tenant owner end another owner's membership", () => {
    signIn({ tenants: [{ tenantId: TENANT_ID, isOwner: true }] });

    expect(UserPermissionService.allowEndMembership(owner, TENANT_ID)).toBe(
      true
    );
  });

  it("lets the instance owner end any membership", () => {
    signIn({ instanceOwner: true });

    expect(UserPermissionService.allowEndMembership(owner, TENANT_ID)).toBe(
      true
    );
  });

  it("refuses a role without the user manager's right", () => {
    signIn({ tenants: [{ tenantId: TENANT_ID }] });

    expect(UserPermissionService.allowEndMembership(member, TENANT_ID)).toBe(
      false
    );
  });
});
