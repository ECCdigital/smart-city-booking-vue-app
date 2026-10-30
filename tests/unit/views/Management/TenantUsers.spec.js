import { beforeEach, describe, expect, it, vi } from "vitest";
import Vuex from "vuex";
import VueRouter from "vue-router";
import { createLocalVue } from "@vue/test-utils";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import i18n from "@/language/index";
import TenantUsers from "@/views/Management/TenantUsers.vue";
import ApiTenantService from "@/services/api/ApiTenantService";
import ApiBlacklistService from "@/services/api/ApiBlacklistService";
import TenantPermissionService from "@/services/permissions/TenantPermissionService";
import { inviteMembersRoute } from "@/utils/tenantUsers";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: {
    addTenantUser: vi.fn(),
    addTenantOwner: vi.fn(),
    getTenantUsers: vi.fn(),
    getTenant: vi.fn(),
    submitTenant: vi.fn(),
  },
}));
vi.mock("@/services/api/ApiBlacklistService", () => ({
  default: { isBlacklisted: vi.fn() },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { isTenantOwner: vi.fn(() => false) },
}));
vi.mock("@/services/api/ApiRolesService", () => ({
  default: { getTenantRoles: vi.fn(async () => ({ data: [] })) },
}));
vi.mock("@/services/api/ApiInvitationService", () => ({
  default: { getTenantInvitations: vi.fn(async () => ({ data: [] })) },
}));
vi.mock("@/services/api/ApiChallengeService", () => ({
  default: { getChallenges: vi.fn(async () => ({ data: [] })) },
}));
// Whether the role may edit users, which the tab „Meldungen“ needs;
// the signed-in user is no part of these tests.
const permissions = vi.hoisted(() => ({ report: false }));
vi.mock("@/services/permissions/UserPermissionService", () => ({
  default: {
    allowReport: () => permissions.report,
    allowEndMembership: () => permissions.report,
  },
}));
vi.mock("@/layouts/Admin.vue", () => ({
  default: {
    name: "AdminLayout",
    render(h) {
      return h("div", this.$slots.default);
    },
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

/**
 * Adding or inviting an address on the blacklist warns first;
 * through the methods with a stand-in context, as
 * above.
 */
describe("TenantUsers: the blacklist warning", () => {
  const BLOCKED = "max@firma.de";

  function context() {
    const ctx = { tenantId: "t1", isLoading: false, blacklistWarning: null };
    ctx.warnOfBlacklist = TenantUsers.methods.warnOfBlacklist.bind(ctx);
    ctx.inviteMultipleUsers = vi.fn();
    ctx.addUserDirectly = vi.fn();
    return ctx;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    ApiBlacklistService.isBlacklisted.mockImplementation(
      async (way, address) => address === BLOCKED
    );
  });

  it("names only the invited addresses on the blacklist and invites once confirmed", async () => {
    const ctx = context();
    const users = [{ email: "anna@sauber.de" }, { email: BLOCKED }];

    await TenantUsers.methods.onInvite.call(ctx, users);

    expect(ApiBlacklistService.isBlacklisted).toHaveBeenCalledWith(
      "tenantUser",
      BLOCKED,
      "t1"
    );
    expect(ctx.blacklistWarning).toMatchObject({
      addresses: [BLOCKED],
      action: "invite",
    });
    expect(ctx.inviteMultipleUsers).not.toHaveBeenCalled();

    await TenantUsers.methods.proceedDespiteBlacklist.call(ctx);

    expect(ctx.blacklistWarning).toBe(null);
    expect(ctx.inviteMultipleUsers).toHaveBeenCalledWith(users);
  });

  it("invites at once when no address is on the blacklist", async () => {
    const ctx = context();
    const users = [{ email: "anna@sauber.de" }];

    await TenantUsers.methods.onInvite.call(ctx, users);

    expect(ctx.blacklistWarning).toBe(null);
    expect(ctx.inviteMultipleUsers).toHaveBeenCalledWith(users);
  });

  it("warns before adding an address on the blacklist directly", async () => {
    const ctx = context();
    const member = { email: BLOCKED, roles: [], asOwner: false };

    await TenantUsers.methods.onAddDirect.call(ctx, member);

    expect(ctx.blacklistWarning).toMatchObject({
      addresses: [BLOCKED],
      action: "add",
    });
    expect(ctx.addUserDirectly).not.toHaveBeenCalled();

    await TenantUsers.methods.proceedDespiteBlacklist.call(ctx);

    expect(ctx.addUserDirectly).toHaveBeenCalledWith(member);
  });
});

const localVue = createLocalVue();
localVue.use(VueRouter);

const stub = (name) => ({
  name,
  render(h) {
    return h("div");
  },
});

// The dialog's own form is its spec; here it is open or not, and closes.
const InviteDialog = {
  name: "TenantInviteUserDialog",
  props: {
    open: Boolean,
    notifyOwnersOnInvitationAccepted: Boolean,
    canChangeInvitationNotice: Boolean,
  },
  render(h) {
    if (!this.open) return null;
    return h("div", { attrs: { "data-test": "invite-dialog" } }, [
      h(
        "button",
        {
          attrs: { "data-test": "invite-close" },
          on: { click: () => this.$emit("close") },
        },
        "Schließen"
      ),
    ]);
  },
};

function membersStore(addToast = () => {}) {
  return new Vuex.Store({
    modules: {
      loading: {
        namespaced: true,
        getters: { isLoading: () => false },
        actions: { start: () => {}, stop: () => {} },
      },
      tenants: {
        namespaced: true,
        getters: { currentTenantId: () => "t1" },
      },
      toasts: { namespaced: true, actions: { add: addToast } },
    },
  });
}

function membersRouter() {
  return new VueRouter({
    mode: "abstract",
    routes: [
      { path: "/tenant/members", name: "user", component: stub("Page") },
    ],
  });
}

/** Opens the members page at `router`'s route, as a load or reload does. */
async function openMembersPage(router, store = membersStore()) {
  const wrapper = mountComponent(TenantUsers, {
    localVue,
    router,
    store,
    stubs: {
      TenantInviteUserDialog: InviteDialog,
      TenantUserDetailDialog: stub("TenantUserDetailDialog"),
      SearchBar: stub("SearchBar"),
      TenantReportsList: ReportsList,
    },
  });
  await flushPromises();
  return wrapper;
}

const inviteDialog = (wrapper) => wrapper.find("[data-test='invite-dialog']");

// The list of reports is its own component; here it is there or not, and
// says how many are open.
const ReportsList = {
  name: "TenantReportsList",
  mounted() {
    this.$emit("count", 2);
  },
  render(h) {
    return h("div", { attrs: { "data-test": "reports-list" } });
  },
};

describe("TenantUsers, invited in by link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiTenantService.getTenantUsers.mockResolvedValue({
      users: [],
      userDetails: [],
    });
    ApiTenantService.getTenant.mockResolvedValue({ data: {} });
  });

  it("opens the invite dialog straight away", async () => {
    const router = membersRouter();
    await router.push(inviteMembersRoute());

    const wrapper = await openMembersPage(router);

    expect(inviteDialog(wrapper).exists()).toBe(true);
  });

  it("shows the page as usual once closed, and a reload leaves it closed", async () => {
    const router = membersRouter();
    await router.push(inviteMembersRoute());
    const wrapper = await openMembersPage(router);

    await wrapper.find("[data-test='invite-close']").trigger("click");

    expect(inviteDialog(wrapper).exists()).toBe(false);
    expect(wrapper.text()).toContain("Mitglied einladen");

    const reloaded = await openMembersPage(router);

    expect(inviteDialog(reloaded).exists()).toBe(false);
  });

  it("opens no dialog on any other way in", async () => {
    const router = membersRouter();
    await router.push({ name: "user" });

    const wrapper = await openMembersPage(router);

    expect(inviteDialog(wrapper).exists()).toBe(false);
  });
});

