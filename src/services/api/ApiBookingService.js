import store from "@/store";
export default {
  getBookings(tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const p = populate || false;
    return ApiClient.get(`api/${t}/bookings?populate=${p}`);
  },
  getBooking(id, tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const p = populate || false;
    return ApiClient.get(`api/${t}/bookings/${id}?populate=${p}`);
  },
  getPublicBookings(tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookings?public=true`);
  },
  getBookingStatus(id, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookings/${id}/status`);
  },
  getRelatedBookings(
    bookableId,
    tenant,
    includeRelatedBookables,
    includeParentBookables,
    publicOnly
  ) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const irb = includeRelatedBookables || false;
    const ipb = includeParentBookables || false;
    const po = publicOnly || false;

    //TODO: check if typo-correction interferes anywhere
    return ApiClient.get(
      `api/${t}/bookables/${bookableId}/bookings?related=${irb}&parent=${ipb}&public=${po}`
    );
  },
  /** A manual booking of the administration (`POST`). */
  createBooking(booking) {
    const cleansedBooking = Object.assign(new Object(), booking);
    return ApiClient.post(
      `api/${store.getters["tenants/currentTenantId"]}/bookings`,
      cleansedBooking
    );
  },
  updateBooking(booking) {
    const cleansedBooking = Object.assign(new Object(), booking);
    return ApiClient.put(
      `api/${store.getters["tenants/currentTenantId"]}/bookings`,
      cleansedBooking
    );
  },
  checkoutBooking(bookingAttempt, simulate, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/${t}/checkout?simulate=${simulate || false}`,
      bookingAttempt
    );
  },
  async commitBooking(id) {
    const response = await ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/commit`
    );
    return response.data;
  },
  async payBooking(id, paymentMethod, timePaid) {
    const response = await ApiClient.post(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/pay`,
      { paymentMethod: paymentMethod, timePaid }
    );
    return response.data;
  },
  /**
   * Wiederherstellen: `rejected` back to `requested`, `cancelled` back to where it was cancelled from.
   * A period other bookings took meanwhile is a 409 `booking_reinstatement_conflict`
   * unless `ignoreConflicts` is set.
   */
  async reinstateBooking(id, { ignoreConflicts = false } = {}) {
    const response = await ApiClient.post(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/reinstate`,
      ignoreConflicts ? { ignoreConflicts: true } : {}
    );
    return response.data;
  },
  /** Widerruf akzeptieren: a live booking to `withdrawn`, for good. */
  async acceptWithdrawal(id) {
    const response = await ApiClient.post(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/accept-withdrawal`,
      {}
    );
    return response.data;
  },
  /** Sets the refund state of a cancelled booking (glossary „Erstattungsstand“): `completed`, or back to `open`. */
  setRefundState(id, refundState) {
    return ApiClient.put(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/refund-state`,
      { refundState }
    );
  },
  async getCancellationRefundPreview(id, tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const response = await ApiClient.get(
      `api/${t}/bookings/${id}/cancellation-refund-preview`
    );
    return response.data;
  },
  async getPublicCancellationRefundPreview(id, tenantId, name) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const response = await ApiClient.get(
      `api/${t}/bookings/${id}/cancellation-refund-preview/public`,
      {
        params: { name },
      }
    );
    return response.data;
  },
  async getHookCancellationRefundPreview(id, tenantId, hookId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const response = await ApiClient.get(
      `api/${t}/bookings/${id}/hooks/${hookId}/cancellation-refund-preview`
    );
    return response.data;
  },
  rejectBooking(
    id,
    tenantId,
    reason,
    skipCancellation,
    bankDetails,
    refundPercentage
  ) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const payload = {
      reason: reason,
      skipCancellation: skipCancellation,
    };
    if (bankDetails) {
      payload.bankDetails = bankDetails;
    }
    if (refundPercentage !== undefined) {
      payload.refundPercentage = refundPercentage;
    }
    return ApiClient.post(`api/${t}/bookings/${id}/reject`, payload);
  },
  requestRejectBooking(id, tenantId, reason, bankDetails) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    const payload = { reason: reason };
    if (bankDetails) {
      payload.bankDetails = bankDetails;
    }
    return ApiClient.post(`api/${t}/bookings/${id}/request-reject`, payload);
  },
  releaseBookingHook(id, tenantId, hookId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookings/${id}/hooks/${hookId}/release`);
  },
  deleteBooking(id) {
    return ApiClient.delete(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}`
    );
  },
  async generateReceipt(id) {
    const response = await ApiClient.post(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/receipt`,
      {}
    );
    return response.data;
  },
  async generateInvoice(id, sendEmail = false) {
    const response = await ApiClient.post(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/invoice?sendEmail=${sendEmail}`,
      {}
    );
    return response.data;
  },
  getReceipt(id, receiptId) {
    return ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/receipt/${receiptId}`,
      {
        responseType: "blob",
      }
    );
  },
  getInvoice(id, invoiceId) {
    return ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/invoice/${invoiceId}`,
      {
        responseType: "blob",
      }
    );
  },
  /** Reissues the cancellation receipt as a revision under the same number; answers with the booking. */
  async reprintCancellationReceipt(id) {
    const response = await ApiClient.post(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/cancellation-receipt`,
      {}
    );
    return response.data;
  },
  /** The withdrawal receipt („Widerrufbeleg“) of a withdrawn booking, by file name. */
  getWithdrawalReceipt(id, withdrawalReceiptId) {
    return ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/withdrawal-receipt/${withdrawalReceiptId}`,
      {
        responseType: "blob",
      }
    );
  },
  getCancellationReceipt(id, cancellationReceiptId) {
    return ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/bookings/${id}/cancellation-receipt/${cancellationReceiptId}`,
      {
        responseType: "blob",
      }
    );
  },
  async downloadBookingIcal(id) {
    return await ApiClient.get(
      `api/${store.getters["tenants/currentTenantId"]}/ical/bookings/${id}`
    );
  },
  downloadGroupBookingIcal(ids, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/ical/bookings?ids=${ids.join(",")}`);
  },
  checkPublicBookingStatus(id, lastname, tenantId) {
    return ApiClient.get(`api/${tenantId}/bookings/${id}/status/public`, {
      params: {
        lastname: lastname,
      },
    });
  },
  verifyBookingOwnership(tenantId, bookingId, bookingName) {
    return ApiClient.get(
      `api/${tenantId}/bookings/${bookingId}/verify-ownership`,
      {
        params: {
          name: bookingName,
        },
      }
    );
  },
  /**
   * Checks a customer upload: `accepted`, or
   * `rejected` with a reason. The backend deletes the file and answers the
   * booking's `customerUploadState`.
   */
  reviewCustomerUpload(
    tenantId,
    bookingId,
    fieldId,
    mediaId,
    result,
    reason,
    alsoFor = null
  ) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/v2/${encodeURIComponent(t)}/bookings/${encodeURIComponent(
        bookingId
      )}/customer-uploads/${encodeURIComponent(fieldId)}/${encodeURIComponent(
        mediaId
      )}/review`,
      // An upload of a series: the other bookings the check counts for;
      // the backend takes all without.
      alsoFor ? { result, reason, alsoFor } : { result, reason }
    );
  },
  /** „Erneut anfordern“ of a checked upload field, with a reason. */
  requestCustomerUploadAgain(tenantId, bookingId, fieldId, reason) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/v2/${encodeURIComponent(t)}/bookings/${encodeURIComponent(
        bookingId
      )}/customer-uploads/${encodeURIComponent(fieldId)}/request-again`,
      { reason }
    );
  },
  /** „Nachweise anfordern“: mails the booker the required proofs missing. */
  remindCustomerUploads(tenantId, bookingId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.post(
      `api/v2/${encodeURIComponent(t)}/bookings/${encodeURIComponent(
        bookingId
      )}/customer-uploads/remind`,
      {}
    );
  },
  /**
   * The booking of a signed link of the page „Nachweise einreichen“
   * (`/booking/proofs`), without a sign-in: provider, time, offers and the
   * derived state of its uploads.
   */
  readCustomerUploadsByLink({ tenantId, bookingId }, link) {
    return ApiClient.get(customerUploadLinkUrl(tenantId, bookingId), {
      headers: { [CUSTOMER_UPLOAD_LINK_HEADER]: link },
    });
  },
  /** A file for an upload field, with the signed link. */
  uploadCustomerUploadByLink({ tenantId, bookingId }, link, fieldId, file) {
    return ApiClient.post(
      customerUploadLinkUrl(tenantId, bookingId, fieldId),
      fileForm(file),
      linkMultipart(link)
    );
  },
  /** A file in place of one not checked yet, with the signed link. */
  replaceCustomerUploadByLink(
    { tenantId, bookingId },
    link,
    fieldId,
    mediaId,
    file
  ) {
    return ApiClient.put(
      customerUploadLinkUrl(tenantId, bookingId, fieldId, mediaId),
      fileForm(file),
      linkMultipart(link)
    );
  },
  /** Deletes a file not checked yet, with the signed link. */
  removeCustomerUploadByLink({ tenantId, bookingId }, link, fieldId, mediaId) {
    return ApiClient.delete(
      customerUploadLinkUrl(tenantId, bookingId, fieldId, mediaId),
      { headers: { [CUSTOMER_UPLOAD_LINK_HEADER]: link } }
    );
  },
};

/** The header the signed link of a booking goes in, in place of a sign-in. */
const CUSTOMER_UPLOAD_LINK_HEADER = "X-Customer-Upload-Link";

function customerUploadLinkUrl(tenantId, bookingId, ...rest) {
  return [
    `api/v2/${encodeURIComponent(tenantId)}/bookings/${encodeURIComponent(
      bookingId
    )}/customer-uploads-by-link`,
    ...rest.map(encodeURIComponent),
  ].join("/");
}

function fileForm(file) {
  const form = new FormData();
  form.append("file", file);
  return form;
}

function linkMultipart(link) {
  return {
    headers: {
      "Content-Type": "multipart/form-data",
      [CUSTOMER_UPLOAD_LINK_HEADER]: link,
    },
  };
}
