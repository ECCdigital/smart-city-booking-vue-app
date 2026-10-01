// PROTOTYPE (ECCdigital/tickets#86): throwaway stub data for the Keycloak
// guide and live check in the tab "Authentifizierung". Never merged.
//
// Everything here is in memory. The scenario panel flips the inputs; the
// variants only render what buildGuide / buildCheck return.

import Vue from "vue";

export const scenario = Vue.observable({
  mode: "bff", // bff | direct
  values: "example", // example | empty | form
  roleMapping: "on", // on | off (ignored for values = form)
  login: "sso", // sso | local
  portalUrl: "set", // set | empty
  allowlist: "ok", // ok | empty | unreachable | ownMissing (BFF only)
  result: "errors", // good | errors | discovery
  unsaved: "no", // no | yes
  justSaved: "no", // no | yes
});

export const check = Vue.observable({
  state: "idle", // idle | running | done
  at: null,
  rows: [],
});

const EXAMPLE = {
  instanceName: "Beispielstadt",
  serverUrl: "https://sso.beispielstadt.de",
  realm: "biletado",
  publicClient: "biletado-web",
  privateClient: "biletado-api",
  privateClientSecret: "s3cr3t",
  roles: ["biletado-admin", "raumverwaltung", "sportstaetten"],
};

const ADMIN_ORIGINS_BFF = [
  "https://verwaltung.beispielstadt.de",
  "https://admin.beispielstadt.de",
];
const ADMIN_ORIGIN_DIRECT = "https://verwaltung.beispielstadt.de";
const PORTAL_URL = "https://buchen.beispielstadt.de";

export const PLACEHOLDER = {
  serverUrl: "‹Keycloak-URL›",
  realm: "‹Realm›",
  publicClient: "‹Client-ID für Web-Anwendung›",
  privateClient: "‹Client-ID für Api-Zugriff›",
};

/** The Keycloak config the guide is built from, per scenario. */
export function effectiveConfig(instance) {
  const form =
    (instance?.applications || []).find((a) => a.id === "keycloak") || {};
  if (scenario.values === "form") {
    return {
      instanceName: instance?.name || "",
      serverUrl: form.serverUrl || "",
      realm: form.realm || "",
      publicClient: form.publicClient || "",
      privateClient: form.privateClient || "",
      privateClientSecret: form.privateClientSecret || "",
      roleMappingActive: !!form.roleMapping?.active,
      roles: [
        ...new Set(
          (form.roleMapping?.roles || [])
            .map((r) => r.keycloakRole)
            .filter(Boolean)
        ),
      ],
    };
  }
  if (scenario.values === "empty") {
    return {
      instanceName: instance?.name || EXAMPLE.instanceName,
      serverUrl: "",
      realm: "",
      publicClient: "",
      privateClient: "",
      privateClientSecret: "",
      roleMappingActive: scenario.roleMapping === "on",
      roles: [],
    };
  }
  return {
    ...EXAMPLE,
    roleMappingActive: scenario.roleMapping === "on",
  };
}

function v(value, placeholderKey) {
  return value
    ? { text: value, missing: false }
    : { text: PLACEHOLDER[placeholderKey], missing: true };
}

/**
 * The guide as data: the values of this instance in the running mode plus
 * the Storefront, from #83 (addresses) and #84 (settings).
 */
