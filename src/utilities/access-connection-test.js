import i18n from "@/language/index";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";

/**
 * Runs the connection test of an access provider and reads the answer: the
 * backend's body with `success` as a boolean, or `{ success: false, message }`
 * for a request that failed, its message read by `getApiErrorMessage`.
 *
 * @param {string} tenantId
 * @param {Object} credentials The credentials as the form holds them
 * @param {string} provider The provider id, e.g. "nuki" or "salto-ks"
 * @returns {Promise<Object>} The result of the test
 */
export async function runConnectionTest(tenantId, credentials, provider) {
  try {
    const { data } = await ApiAccessAppsService.testConnection(
      tenantId,
      credentials,
      provider
    );
    return { ...data, success: data.success === true };
  } catch (error) {
    return {
      success: false,
      message: getApiErrorMessage(
        error,
        i18n.t("accessPoint.connection.error.message")
      ),
    };
  }
}
