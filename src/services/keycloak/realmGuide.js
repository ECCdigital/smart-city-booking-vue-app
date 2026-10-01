import i18n from "@/language/index";

/**
 * The Anleitung of the tab „Single Sign-On“ as plain data: how a Keycloak
 * realm is set up for this instance, step by step, with the values of the
 * instance, for the running mode and for the Storefront. The checklist renders
 * it; the text to copy and the result of „Realm prüfen“ read it too.
 *
 * Values are `{ text, missing }`. A missing value carries its placeholder as
 * `text` (e.g. `‹Client-ID des Web-Clients›`), so a value built from it, such
 * as the Issuer, reads with the placeholder in it. `{ none: true }` marks a
 * field that stays empty in Keycloak; `{ switchUser: true }` the
 * Rücksprungadresse for „Benutzer wechseln“, the only one ending with `*`.
 *
 * Settings carry the `name` Keycloak gives them, never translated, or a
 * `label` of Biletado's (`instance.edit.sso.guide.labels.<label>`). Everything
 * else that reads as German is an id, translated under
 * `instance.edit.sso.guide`: `steps.<key>.title`, `notes.<id>` (with
 * `params`), `hints.<id>`, `apps.<app>`.
 *
 * The model never carries the Client Secret, only whether it is missing.
 */

/** Keycloak versions the Anleitung is written for. */
export const KEYCLOAK_VERSIONS = Object.freeze({
  minimum: "26.7.3",
  recommended: "26.8.x",
});

/** The fields of the Web-Client that take the entries of an Adresse. */
export const ADDRESS_FIELDS = Object.freeze([
  { id: "redirectUris", name: "Valid redirect URIs" },
  { id: "postLogoutRedirectUris", name: "Valid post logout redirect URIs" },
  { id: "webOrigins", name: "Web origins" },
]);

/**
 * The SSO routes of the Storefront, fixed in smart-city-booking-store-front:
 * the callback after sign-in and the sign-in „Benutzer wechseln“ returns to.
 */
export const STOREFRONT_SSO_PATHS = Object.freeze({
  callback: "/api/auth/sso/callback",
  switchUser: "/api/auth/sso/login*",
});

/**
 * Per source of the Admin UI's Adressen (`admin.source`): the notes in the
 * step „Rücksprungadressen und Web Origins eintragen“ and the hints above the
 * checklist (those about the allowlist of the BFF).
 */
const ADMIN_NOTES = {
  direct: [{ id: "otherDomains", type: "info" }],
};
const ADMIN_HINTS = {
  "bff-unavailable": [{ id: "bffUnavailable", type: "warning" }],
};

const ON = "On";
const OFF = "Off";

function placeholder(key) {
  return {
    text: i18n.t(`instance.edit.sso.guide.placeholders.${key}`),
    missing: true,
  };
}

function known(text) {
  return { text, missing: false };
}

/** A field in Keycloak that stays empty, e.g. the API-Client's Web origins. */
function none() {
  return {
    text: i18n.t("instance.edit.sso.guide.none"),
    missing: false,
    none: true,
  };
}

function trimmed(raw) {
  return String(raw == null ? "" : raw).trim();
}

function valueOf(raw, key) {
  const text = trimmed(raw);
  return text ? known(text) : placeholder(key);
}

/**
 * A setting as Keycloak names it, with the value to enter. `copy` marks a
 * value of the instance to copy; fixed values such as `On` or `S256` are not.
 */
function setting(id, name, value, copy = false) {
  return { id, name, value, copy };
}

/** The Adresse of a URL, or `""` when it has none. */
function originOf(url) {
  try {
    const parsed = new URL(trimmed(url));
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.origin
      : "";
  } catch {
    return "";
  }
}

/** A Rücksprungadresse; every one but „Benutzer wechseln“ is exact. */
function entry(text) {
  return { ...known(text), switchUser: text.endsWith("*") };
}

/**
 * One Adresse of an app with its Rücksprungadressen and its Web origin, the
 * exact Adresse. An Adresse with `placeholder` has Rücksprungadressen nobody
 * here knows (the BFF did not name its paths); they read as placeholders.
 */
