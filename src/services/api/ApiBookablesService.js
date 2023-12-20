import store from "@/store";
import { uniqueId } from "lodash/util";

const currentTenant = store.getters["tenants/tenant"];

export default {
  getBookables(tenant, populate) {
    const t = tenant || currentTenant.id;
    return ApiClient.get(`api/${t}/bookables?populate=${populate}`, {
      withCredentials: true,
    });
  },
  getBookable(id, tenant, populate) {
    const t = tenant || currentTenant.id;
    return ApiClient.get(`api/${t}/bookables/${id}?populate=${populate}`, {
      withCredentials: true,
    });
  },
  createOrUpdateBookable(tenant) {
    const bookablesForm = store.getters["bookables/form"];
    const t = tenant || currentTenant.id;
    const formData = { ...bookablesForm };
    formData.tenant = t;

    if (formData.priceEur && typeof formData.priceEur === "string") {
      formData.priceEur = formData.priceEur.replace(",", ".");
      formData.priceEur = Number(formData.priceEur);
    }

    formData.specialOpeningHours = formData.specialOpeningHours.filter((item) => item.date !== null);

    return ApiClient.put(`api/${t}/bookables`, formData, {
      withCredentials: true,
    });
  },
  deleteBookable(bookableId) {
    return ApiClient.delete(`api/${currentTenant.id}/bookables/${bookableId}`, {
      withCredentials: true,
    });
  },
  duplicateBookable(bookableId) {
    return new Promise((resolve, reject) => {
      ApiClient.get(`api/${currentTenant.id}/bookables/${bookableId}`)
        .then((getBookingResponse) => {
          const bookable = Object.assign(new Object(), getBookingResponse.data);

          delete bookable.id;
          delete bookable._id;

          bookable.title = `${bookable.title} (Kopie)`;

          if (bookable) {
            ApiClient.put(`api/${currentTenant.id}/bookables`, bookable, {
              withCredentials: true,
            })
              .then((putBookingResponse) => {
                resolve(putBookingResponse);
              })
              .catch((error) => {
                reject(error);
              });
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  getReleatedOpeningHours(bookableId, tenant) {
    const t = tenant || currentTenant.id;
    return ApiClient.get(`api/${t}/bookables/${bookableId}/openingHours`, {
      withCredentials: true,
    });
  }
};
