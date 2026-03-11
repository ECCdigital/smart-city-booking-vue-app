export default {
  validateCheckoutItem(
    tenant,
    item,
    timeBegin,
    timeEnd,
    couponCode,
    bookWithPrice,
    checkoutID
  ) {

    console.log("Validating checkout item with the following details:");
    console.log("Tenant:", tenant);
    console.log("Item:", item);
    console.log("Time Begin:", timeBegin);
    console.log("Time End:", timeEnd);
    console.log("Coupon Code:", couponCode);
    console.log("Book With Price:", bookWithPrice);
    console.log("Checkout ID:", checkoutID);

    return ApiClient.post(`api/${tenant}/checkout/validateItem`, {
      ...item,
      tenant,
      timeBegin,
      timeEnd,
      couponCode,
      bookWithPrice,
      checkoutId: checkoutID,
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
