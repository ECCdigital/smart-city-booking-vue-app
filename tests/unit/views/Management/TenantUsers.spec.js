import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/language/index";
import TenantUsers from "@/views/Management/TenantUsers.vue";
import ApiTenantService from "@/services/api/ApiTenantService";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    addTenantUser: vi.fn(),
    addTenantOwner: vi.fn(),
    getTenantUsers: vi.fn(),
  },
}));

/**
 * `addUserDirectly` is the one place where the ticket keeps a 404 message
 * instead of neutralising it: the frequent case is still "this address has no
 * account yet", which carries a concrete instruction. Since 4.3.x a tenant
 * outside the caller's reach answers the same 404, so the sentence names both.
 *
 * The view is a route-level component with a router, a store and a dozen
 * dialogs; the catch branch is exercised through the method with a stand-in
 * context rather than by mounting all of that.
 */
function invoke(error) {
  const addToast = vi.fn();
  const context = {
    tenantId: "t1",
    isLoading: false,
    showInviteDialog: true,
    api: { users: [], userDetails: [] },
    addToast,
  };

  ApiTenantService.addTenantUser.mockRejectedValueOnce(error);

  return TenantUsers.methods.addUserDirectly
    .call(context, { email: "a@b.de", roles: [], asOwner: false })
    .then(() => addToast);
}

describe("TenantUsers.addUserDirectly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the registration hint on a 404 and names the second reading", async () => {
    const addToast = await invoke({ response: { status: 404 } });

    const toast = addToast.mock.calls[0][0];
    expect(toast.title).toBe(i18n.t("tenant.addUser.error.not-found.title"));
    expect(toast.message).toMatch(/registriert/i);
    expect(toast.message).toMatch(/nicht zugänglich/i);
  });

  it("survives an error without a response instead of throwing", async () => {
    const addToast = await invoke(new Error("Network Error"));

    expect(addToast.mock.calls[0][0].title).toBe(
      i18n.t("tenant.addUser.error.something-wrong.title")
    );
  });
});
