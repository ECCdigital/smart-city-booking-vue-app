/**
 * The tenant applications for lockers and door access.
 *
 * They are configured under "Zutritt & Schließsysteme" but still travel in
 * the tenant's `applications` array, so the tenant page has to carry them
 * through a save unchanged - which only works if both pages agree on their
 * shape.
 */
export const LOCK_AND_ACCESS_APP_IDS = ["pareva", "ifbs", "nuki", "salto-ks"];

export function createLockAndAccessAppDefaults() {
  return {
    pareva: {
      type: "locker",
      id: "pareva",
      title: "Pareva",
      serverUrl: "",
      lockerId: "",
      user: "",
      password: "",
      active: false,
    },
    ifbs: {
      type: "locker",
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
      apiBaseUrl: "https://clp-accept-user.my-clay.com",
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
