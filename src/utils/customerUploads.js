/**
 * Customer uploads (glossary "Kunden-Upload", in the UI „Nachweis“): the
 * tenant's settings and the upload fields of a bookable, as the backend
 * stores and checks them (`customer-upload-rules.js`). The messages under
 * the fields mirror the backend's refusals and nothing more.
 */

/** The formats a customer upload may ever have, in this order. */
export const CUSTOMER_UPLOAD_FORMATS = Object.freeze(["pdf", "jpeg", "png"]);

export const UPLOAD_FIELD_CATEGORIES = Object.freeze(["normal", "sensitive"]);
export const UPLOAD_FIELD_TIMINGS = Object.freeze([
  "checkout",
  "afterConfirmation",
]);

/** Biletado keeps a customer upload at most this long after the booking. */
export const MAX_RETENTION_DAYS = 30;
export const MIN_FILES_PER_FIELD = 1;
export const MAX_FILES_PER_FIELD = 5;

/** The instance limits when the instance does not name them. */
export const DEFAULT_CUSTOMER_UPLOAD_LIMITS = Object.freeze({
  maxFileSizeMb: 10,
  maxFilesPerBooking: 20,
  maxTotalSizeMbPerBooking: 100,
});

/** The tenant's settings when it has none stored yet. */
export function defaultCustomerUploadSettings() {
  return {
    enabled: false,
    formats: [...CUSTOMER_UPLOAD_FORMATS],
    retentionDays: MAX_RETENTION_DAYS,
    // To the booker, before the upload deadline of a missing required upload.
    reminderDaysBeforeDeadline: 3,
    // To the staff, before the automatic deletion of an unchecked upload.
    reviewReminderDaysBeforeDeletion: 3,
    notifyOnSubmitted: true,
    notifyOnOverdue: true,
  };
}

/** The tenant's settings, complete: what it stores over the defaults. */
export function customerUploadSettingsOf(tenant) {
  return {
    ...defaultCustomerUploadSettings(),
    ...(tenant?.customerUploads || {}),
  };
}

/** Whether the tenant has customer uploads enabled. */
export function customerUploadsEnabled(tenant) {
  return tenant?.customerUploads?.enabled === true;
}

/** The instance limits, from the public instance. */
export function customerUploadLimitsOf(instance) {
  return {
    ...DEFAULT_CUSTOMER_UPLOAD_LIMITS,
    ...(instance?.customerUploadLimits || {}),
  };
}