describe("TenantUsers: the tab „Meldungen“", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.report = true;
    ApiTenantService.getTenantUsers.mockResolvedValue({
      users: [
        {
          userId: "erika@example.de",
          status: "active",
          roles: [],
          owner: false,
          invitations: [],
        },
      ],
      userDetails: [
        { id: "erika@example.de", firstName: "Erika", lastName: "Muster" },
      ],
    });
    ApiTenantService.getTenant.mockResolvedValue({ data: {} });
  });

  const tabs = (wrapper) => wrapper.findAll(".v-tab").wrappers;
  const label = (tab) => tab.text().replace(/\s+/g, " ");
  const reportsList = (wrapper) => wrapper.find("[data-test='reports-list']");
  const isShown = (node) =>
    node.exists() && node.element.style.display !== "none";

  it("shows the members first, beside a tab with the open reports", async () => {
    const router = membersRouter();
    await router.push({ name: "user" });

    const wrapper = await openMembersPage(router);

    expect(tabs(wrapper).map(label)).toEqual([
      "Mitglieder",
      "Meldungen 2 offen",
    ]);
    expect(wrapper.text()).toContain("1 Mitglieder");
    expect(isShown(reportsList(wrapper))).toBe(false);
  });

  it("shows the reports alone in their tab, without the members", async () => {
    const router = membersRouter();
    await router.push({ name: "user" });
    const wrapper = await openMembersPage(router);

    await tabs(wrapper)[1].trigger("click");
    await flushPromises();

    expect(isShown(reportsList(wrapper))).toBe(true);
    expect(wrapper.text()).not.toContain("1 Mitglieder");
    expect(wrapper.text()).not.toContain("Mitglied einladen");
  });

  it("offers „E-Mailadresse melden“ beside the tabs, in „Meldungen“ alone", async () => {
    const router = membersRouter();
    await router.push({ name: "user" });
    const wrapper = await openMembersPage(router);
    const button = () => wrapper.find("[data-test='tenant-report-address']");

    expect(button().exists()).toBe(false);

    await tabs(wrapper)[1].trigger("click");
    await flushPromises();

    expect(button().text()).toBe("E-Mailadresse melden");
    await button().trigger("click");
    expect(wrapper.vm.reportingAddress).toBe(true);
  });

  it("shows neither tabs nor reports to a role that may not edit users", async () => {
    permissions.report = false;
    const router = membersRouter();
    await router.push({ name: "user" });

    const wrapper = await openMembersPage(router);

    expect(tabs(wrapper)).toHaveLength(0);
    expect(reportsList(wrapper).exists()).toBe(false);
    expect(wrapper.text()).toContain("1 Mitglieder");
  });
});

