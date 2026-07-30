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
      ...(excludeBookingIds?.length
        ? { excludeBookingIds }
        : {}),
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