/** `formats` in the order of `CUSTOMER_UPLOAD_FORMATS`, without doubles. */
export function orderedFormats(formats) {
  const chosen = new Set(formats || []);
  return CUSTOMER_UPLOAD_FORMATS.filter((format) => chosen.has(format));
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `upload-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/**
 * A new upload field: its stable id, one file, every format the tenant
 * allows, the size limit of the instance, uploaded in the checkout.
 */
export function newUploadField(
  tenantFormats = CUSTOMER_UPLOAD_FORMATS,
  maxFileSizeMb = null
) {
  return {
    id: newId(),
    label: "",
    hint: "",
    consentText: "",
    required: false,
    maxFiles: MIN_FILES_PER_FIELD,
    formats: orderedFormats(tenantFormats),
    maxFileSizeMb,
    category: "normal",
    timing: "checkout",
    deadlineDaysBeforeStart: null,
  };
}

const isFilled = (value) =>
  value !== undefined && value !== null && value !== "";

const isWholeNumberIn = (value, min, max) =>
  isFilled(value) &&
  Number.isInteger(Number(value)) &&
  Number(value) >= min &&
  Number(value) <= max;

/**
 * Why the tenant's settings would be refused, as keys of the German
 * catalogue by field; empty while they are fine.
 */
export function customerUploadSettingsIssues(settings) {
  const issues = {};
  if (settings.enabled && !(settings.formats || []).length) {
    issues.formats = "tenant.customerUploads.validation.formats";
  }
  if (!isWholeNumberIn(settings.retentionDays, 0, MAX_RETENTION_DAYS)) {
    issues.retentionDays = "tenant.customerUploads.validation.retentionDays";
  }
  if (!isWholeNumberIn(settings.reminderDaysBeforeDeadline, 0, 365)) {
    issues.reminderDaysBeforeDeadline =
      "tenant.customerUploads.validation.reminderDays";
  }
  if (
    !isWholeNumberIn(
      settings.reviewReminderDaysBeforeDeletion,
      0,
      MAX_RETENTION_DAYS
    )
  ) {
    issues.reviewReminderDaysBeforeDeletion =
      "tenant.customerUploads.validation.reviewReminderDays";
  }
  return issues;
}

/**
 * Why an upload field would be refused, as keys of the German catalogue by
 * property; empty while it is fine.
 *
 * @param {Object} field
 * @param {{tenantFormats: string[], maxFileSizeMb: number}} context
 */
export function uploadFieldIssues(field, { tenantFormats, maxFileSizeMb }) {
  const issues = {};
  const key = (name) => `bookable.uploadFields.validation.${name}`;

  if (!String(field.label ?? "").trim()) {
    issues.label = key("label");
  }
  if (
    !isWholeNumberIn(field.maxFiles, MIN_FILES_PER_FIELD, MAX_FILES_PER_FIELD)
  ) {
    issues.maxFiles = key("maxFiles");
  }
  const formats = field.formats || [];
  if (!formats.length) {
    issues.formats = key("formatsEmpty");
  } else if (formats.some((format) => !tenantFormats.includes(format))) {
    issues.formats = key("formatsOutsideTenant");
  }
  if (isFilled(field.maxFileSizeMb)) {
    const size = Number(field.maxFileSizeMb);
    if (!Number.isFinite(size) || size <= 0) {
      issues.maxFileSizeMb = key("maxFileSize");
    } else if (size > maxFileSizeMb) {
      issues.maxFileSizeMb = key("maxFileSizeAboveInstance");
    }
  }
  if (
    field.timing === "afterConfirmation" &&
    isFilled(field.deadlineDaysBeforeStart) &&
    !isWholeNumberIn(field.deadlineDaysBeforeStart, 0, 365)
  ) {
    issues.deadlineDaysBeforeStart = key("deadline");
  }
  return issues;
}

/**
 * The states of an upload field at a booking, as the backend derives them
 * (`customer-upload-state.js`): never stored, read off the answer.
 */
export const PROOF_FIELD_STATES = Object.freeze([
  "open",
  "submitted",
  "rejected",
  "overdue",
  "fulfilled",
]);

/** Where the check of one customer upload stands. */
export const PROOF_REVIEW_STATES = Object.freeze([
  "submitted",
  "accepted",
  "rejected",
]);

const reviewOf = (upload) => upload.review?.status ?? "submitted";

/** Whether a customer upload waits for its check: not checked. */
const isWaiting = (upload) => reviewOf(upload) === "submitted";

/**
 * The upload fields of a booking with their customer uploads, as the
 * section „Nachweise“ of its page lists them; null
 * where there is nothing to list. The backend answers the state only to
 * whoever may read it (`manageBookings.readAny`, the tenant owner, not the
 * instance owner by the special position), so a missing state is the one
 * rule here - the page asks no right of its own.
 *
 * A customer upload can be downloaded and checked while it waits for its
 * check: the check deletes the file and leaves a note at the booking.
 * A fulfilled field can be asked for again
 * („Erneut anfordern“). The fields
 * the booking no longer shows - renamed away, deleted at the offer, closed
 * - follow under the label they had (`former`), so their notes stay
 * readable and what still waits can be checked.
 *
 * @param {Object} booking A booking answer with `customerUploadState`
 * @returns {Object[]|null} The fields, each with `canRequestAgain` and
 *   `uploads[].downloadable`, `uploads[].reviewable`
 */
export function proofFieldsOf(booking) {
  const state = booking?.customerUploadState;
  const fields = [
    ...(Array.isArray(state?.fields) ? state.fields : []),
    ...(Array.isArray(state?.otherFields) ? state.otherFields : []).map(
      (field) => ({ ...field, former: true })
    ),
  ];
  if (fields.length === 0) {
    return null;
  }
  return fields.map((field) => {
    const uploads = (field.uploads || []).map((upload) => {
      const waiting = Boolean(upload.mediaId) && isWaiting(upload);
      return { ...upload, downloadable: waiting, reviewable: waiting };
    });
    return {
      ...field,
      requests: field.requests || [],
      reopen: field.reopen ?? null,
      uploads,
      // Only a fulfilled field: one already open again asks for nothing new.
      canRequestAgain: !field.former && field.state === "fulfilled",
    };
  });
}

/**
 * The note of a checked customer upload (glossary „Vermerk“) as the section
 * lists it: result, reviewer, time, reason, and how the file went.
 *
 * @param {Object} upload An upload of `proofFieldsOf`
 * @returns {{result: string, reviewedByName: string, reviewedAt:
 *   number|null, reason: string}|null} Null while the upload waits for its
 *   check
 */
export function proofNoteOf(upload) {
  if (isWaiting(upload)) {
    return null;
  }
  const result = reviewOf(upload);
  return {
    result,
    reviewedByName: upload.review?.reviewedByName || "",
    reviewedAt: upload.review?.reviewedAt ?? null,
    reason: upload.review?.reason || "",
  };
}

/** The longest reason the backend takes for a rejection or a new request. */
export const MAX_PROOF_REASON_LENGTH = 500;

/**
 * The members of a series that have proofs to list, each with its fields,
 * in the order of the series; empty where none has any.
 *
 * @param {Object[]} members The member bookings of a group booking answer
 * @returns {{bookingId: string, booking: Object, fields: Object[]}[]}
 */
export function seriesProofsOf(members) {
  return (members || [])
    .map((booking) => ({
      bookingId: booking?.id,
      booking,
      fields: proofFieldsOf(booking),
    }))
    .filter((member) => member.bookingId && member.fields);
}

/*
 * The upload fields "in the checkout" of the legacy checkout:
 * the files go with the checkout of a single
 * booking, as multipart. The backend answers the fields with the public
 * offer (`checkoutUploadFields`), only while the tenant has customer
 * uploads on, each with the size limit that counts.
 */

const MEGABYTE = 1024 * 1024;

const FILE_FORMATS = Object.freeze({
  pdf: { mimeTypes: ["application/pdf"], extensions: ["pdf"] },
  jpeg: { mimeTypes: ["image/jpeg"], extensions: ["jpg", "jpeg"] },
  png: { mimeTypes: ["image/png"], extensions: ["png"] },
});

/** The upload fields the checkout of an offer asks for. */
export function checkoutUploadFieldsOf(bookable) {
  const fields = bookable?.checkoutUploadFields;
  return Array.isArray(fields) ? fields : [];
}

/** The `accept` attribute of a file input for the formats of a field. */
export function acceptOf(formats = []) {
  return formats
    .flatMap((format) => [
      ...(FILE_FORMATS[format]?.mimeTypes ?? []),
      ...(FILE_FORMATS[format]?.extensions ?? []).map((ext) => `.${ext}`),
    ])
    .join(",");
}

/** The formats of a field as the page names them: `PDF, JPEG`. */
export function formatsLabel(formats = []) {
  return formats.map((format) => format.toUpperCase()).join(", ");
}

/**
 * The format of a chosen file: by its type, by its extension where the
 * browser names no type. The backend decides by the content.
 */
export function formatOfFile(file) {
  const type = String(file?.type ?? "").toLowerCase();
  const extension = String(file?.name ?? "")
    .toLowerCase()
    .split(".")
    .pop();
  for (const [format, { mimeTypes, extensions }] of Object.entries(
    FILE_FORMATS
  )) {
    if (type ? mimeTypes.includes(type) : extensions.includes(extension)) {
      return format;
    }
  }
  return null;
}

/**
 * What the checkout checks before a file is added to a field, in the
 * backend's order and with its codes: size, number, format.
 *
 * @param {{ name?: string, type?: string, size: number }} file
 * @param {Object} field An upload field of {@link checkoutUploadFieldsOf}
 * @param {number} chosen The files already chosen for the field
 * @returns {{ code: string, params: Object }|null} Null when it may go
 */
export function precheckCheckoutUpload(file, field, chosen) {
  if (file.size > field.maxFileSizeMb * MEGABYTE) {
    return {
      code: "customer_upload_too_large",
      params: { maxFileSizeMb: field.maxFileSizeMb },
    };
  }
  if (chosen >= field.maxFiles) {
    return {
      code: "customer_upload_field_full",
      params: { maxFiles: field.maxFiles },
    };
  }
  if (!field.formats.includes(formatOfFile(file))) {
    return {
      code: "customer_upload_format_not_allowed",
      params: { formats: field.formats },
    };
  }
  return null;
}

/** The required upload fields of the checkout without a file. */
export function missingCheckoutUploads(fields, files) {
  return fields.filter(
    (field) => field.required && !(files?.[field.id]?.length > 0)
  );
}

/** Whether there is any file to send with the checkout. */
export function hasCheckoutUploads(files) {
  return Object.values(files || {}).some((chosen) => chosen?.length > 0);
}

/** The form field of a multipart checkout that carries its JSON body. */
export const CHECKOUT_BODY_FIELD = "checkout";
/** The prefix of a file's form field; the id of its upload field follows. */
export const CHECKOUT_FILE_PREFIX = "customerUpload:";

/**
 * The parts of a multipart checkout, in their order: the checkout as JSON,
 * then each file under its field.
 *
 * @returns {Array<[string, string|File]>}
 */
export function checkoutUploadParts(body, files) {
  const parts = [[CHECKOUT_BODY_FIELD, JSON.stringify(body)]];
  for (const [fieldId, chosen] of Object.entries(files || {})) {
    for (const file of chosen || []) {
      parts.push([`${CHECKOUT_FILE_PREFIX}${fieldId}`, file]);
    }
  }
  return parts;
}

const CHECKOUT_UPLOAD_REASONS = Object.freeze([
  "checkout.customer_upload_refused",
  "checkout.customer_upload_required",
]);

/**
 * A refused checkout as a refused customer upload: the legacy checkout's
 * answer `{ error: reason, params }` with the code in `params`, or the
 * refusal before the checkout (`{ code, params }`, e.g. the rate limit).
 *
 * @param {Object|string|null} data The body of the failed request
 * @returns {{ code: string, params: Object }|null} Null for any other
 */
export function checkoutUploadRefusalOf(data) {
  if (!data || typeof data !== "object") return null;
  const params = data.params ?? {};
  if (CHECKOUT_UPLOAD_REASONS.includes(data.error)) {
    return { code: params.code, params };
  }
  if (
    typeof data.code === "string" &&
    data.code.startsWith("customer_upload_")
  ) {
    return { code: data.code, params };
  }
  return null;
}

const CHECKOUT_UPLOAD_ERROR_KEYS = Object.freeze({
  customer_upload_format_not_allowed: "format",
  customer_upload_too_large: "size",
  customer_upload_field_full: "field-full",
  customer_upload_booking_limit: "booking-limit",
  customer_upload_virus_found: "virus",
  customer_upload_scanner_unavailable: "scanner",
  customer_upload_rate_limited: "rate-limit",
  customer_upload_file_missing: "file-missing",
  customer_upload_field_not_found: "not-found",
  customer_upload_required_missing: "required-missing",
});

/** The German message key of a refused customer upload of the checkout. */
export function checkoutUploadErrorKey(code) {
  return `checkout.customer-uploads.errors.${
    CHECKOUT_UPLOAD_ERROR_KEYS[code] ?? "generic"
  }`;
}

