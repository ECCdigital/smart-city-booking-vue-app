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
}

export default ApiInstanceService;
