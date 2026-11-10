import { describe, expect, it } from "vitest";
import {
  customerUploadLimitsOf,
  customerUploadSettingsIssues,
  customerUploadSettingsOf,
  customerUploadsEnabled,
  newUploadField,
  orderedFormats,
  proofFieldsOf,
  proofNoteOf,
  seriesProofsOf,
  uploadFieldIssues,
} from "@/utils/customerUploads";

const CONTEXT = { tenantFormats: ["pdf", "png"], maxFileSizeMb: 10 };
const field = (overrides = {}) => ({
  ...newUploadField(["pdf"]),
  label: "Vereinsausweis",
  ...overrides,
});

describe("customerUploads - the tenant's settings", () => {
  it("reads a tenant without settings as off, every format, 30 days and both mails", () => {
    expect(customerUploadSettingsOf({})).toEqual({
      enabled: false,
      formats: ["pdf", "jpeg", "png"],
      retentionDays: 30,
      reminderDaysBeforeDeadline: 3,
      reviewReminderDaysBeforeDeletion: 3,
      notifyOnSubmitted: true,
      notifyOnOverdue: true,
    });
    expect(customerUploadsEnabled({})).toBe(false);
    expect(customerUploadsEnabled(null)).toBe(false);
  });

  it("is enabled only by the tenant's switch", () => {
    expect(customerUploadsEnabled({ customerUploads: { enabled: true } })).toBe(
      true
    );
  });

  it("refuses a retention over 30 days and enabling without a format", () => {
    const settings = {
      ...customerUploadSettingsOf({}),
      enabled: true,
      formats: [],
      retentionDays: 31,
      reviewReminderDaysBeforeDeletion: 31,
    };

    expect(customerUploadSettingsIssues(settings)).toEqual({
      formats: "tenant.customerUploads.validation.formats",
      retentionDays: "tenant.customerUploads.validation.retentionDays",
      reviewReminderDaysBeforeDeletion:
        "tenant.customerUploads.validation.reviewReminderDays",
    });
  });

  it("takes a shorter retention", () => {
    expect(
      customerUploadSettingsIssues({
        ...customerUploadSettingsOf({}),
        retentionDays: 7,
      })
    ).toEqual({});
  });
});

describe("customerUploads - the instance limits", () => {
  it("default to 10 MB a file, 20 files and 100 MB a booking", () => {
    expect(customerUploadLimitsOf(null)).toEqual({
      maxFileSizeMb: 10,
      maxFilesPerBooking: 20,
      maxTotalSizeMbPerBooking: 100,
    });
  });

  it("are the instance's where it names them", () => {
    expect(
      customerUploadLimitsOf({ customerUploadLimits: { maxFileSizeMb: 4 } })
        .maxFileSizeMb
    ).toBe(4);
  });
});

describe("customerUploads - an upload field", () => {
  it("orders formats as PDF, JPEG, PNG without doubles", () => {
    expect(orderedFormats(["png", "pdf", "png"])).toEqual(["pdf", "png"]);
  });

  it("gets a different id each time", () => {
    expect(newUploadField().id).not.toBe(newUploadField().id);
  });

  it("is fine with every property of the spec", () => {
    expect(
      uploadFieldIssues(
        field({
          required: true,
          maxFiles: 5,
          formats: ["pdf", "png"],
          maxFileSizeMb: 10,
          category: "sensitive",
          timing: "afterConfirmation",
          deadlineDaysBeforeStart: 3,
        }),
        CONTEXT
      )
    ).toEqual({});
  });

  it("names each refusal of the backend at its property", () => {
    expect(
      uploadFieldIssues(
        field({
          label: " ",
          maxFiles: 6,
          formats: ["jpeg"],
          maxFileSizeMb: 11,
          timing: "afterConfirmation",
          deadlineDaysBeforeStart: -1,
        }),
        CONTEXT
      )
    ).toEqual({
      label: "bookable.uploadFields.validation.label",
      maxFiles: "bookable.uploadFields.validation.maxFiles",
      formats: "bookable.uploadFields.validation.formatsOutsideTenant",
      maxFileSizeMb:
        "bookable.uploadFields.validation.maxFileSizeAboveInstance",
      deadlineDaysBeforeStart: "bookable.uploadFields.validation.deadline",
    });
  });

  it("needs a format and at least one file", () => {
    expect(
      uploadFieldIssues(field({ formats: [], maxFiles: 0 }), CONTEXT)
    ).toEqual({
      formats: "bookable.uploadFields.validation.formatsEmpty",
      maxFiles: "bookable.uploadFields.validation.maxFiles",
    });
  });
});

const upload = (status, overrides = {}) => ({
  mediaId: `m-${status}`,
  originalFileName: `${status}.pdf`,
  mimeType: "application/pdf",
  uploadedAt: 1,
  review: { status, reason: "", reviewedAt: null },
  ...overrides,
});
const proofField = (overrides = {}) => ({
  fieldId: "field-proof",
  label: "Vereinsausweis",
  required: true,
  state: "submitted",
  deadline: null,
  uploads: [],
  ...overrides,
});
const withState = (fields, id = "B1") => ({
  id,
  customerUploadState: { state: "toReview", fields },
});