function addressOf(app, input) {
  const origin = known(input.origin);
  const redirects = input.placeholder
    ? {
      redirectUris: [placeholder("bffRedirectUri")],
      postLogoutRedirectUris: [
        placeholder("bffPostLogoutRedirectUri"),
        { ...placeholder("bffSwitchUserRedirectUri"), switchUser: true },
      ],
    }
    : {
      redirectUris: (input.redirectUris || []).map(entry),
      postLogoutRedirectUris: (input.postLogoutRedirectUris || []).map(entry),
    };
  const address = { app, origin, ...redirects, webOrigins: [origin] };
  return {
    ...address,
    fields: ADDRESS_FIELDS.map((field) => ({
      ...field,
      values: address[field.id],
    })),
  };
}

/** The Storefront's Adresse from the Portal-URL, or `null` without one. */
function storefrontAddress(portalUrl) {
  const origin = originOf(portalUrl);
  if (!origin) return null;
  return addressOf("storefront", {
    origin,
    redirectUris: [`${origin}${STOREFRONT_SSO_PATHS.callback}`],
    postLogoutRedirectUris: [`${origin}${STOREFRONT_SSO_PATHS.switchUser}`],
  });
}

function realmStep({ realm, issuer }) {
  return {
    key: "realm",
    settings: [
      setting("realmName", "Realm name", realm, true),
      setting("issuer", "Issuer", issuer, true),
    ],
    notes: [{ id: "version", type: "info", params: { ...KEYCLOAK_VERSIONS } }],
  };
}

function webClientStep({ webClient }) {
  return {
    key: "webClient",
    settings: [
      setting("clientId", "Client ID", webClient, true),
      setting("clientAuthentication", "Client authentication", known(OFF)),
      setting("standardFlow", "Standard flow", known(ON)),
      setting("directAccessGrants", "Direct access grants", known(OFF)),
      setting("implicitFlow", "Implicit flow", known(OFF)),
      setting("serviceAccounts", "Service accounts roles", known(OFF)),
      setting("pkceMethod", "PKCE Method", known("S256")),
    ],
  };
}

function addressesStep({ webClient }, { admin, adminAddresses, storefront }) {
  return {
    key: "addresses",
    sections: [
      {
        app: "adminUi",
        addresses: adminAddresses,
        notes: ADMIN_NOTES[admin?.source] || [],
      },
      {
        app: "storefront",
        addresses: storefront ? [storefront] : [],
        notes: storefront
          ? []
          : [{ id: "storefrontWithoutPortalUrl", type: "info" }],
      },
    ],
    notes: [
      {
        id: "exactEntries",
        type: "info",
        params: { webClient: webClient.text },
      },
    ],
  };
}

function audienceStep({ webClient, apiClient }) {
  // The Web-Client's own scope, where the Audience-Mapper goes.
  const scope = {
    text: `${webClient.text}-dedicated`,
    missing: webClient.missing,
  };
  return {
    key: "audience",
    settings: [
      setting("clientScope", "Client scope", scope, true),
      setting("mapperType", "Mapper type", known("Audience")),
      setting(
        "includedClientAudience",
        "Included Client Audience",
        apiClient,
        true
      ),
      setting("accessToken", "Add to access token", known(ON)),
      setting("idToken", "Add to ID token", known(OFF)),
    ],
    notes: [{ id: "signInAgain", type: "info" }],
  };
}

function apiClientStep({ apiClient }) {
  return {
    key: "apiClient",
    settings: [
      setting("clientId", "Client ID", apiClient, true),
      setting("enabled", "Enabled", known(ON)),
      setting("clientAuthentication", "Client authentication", known(ON)),
      setting("standardFlow", "Standard flow", known(OFF)),
      setting("directAccessGrants", "Direct access grants", known(OFF)),
      setting("implicitFlow", "Implicit flow", known(OFF)),
      setting("serviceAccounts", "Service accounts roles", known(OFF)),
      setting("redirectUris", "Valid redirect URIs", none()),
      setting("webOrigins", "Web origins", none()),
    ],
    notes: [{ id: "clientSecret", type: "info" }],
  };
}

