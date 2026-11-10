import {
  checkoutUploadParts,
  groupCheckoutUploadParts,
  hasCheckoutUploads,
} from "@/utils/customerUploads";

/** A multipart request of its parts, a file under its own name. */
function formOf(parts) {
  const form = new FormData();
  for (const [name, value] of parts) {
    if (typeof value === "string") form.append(name, value);
    else form.append(name, value, value.name);
  }
  return form;
}

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

export default {
  validateCheckoutItem(
    tenant,
    item,
    timeBegin,
    timeEnd,
    couponCode,
    bookWithoutDiscount,
    checkoutID,
    excludeBookingIds
  ) {
    return ApiClient.post(`api/${tenant}/checkout/validateItem`, {
      ...item,
      tenant,
      timeBegin,
      timeEnd,
      couponCode,
      bookWithoutDiscount,
      checkoutId: checkoutID,
      ...(excludeBookingIds?.length ? { excludeBookingIds } : {}),
    });
  },
  /**
   * The checkout of a single booking. With files of the upload fields "in
   * the checkout" (`files` by field id) it goes as
   * multipart: the payload as JSON in `checkout`, each file under its field.
   */
  checkout(tenant, payload, simulate = true, files = {}) {
    const url = `api/${tenant}/checkout?simulate=${
      simulate === true ? "true" : "false"
    }`;
    if (!hasCheckoutUploads(files)) {
      return ApiClient.post(url, payload);
    }
    return ApiClient.post(
      url,
      formOf(checkoutUploadParts(payload, files)),
      MULTIPART
    );
  },
  /**
   * The checkout of a series. With files of the upload fields "in the
   * checkout" (each `{ key, fieldId, file,
   * attempts }`) it goes as multipart: the payload with
   * `customerUploadTargets` as JSON in `checkout`, each file under its key.
   */
  groupCheckout(tenantId, payload, simulate = true, uploads = []) {
    const url = `api/${tenantId}/checkout/group?simulate=${simulate}`;
    if (!uploads?.length) {
      return ApiClient.post(url, payload);
    }
    return ApiClient.post(
      url,
      formOf(groupCheckoutUploadParts(payload, uploads)),
      MULTIPART
    );
  },
  getCheckoutPermissions(tenantId, id) {
    return ApiClient.get(`api/${tenantId}/checkout/permissions/${id}`);
  },
};
