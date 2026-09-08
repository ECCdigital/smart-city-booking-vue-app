import { describe, expect, it } from "vitest";
import {
  createLockAndAccessAppDefaults,
  findTenantApp,
  LOCK_AND_ACCESS_APP_IDS,
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
