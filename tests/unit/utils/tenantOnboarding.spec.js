import { describe, expect, it } from "vitest";
import {
  completionVariant,
  contactPrefill,
  creationErrorMessage,
  creationFieldErrorKey,
  findCreatedTenant,
  firstBookableRoute,
  isFormallyValidMail,
  showsSupervisionNotice,
  tenantCreationError,
  tenantTabRoute,
} from "@/utils/tenantOnboarding";

describe("supervision levels", () => {
  it("names the closing action per level", () => {
    expect(completionVariant("free")).toBe("free");
    expect(completionVariant("supervised")).toBe("supervised");
    expect(completionVariant("pending")).toBe("pending");
    expect(completionVariant("declined")).toBe("declined");
  });

  it("reads a missing or unknown level as free, the default of the backend", () => {
    expect(completionVariant(undefined)).toBe("free");
    expect(completionVariant("whatever")).toBe("free");
  });

  it("explains the supervision for every level but free", () => {
    expect(showsSupervisionNotice("free")).toBe(false);
    expect(showsSupervisionNotice(undefined)).toBe(false);
    expect(showsSupervisionNotice("supervised")).toBe(true);
    expect(showsSupervisionNotice("pending")).toBe(true);
    expect(showsSupervisionNotice("declined")).toBe(true);
  });
});

describe("findCreatedTenant", () => {
  it("picks the tenant that is new since the creation and carries the name", () => {
    const before = [{ id: "a", name: "Verein" }];
    const after = [
      { id: "a", name: "Verein" },
      { id: "c", name: "Anderer" },
      { id: "b", name: "Verein" },
    ];

    expect(findCreatedTenant(before, after, " Verein ")).toEqual({
      id: "b",
      name: "Verein",
    });
  });

  it("answers null when the list shows no new tenant of that name", () => {
    expect(findCreatedTenant([], [{ id: "a", name: "X" }], "Y")).toBeNull();
  });
});

describe("tenantCreationError", () => {
  const refused = (status, data = {}, headers = {}) => ({
    response: { status, data, headers },
  });

  it("reads the wait of a hit creation limit from Retry-After", () => {
    expect(
      tenantCreationError(refused(429, {}, { "retry-after": "5400" }))
    ).toEqual({ key: "rate-limited", wait: "1 Std. 30 Min." });
    expect(
      tenantCreationError(refused(429, { params: { retryAfterSeconds: 60 } }))
    ).toEqual({ key: "rate-limited", wait: "1 Min." });
  });

  it("points to the fitting verification path", () => {
    expect(
      tenantCreationError(
        refused(403, {
          code: "email_verification_required",
          params: { method: "email" },
        })
      ).key
    ).toBe("verification-mail");
    expect(
      tenantCreationError(
        refused(403, {
          code: "email_verification_required",
          params: { method: "identity_provider" },
        })
      ).key
    ).toBe("verification-identity-provider");
  });

  it("names the tenant cap and the field of a 400", () => {
    expect(
      tenantCreationError(refused(409, { code: "max_tenants_reached" })).key
    ).toBe("max-tenants");
    expect(
      tenantCreationError(
        refused(400, { code: "invalid_mail", params: { field: "mail" } })
      )
    ).toEqual({ key: "field", field: "mail" });
  });

  it("falls back to the generic failure", () => {
    expect(tenantCreationError(new Error("offline")).key).toBe("generic");
    expect(tenantCreationError(refused(403, { code: "forbidden" })).key).toBe(
      "generic"
    );
  });
});

describe("creationErrorMessage", () => {
  it("names the wait of a hit limit, or says later without one", () => {
    expect(
      creationErrorMessage({ key: "rate-limited", wait: "2 Min." })
    ).toEqual({
      key: "tenant.onboarding.errors.rate-limited",
      params: { wait: "2 Min." },
    });
    expect(creationErrorMessage({ key: "rate-limited", wait: "" }).key).toBe(
      "tenant.onboarding.errors.rate-limited-unknown"
    );
  });

  it("answers nothing without an error", () => {
    expect(creationErrorMessage(null)).toBeNull();
  });
});

describe("creationFieldErrorKey", () => {
  it("marks only the field the backend named", () => {
    const error = { key: "field", field: "mail" };
    expect(creationFieldErrorKey(error, "mail")).toBe(
      "tenant.onboarding.errors.mail-invalid"
    );
    expect(creationFieldErrorKey(error, "name")).toBeNull();
    expect(
      creationFieldErrorKey(
        { key: "field", field: "contactName" },
        "contactName"
      )
    ).toBe("tenant.onboarding.offer.errors.required");
    expect(creationFieldErrorKey({ key: "generic" }, "mail")).toBeNull();
  });
});

describe("isFormallyValidMail", () => {
  it("accepts what the backend accepts, surrounding whitespace included", () => {
    expect(isFormallyValidMail("erika@example.org")).toBe(true);
    expect(isFormallyValidMail(" erika@example.org ")).toBe(true);
  });

  it("refuses an empty, incomplete or spaced address", () => {
    [
      "",
      null,
      undefined,
      "erika",
      "erika@example",
      "e rika@example.org",
    ].forEach((value) => expect(isFormallyValidMail(value)).toBe(false));
  });
});

describe("contactPrefill", () => {
  it("takes contact person and mail from the user account", () => {
    expect(
      contactPrefill({
        id: "erika@example.org",
        firstName: "Erika",
        lastName: "Muster",
      })
    ).toEqual({ contactName: "Erika Muster", mail: "erika@example.org" });
  });

  it("stays empty without an account", () => {
    expect(contactPrefill(null)).toEqual({ contactName: "", mail: "" });
  });
});

describe("firstBookableRoute", () => {
  it("opens the guided flow of a new bookable", () => {
    expect(firstBookableRoute()).toEqual({ name: "room-edit" });
  });
});

describe("tenantTabRoute", () => {
  it("opens the tenant settings at a tab, on their own", () => {
    expect(tenantTabRoute("payments")).toEqual({
      name: "tenant",
      query: { tab: "payments" },
    });
  });
});