/**
 * The status card of the member dialog shows a suspension of the whole
 * instance; the member carries it from its user.
 */
describe("TenantUsers: a member suspended at the instance", () => {
  it("carries the suspension of its user", () => {
    const members = TenantUsers.computed.members.call({
      api: {
        users: [{ userId: "erika@example.de", status: "active" }],
        userDetails: [
          {
            id: "erika@example.de",
            isSuspended: true,
            suspension: { origin: "manual" },
          },
        ],
      },
    });

    expect(members[0]).toMatchObject({
      isSuspended: true,
      suspension: { origin: "manual" },
    });
  });

  it("says „Gesperrt“ in the list's status chip, whatever the membership", () => {
    const member = { status: "active", isSuspended: true };

    expect(TenantUsers.methods.getStatusText(member)).toBe("Gesperrt");
    expect(TenantUsers.methods.getStatusColor(member)).toBe("red");
  });

  it("counts a suspended account as „Gesperrt“, not with its membership", () => {
    const ctx = {
      filteredMembers: [
        { status: "active", isSuspended: true },
        { status: "active", isSuspended: false },
        { status: "pending", isSuspended: false },
      ],
    };
    const count = (status) =>
      TenantUsers.methods.getStatusCount.call(ctx, status);

    expect([count("active"), count("pending"), count("suspended")]).toEqual([
      1, 1, 1,
    ]);
  });

  it("keeps the membership's status for an account not suspended", () => {
    const member = { status: "active", isSuspended: false };

    expect(TenantUsers.methods.getStatusText(member)).toBe("Aktiv");
    expect(TenantUsers.methods.getStatusColor(member)).toBe("green");
  });
});

/**
 * „Mitgliedschaft beenden“ from the list asks first;
 * through the methods with a stand-in context, as above.
 */
