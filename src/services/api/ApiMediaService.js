import store from "@/store";

export const MEDIA_SCOPE = Object.freeze({
  TENANT: "tenant",
  INSTANCE: "instance",
});

// The instance library shares the routes of the tenant library; the missing
// tenant segment is what puts a request into the instance scope.
function basePath(scope) {
  if (scope === MEDIA_SCOPE.INSTANCE) {
    return "api/v2/instance/media";
  }
  const t = store.getters["tenants/currentTenantId"];
  return `api/v2/${t}/media`;
}

export default {
  getMediaList(scope, { page, pageSize, kind, tag, q, visibility } = {}) {
    return ApiClient.get(basePath(scope), {
      params: { page, pageSize, kind, tag, q, visibility },
    });
  },
  getMedia(scope, mediaId) {
    return ApiClient.get(`${basePath(scope)}/${mediaId}`);
  },
  updateMedia(scope, mediaId, updates) {
    return ApiClient.patch(`${basePath(scope)}/${mediaId}`, updates);
  },
  deleteMedia(scope, mediaId) {
    return ApiClient.delete(`${basePath(scope)}/${mediaId}`);
  },
  getMediaUsage(scope, mediaId) {
    return ApiClient.get(`${basePath(scope)}/${mediaId}/usage`);
  },
  uploadMedia(scope, { file, visibility, tags }, onUploadProgress) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);
    if (visibility) {
      formData.append("visibility", visibility);
    }
    if (tags && tags.length > 0) {
      formData.append("tags", tags.join(","));
    }
    return ApiClient.post(basePath(scope), formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
  },
  // Binary delivery goes through the API client so `intern` media load with
  // credentials in both auth modes — a plain <img src> would carry none.
  getMediaFileBlob(scope, mediaId, size) {
    return ApiClient.get(`${basePath(scope)}/${mediaId}/file`, {
      params: { size },
      responseType: "blob",
    });
  },
};
