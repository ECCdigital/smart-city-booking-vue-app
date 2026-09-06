/**
 * The tenant applications for doors and locker systems.
 *
 * They are configured under "Zutritt & Schließsysteme" but still travel in
 * the tenant's `applications` array, so the tenant page has to carry them
 * through a save unchanged - which only works if both pages agree on their
 * shape.
 *
 * All four are of type `access`: the backend schema knows no other type for
 * them since the migration, and there is no fallback - a tenant whose
 * applications were not migrated reads as not configured.
 */
export const LOCK_AND_ACCESS_APP_IDS = ["pareva", "ifbs", "nuki", "salto-ks"];

/**
 * The application a tenant has stored under `id`, if it has one the current
 * schema knows.
 *
 * For a lock or access provider only `type: "access"` counts. A tenant whose
 * applications were not migrated still carries the old `type: "locker"`,
 * which is out of the schema: the backend hands such an entry back untouched
 * but its provider layer does not see it, and reading it into the form would
 * write the dead type out again on the next save. So it does not count as
 * stored - the provider reads as not configured and is set up again.
 *
 * Every other application - the payment ones - is found by id alone.
 *
 * @param {Array} applications The tenant's `applications` array
 * @param {string} id An application id, e.g. "pareva" or "invoice"
 * @returns {Object|undefined} The stored application, or undefined
 */
export function findTenantApp(applications, id) {
  const stored = (applications || []).find((app) => app.id === id);

  if (stored && LOCK_AND_ACCESS_APP_IDS.includes(id)) {
    return stored.type === "access" ? stored : undefined;
  }

  return stored;
}

export function createLockAndAccessAppDefaults() {
  return {
    pareva: {
      type: "access",
      id: "pareva",
      title: "Pareva",
      serverUrl: "",
      lockerId: "",
      user: "",
      password: "",
      active: false,
    },
    ifbs: {
      type: "access",
      id: "ifbs",
      title: "Parkraumservice",
      serverUrl: "",
      secretPhrase: "",
      apiKeyID: "",
      apiKey: "",
      active: false,
      customerService: {
        name: "",
        email: "",
        phone: "",
      },
    },
    nuki: {
      type: "access",
      id: "nuki",
      title: "Nuki",
      apiToken: "",
      apiBaseUrl: "https://api.nuki.io",
      active: false,
    },
    "salto-ks": {
      type: "access",
      id: "salto-ks",
      title: "Salto KS",
      clientId: "",
      clientSecret: "",
      username: "",
      password: "",
      siteId: "",
      environment: "accept",
      active: false,
    },
  };
}

/**
 * Drop the secret fields that were left empty. An empty field means
 * "unchanged", and leaving the key out is what keeps the stored (encrypted)
 * value on the server.
 *
 * @param {Object} app A tenant application about to be saved
 * @returns {Object} A copy without the untouched secrets
 */
export function withoutUnchangedSecrets(app) {
  const result = { ...app };

  if (result.id === "nuki" && !result.apiToken) {
    delete result.apiToken;
  }
  if (result.id === "salto-ks" && !result.clientSecret) {
    delete result.clientSecret;
  }
  if (result.id === "salto-ks" && !result.password) {
    delete result.password;
  }

  return result;
}
