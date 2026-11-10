import { describe, expect, it } from "vitest";
import {
  checkoutUploadErrorKey,
  checkoutUploadFieldsOf,
  checkoutUploadParts,
  checkoutUploadRefusalOf,
  formatOfFile,
  hasCheckoutUploads,
  missingCheckoutUploads,
  precheckCheckoutUpload,
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
  PROOF_STATE,
  filterBookingsByProofState,
  mostUrgentProofStateOf,
  openProofCountOf,
  openProofCountOfAll,
  proofStateMarker,
  proofStatesOf,
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
      notifyRoleIds: [],
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

describe("customerUploads - the upload fields of the legacy checkout (ECCdigital/tickets#827)", () => {
  const MB = 1024 * 1024;
  const checkoutField = (overrides = {}) => ({
    id: "f1",
    label: "Vereinsausweis",
    hint: "",
    consentText: "",
    required: true,
    maxFiles: 2,
    formats: ["pdf", "jpeg"],
    maxFileSizeMb: 1,
    ...overrides,
  });
  const pdf = (size = 1000, name = "ausweis.pdf") => ({
    name,
    type: "application/pdf",
    size,
  });

  it("reads the fields off the public offer, none where it names none", () => {
    expect(
      checkoutUploadFieldsOf({ checkoutUploadFields: [checkoutField()] })
    ).toHaveLength(1);
    expect(checkoutUploadFieldsOf({})).toEqual([]);
    expect(checkoutUploadFieldsOf(undefined)).toEqual([]);
  });

  it("reads the format off the type, else off the extension", () => {
    expect(formatOfFile({ name: "a.JPG", type: "" })).toBe("jpeg");
    expect(formatOfFile({ name: "a.bin", type: "image/png" })).toBe("png");
    expect(formatOfFile({ name: "a.txt", type: "text/plain" })).toBeNull();
  });

  it("checks size, number and format before a file is taken", () => {
    const f = checkoutField();
    expect(precheckCheckoutUpload(pdf(), f, 0)).toBeNull();
    expect(precheckCheckoutUpload(pdf(2 * MB), f, 0).code).toBe(
      "customer_upload_too_large"
    );
    expect(precheckCheckoutUpload(pdf(), f, 2).code).toBe(
      "customer_upload_field_full"
    );
    expect(
      precheckCheckoutUpload(
        { name: "a.png", type: "image/png", size: 1 },
        f,
        0
      ).code
    ).toBe("customer_upload_format_not_allowed");
  });

  it("names the required fields without a file", () => {
    const fields = [
      checkoutField(),
      checkoutField({ id: "f2", required: false }),
    ];
    expect(missingCheckoutUploads(fields, {}).map((f) => f.id)).toEqual(["f1"]);
    expect(missingCheckoutUploads(fields, { f1: [pdf()] })).toEqual([]);
  });

  it("puts the checkout as JSON first, then each file under its field", () => {
    const a = pdf(10, "a.pdf");
    expect(checkoutUploadParts({ mail: "x" }, { f1: [a], f2: [] })).toEqual([
      ["checkout", JSON.stringify({ mail: "x" })],
      ["customerUpload:f1", a],
    ]);
    expect(hasCheckoutUploads({ f1: [a] })).toBe(true);
    expect(hasCheckoutUploads({ f1: [] })).toBe(false);
  });

  it("reads a refused customer upload off the legacy checkout's answer", () => {
    expect(
      checkoutUploadRefusalOf({
        error: "checkout.customer_upload_refused",
        params: { code: "customer_upload_virus_found", fieldId: "f1" },
      }).code
    ).toBe("customer_upload_virus_found");
    expect(
      checkoutUploadRefusalOf({
        error: "checkout.customer_upload_required",
        params: { code: "customer_upload_required_missing", labels: ["A"] },
      }).code
    ).toBe("customer_upload_required_missing");
    expect(
      checkoutUploadRefusalOf({
        error: "TooManyRequestsError",
        code: "customer_upload_rate_limited",
      }).code
    ).toBe("customer_upload_rate_limited");
    expect(checkoutUploadRefusalOf("Booking conflict")).toBeNull();
    expect(
      checkoutUploadRefusalOf({ error: "checkout.address_blacklisted" })
    ).toBeNull();
  });

  it("has a message for every refusal, a generic one for the unknown", () => {
    expect(checkoutUploadErrorKey("customer_upload_virus_found")).toBe(
      "checkout.customer-uploads.errors.virus"
    );
    expect(checkoutUploadErrorKey("something_else")).toBe(
      "checkout.customer-uploads.errors.generic"
    );
  });
});

describe("customerUploads - the proof chips (ECCdigital/tickets#831)", () => {
  const proofField = (state, overrides = {}) => ({
    fieldId: `field-${state}-${Math.random()}`,
    required: true,
    state,
    pastDeadline: false,
    ...overrides,
  });
  const withFields = (fields, state = null) => ({
    id: "b-1",
    customerUploadState: { state, fields, otherFields: [] },
  });

  it("has no chip without a state", () => {
    expect(proofStatesOf({ id: "b-1" })).toEqual([]);
    expect(proofStatesOf({ id: "b-1", customerUploadState: null })).toEqual([]);
    expect(proofStatesOf(null)).toEqual([]);
    expect(mostUrgentProofStateOf({ id: "b-1" })).toBeNull();
  });

  it("has no chip without required fields or when all are fulfilled", () => {
    expect(
      proofStatesOf(withFields([proofField("open", { required: false })]))
    ).toEqual([]);
    expect(
      proofStatesOf(withFields([proofField("fulfilled")], "fulfilled"))
    ).toEqual([]);
  });

  it("orders the chips overdue, missing, to review", () => {
    const booking = withFields([
      proofField("submitted"),
      proofField("open"),
      proofField("overdue"),
      proofField("submitted"),
    ]);
    expect(proofStatesOf(booking)).toEqual([
      PROOF_STATE.OVERDUE,
      PROOF_STATE.MISSING,
      PROOF_STATE.TO_REVIEW,
    ]);
    expect(mostUrgentProofStateOf(booking)).toBe(PROOF_STATE.OVERDUE);
  });

  it("takes the most urgent chip in each order of the fields", () => {
    expect(
      mostUrgentProofStateOf(
        withFields([proofField("submitted"), proofField("rejected")])
      )
    ).toBe(PROOF_STATE.MISSING);
    expect(
      mostUrgentProofStateOf(
        withFields([proofField("fulfilled"), proofField("submitted")])
      )
    ).toBe(PROOF_STATE.TO_REVIEW);
  });

  it("counts an open or rejected field past its deadline as overdue", () => {
    expect(
      proofStatesOf(
        withFields([proofField("rejected", { pastDeadline: true })])
      )
    ).toEqual([PROOF_STATE.OVERDUE]);
  });

  it("falls back on the booking's state when no fields are answered", () => {
    expect(proofStatesOf(withFields([], "toReview"))).toEqual([
      PROOF_STATE.TO_REVIEW,
    ]);
  });

  it("presents each chip with a label key and none for fulfilled", () => {
    expect(proofStateMarker(PROOF_STATE.OVERDUE)).toMatchObject({
      labelKey: "booking.proofState.marker.overdue",
      color: "error",
    });
    expect(proofStateMarker(PROOF_STATE.FULFILLED)).toBeNull();
    expect(proofStateMarker(null)).toBeNull();
  });

  it("filters the bookings with any chip among the selection", () => {
    const missing = { ...withFields([proofField("open")]), id: "missing" };
    const review = { ...withFields([proofField("submitted")]), id: "review" };
    const none = { id: "none" };
    expect(
      filterBookingsByProofState(
        [missing, review, none],
        [PROOF_STATE.TO_REVIEW]
      ).map((b) => b.id)
    ).toEqual(["review"]);
  });

  it("counts the proofs open or unchecked for the release", () => {
    const booking = withFields([
      proofField("open"),
      proofField("rejected"),
      proofField("overdue"),
      proofField("fulfilled"),
      proofField("submitted", { required: false }),
      proofField("open", { required: false }),
    ]);
    expect(openProofCountOf(booking)).toBe(4);
    expect(openProofCountOf({ id: "b-2" })).toBe(0);
    expect(
      openProofCountOfAll([booking, withFields([proofField("submitted")])])
    ).toBe(5);
    expect(openProofCountOfAll(undefined)).toBe(0);
  });
});