export function buildGuide(cfg) {
  const mode = scenario.mode;
  const serverUrl = v(cfg.serverUrl, "serverUrl");
  const realm = v(cfg.realm, "realm");
  const publicClient = v(cfg.publicClient, "publicClient");
  const privateClient = v(cfg.privateClient, "privateClient");
  const issuer = {
    text: `${serverUrl.text}/realms/${realm.text}`,
    missing: serverUrl.missing || realm.missing,
  };

  // Admin UI addresses (#83)
  let adminOrigins;
  let adminHint = null;
  if (mode === "bff") {
    if (scenario.allowlist === "ok") {
      adminOrigins = ADMIN_ORIGINS_BFF;
    } else {
      adminOrigins = [ADMIN_ORIGINS_BFF[0]];
      adminHint = {
        empty:
          "Die Allowlist des BFF (PUBLIC_ORIGIN) ist leer: Der BFF nimmt jede Adresse an. Die Anleitung nennt nur die Adresse, unter der du gerade arbeitest.",
        unreachable:
          "Der BFF hat seine Adressen nicht genannt. Die Liste ist vielleicht unvollständig: Sie nennt nur die Adresse, unter der du gerade arbeitest.",
        ownMissing:
          "Die Adresse, unter der du gerade arbeitest, steht nicht in der Allowlist des BFF (PUBLIC_ORIGIN). Die SSO-Anmeldung von hier scheitert.",
      }[scenario.allowlist];
    }
  } else {
    adminOrigins = [ADMIN_ORIGIN_DIRECT];
    adminHint = null;
  }

  const admin = {
    label: "Admin UI",
    origins: adminOrigins,
    hint: adminHint,
    note:
      mode === "direct"
        ? "Läuft das Admin UI unter weiteren Domains, braucht jede dieselben Einträge."
        : null,
    redirectUris:
      mode === "bff"
        ? adminOrigins.map((o) => `${o}/admin/api/auth/sso/callback`)
        : adminOrigins.flatMap((o) => [
          `${o}/admin/login/sso`,
          `${o}/admin/silent-check-sso.html`,
        ]),
    postLogoutUris:
      mode === "bff"
        ? adminOrigins.flatMap((o) => [
          `${o}/admin/login`,
          `${o}/admin/api/auth/sso/login*`,
        ])
        : adminOrigins.flatMap((o) => [
          `${o}/admin/login`,
          `${o}/admin/login/sso*`,
        ]),
    webOrigins: adminOrigins,
  };

  const storefront =
    scenario.portalUrl === "set"
      ? {
        label: "Storefront",
        origins: [PORTAL_URL],
        hint: null,
        redirectUris: [`${PORTAL_URL}/api/auth/sso/callback`],
        postLogoutUris: [`${PORTAL_URL}/api/auth/sso/login*`],
        webOrigins: [PORTAL_URL],
      }
      : {
        label: "Storefront",
        origins: [],
        hint: "Die Portal-URL ist leer. Trage sie im Tab „Allgemein“ ein, dann nennt die Anleitung die Adressen der Storefront.",
        redirectUris: [],
        postLogoutUris: [],
        webOrigins: [],
      };

  const apps = [admin, storefront];

  const publicSettings = [
    { name: "Client type", value: "OpenID Connect" },
    { name: "Client ID", value: publicClient.text, missing: publicClient.missing, copy: true },
    { name: "Enabled", value: "On" },
    { name: "Client authentication", value: "Off" },
    { name: "Standard flow", value: "On" },
    { name: "Direct access grants", value: "Off" },
    { name: "Implicit flow", value: "Off" },
    { name: "Service accounts roles", value: "Off" },
    { name: "PKCE Method", value: "S256" },
  ];

  const audienceMapper = [
    { name: "Ort", value: `Client scope ${publicClient.text}-dedicated`, missing: publicClient.missing },
    { name: "Mapper type", value: "Audience" },
    { name: "Name", value: "audience-api", copy: true },
    { name: "Included Client Audience", value: privateClient.text, missing: privateClient.missing, copy: true },
    { name: "Add to access token", value: "On" },
    { name: "Add to ID token", value: "Off" },
  ];

  const confidentialSettings = [
    { name: "Client type", value: "OpenID Connect" },
    { name: "Client ID", value: privateClient.text, missing: privateClient.missing, copy: true },
    { name: "Enabled", value: "On" },
    { name: "Client authentication", value: "On" },
    { name: "Standard flow", value: "Off" },
    { name: "Direct access grants", value: "Off" },
    { name: "Implicit flow", value: "Off" },
    { name: "Service accounts roles", value: "Off" },
    { name: "Valid redirect URIs", value: "leer" },
    { name: "Web origins", value: "leer" },
    { name: "Client secret", value: "in Biletado unter „Client Secret“ eintragen" },
  ];

  const roles = cfg.roleMappingActive
    ? {
      names: cfg.roles,
      settings: [
        { name: "Client-Rollen am", value: publicClient.text, missing: publicClient.missing },
        { name: "Client scope „roles“", value: "Default, mit Mapper „client roles“" },
        { name: "Full scope allowed", value: `Off (Scope von ${publicClient.text}-dedicated)` },
        { name: "Scope zugeordnet", value: "die Client-Rollen oben" },
      ],
      warning:
          "Die Rollenzuordnung greift nur bei der Anmeldung per SSO. Dabei entfernt Biletado auch Rollen, die jemand in Biletado von Hand vergeben hat.",
    }
    : null;

  const notes = [
    "Nach dem Anlegen des Audience-Mappers neu anmelden, sonst trägt das Token den API-Client noch nicht.",
    `Keycloak-URL ohne Schrägstrich am Ende. Der Issuer muss genau ${issuer.text} sein.`,
    "Änderungen an der Instanz wirken nach bis zu einer Minute.",
    "Die Einstellungen gelten auch für ältere Keycloak 26.x.",
  ];

  const missing = ["serverUrl", "realm", "publicClient", "privateClient"]
    .filter((k) => !cfg[k])
    .map((k) => PLACEHOLDER[k]);
  if (!cfg.privateClientSecret) missing.push("‹Client Secret›");

  return {
    mode,
    instanceName: cfg.instanceName,
    serverUrl,
    realm,
    issuer,
    publicClient,
    privateClient,
    apps,
    publicSettings,
    audienceMapper,
    confidentialSettings,
    roles,
    notes,
    missing,
    complete: missing.length === 0,
    version: "Keycloak ab 26.7.3, empfohlen 26.8.x",
  };
}

