import store from "@/store";
import { getApiHttpBaseUrl } from "@/services/auth/authMode";

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
  // The address of the binary route. Public media are served without auth
  // (`optionalAuth` at the route, §4.6), so a plain <img src> reaches them —
  // and gets the browser cache the header matrix is written for.
  getMediaFileUrl(scope, mediaId, size) {
    const query = size ? `?size=${encodeURIComponent(size)}` : "";
    return `${getApiHttpBaseUrl()}/${basePath(scope)}/${mediaId}/file${query}`;
  },
  // The address of a medium as it is *stored* on an entity — the backend's own
  // delivery route, with no client prefix in front of it.
  //
  // `getMediaFileUrl` is for loading an image inside this app: it carries the
  // BFF base, which is an address only this browser understands. Persisting
  // that would hand the storefront, the mails and the HTML endpoint a URL that
  // means nothing to them, so an untyped legacy site gets this instead.
  getMediaFilePath(scope, mediaId) {
    return `/${basePath(scope)}/${mediaId}/file`;
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
