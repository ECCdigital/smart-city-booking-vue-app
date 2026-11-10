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
 * A customer upload can be downloaded while it waits for its check.
 *
 * @param {Object} booking A booking answer with `customerUploadState`
 * @returns {Object[]|null} The fields, each with `uploads[].downloadable`
 */
export function proofFieldsOf(booking) {
  const state = booking?.customerUploadState;
  const fields = Array.isArray(state?.fields) ? state.fields : [];
  if (fields.length === 0) {
    return null;
  }
  return fields.map((field) => {
    const uploads = (field.uploads || []).map((upload) => {
      const waiting = Boolean(upload.mediaId) && isWaiting(upload);
      return { ...upload, downloadable: waiting };
    });
    return {
      ...field,
      uploads,
    };
  });
}

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

