import { describe, expect, it } from "vitest";
import {
  createLockAndAccessAppDefaults,
  findTenantApp,
  LOCK_AND_ACCESS_APP_IDS,
  withoutUnchangedSecrets,
} from "@/utilities/access-apps";

/**
 * A backend migration rewrote Pareva and iFBS from `type: "locker"` to
 * `"access"`, and the tenant application schema no longer knows the old
 * value. A default that still carries `"locker"` travels back on the next
 * save of the tenant page and takes the app out of the backend's sight.
 * There is no fallback: an unmigrated tenant reads as "not configured".
 */
describe("lock and access app defaults", () => {
  it("declares every provider as an access application", () => {
    const defaults = createLockAndAccessAppDefaults();

    LOCK_AND_ACCESS_APP_IDS.forEach((id) => {
      expect(defaults[id].type).toBe("access");
    });
  });

  it("keeps the provider-specific fields of the locker systems", () => {
    const defaults = createLockAndAccessAppDefaults();

    expect(defaults.pareva).toMatchObject({
      id: "pareva",
      lockerId: "",
      active: false,
    });
    expect(defaults.ifbs).toMatchObject({
      id: "ifbs",
      apiKeyID: "",
      active: false,
    });
  });

  /**
   * Open Locker is the fifth provider (ECCdigital/tickets#970): the tenant's
   * technical account on its Open Locker instance - server, e-mail and
   * password, the password stored encrypted by the backend like Pareva's.
   */
  it("knows Open Locker with the technical account's fields", () => {
    expect(LOCK_AND_ACCESS_APP_IDS).toContain("open-locker");
    expect(createLockAndAccessAppDefaults()["open-locker"]).toEqual({
      type: "access",
      id: "open-locker",
      title: "Open Locker",
      serverUrl: "",
      email: "",
      password: "",
      active: false,
    });
  });

  /**
   * The storefront shows the provider's customer service below the open
   * button of a door. The backend keeps `customerService` on every access
   * application, but the admin form only writes it for the providers whose
   * defaults carry it - iFBS and Nuki. Pareva, Salto KS and Open Locker
   * deliberately stay without one.
   */
  it("gives iFBS and Nuki an empty customer service, the others none", () => {
    const defaults = createLockAndAccessAppDefaults();
    const empty = { name: "", email: "", phone: "" };

    expect(defaults.ifbs.customerService).toEqual(empty);
    expect(defaults.nuki.customerService).toEqual(empty);
    expect(defaults.pareva).not.toHaveProperty("customerService");
    expect(defaults["salto-ks"]).not.toHaveProperty("customerService");
    expect(defaults["open-locker"]).not.toHaveProperty("customerService");
  });

  // A tenant that sets Salto KS up anew starts on the real installation,
  // not on the sandbox (ECCdigital/tickets#508).
  it("starts a new Salto KS setup on production", () => {
    expect(createLockAndAccessAppDefaults()["salto-ks"].environment).toBe(
      "production"
    );
  });
});

/**
 * The reading half of the same cut. The backend hands an unmigrated
 * `type: "locker"` application back untouched - its provider layer does not
 * see it, so taking it into the form would only write the dead type out
 * again on the next save.
 */
describe("finding a stored tenant application", () => {
  it("finds the application of an access provider", () => {
    const stored = [
      { id: "invoice", type: "payment" },
      { id: "pareva", type: "access", serverUrl: "https://p" },
    ];

    expect(findTenantApp(stored, "pareva")).toMatchObject({
      serverUrl: "https://p",
    });
  });

  it("finds the Open Locker application", () => {
    const stored = [
      { id: "open-locker", type: "access", email: "technik@example.org" },
    ];

    expect(findTenantApp(stored, "open-locker")).toMatchObject({
      email: "technik@example.org",
    });
  });

  it("does not count an unmigrated locker application as stored", () => {
    const stored = [{ id: "pareva", type: "locker", serverUrl: "https://p" }];

    expect(findTenantApp(stored, "pareva")).toBeUndefined();
  });

  it("finds a payment application by id alone", () => {
    const stored = [{ id: "invoice", type: "payment", iban: "DE1" }];

    expect(findTenantApp(stored, "invoice")).toMatchObject({ iban: "DE1" });
  });

  it("answers undefined when the tenant has no applications", () => {
    expect(findTenantApp(undefined, "pareva")).toBeUndefined();
  });
});

/**
 * The Open Locker password travels like Pareva's: the backend hands it back
 * decrypted and the form holds it, so a save sends what the field shows and
 * the backend encrypts it again. Only the secrets the backend withholds -
 * Nuki's token, Salto KS's client secret and password - are left out when
 * empty.
 */
describe("the secrets of a save", () => {
  it("sends the Open Locker password as the form holds it", () => {
    const app = {
      ...createLockAndAccessAppDefaults()["open-locker"],
      password: "geheim",
    };

    expect(withoutUnchangedSecrets(app)).toEqual(app);
  });
});
