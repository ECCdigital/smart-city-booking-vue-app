export default {
  getFiles(tenant, includeProtected) {
    return ApiClient.get(
      `api/${tenant}/files/list?includeProtected=${
        includeProtected ? "true" : "false"
      }`
    );
  },
  getFile(tenant, name) {
    return ApiClient.get(`api/${tenant}/files/get?name=${name}`, {
      responseType: "blob",
    });
  },
  createFile(tenant, formData) {
    return ApiClient.post(`api/${tenant}/files`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