/** Why "Prüfen" is locked, or null. */
export function checkLock(guide, hasUnsavedChanges) {
  if (!guide.complete)
    return `Trage zuerst ${guide.missing.join(", ")} ein und speichere.`;
  if (hasUnsavedChanges || scenario.unsaved === "yes")
    return "Speichere zuerst. Die Prüfung nutzt nur gespeicherte Werte.";
  return null;
}

const NA_DISCOVERY = "Nicht prüfbar, weil der Realm nicht erreichbar ist.";

/**
 * Stub results for requirements 1 to 9 from #81 plus the Portal-URL (#85).
 * `step` ties a row to the part of the guide that fixes it.
 */
export function buildCheckRows(guide) {
  const r = scenario.result;
  const sso = scenario.login === "sso";
  const pc = guide.publicClient.text;
  const cc = guide.privateClient.text;
  const admin = guide.apps[0];
  const sf = guide.apps[1];
  const portalSet = scenario.portalUrl === "set";

  if (r === "discovery") {
    const rows = [
      {
        id: 1,
        step: "realm",
        title: "Realm erreichbar, Issuer stimmt",
        status: "fail",
        reason: `Keycloak antwortet unter ${guide.issuer.text}/.well-known/openid-configuration mit 404: Keycloak-URL oder Realm falsch.`,
      },
    ];
    for (const row of baseRows(guide)) {
      if (row.id === 1) continue;
      rows.push({ ...row, status: "na", reason: NA_DISCOVERY, parts: null });
    }
    return rows;
  }

  const errors = r === "errors";
  return baseRows(guide).map((row) => {
    switch (row.id) {
    case 1:
      return { ...row, status: "ok", reason: `Issuer ist ${guide.issuer.text}.` };
    case 2:
      return { ...row, status: "ok", reason: `${pc} ist public und nutzt den Standard flow.` };
    case 3:
      return { ...row, status: "ok", reason: "Keycloak verlangt PKCE mit S256." };
    case 4:
      return {
        ...row,
        status: errors && portalSet ? "fail" : portalSet ? "ok" : "na",
        reason:
            errors && portalSet
              ? `Keycloak lehnt ${sf.redirectUris[0]} ab: fehlt unter Valid redirect URIs.`
              : portalSet
                ? "Keycloak nimmt jede Rücksprungadresse an und lehnt http:// ab."
                : "Für die Storefront nicht prüfbar: Die Portal-URL ist leer.",
        parts: [
          { label: admin.label, status: "ok", reason: `${admin.redirectUris.length} von ${admin.redirectUris.length} angenommen` },
          portalSet
            ? errors
              ? { label: sf.label, status: "fail", reason: `${sf.redirectUris[0]} abgelehnt` }
              : { label: sf.label, status: "ok", reason: "1 von 1 angenommen" }
            : { label: sf.label, status: "na", reason: "Portal-URL leer" },
        ],
      };
    case 5:
      return {
        ...row,
        status: errors ? "fail" : "ok",
        reason: errors
          ? `Keycloak lehnt ${admin.postLogoutUris[1].replace("*", "?redirect=%2F")} ab: Der Eintrag für „Benutzer wechseln“ braucht * am Ende des Pfads.`
          : "Keycloak nimmt jede Abmelde-Adresse an, auch mit Query.",
      };
    case 6:
      return errors
        ? {
          ...row,
          status: "na",
          reason: "Unerwartete Antwort von Keycloak: 403 ohne error. Vielleicht eine Client Policy oder ein Proxy.",
        }
        : { ...row, status: "ok", reason: `Keycloak erlaubt ${admin.webOrigins[0]}.` };
    case 7:
      return { ...row, status: "ok", reason: `${cc} darf mit seinem Secret Tokens prüfen.` };
    case 8:
      if (!sso)
        return { ...row, status: "na", reason: "Nicht prüfbar: Du bist lokal angemeldet. Melde dich per SSO an und prüfe erneut." };
      return errors
        ? { ...row, status: "fail", reason: `aud in deinem Token enthält ${cc} nicht. Der Audience-Mapper im Scope ${pc}-dedicated fehlt.` }
        : { ...row, status: "ok", reason: `aud in deinem Token enthält ${cc}.` };
    case 9:
      if (!sso)
        return { ...row, status: "na", reason: "Nicht prüfbar: Du bist lokal angemeldet. Melde dich per SSO an und prüfe erneut." };
      return {
        ...row,
        status: "info",
        reason: errors
          ? `Dein Token trägt keine Client-Rollen von ${pc}. Entweder hast du keine, oder Mapper oder Scope „roles“ fehlen.`
          : `Dein Token trägt die Client-Rollen ${guide.roles?.names.slice(0, 1).join(", ") || "biletado-admin"} von ${pc}.`,
      };
    case 10:
      if (!portalSet)
        return { ...row, status: "na", reason: "Nicht prüfbar: Die Portal-URL ist leer." };
      return errors
        ? {
          ...row,
          status: "fail",
          reason: `Die Storefront schickt https://www.buchen.beispielstadt.de/api/auth/sso/callback, die Portal-URL nennt ${PORTAL_URL}.`,
        }
        : { ...row, status: "ok", reason: `Die Storefront schickt Rücksprungadressen unter ${PORTAL_URL}.` };
    default:
      return row;
    }
  });
}

