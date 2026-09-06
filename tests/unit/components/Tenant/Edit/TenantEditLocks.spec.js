import { beforeEach, describe, expect, it, vi } from "vitest";
import TenantEditLocks from "@/components/Tenant/Edit/TenantEditLocks.vue";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";

vi.mock("@/services/api/ApiAccessAppsService", () => ({
  default: { testConnection: vi.fn() },
}));

function apps() {
  return {
    pareva: {
      type: "access",
      id: "pareva",
      title: "Pareva",
      serverUrl: "https://pareva.example",
      lockerId: "L1",
      user: "u",
      password: "p",
      active: true,
    },
    ifbs: {
      type: "access",
      id: "ifbs",
      title: "Parkraumservice",
      serverUrl: "https://ifbs.example",
      secretPhrase: "s",
      apiKeyID: "k-id",
      apiKey: "k",
      active: true,
      customerService: { name: "", email: "", phone: "" },
    },
  };
}

/**
 * Both providers sit in a collapsed `AppPanel`, whose Vuetify expansion
 * panel only renders its content once it has been opened.
 */
async function mountLocks() {
  const wrapper = mountComponent(TenantEditLocks, {
    propsData: { tenant: { id: "t1" }, apps: apps() },
  });

  const headers = wrapper.findAll(".v-expansion-panel-header").wrappers;
  for (const header of headers) {
    await header.trigger("click");
  }
  await wrapper.vm.$nextTick();

  return wrapper;
}

/** Panel 0 is Pareva, panel 1 the bike boxes. */
function testButton(wrapper, panelIndex) {
  const buttons = wrapper
    .findAll("button")
    .wrappers.filter((button) => button.text().includes("Verbindung testen"));

  return buttons[panelIndex];
}

async function settle(wrapper) {
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * The connection test used to run through the `/locker/*` facade, which is
 * on its way out. The access route answers the same body - the very same
 * provider test handler stands behind both - so the move is a change of
 * address, not of meaning.
 */
describe("TenantEditLocks connection test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tests Pareva through the access apps route", async () => {
    ApiAccessAppsService.testConnection.mockResolvedValue({
      data: { success: true },
    });

    const wrapper = await mountLocks();
    await testButton(wrapper, 0).trigger("click");
    await settle(wrapper);

    expect(ApiAccessAppsService.testConnection).toHaveBeenCalledWith(
      "t1",
      {
        serverUrl: "https://pareva.example",
        lockerId: "L1",
        user: "u",
        password: "p",
      },
      "pareva"
    );
    expect(wrapper.vm.testResults.pareva.success).toBe(true);
    expect(wrapper.text()).toMatch(/Verbindung erfolgreich/i);
  });

  it("tests iFBS through the access apps route", async () => {
    ApiAccessAppsService.testConnection.mockResolvedValue({
      data: { success: false, errorCode: 7, message: "Kein Zugriff" },
    });

    const wrapper = await mountLocks();
    await testButton(wrapper, 1).trigger("click");
    await settle(wrapper);

    expect(ApiAccessAppsService.testConnection).toHaveBeenCalledWith(
      "t1",
      {
        serverUrl: "https://ifbs.example",
        apiKeyID: "k-id",
        apiKey: "k",
      },
      "ifbs"
    );
    expect(wrapper.vm.testResults.ifbs).toMatchObject({
      success: false,
      errNo: 7,
      errMsg: "Kein Zugriff",
    });
    expect(wrapper.text()).toMatch(/Kein Zugriff/);
  });

  it("shows the server's message when the request fails", async () => {
    ApiAccessAppsService.testConnection.mockRejectedValue({
      response: { data: { message: "Nicht berechtigt", errorCode: 403 } },
    });

    const wrapper = await mountLocks();
    await testButton(wrapper, 0).trigger("click");
    await settle(wrapper);

    expect(wrapper.vm.testResults.pareva).toMatchObject({
      success: false,
      errMsg: "Nicht berechtigt",
      errNo: 403,
    });
  });
});
