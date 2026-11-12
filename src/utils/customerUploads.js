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
  "beforeRelease",
  "afterConfirmation",
]);

/** Biletado keeps a customer upload at most this long after the booking. */
export const MAX_RETENTION_DAYS = 30;
export const MIN_FILES_PER_FIELD = 1;

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
    notifyOnSubmitted: true,
    notifyOnOverdue: true,
    // The roles whose members get „Nachweis eingereicht“ and „Nachweis
    // überfällig“; never the tenant's address. None: nobody gets them.
    notifyRoleIds: [],
  };
}

/** The tenant's settings, complete: what it stores over the defaults. */
export function customerUploadSettingsOf(tenant) {
  const settings = {
    ...defaultCustomerUploadSettings(),
    ...(tenant?.customerUploads || {}),
  };
  // No setting any more: nobody is reminded before the deletion.
  delete settings.reviewReminderDaysBeforeDeletion;
  return settings;
}

/** Whether the instance has cleared customer uploads for the tenants. */
export function instanceCustomerUploadsEnabled(instance) {
  return instance?.customerUploads?.enabled === true;
}

/**
 * Whether customer uploads hold for the tenant: switched on by the tenant
 * and cleared by the instance.
 */
export function customerUploadsEnabled(tenant, instance) {
  return (
    tenant?.customerUploads?.enabled === true &&
    instanceCustomerUploadsEnabled(instance)
  );
}

/** The instance limits as they hold, from the public instance. */
export function customerUploadLimitsOf(instance) {
  return {
    ...DEFAULT_CUSTOMER_UPLOAD_LIMITS,
    ...(instance?.customerUploadLimits || {}),
  };
}

/**
 * The ceilings of the server (environment variables), from the public
 * instance: the instance sets its limits below them, never above.
 */
export function customerUploadCeilingsOf(instance) {
  return {
    ...DEFAULT_CUSTOMER_UPLOAD_LIMITS,
    ...(instance?.customerUploadCeilings || {}),
  };
}

/** The limits the instance may set, in the order of the form. */
export const INSTANCE_CUSTOMER_UPLOAD_LIMITS = Object.freeze([
  "maxFileSizeMb",
  "maxFilesPerBooking",
  "maxTotalSizeMbPerBooking",
]);

/**
 * The instance's settings, complete: what it stores over the defaults -
 * off, and no limit of its own (`null`: the ceiling).
 */
export function instanceCustomerUploadsOf(instance) {
  return {
    enabled: false,
    maxFileSizeMb: null,
    maxFilesPerBooking: null,
    maxTotalSizeMbPerBooking: null,
    ...(instance?.customerUploads || {}),
  };
}

/**
 * Why the instance's settings would be refused, as keys of the German
 * catalogue by limit; empty while they are fine. A limit is empty or a
 * whole number from 1 up to its ceiling.
 */