function baseRows(guide) {
  const rows = [
    { id: 1, step: "realm", title: "Realm erreichbar, Issuer stimmt" },
    { id: 2, step: "public", title: "Web-Client ist public, mit Standard flow" },
    { id: 3, step: "public", title: "PKCE mit S256 erzwungen" },
    { id: 4, step: "addresses", title: "Rücksprungadressen nach dem Anmelden" },
    { id: 5, step: "addresses", title: "Abmelde-Adressen, auch „Benutzer wechseln“" },
    { id: 6, step: "addresses", title: "Web Origins" },
    { id: 7, step: "confidential", title: "API-Client darf Tokens prüfen" },
    { id: 8, step: "audience", title: "Audience: Token nennt den API-Client" },
    { id: 9, step: "roles", title: "Client-Rollen im Token" },
    { id: 10, step: "portal", title: "Portal-URL passt zur Storefront" },
  ];
  return rows.filter(
    (r) =>
      !(r.id === 6 && guide.mode === "bff") && !(r.id === 9 && !guide.roles)
  );
}

export function runCheck(guide) {
  check.state = "running";
  check.rows = [];
  setTimeout(() => {
    check.rows = buildCheckRows(guide);
    check.at = new Date();
    check.state = "done";
  }, 1200);
}

export function resetCheck() {
  check.state = "idle";
  check.rows = [];
  check.at = null;
}