describe("TenantUsers: ending a membership", () => {
  const member = { userId: "erika@example.de", firstName: "Erika" };

  function context() {
    const ctx = { endingMembership: null, reporting: null };
    ctx.removeTenantUser = vi.fn();
    ctx.openReport = TenantUsers.methods.openReport.bind(ctx);
    return ctx;
  }

  it("asks before it ends anything", () => {
    const ctx = context();

    TenantUsers.methods.askEndMembership.call(ctx, member);

    expect(ctx.endingMembership).toBe(member);
    expect(ctx.removeTenantUser).not.toHaveBeenCalled();
  });

  it("ends the membership once confirmed and closes the question", async () => {
    const ctx = context();
    TenantUsers.methods.askEndMembership.call(ctx, member);

    await TenantUsers.methods.confirmEndMembership.call(ctx);

    expect(ctx.removeTenantUser).toHaveBeenCalledWith("erika@example.de");
    expect(ctx.endingMembership).toBe(null);
  });

  it("turns to the report instead, ending nothing", () => {
    const ctx = context();
    TenantUsers.methods.askEndMembership.call(ctx, member);

    TenantUsers.methods.reportInsteadOfEnding.call(ctx);

    expect(ctx.reporting).toBe(member);
    expect(ctx.endingMembership).toBe(null);
    expect(ctx.removeTenantUser).not.toHaveBeenCalled();
  });
});

/**
 * The mail to the Besitzer when an invitation is accepted is one setting of
 * the tenant. The page reads it with the tenant, hands it to the invite
 * dialog for a Besitzer only, and writes nothing but that one field back.
 */
describe("TenantUsers, the Besitzer's notice of an accepted invitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiTenantService.getTenantUsers.mockResolvedValue({
      users: [],
      userDetails: [],
    });
    TenantPermissionService.isTenantOwner.mockReturnValue(true);
  });

  const dialogOf = (wrapper) =>
    wrapper.findComponent({ name: "TenantInviteUserDialog" });

  async function openAsBesitzer(tenant, addToast) {
    ApiTenantService.getTenant.mockResolvedValue({ data: tenant });
    const router = membersRouter();
    await router.push({ name: "user" });
    return openMembersPage(router, membersStore(addToast));
  }

  it("reads a tenant without the field as on", async () => {
    const wrapper = await openAsBesitzer({ id: "t1" });

    expect(dialogOf(wrapper).props("notifyOwnersOnInvitationAccepted")).toBe(
      true
    );
    expect(dialogOf(wrapper).props("canChangeInvitationNotice")).toBe(true);
  });

  it("reads the setting the Besitzer turned off", async () => {
    const wrapper = await openAsBesitzer({
      id: "t1",
      notifyOwnersOnInvitationAccepted: false,
    });

    expect(dialogOf(wrapper).props("notifyOwnersOnInvitationAccepted")).toBe(
      false
    );
  });

  it("lets no one but a Besitzer of the tenant change it", async () => {
    TenantPermissionService.isTenantOwner.mockReturnValue(false);

    const wrapper = await openAsBesitzer({ id: "t1" });

    expect(TenantPermissionService.isTenantOwner).toHaveBeenCalledWith("t1");
    expect(dialogOf(wrapper).props("canChangeInvitationNotice")).toBe(false);
  });

  it("saves only that one field of the tenant", async () => {
    ApiTenantService.submitTenant.mockResolvedValue({ data: {} });
    const wrapper = await openAsBesitzer({ id: "t1", name: "Bad" });

    dialogOf(wrapper).vm.$emit("change-invitation-notice", false);
    await flushPromises();

    expect(ApiTenantService.submitTenant).toHaveBeenCalledWith({
      id: "t1",
      notifyOwnersOnInvitationAccepted: false,
    });
    expect(dialogOf(wrapper).props("notifyOwnersOnInvitationAccepted")).toBe(
      false
    );
  });

  it("turns the setting back and says so when the save fails", async () => {
    ApiTenantService.submitTenant.mockRejectedValue(new Error("Network Error"));
    const addToast = vi.fn();
    const wrapper = await openAsBesitzer({ id: "t1" }, addToast);

    dialogOf(wrapper).vm.$emit("change-invitation-notice", false);
    await flushPromises();

    expect(dialogOf(wrapper).props("notifyOwnersOnInvitationAccepted")).toBe(
      true
    );
    expect(addToast.mock.calls.at(-1)[1]).toMatchObject({ type: "error" });
  });
});