export function instanceCustomerUploadsIssues(settings, ceilings) {
  const issues = {};
  for (const name of INSTANCE_CUSTOMER_UPLOAD_LIMITS) {
    const value = settings[name];
    if (isFilled(value) && !isWholeNumberIn(value, 1, ceilings[name])) {
      issues[name] = "instance.edit.customerUploads.validation.limit";
    }
  }
  return issues;
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
 * allows, no size of its own (the instance's limit holds), uploaded in the
 * checkout.
 */
export function newUploadField(tenantFormats = CUSTOMER_UPLOAD_FORMATS) {
  return {
    id: newId(),
    label: "",
    hint: "",
    consentText: "",
    required: false,
    maxFiles: MIN_FILES_PER_FIELD,
    formats: orderedFormats(tenantFormats),
    maxFileSizeMb: null,
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
  return issues;
}

/**
 * Why an upload field would be refused, as keys of the German catalogue by
 * property; empty while it is fine. The number of files and the size per
 * file are not set in the dialog: a field takes one file, under the
 * instance's limits.
 *
 * @param {Object} field
 * @param {{tenantFormats: string[]}} context
 */
export function uploadFieldIssues(field, { tenantFormats }) {
  const issues = {};
  const key = (name) => `bookable.uploadFields.validation.${name}`;

  if (!String(field.label ?? "").trim()) {
    issues.label = key("label");
  }
  const formats = field.formats || [];
  if (!formats.length) {
    issues.formats = key("formatsEmpty");
  } else if (formats.some((format) => !tenantFormats.includes(format))) {
    issues.formats = key("formatsOutsideTenant");
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

/**
 * Whether a customer upload waits for its check: not checked, and its file
 * still stored - the deletion deadline deletes an unchecked sensitive file
 * too and leaves a note.
 */
const isWaiting = (upload) =>
  reviewOf(upload) === "submitted" && !upload.review?.fileDeleted;

/**
 * Whether the check deletes the file of a customer upload: one of a field
 * „besonders schutzwürdig“. A normal file stays with the booking. The
 * upload's own category counts, the field's where the backend names none.
 *
 * @param {Object} upload
 * @param {Object} [field]
 * @returns {boolean}
 */
export function checkDeletesFile(upload, field) {
  return (upload?.category ?? field?.category) === "sensitive";
}

/**
 * The upload fields of a booking with their customer uploads, as the
 * section „Nachweise“ of its page lists them; null
 * where there is nothing to list. The backend answers the state only to
 * whoever may read it (`manageBookings.readAny`, the tenant owner, not the
 * instance owner by the special position), so a missing state is the one
 * rule here - the page asks no right of its own.
 *
 * A customer upload can be checked while it waits for its check, and
 * downloaded while its file is stored: the check leaves a note at the
 * booking and deletes the file of a sensitive upload alone - a normal one
 * stays with the booking.
 * A fulfilled field can be asked for again
 * („Erneut anfordern“). The fields
 * the booking no longer shows - renamed away, deleted at the offer, closed
 * - follow under the label they had (`former`), so their notes stay
 * readable and what still waits can be checked.
 *
 * @param {Object} booking A booking answer with `customerUploadState`
 * @returns {Object[]|null} The fields, each with `canRequestAgain`,
 *   `retentionDays` and
 *   `uploads[].downloadable`, `uploads[].viewable`, `uploads[].reviewable`
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
      const stored = Boolean(upload.mediaId) && !upload.review?.fileDeleted;
      const waiting = Boolean(upload.mediaId) && isWaiting(upload);
      return {
        ...upload,
        downloadable: stored,
        // A PDF or image opens in the page as well.
        viewable: stored && previewKindOf(upload) !== null,
        reviewable: waiting,
      };
    });
    return {
      ...field,
      requests: field.requests || [],
      reopen: field.reopen ?? null,
      // The tenant's deletion deadline, for the notice before a download.
      retentionDays: Number.isInteger(state.retentionDays)
        ? state.retentionDays
        : null,
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
 *   number|null, reason: string, autoDeleted: boolean, fileDeleted:
 *   boolean}|null} Null while the
 *   upload waits for its check; the result stays `submitted` for an upload
 *   the deletion deadline deleted unchecked
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
    autoDeleted: Boolean(upload.review?.autoDeleted),
    fileDeleted: Boolean(upload.review?.fileDeleted),
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
 * How a customer upload shows in the page: `pdf` in a frame, `image` as a
 * picture, null for a file the page cannot show. By its type, by the
 * extension of its name where it has none.
 *
 * @param {Object} upload
 * @returns {"pdf"|"image"|null}
 */
export function previewKindOf(upload) {
  const format = formatOfFile({
    type: upload?.mimeType,
    name: upload?.originalFileName,
  });
  if (format === "pdf") return "pdf";
  return format ? "image" : null;
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
  customer_upload_target_invalid: "target-invalid",
});

/** The German message key of a refused customer upload of the checkout. */
export function checkoutUploadErrorKey(code) {
  return `checkout.customer-uploads.errors.${
    CHECKOUT_UPLOAD_ERROR_KEYS[code] ?? "generic"
  }`;
}

/**
 * The state of a booking over its required upload fields, as the backend
 * derives it (`customer-upload-state.js`, `BOOKING_STATE`), from the least
 * to the most favourable.
 */
export const PROOF_STATE = Object.freeze({
  OVERDUE: "overdue",
  MISSING: "missing",
  TO_REVIEW: "toReview",
  FULFILLED: "fulfilled",
});

/** The states with a chip, the most urgent first; fulfilled has none. */
export const PROOF_MARKER_STATES = Object.freeze([
  PROOF_STATE.OVERDUE,
  PROOF_STATE.MISSING,
  PROOF_STATE.TO_REVIEW,
]);

const PROOF_MARKERS = Object.freeze({
  [PROOF_STATE.OVERDUE]: {
    color: "error",
    textColor: "white",
    icon: "mdi-file-alert-outline",
  },
  [PROOF_STATE.MISSING]: {
    color: "warning",
    textColor: "white",
    icon: "mdi-file-question-outline",
  },
  [PROOF_STATE.TO_REVIEW]: {
    color: "info",
    textColor: "white",
    icon: "mdi-file-search-outline",
  },
});

/**
 * How a required field counts for its booking - the backend's
 * `bookingStateOfField`, read off the state and `pastDeadline` it answers:
 * no rule of its own for deadlines.
 */
function proofStateOfField(field) {
  switch (field.state) {
    case "fulfilled":
      return PROOF_STATE.FULFILLED;
    case "submitted":
      return PROOF_STATE.TO_REVIEW;
    case "overdue":
      return PROOF_STATE.OVERDUE;
    default:
      return field.pastDeadline ? PROOF_STATE.OVERDUE : PROOF_STATE.MISSING;
  }
}

/**
 * The proof chips of a booking for the list: each
 * state its required upload fields are in, once, the most urgent first -
 * „Nachweis überfällig“, „Nachweis fehlt“, „Nachweis zu prüfen“. None
 * without a state: the backend answers it only to whoever reads the
 * tenant's bookings (`manageBookings.readAny`), so a missing state is the
 * one rule for who sees the chips.
 *
 * @param {Object} booking A booking answer with `customerUploadState`
 * @returns {string[]} States of {@link PROOF_MARKER_STATES}
 */
export function proofStatesOf(booking) {
  const state = booking?.customerUploadState;
  if (!state) return [];
  const fields = Array.isArray(state.fields) ? state.fields : [];
  const states = new Set(
    fields.filter((field) => field.required).map(proofStateOfField)
  );
  // An answer without its fields still names the booking's state.
  if (states.size === 0 && state.state) states.add(state.state);
  return PROOF_MARKER_STATES.filter((candidate) => states.has(candidate));
}

/** The most urgent proof state of a booking, the kanban card's one chip. */
export function mostUrgentProofStateOf(booking) {
  return proofStatesOf(booking)[0] ?? null;
}

/**
 * The chip of a proof state, as `freeMarker()` but with the key of its
 * label (`booking.proofState.marker.<state>`); null for none.
 */
export function proofStateMarker(state) {
  if (!PROOF_MARKERS[state]) return null;
  return {
    state,
    labelKey: `booking.proofState.marker.${state}`,
    ...PROOF_MARKERS[state],
  };
}

/** The list's proof filter: the bookings with a chip among `states`. */
export function filterBookingsByProofState(bookings, states) {
  return bookings.filter((booking) =>
    proofStatesOf(booking).some((state) => states.includes(state))
  );
}

/** The states of a field that still wants a file from the customer. */
const MISSING_FIELD_STATES = new Set(["open", "rejected", "overdue"]);

/**
 * The proofs open or unchecked at a booking, for the hint when it is
 * released (`requested` → `confirmed`): its
 * required fields still without a file, and every field with a file
 * waiting for its check. The release stays allowed.
 *
 * @param {Object} booking A booking answer with `customerUploadState`
 * @returns {number}
 */
export function openProofCountOf(booking) {
  const fields = booking?.customerUploadState?.fields;
  if (!Array.isArray(fields)) return 0;
  return fields.filter(
    (field) =>
      field.state === "submitted" ||
      (field.required && MISSING_FIELD_STATES.has(field.state))
  ).length;
}

/**
 * The labels of the required proofs still missing at a booking (open,
 * rejected or overdue), for the hint at its release and „Nachweise
 * anfordern“.
 *
 * @param {Object} booking A booking answer with `customerUploadState`
 * @returns {string[]}
 */
export function missingProofLabelsOf(booking) {
  const fields = booking?.customerUploadState?.fields;
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((field) => field.required && MISSING_FIELD_STATES.has(field.state))
    .map((field) => field.label);
}

/** {@link openProofCountOf} over the bookings of a series. */
export function openProofCountOfAll(bookings) {
  return (bookings || []).reduce(
    (count, booking) => count + openProofCountOf(booking),
    0
  );
}

/*
 * The upload fields "in the checkout" of a group:
 * the customer hands a file in once and chooses the bookings of the
 * series it counts for, each with the field the file was chosen for. A
 * file of the group is `{ key, fieldId, file, attempts }`, `attempts` the
 * indices of the series' booking attempts. A guest has no choice: each of
 * their files is for one booking.
 */

/** A key for a new file of the group, unique among `uploads`. */
export function groupUploadKey(uploads = []) {
  const taken = new Set(uploads.map((upload) => upload.key));
  let n = uploads.length + 1;
  while (taken.has(`file-${n}`)) n += 1;
  return `file-${n}`;
}

/** The files of the group chosen for a field at one booking attempt. */
export function groupFilesAt(uploads, attempt, fieldId) {
  return (uploads || []).filter(
    (upload) => upload.fieldId === fieldId && upload.attempts.includes(attempt)
  );
}

/**
 * The bookings a new file of a field is for, before the customer changes
 * it: every booking with room left in the field, a guest's first one.
 */
export function defaultGroupAttempts(field, uploads, memberCount, guest) {
  const withRoom = [...Array(memberCount).keys()].filter(
    (attempt) =>
      groupFilesAt(uploads, attempt, field.id).length < field.maxFiles
  );
  return guest ? withRoom.slice(0, 1) : withRoom;
}

/**
 * What the group checkout checks before a file is added, as for a single
 * booking: size and format of the file, the number at each of its bookings.
 *
 * @returns {{ code: string, params: Object }|null} Null when it may go
 */
export function precheckGroupCheckoutUpload(file, field, attempts, uploads) {
  const ofFile = precheckCheckoutUpload(file, field, 0);
  if (ofFile) return ofFile;
  if (attempts.length === 0) {
    return {
      code: "customer_upload_field_full",
      params: { maxFiles: field.maxFiles },
    };
  }
  const full = attempts.find(
    (attempt) =>
      groupFilesAt(uploads, attempt, field.id).length >= field.maxFiles
  );
  return full === undefined
    ? null
    : {
        code: "customer_upload_field_full",
        params: { maxFiles: field.maxFiles, attempt: full },
      };
}

/**
 * The required upload fields of the checkout without a file, per booking
 * attempt of the series.
 *
 * @returns {{ attempt: number, field: Object }[]}
 */
export function missingGroupCheckoutUploads(fields, uploads, memberCount) {
  const missing = [];
  for (let attempt = 0; attempt < memberCount; attempt += 1) {
    for (const field of fields) {
      if (
        field.required &&
        groupFilesAt(uploads, attempt, field.id).length === 0
      ) {
        missing.push({ attempt, field });
      }
    }
  }
  return missing;
}

/**
 * `customerUploadTargets` of a group checkout: by the key of each file its
 * bookings, each with the file's field.
 */
export function customerUploadTargetsOf(uploads) {
  return Object.fromEntries(
    (uploads || []).map((upload) => [
      upload.key,
      upload.attempts.map((attempt) => ({ attempt, fieldId: upload.fieldId })),
    ])
  );
}

/**
 * The parts of a multipart group checkout: the payload with its targets as
 * JSON, then each file under its key.
 *
 * @returns {Array<[string, string|File]>}
 */
export function groupCheckoutUploadParts(body, uploads) {
  return [
    [
      CHECKOUT_BODY_FIELD,
      JSON.stringify({
        ...body,
        customerUploadTargets: customerUploadTargetsOf(uploads),
      }),
    ],
    ...(uploads || []).map((upload) => [
      `${CHECKOUT_FILE_PREFIX}${upload.key}`,
      upload.file,
    ]),
  ];
}

/**
 * The other bookings and fields a customer upload of a group counts for,
 * as the backend answers them: a check of it
 * writes the note at all of them.
 *
 * @returns {{ bookingId: string, fieldId: string, fieldLabel: string }[]}
 */
export function alsoForOf(upload) {
  return Array.isArray(upload?.alsoFor) ? upload.alsoFor : [];
}

/*
 * The page „Nachweise einreichen“ of the Admin UI (`/booking/proofs`): an
 * instance without a storefront links every customer there, with the
 * signed link of the booking, without a sign-in.
 */

/**
 * The tenant and booking a signed link names, read off its payload so the
 * page knows where to ask. Unchecked: the backend checks the signature and
 * refuses a forged one.
 *
 * @param {string} link The token `base64url(JSON {t, b}).signature`
 * @returns {{ tenantId: string, bookingId: string }|null}
 */
export function customerUploadLinkTarget(link) {
  const [payload, signature, ...rest] = String(link || "").split(".");
  if (!payload || !signature || rest.length > 0) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      Array.from(window.atob(base64))
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    const { t, b } = JSON.parse(json);
    if (typeof t !== "string" || typeof b !== "string" || !t || !b) {
      return null;
    }
    return { tenantId: t, bookingId: b };
  } catch {
    return null;
  }
}

const DAY = 24 * 60 * 60 * 1000;
/** From this many days before the deadline an open field stands out. */
const DEADLINE_WARNING_DAYS = 3;

const lastReviewed = (field, status) =>
  [...(field.uploads || [])]
    .filter((upload) => upload.review?.status === status)
    .sort((a, b) => (b.review.reviewedAt ?? 0) - (a.review.reviewedAt ?? 0))[0];

/**
 * How the page shows one upload field to the customer: the chip of its
 * state, the files still waiting for their check (replace, delete), whether
 * a new file fits, and the texts that go with its state - as the
 * storefront's page shows it.
 *
 * @param {Object} field A field of `customerUploadState.fields`
 * @param {number} [now]
 * @returns {{ color: string, labelKey: string, labelParams: Object,
 *   canUpload: boolean, pendingUploads: Object[], lateHint: boolean,
 *   reason: string|null, reasonKey: string|null }}
 */
export function customerProofFieldView(field, now = Date.now()) {
  const deadline = field.deadline ?? null;
  const days =
    deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / DAY));
  const key = (name) => `customer-proofs.state.${name}`;
  const base = {
    color: "grey",
    labelKey: key("open"),
    labelParams: { deadline, days },
    canUpload: field.remainingFiles > 0,
    pendingUploads: (field.uploads || []).filter(
      (upload) => upload.mediaId && isWaiting(upload)
    ),
    lateHint: false,
    reason: null,
    reasonKey: null,
  };

  switch (field.state) {
    case "submitted":
      return { ...base, color: "info", labelKey: key("submitted") };
    case "rejected": {
      // A rejection or „Erneut anfordern“: both ask for a new file.
      const requestedAgain = field.reopen?.kind === "requestedAgain";
      return {
        ...base,
        color: "error",
        labelKey: key(requestedAgain ? "requested-again" : "rejected"),
        reason:
          field.reopen?.reason ||
          lastReviewed(field, "rejected")?.review.reason ||
          null,
        reasonKey: `customer-proofs.${
          requestedAgain ? "request-again-reason" : "rejection-reason"
        }`,
        lateHint: Boolean(field.pastDeadline),
      };
    }
    case "overdue":
      return {
        ...base,
        color: "error",
        labelKey: key("overdue"),
        lateHint: true,
      };
    case "fulfilled": {
      // Only a sensitive file is deleted with its check.
      const accepted = lastReviewed(field, "accepted");
      return {
        ...base,
        color: "success",
        labelKey: key(
          accepted?.review.fileDeleted ? "fulfilled" : "fulfilled-kept"
        ),
        labelParams: { reviewedAt: accepted?.review.reviewedAt ?? null },
        canUpload: false,
      };
    }
    default:
      return {
        ...base,
        color:
          days !== null && days <= DEADLINE_WARNING_DAYS ? "warning" : "grey",
        // Due before the release, which has no date: no deadline to name.
        labelKey:
          field.timing === "beforeRelease"
            ? key("open-before-release")
            : deadline === null
            ? key("open-without-deadline")
            : key("open"),
      };
  }
}

/**
 * Size, number and format of a file for an upload field on the page,
 * before it goes. The backend checks again, by the content.
 *
 * @param {{ name?: string, type?: string, size: number }} file
 * @param {Object} field A field of `customerUploadState.fields`
 * @param {{ replacing?: boolean }} [options] A replacement takes no room
 * @returns {{ code: string, params: Object }|null} Null when it may go
 */
export function precheckCustomerProof(file, field, { replacing = false } = {}) {
  // The checks of the checkout, the files waiting for their check as the
  // ones chosen; a replacement takes the place of one of them.
  const waiting = replacing ? 0 : field.maxFiles - field.remainingFiles;
  return precheckCheckoutUpload(file, field, waiting);
}

const CUSTOMER_PROOF_ERROR_KEYS = Object.freeze({
  customer_upload_format_not_allowed: "format",
  customer_upload_too_large: "size",
  customer_upload_field_full: "field-full",
  customer_upload_booking_limit: "booking-limit",
  customer_upload_virus_found: "virus",
  customer_upload_scanner_unavailable: "scanner",
  customer_upload_rate_limited: "rate-limit",
  customer_upload_not_open: "not-open",
  customer_upload_already_reviewed: "already-reviewed",
  customer_upload_file_missing: "file-missing",
  customer_upload_field_not_found: "not-found",
  customer_upload_not_found: "not-found",
  booking_not_found: "not-found",
  customer_upload_link_invalid: "link-invalid",
  customer_upload_link_expired: "link-expired",
});

/** The German message key of a refusal on the page, by its code. */
export function customerProofErrorKey(code) {
  return `customer-proofs.errors.${
    CUSTOMER_PROOF_ERROR_KEYS[code] ?? "generic"
  }`;
}

/** Why the page cannot open the booking of its link: `invalid`, `expired`, `error`. */
export function customerProofLinkRefusalOf(code) {
  if (code === "customer_upload_link_expired") return "expired";
  if (code === "customer_upload_link_invalid") return "invalid";
  return "error";
}
