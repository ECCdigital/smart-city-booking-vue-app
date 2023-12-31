export default {
  getFiles(tenant, includeProtected) {
    return ApiClient.get(
      `api/${tenant}/files/list?includeProtected=${
        includeProtected ? "true" : "false"
      }`,
      {
        withCredentials: true,
      }
    );
  },
  createFile(tenant, formData) {
    return ApiClient.post(`api/${tenant}/files`, formData, {
      withCredentials: true,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
