import { describe, expect, it } from "vitest";
import {
  customerUploadLimitsOf,
  customerUploadSettingsIssues,
  customerUploadSettingsOf,
  customerUploadsEnabled,
  newUploadField,
  orderedFormats,
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
