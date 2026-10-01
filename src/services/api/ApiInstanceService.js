import ApiClient from "./ApiClientService";

class ApiInstanceService {
  static async getInstance() {
    const response = await ApiClient.get("api/instances");
    return response.data;
  }

  static async getPublicInstance() {
    const response = await ApiClient.get("api/instances/public");
    return response.data;
  }

  static async updateInstance(instance) {
    const response = await ApiClient.put("api/instances", instance);
    return response.data;
  }

  static async getBookableCustomFields() {
    const response = await ApiClient.get(
      "api/instances/bookable-custom-fields"
    );
    return response.data;
  }

  /**
   * „Realm prüfen“: the backend checks the stored realm from outside, without
   * the Admin API, and answers `{ checkedAt, rows }`. Same path in both modes;
   * in BFF mode the BFF proxies it with the session's token.
   *
   * @param {{ mode: "direct"|"bff", apps: object[] }} body the mode and the
   *   Rücksprungadressen the Anleitung shows, see `checkBody`
   */
  static async checkKeycloakRealm(body) {
    const response = await ApiClient.post("api/instances/keycloak/check", body);
    return response.data;
  }
}

export default ApiInstanceService;