/** Only with an active role mapping; each of its Keycloak roles once. */
function rolesStep({ webClient }, roleMapping) {
  const roles = [
    ...new Set(
      (roleMapping.roles || [])
        .map((role) => trimmed(role?.keycloakRole))
        .filter(Boolean)
    ),
  ].map(known);
  return {
    key: "roles",
    roles,
    settings: [setting("fullScopeAllowed", "Full scope allowed", known(OFF))],
    notes: [
      { id: "roleMappingReplacesRoles", type: "warning" },
      roles.length
        ? {
          id: "createClientRoles",
          type: "info",
          params: { webClient: webClient.text },
        }
        : { id: "noKeycloakRoles", type: "info" },
      { id: "rolesScope", type: "info" },
    ],
  };
}

function portalStep(portalUrl, storefront) {
  if (!storefront) {
    return { key: "portal", notes: [{ id: "setPortalUrl", type: "info" }] };
  }
  return {
    key: "portal",
    settings: [
      {
        id: "portalUrl",
        label: "portalUrl",
        value: known(trimmed(portalUrl)),
        copy: true,
      },
    ],
    notes: [{ id: "storefrontReachable", type: "info" }],
  };
}

/**
 * @param {object} input
 * @param {object} [input.keycloakApp] the instance's application `keycloak`
 * @param {string} [input.portalUrl] the instance's Portal-URL
 * @param {"direct"|"bff"} input.mode the auth mode of the Admin UI
 * @param {object} input.admin the Admin UI's side:
 *   `{ source, addresses: [{ origin, redirectUris, postLogoutRedirectUris }] }`,
 *   an Adresse as `{ origin, placeholder: true }` when its Rücksprungadressen
 *   are unknown. Sources: `direct` (from `directRedirects`),
 *   `bff-unavailable` (the BFF did not name its Adressen).
 * @returns {{
 *   mode: string,
 *   values: { serverUrl, realm, issuer, webClient, apiClient },
 *   addresses: Array<{ app, origin, redirectUris, postLogoutRedirectUris,
 *     webOrigins, fields }>,
 *   hints: Array<{ id, type, params? }>,
 *   missing: string[],
 *   complete: boolean,
 *   steps: Array<{ key, number, settings, notes, roles?, sections? }>,
 * }} `missing` names the values that keep SSO from being set up, in the order
 *   of the form: `serverUrl`, `realm`, `webClient`, `apiClient`,
 *   `clientSecret`. Step keys: `realm`, `webClient`, `addresses`,
 *   `audience`, `apiClient`, `roles` (only with an active role mapping),
 *   `portal`.
 */
export function buildRealmGuide({ keycloakApp, portalUrl, mode, admin }) {
  const app = keycloakApp || {};
  const serverUrl = valueOf(
    trimmed(app.serverUrl).replace(/\/+$/, ""),
    "serverUrl"
  );
  const realm = valueOf(app.realm, "realm");
  const values = {
    serverUrl,
    realm,
    issuer: {
      text: `${serverUrl.text}/realms/${realm.text}`,
      missing: serverUrl.missing || realm.missing,
    },
    webClient: valueOf(app.publicClient, "webClient"),
    apiClient: valueOf(app.privateClient, "apiClient"),
  };

  const missing = ["serverUrl", "realm", "webClient", "apiClient"].filter(
    (key) => values[key].missing
  );
  if (!trimmed(app.privateClientSecret)) missing.push("clientSecret");

  const adminAddresses = (admin?.addresses || []).map((input) =>
    addressOf("adminUi", input)
  );
  const storefront = storefrontAddress(portalUrl);
  const roleMapping = app.roleMapping?.active ? app.roleMapping : null;

  const steps = [
    realmStep(values),
    webClientStep(values),
    addressesStep(values, { admin, adminAddresses, storefront }),
    audienceStep(values),
    apiClientStep(values),
    ...(roleMapping ? [rolesStep(values, roleMapping)] : []),
    portalStep(portalUrl, storefront),
  ].map((step, index) => ({
    settings: [],
    notes: [],
    ...step,
    number: index + 1,
  }));

  // Hints above the checklist; every other note sits in its step.
  const hints = [
    ...(ADMIN_HINTS[admin?.source] || []),
    ...(storefront ? [] : [{ id: "portalUrlMissing", type: "warning" }]),
  ];

  return {
    mode,
    values,
    addresses: [...adminAddresses, ...(storefront ? [storefront] : [])],
    hints,
    missing,
    complete: missing.length === 0,
    steps,
  };
}
