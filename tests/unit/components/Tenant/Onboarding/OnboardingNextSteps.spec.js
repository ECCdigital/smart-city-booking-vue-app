import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VueRouter from "vue-router";
import { createLocalVue } from "@vue/test-utils";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
import {
  restoreLocale,
  unmarkedTexts,
  usePseudoLocale,
} from "@tests/unit/support/pseudoLocale";

vi.mock("@/services/api/ApiTenantService", () => ({
  default: { getReadiness: vi.fn() },
}));
vi.mock("@/services/permissions/TenantPermissionService", () => ({
  default: { allowReadiness: (tenantId) => readinessAllowed(tenantId) },
}));

import ApiTenantService from "@/services/api/ApiTenantService";
import OnboardingNextSteps from "@/components/Tenant/Onboarding/OnboardingNextSteps.vue";

const localVue = createLocalVue();
localVue.use(VueRouter);

// The app's routes the next steps lead to, by name and path.
const ROUTES = [
  { path: "/dashboard", name: "dashboard" },
  { path: "/onboarding", name: "tenant-onboarding" },
  { path: "/tenant", name: "tenant" },
  { path: "/tenant/members", name: "user" },
  { path: "/rooms/edit", name: "room-edit" },
];

let readinessAllowed;

const tenantOf = (supervisionLevel) => ({
  id: "t-1",
  name: "Verein",
  supervisionLevel,
});

function mountNextSteps(tenant = tenantOf("free")) {
  const router = new VueRouter({ mode: "abstract", routes: ROUTES });
  return mountComponent(OnboardingNextSteps, {
    localVue,
    router,
    propsData: { tenant },
  });
}

const find = (wrapper, name) => wrapper.find(`[data-test='${name}']`);

beforeEach(() => {
  vi.clearAllMocks();
  readinessAllowed = () => true;
  ApiTenantService.getReadiness.mockResolvedValue({ criteria: [] });
});

describe("OnboardingNextSteps", () => {
  it("names the created tenant", () => {
    const wrapper = mountNextSteps();

    expect(find(wrapper, "next-created").text()).toBe(
      "Mandant Verein ist angelegt"
    );
    expect(find(wrapper, "next-created").find("em").text()).toBe("Verein");
  });

  it("explains no supervision to a free tenant", () => {
    expect(find(mountNextSteps(), "supervision-notice").exists()).toBe(false);
  });

  it("keeps a supervised tenant's level in view, under the tenant's name", () => {
    const wrapper = mountNextSteps(tenantOf("supervised"));

    const notice = find(wrapper, "supervision-notice");
    expect(notice.text()).toContain("beaufsichtigt");
    expect(
      find(wrapper, "next-created").element.compareDocumentPosition(
        notice.element
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("offers three equal ways on, each a plain link that does not come back", () => {
    const wrapper = mountNextSteps();

    const tiles = wrapper.findAll("[data-test^='next-tile-']");
    expect(tiles.wrappers.map((tile) => tile.element.tagName)).toEqual([
      "A",
      "A",
      "A",
    ]);
    expect(
      tiles.wrappers.map((tile) => [
        tile.attributes("data-test"),
        tile.attributes("href"),
      ])
    ).toEqual([
      ["next-tile-settings", "/tenant"],
      ["next-tile-invite", "/tenant/members?invite=1"],
      ["next-tile-bookable", "/rooms/edit"],
    ]);
    expect(find(wrapper, "next-tile-settings").text()).toContain(
      "Mandanten-Einstellungen erweitern"
    );
    expect(find(wrapper, "next-tile-invite").text()).toContain(
      "Nutzer einladen"
    );
    expect(find(wrapper, "next-tile-bookable").text()).toContain(
      "Erstes Buchungsobjekt anlegen"
    );
    // Equal in rank: no tile is drawn as the one to take.
    expect(
      new Set(tiles.wrappers.map((tile) => tile.classes().join(" "))).size
    ).toBe(1);
  });

  it("shows the tenant's readiness check below the ways on", async () => {
    ApiTenantService.getReadiness.mockResolvedValue({
      criteria: [{ key: "payment", state: "missing", hint: "", offers: [] }],
    });
    const wrapper = mountNextSteps();
    await flushPromises();

    expect(ApiTenantService.getReadiness).toHaveBeenCalledWith("t-1");
    expect(find(wrapper, "readiness-payment").text()).toContain("Offen");
    expect(
      find(wrapper, "next-tile-bookable").element.compareDocumentPosition(
        find(wrapper, "readiness-check").element
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("leaves the readiness check out for whom may not read it", async () => {
    readinessAllowed = (tenantId) => tenantId !== "t-1";
    const wrapper = mountNextSteps();
    await flushPromises();

    expect(find(wrapper, "readiness-check").exists()).toBe(false);
    expect(ApiTenantService.getReadiness).not.toHaveBeenCalled();
  });

  it("leads to the tenant's legal texts and payment", () => {
    const wrapper = mountNextSteps();

    expect(find(wrapper, "setup-legal").attributes("href")).toBe(
      "/tenant?tab=legal"
    );
    expect(find(wrapper, "setup-payment").attributes("href")).toBe(
      "/tenant?tab=payments"
    );
    expect(find(wrapper, "setup-links").text()).not.toContain(
      "kostenlose Angebot"
    );
  });

  it("ends with a plain way to the start page", () => {
    const wrapper = mountNextSteps();

    const home = find(wrapper, "next-home");
    expect(home.text()).toBe("Zur Startseite");
    expect(home.attributes("href")).toBe("/dashboard");
    expect(
      find(wrapper, "setup-links").element.compareDocumentPosition(
        home.element
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe("OnboardingNextSteps — copy", () => {
  beforeEach(() => usePseudoLocale());
  afterEach(() => restoreLocale());

  it("takes every text from the catalogue", async () => {
    ApiTenantService.getReadiness.mockResolvedValue({
      criteria: [{ key: "payment", state: "missing", hint: "", offers: [] }],
    });
    const wrapper = mountNextSteps({
      id: "t-1",
      name: "1",
      supervisionLevel: "supervised",
    });
    await flushPromises();

    expect(unmarkedTexts(wrapper.element)).toEqual([]);
  });
});
