import { describe, expect, it } from "vitest";
import {
  customerProofErrorKey,
  customerProofFieldView,
  customerProofLinkRefusalOf,
  customerUploadLinkTarget,
  precheckCustomerProof,
} from "@/utils/customerUploads";

// A token as the backend signs it: base64url(JSON {t, b}) "." signature.
const tokenOf = (payload, signature = "c2lnbmF0dXJl") =>
  `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;

const NOW = Date.UTC(2026, 10, 12, 12);
const DAY = 24 * 60 * 60 * 1000;

const field = (overrides = {}) => ({
  fieldId: "f1",
  label: "Vereinsausweis",
  required: true,
  category: "normal",
  formats: ["pdf"],
  maxFiles: 3,
  maxFileSizeMb: 10,
  timing: "afterConfirmation",
  deadline: NOW + 10 * DAY,
  pastDeadline: false,
  state: "open",
  reopen: null,
  remainingFiles: 3,
  uploads: [],
  ...overrides,
});

describe("customerUploadLinkTarget", () => {
  it("reads tenant and booking off the link", () => {
    expect(
      customerUploadLinkTarget(tokenOf({ t: "tn", b: "ABCD-EFGH" }))
    ).toEqual({ tenantId: "tn", bookingId: "ABCD-EFGH" });
  });

  it("reads a tenant with umlauts", () => {
    expect(
      customerUploadLinkTarget(tokenOf({ t: "süderbrarup", b: "B1" }))
    ).toEqual({ tenantId: "süderbrarup", bookingId: "B1" });
  });

  it.each([
    ["no link", ""],
    ["no signature", "abc"],
    ["too many parts", "a.b.c"],
    ["no JSON", "bm9qc29u.sig"],
    ["no booking", tokenOf({ t: "tn" })],
  ])("names nothing for %s", (_, link) => {
    expect(customerUploadLinkTarget(link)).toBeNull();
  });
});

describe("customerProofFieldView", () => {
  it("shows an open field with its deadline and room for a file", () => {
    const view = customerProofFieldView(field(), NOW);

    expect(view.labelKey).toBe("customer-proofs.state.open");
    expect(view.labelParams.days).toBe(10);
    expect(view.canUpload).toBe(true);
    expect(view.color).toBe("grey");
  });

  it("warns of a deadline close by", () => {
    const view = customerProofFieldView(
      field({ deadline: NOW + 2 * DAY }),
      NOW
    );
    expect(view.color).toBe("warning");
  });

  it("names no deadline for a proof before the release", () => {
    const view = customerProofFieldView(
      field({ timing: "beforeRelease", deadline: null }),
      NOW
    );
    expect(view.labelKey).toBe("customer-proofs.state.open-before-release");
  });

  it("lists the files waiting for their check", () => {
    const waiting = { mediaId: "m1", review: { status: "submitted" } };
    const checked = { mediaId: "m0", review: { status: "accepted" } };
    const view = customerProofFieldView(
      field({ state: "submitted", uploads: [checked, waiting] }),
      NOW
    );
    expect(view.labelKey).toBe("customer-proofs.state.submitted");
    expect(view.pendingUploads).toEqual([waiting]);
  });

  it("names the reason of a rejection and of „Erneut anfordern“", () => {
    const rejected = customerProofFieldView(
      field({
        state: "rejected",
        uploads: [
          {
            mediaId: "",
            review: {
              status: "rejected",
              reason: "Unleserlich",
              reviewedAt: 1,
            },
          },
        ],
      }),
      NOW
    );
    expect(rejected.reason).toBe("Unleserlich");
    expect(rejected.reasonKey).toBe("customer-proofs.rejection-reason");

    const again = customerProofFieldView(
      field({
        state: "rejected",
        reopen: { kind: "requestedAgain", reason: "Abgelaufen" },
      }),
      NOW
    );
    expect(again.labelKey).toBe("customer-proofs.state.requested-again");
    expect(again.reason).toBe("Abgelaufen");
  });

  it("takes no file for a fulfilled field", () => {
    const view = customerProofFieldView(
      field({
        state: "fulfilled",
        uploads: [
          {
            mediaId: "m1",
            review: { status: "accepted", reviewedAt: NOW, fileDeleted: true },
          },
        ],
      }),
      NOW
    );
    expect(view.canUpload).toBe(false);
    expect(view.labelKey).toBe("customer-proofs.state.fulfilled");
  });

  it("hints that an overdue field still takes a file", () => {
    const view = customerProofFieldView(field({ state: "overdue" }), NOW);
    expect(view.lateHint).toBe(true);
    expect(view.canUpload).toBe(true);
  });
});

describe("precheckCustomerProof", () => {
  const pdf = (size = 1000) => ({
    name: "a.pdf",
    type: "application/pdf",
    size,
  });

  it("lets a fitting file go", () => {
    expect(precheckCustomerProof(pdf(), field())).toBeNull();
  });

  it("refuses a file too large, of another format, or without room", () => {
    expect(precheckCustomerProof(pdf(11 * 1024 * 1024), field()).code).toBe(
      "customer_upload_too_large"
    );
    expect(
      precheckCustomerProof(
        { name: "a.png", type: "image/png", size: 1 },
        field()
      ).code
    ).toBe("customer_upload_format_not_allowed");
    expect(
      precheckCustomerProof(pdf(), field({ remainingFiles: 0 })).code
    ).toBe("customer_upload_field_full");
  });

  it("takes a replacement into a full field", () => {
    expect(
      precheckCustomerProof(pdf(), field({ remainingFiles: 0 }), {
        replacing: true,
      })
    ).toBeNull();
  });
});

describe("the refusals of the page", () => {
  it("names a message per code, a generic one for any other", () => {
    expect(customerProofErrorKey("customer_upload_virus_found")).toBe(
      "customer-proofs.errors.virus"
    );
    expect(customerProofErrorKey("whatever")).toBe(
      "customer-proofs.errors.generic"
    );
  });

  it("tells an expired link from an invalid one", () => {
    expect(customerProofLinkRefusalOf("customer_upload_link_expired")).toBe(
      "expired"
    );
    expect(customerProofLinkRefusalOf("customer_upload_link_invalid")).toBe(
      "invalid"
    );
    expect(customerProofLinkRefusalOf(undefined)).toBe("error");
  });
});
