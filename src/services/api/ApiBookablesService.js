import store from "@/store";
export default {
  getBookables(tenant, populate) {
    const t = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.get(`api/${t}/bookables?populate=${populate}`, {
      withCredentials: true,
    });
  },
  getBookable(id, tenant, populate) {
    const t = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.get(`api/${t}/bookables/${id}?populate=${populate}`, {
      withCredentials: true,
    });
  },
  createOrUpdateBookable(tenant) {
    const bookablesForm = store.getters["bookables/form"];
    const t = tenant || store.getters["tenants/tenant"].id;
    const formData = { ...bookablesForm };
    formData.tenant = t;

    if (formData.priceEur && typeof formData.priceEur === "string") {
      formData.priceEur = formData.priceEur.replace(",", ".");
      formData.priceEur = Number(formData.priceEur);
    }

    formData.specialOpeningHours = formData.specialOpeningHours.filter(
      (item) => item.date !== null
    );

    return ApiClient.put(`api/${t}/bookables`, formData, {
      withCredentials: true,
    });
  },
  deleteBookable(bookableId) {
    return ApiClient.delete(`api/${store.getters["tenants/tenant"].id}/bookables/${bookableId}`, {
      withCredentials: true,
    });
  },
  duplicateBookable(bookableId) {
    return new Promise((resolve, reject) => {
      ApiClient.get(`api/${store.getters["tenants/tenant"].id}/bookables/${bookableId}`)
        .then((getBookingResponse) => {
          const bookable = Object.assign(new Object(), getBookingResponse.data);

          delete bookable.id;
          delete bookable._id;

          bookable.title = `${bookable.title} (Kopie)`;

          if (bookable) {
            ApiClient.put(`api/${store.getters["tenants/tenant"].id}/bookables`, bookable, {
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
  getRelatedOpeningHours(bookableId, tenant) {
    const t = tenant || store.getters["tenants/tenant"].id;
    return ApiClient.get(`api/${t}/bookables/${bookableId}/openingHours`, {
      withCredentials: true,
    });
  },
  getBookableAvailability(bookableId, tenant, startDate, endDate, amount) {
    return ApiClient.get(
      `api/${tenant}/bookables/${bookableId}/availability?startDate=${startDate}&endDate=${endDate}&amount=${amount}`,
      {
        withCredentials: true,
      }
    );
  },
  async publicBookableCountCheck(tenant) {
    const t = tenant || store.getters["tenants/tenant"].id;
    return (await ApiClient.get(`api/${t}/bookables/count/check`, {
      withCredentials: true,
    })).data
  }
};
