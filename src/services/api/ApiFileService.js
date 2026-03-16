export default {
  getFiles({ tenantID, includeProtected }) {
    if (tenantID) {
      return ApiClient.get(
        `api/${tenantID}/files/list?includeProtected=${
          includeProtected ? "true" : "false"
        }`
      );
    } else {
      return ApiClient.get(
        `api/files/list?includeProtected=${includeProtected ? "true" : "false"}`
      );
    }
  },
  getFile({ tenantID, name }) {
    if (tenantID) {
      return ApiClient.get(`api/${tenantID}/files/get?name=${name}`, {
        responseType: "blob",
      });
    } else {
      return ApiClient.get(`api/files/get?name=${name}`, {
        responseType: "blob",
      });
    }
  },
  createFile({ tenantID, formData }) {
    if (tenantID) {
      return ApiClient.post(`api/${tenantID}/files`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } else {
      return ApiClient.post("api/files", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    }
  },
};
