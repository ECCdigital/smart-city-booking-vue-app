export default {
  validateCheckoutItem(
    tenant,
    item,
    timeBegin,
    timeEnd,
    couponCode,
    bookWithPrice
  ) {
    return ApiClient.post(`api/${tenant}/checkout/validateItem`, {
      ...item,
      tenant,
      timeBegin,
      timeEnd,
      couponCode,
      bookWithPrice,
    });
  },
  checkout(tenant, payload, simulate = true) {
    return ApiClient.post(
      `api/${tenant}/checkout?simulate=${simulate === true ? "true" : "false"}`,
      payload
    );
  },
  groupCheckout(tenantId, payload, simulate = true) {
    return ApiClient.post(
      `api/${tenantId}/checkout/group?simulate=${simulate}`,
      payload
    );
  },
  getCheckoutPermissions(tenantId, id) {
    return ApiClient.get(`api/${tenantId}/checkout/permissions/${id}`);
  },
};