describe("customerUploads - the section „Nachweise“ of a booking page", () => {
  it("lists nothing where the answer carries no state: no right, or no customer uploads", () => {
    expect(proofFieldsOf({ id: "B1" })).toBe(null);
    expect(proofFieldsOf({ id: "B1", customerUploadState: null })).toBe(null);
    expect(proofFieldsOf(null)).toBe(null);
  });

  it("lists nothing where the booked offers have no upload field", () => {
    expect(
      proofFieldsOf({ customerUploadState: { state: null, fields: [] } })
    ).toBe(null);
  });

  it("lists each field with its uploads, a file waiting for its check downloadable", () => {
    const [field] = proofFieldsOf(
      withState([
        proofField({
          uploads: [
            upload("submitted"),
            upload("accepted"),
            upload("rejected"),
          ],
        }),
      ])
    );

    expect(field.label).toBe("Vereinsausweis");
    expect(field.uploads.map((u) => u.downloadable)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("keeps the category of a field, so „besonders schutzwürdig“ can be marked", () => {
    const [sensitive, normal] = proofFieldsOf(
      withState([
        proofField({ fieldId: "id-card", category: "sensitive" }),
        proofField({ fieldId: "club", category: "normal" }),
      ])
    );

    expect(sensitive.category).toBe("sensitive");
    expect(normal.category).toBe("normal");
  });

  it("offers no download for an upload without a medium", () => {
    const [field] = proofFieldsOf(
      withState([
        proofField({ uploads: [upload("submitted", { mediaId: null })] }),
      ])
    );

    expect(field.uploads[0].downloadable).toBe(false);
  });

  it("lists the members of a series that carry proofs, in their order", () => {
    const members = [
      withState([proofField()], "B1"),
      { id: "B2", customerUploadState: null },
      withState([proofField({ state: "open" })], "B3"),
    ];

    expect(seriesProofsOf(members).map((m) => m.bookingId)).toEqual([
      "B1",
      "B3",
    ]);
    expect(seriesProofsOf([{ id: "B2" }])).toEqual([]);
    expect(seriesProofsOf(undefined)).toEqual([]);
  });
});

describe("customerUploads - checking a proof (ECCdigital/tickets#826)", () => {
  it("offers the check for a file that waits, not for a note", () => {
    const [field] = proofFieldsOf(
      withState([
        proofField({ uploads: [upload("submitted"), upload("rejected")] }),
      ])
    );

    expect(field.uploads.map((u) => u.reviewable)).toEqual([true, false]);
    expect(field.canRequestAgain).toBe(false);
  });

  it("offers „Erneut anfordern“ at a fulfilled field alone", () => {
    const [fulfilled] = proofFieldsOf(
      withState([
        proofField({ state: "fulfilled", uploads: [upload("accepted")] }),
      ])
    );
    const [waiting] = proofFieldsOf(
      withState([
        proofField({ uploads: [upload("accepted"), upload("submitted")] }),
      ])
    );
    const [openAgain] = proofFieldsOf(
      withState([
        proofField({
          state: "rejected",
          uploads: [upload("accepted"), upload("rejected")],
        }),
      ])
    );

    expect(fulfilled.canRequestAgain).toBe(true);
    expect(waiting.canRequestAgain).toBe(false);
    expect(openAgain.canRequestAgain).toBe(false);
  });

  it("lists the notes of a field renamed away or deleted under its old label", () => {
    const fields = proofFieldsOf({
      customerUploadState: {
        state: null,
        fields: [],
        otherFields: [
          {
            fieldId: "gone",
            label: "Alter Ausweis",
            uploads: [upload("accepted"), upload("submitted")],
            requests: [],
          },
        ],
      },
    });

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ label: "Alter Ausweis", former: true });
    expect(fields[0].uploads.map((u) => u.reviewable)).toEqual([false, true]);
    expect(fields[0].canRequestAgain).toBe(false);
  });

  it("reads the note of a checked upload: result, reviewer, time, reason, deletion", () => {
    expect(proofNoteOf(upload("submitted"))).toBe(null);
    expect(
      proofNoteOf(
        upload("rejected", {
          review: {
            status: "rejected",
            reason: "Unleserlich",
            reviewedAt: 5,
            reviewedByName: "Sabine Sachbearbeiterin",
            autoDeleted: false,
          },
        })
      )
    ).toEqual({
      result: "rejected",
      reviewedByName: "Sabine Sachbearbeiterin",
      reviewedAt: 5,
      reason: "Unleserlich",
      autoDeleted: false,
    });
  });

  it("hands each member of a series to its own checks", () => {
    const member = withState([proofField()], "B1");
    expect(seriesProofsOf([member])[0].booking).toBe(member);
  });
});

