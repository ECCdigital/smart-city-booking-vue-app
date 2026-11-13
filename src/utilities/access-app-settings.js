import {
  emptyCustomerService,
  SALTO_PROVIDER,
  saltoEnvironment,
} from "@/utilities/access-apps";

/**
 * The settings of a provider on the Zugangspunkte page
 * (ECCdigital/tickets#1104), in one place: which fields the form asks first
 * (`primary`, what the connection needs), which it folds under „Weitere
 * Einstellungen“ (`advanced`, each with its standard where it has one),
 * which are secrets, whether the provider carries a customer service and
 * which help stands folded above. A field's text lives under
 * `accessPoint.management.settings.fields.<label or key>`.
 *
 * The secrets are the backend's (`secretFields` of #1101): the form never
 * shows a stored one, and a secret left empty is not sent.
 */
export const SETTINGS_FORMS = {
  nuki: {
    primary: [{ key: "apiToken", secret: true }],
    advanced: [{ key: "apiBaseUrl", standard: "https://api.nuki.io" }],
    customerService: true,
    help: "nuki",
  },
  [SALTO_PROVIDER]: {
    primary: [
      { key: "clientId" },
      { key: "clientSecret", secret: true },
      { key: "siteId" },
      { key: "username", label: "saltoUsername", hint: true },
      { key: "password", label: "saltoPassword", secret: true },
    ],
    advanced: [
      {
        key: "environment",
        standard: "production",
        choices: ["production", "accept"],
      },
    ],
    help: "salto",
  },
  "open-locker": {
    primary: [
      { key: "serverUrl" },
      { key: "email", label: "openLockerEmail" },
      { key: "password", secret: true },
    ],
    advanced: [],
    help: "openLocker",
  },
  ifbs: {
    primary: [
      { key: "serverUrl" },
      { key: "apiKeyID" },
      { key: "apiKey", secret: true },
    ],
    advanced: [{ key: "secretPhrase", secret: true, hint: true }],
    customerService: true,
  },
  pareva: {
    primary: [
      { key: "serverUrl" },
      { key: "lockerId" },
      { key: "user" },
      { key: "password", secret: true },
    ],
    advanced: [],
  },
};

/** The form of a provider, or an empty one for a provider it does not know. */
export function settingsForm(providerId) {
  return SETTINGS_FORMS[providerId] || { primary: [], advanced: [] };
}

function fieldsOf(providerId) {
  const form = settingsForm(providerId);
  return [...form.primary, ...form.advanced];
}

/**
 * Whether the stored application holds a secret in `key`. The backend says
 * so in `storedSecrets`; until it stops answering secrets
 * (ECCdigital/tickets#1105) a secret in the answer counts as stored.
 *
 * @param {Object|null} app The stored access application
 * @param {string} key A secret field
 * @returns {boolean}
 */
export function secretStored(app, key) {
  if (!app) return false;
  return !!app.storedSecrets?.[key] || !!app[key];
}

/**
 * A fresh form for the settings of a provider: the stored values, every
 * secret empty, and open to typing only where none is stored.
 *
 * @param {string} providerId
 * @param {Object|null} app The stored access application
 * @returns {{values: Object, changing: Object}}
 */
export function newSettings(providerId, app) {
  const values = {};
  const changing = {};
  fieldsOf(providerId).forEach((field) => {
    if (field.secret) {
      values[field.key] = "";
      changing[field.key] = !secretStored(app, field.key);
    } else {
      values[field.key] = app?.[field.key] ?? field.standard ?? "";
    }
  });
  if (providerId === SALTO_PROVIDER && app) {
    values.environment = saltoEnvironment(app);
  }
  if (settingsForm(providerId).customerService) {
    values.customerService = {
      ...emptyCustomerService(),
      ...(app?.customerService || {}),
    };
  }
  return { values, changing };
}

function secretKeys(providerId) {
  return fieldsOf(providerId)
    .filter((field) => field.secret)
    .map((field) => field.key);
}

/**
 * What saving sends: the form's values, without a secret left empty - the
 * backend keeps the stored one.
 *
 * @param {string} providerId
 * @param {{values: Object}} settings
 * @returns {Object}
 */
export function savePayload(providerId, settings) {
  const payload = { ...settings.values };
  secretKeys(providerId).forEach((key) => {
    if (!payload[key]) delete payload[key];
  });
  return payload;
}

/**
 * What the connection test sends: the fields of the connection, a secret
 * left empty as empty - the backend then takes the stored one, as long as it
 * belongs to what the form names.
 *
 * @param {{values: Object}} settings
 * @returns {Object}
 */
export function testPayload(settings) {
  // eslint-disable-next-line no-unused-vars
  const { customerService, ...credentials } = settings.values;
  return credentials;
}

/** The fields a refusal of the provider names, by the code of the test. */
const REFUSED_FIELDS = {
  "open-locker": { invalid_credentials: ["email", "password"] },
};

/** The fields each check of Salto KS stands for, when it fails. */
const SALTO_CHECK_FIELDS = {
  credentials: ["clientId", "clientSecret"],
  login: ["username", "password"],
  site: ["siteId"],
};

/**
 * The fields a failed connection test names, each with the kind of fault:
 * `missing` (a required entry, `missing_fields`), `notStored` or `changed`
 * (a secret the stored one cannot stand in for, `missing_secret`), or
 * `refused` (the provider refused it).
 *
 * @param {string} providerId
 * @param {Object|null} result The answer of the test
 * @returns {Object<string, "missing"|"notStored"|"changed"|"refused">}
 */
export function testFaults(providerId, result) {
  const faults = {};
  if (!result || result.success) return faults;

  const missing = result.missing || [];
  if (result.code === "missing_fields") {
    missing.forEach(({ field }) => (faults[field] = "missing"));
  }
  if (result.code === "missing_secret") {
    missing.forEach(({ field, reason }) => {
      faults[field] = reason === "not_stored" ? "notStored" : "changed";
    });
  }
  (REFUSED_FIELDS[providerId]?.[result.code] || []).forEach(
    (field) => (faults[field] = "refused")
  );
  if (providerId === SALTO_PROVIDER && result.checks) {
    Object.entries(SALTO_CHECK_FIELDS).forEach(([check, fields]) => {
      if (result.checks[check]?.status !== "failed") return;
      fields.forEach((field) => (faults[field] = faults[field] || "refused"));
    });
  }
  return faults;
}

/**
 * The text key of a field of the provider's form.
 *
 * @param {string} providerId
 * @param {string} key
 * @returns {string}
 */
export function fieldLabelKey(providerId, key) {
  const field = fieldsOf(providerId).find((f) => f.key === key);
  return `accessPoint.management.settings.fields.${field?.label || key}`;
}
