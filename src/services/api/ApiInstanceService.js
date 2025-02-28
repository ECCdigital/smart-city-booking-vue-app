class ApiInstanceService {
  static async getInstance(publicInstance = true) {
    const response = await ApiClient.get(`api/instances?publicInstance=${publicInstance}`, {
      withCredentials: true,
    });
    return response.data;
  }

  static async updateInstance(instance) {
    const response = await ApiClient.put("api/instances", instance,{
      withCredentials: true,
    });
    return response.data;
  }
}

export default ApiInstanceService;