export const STATUS = {
  ok: { label: "erfüllt", icon: "mdi-check-circle", color: "success" },
  fail: { label: "nicht erfüllt", icon: "mdi-close-circle", color: "error" },
  na: { label: "nicht prüfbar", icon: "mdi-help-circle", color: "grey" },
  info: { label: "Information", icon: "mdi-information", color: "info" },
  open: { label: "ungeprüft", icon: "mdi-circle-outline", color: "grey lighten-1" },
};

export function summary(rows) {
  const count = (s) => rows.filter((r) => r.status === s).length;
  const parts = [];
  if (count("ok")) parts.push(`${count("ok")} erfüllt`);
  if (count("fail")) parts.push(`${count("fail")} nicht erfüllt`);
  if (count("na")) parts.push(`${count("na")} nicht prüfbar`);
  if (count("info")) parts.push(`${count("info")} Information`);
  return parts.join(", ");
}

function stamp(date = new Date()) {
  return date.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function settingLines(settings, indent = "   ") {
  return settings.map((s) => `${indent}${s.name}: ${s.value}`);
}

function uriBlock(title, guide, key, indent = "   ") {
  const lines = [`${indent}${title}:`];
  for (const app of guide.apps) {
    for (const uri of app[key]) lines.push(`${indent}  ${uri}`);
  }
  return lines;
}

/** The guide as plain text, for the IT of the customer. */
export function guideAsText(guide) {
  const pc = guide.publicClient.text;
  const cc = guide.privateClient.text;
  const lines = [
    `Keycloak-Realm für Biletado einrichten: ${guide.instanceName}`,
    `Erstellt am ${stamp()} im Admin UI (Modus ${guide.mode === "bff" ? "BFF" : "direct"}).`,
    "",
    `${guide.version}.`,
    `Keycloak-URL: ${guide.serverUrl.text}`,
    `Realm: ${guide.realm.text}`,
    `Issuer: ${guide.issuer.text}`,
    "",
    `1. Client ${pc} (public, für Admin UI und Storefront)`,
    ...settingLines(guide.publicSettings),
    ...uriBlock("Valid redirect URIs", guide, "redirectUris"),
    ...uriBlock("Valid post logout redirect URIs", guide, "postLogoutUris"),
    ...uriBlock("Web origins", guide, "webOrigins"),
    "",
    `2. Audience-Mapper im Client scope ${pc}-dedicated`,
    ...settingLines(guide.audienceMapper.slice(1)),
    "",
    `3. Client ${cc} (confidential, nur für Token-Introspection)`,
    ...settingLines(guide.confidentialSettings),
  ];
  if (guide.roles) {
    lines.push(
      "",
      `4. Client-Rollen am Client ${pc}`,
      `   Rollen: ${guide.roles.names.join(", ") || "‹noch keine Rollenzuweisung in Biletado›"}`,
      ...settingLines(guide.roles.settings.slice(1)),
      `   Achtung: ${guide.roles.warning}`
    );
  }
  for (const app of guide.apps) {
    if (app.hint) lines.push("", `Hinweis zu ${app.label}: ${app.hint}`);
  }
  lines.push("", "Hinweise", ...guide.notes.map((n) => `- ${n}`));
  return lines.join("\n");
}

/** The check result as plain text. */
export function checkAsText(guide, rows, at) {
  const lines = [
    `Prüfung des Keycloak-Realms ${guide.issuer.text}`,
    `für ${guide.instanceName}, am ${stamp(at || new Date())}: ${summary(rows)}`,
    "",
  ];
  for (const row of rows) {
    lines.push(`[${STATUS[row.status].label}] ${row.id}. ${row.title}`);
    lines.push(`   ${row.reason}`);
    for (const part of row.parts || []) {
      lines.push(`   - ${part.label}: ${STATUS[part.status].label}, ${part.reason}`);
    }
  }
  return lines.join("\n");
}
