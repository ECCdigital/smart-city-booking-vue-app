class ApiRuleEngineService {
  static async getMeta() {
    const response = await ApiClient.get("api/rules/meta");
    return response.data;
  }

  static async getRules() {
    const response = await ApiClient.get("api/rules");
    return response.data;
  }

  static async getRule(id) {
    const response = await ApiClient.get(`api/rules/${id}`);
    return response.data;
  }

  static async createRule(rule) {
    const response = await ApiClient.post("api/rules", rule);
    return response.data;
  }

  static async updateRule(id, rule) {
    const response = await ApiClient.put(`api/rules/${id}`, rule);
    return response.data;
  }

  static async setEnabled(id, enabled) {
    const response = await ApiClient.put(`api/rules/${id}/enabled`, {
      enabled,
    });
    return response.data;
  }

  static async deleteRule(id) {
    const response = await ApiClient.delete(`api/rules/${id}`);
    return response.data;
  }

  static async runRule(id) {
    const response = await ApiClient.post(`api/rules/${id}/run`);
    return response.data;
  }

  static async dryRunRule(id) {
    const response = await ApiClient.post(`api/rules/${id}/dry-run`);
    return response.data;
  }

  static async getExecutions(params = {}) {
    const response = await ApiClient.get("api/rules/executions", { params });
    return response.data;
  }

  static async getRuleExecutions(id, params = {}) {
    const response = await ApiClient.get(`api/rules/${id}/executions`, {
      params,
    });
    return response.data;
  }
}

export default ApiRuleEngineService;
