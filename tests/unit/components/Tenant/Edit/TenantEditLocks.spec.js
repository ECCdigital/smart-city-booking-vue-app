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
    "open-locker": {
      type: "access",
      id: "open-locker",
      title: "Open Locker",
      serverUrl: "https://locker-labor.e-c-crew.dev",
      email: "technik@example.org",
      password: "geheim",
      active: true,
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

/** Panel 0 is Pareva, panel 1 the bike boxes, panel 2 Open Locker. */
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

/**
 * Open Locker is the fifth provider (ECCdigital/tickets#970). The tenant
 * stores its technical account - server, e-mail, password - and the test
 * signs in with it. A wrong password and an account Open Locker blocks are
 * different repairs, so each is said in words of its own; what the backend
 * names without a code (an unreachable server) is shown as it came.
 */
describe("TenantEditLocks Open Locker", () => {
  const OPEN_LOCKER_PANEL = 2;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function panel(wrapper) {
    return wrapper.findAll(".v-expansion-panel").at(OPEN_LOCKER_PANEL);
  }

  function testAlert(wrapper) {
    return panel(wrapper).findComponent({ name: "ConnectionTestAlert" });
  }

  function input(wrapper, label) {
    const field = panel(wrapper)
      .findAll(".v-text-field")
      .wrappers.find((f) => f.find("label").text() === label);
    return field.find("input");
  }

  async function testWith(answer) {
    ApiAccessAppsService.testConnection.mockResolvedValue({ data: answer });
    const wrapper = await mountLocks();
    await testButton(wrapper, OPEN_LOCKER_PANEL).trigger("click");
    await settle(wrapper);
    return wrapper;
  }

  it("shows a panel with the technical account's credentials", async () => {
    const wrapper = await mountLocks();

    expect(panel(wrapper).text()).toContain("Open Locker");
    expect(input(wrapper, "Server-URL").element.value).toBe(
      "https://locker-labor.e-c-crew.dev"
    );
    expect(input(wrapper, "E-Mail des technischen Kontos").element.value).toBe(
      "technik@example.org"
    );
    const password = input(wrapper, "Passwort");
    expect(password.element.value).toBe("geheim");
    expect(password.attributes("type")).toBe("password");
  });

  it("hands a changed password on like the other fields", async () => {
    const wrapper = await mountLocks();

    await input(wrapper, "Passwort").setValue("neu");

    const emitted = wrapper.emitted("update:apps");
    expect(emitted[emitted.length - 1][0]["open-locker"]).toMatchObject({
      type: "access",
      id: "open-locker",
      email: "technik@example.org",
      password: "neu",
    });
  });

  it("tests Open Locker through the access apps route", async () => {
    const wrapper = await testWith({
      success: true,
      message: "Connection successful",
    });

    expect(ApiAccessAppsService.testConnection).toHaveBeenCalledWith(
      "t1",
      {
        serverUrl: "https://locker-labor.e-c-crew.dev",
        email: "technik@example.org",
        password: "geheim",
      },
      "open-locker"
    );
    expect(testAlert(wrapper).text()).toBe("Verbindung erfolgreich!");
  });

  it("says that e-mail or password are wrong", async () => {
    const wrapper = await testWith({
      success: false,
      code: "invalid_credentials",
      message: "Invalid credentials",
    });

    expect(testAlert(wrapper).text()).toBe(
      "Anmeldung fehlgeschlagen: E-Mail oder Passwort des technischen Kontos stimmen nicht."
    );
  });

  it("says that the account is blocked for terms not accepted", async () => {
    const wrapper = await testWith({
      success: false,
      code: "terms_not_accepted",
      message:
        "Account blocked: the technical account has not accepted the current terms of Open Locker",
    });

    expect(testAlert(wrapper).text()).toContain(
      "Das technische Konto ist gesperrt: Es hat die aktuellen Nutzungsbedingungen von Open Locker nicht akzeptiert."
    );
  });

  it("says that the account is blocked for an unverified address", async () => {
    const wrapper = await testWith({
      success: false,
      code: "email_not_verified",
      message:
        "Account blocked: the technical account has not verified its e-mail address",
    });

    expect(testAlert(wrapper).text()).toContain(
      "Das technische Konto ist gesperrt: Seine E-Mail-Adresse ist nicht bestätigt."
    );
  });

  it("shows the backend's message where it names no code", async () => {
    const wrapper = await testWith({
      success: false,
      message: "Server not found",
    });

    expect(testAlert(wrapper).text()).toContain(
      "Verbindung fehlgeschlagen: Server not found"
    );
  });

  it("says so when the request itself failed", async () => {
    ApiAccessAppsService.testConnection.mockRejectedValue(
      new Error("Network Error")
    );
    const wrapper = await mountLocks();
    await testButton(wrapper, OPEN_LOCKER_PANEL).trigger("click");
    await settle(wrapper);

    expect(testAlert(wrapper).text()).toContain(
      "Die Verbindung konnte nicht hergestellt werden."
    );
  });
});
