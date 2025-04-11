import store from "@/store";
export default {
  getBookables(tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables?populate=${populate}`, {
      withCredentials: true,
    });
  },
  getPublicBookables(tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables/public?populate=${populate}`, {
      withCredentials: true,
    });
  },
  getBookable(id, tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables/${id}?populate=${populate}`, {
      withCredentials: true,
    });
  },
  getPublicBookable(id, tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables/public/${id}?populate=${populate}`, {
      withCredentials: true,
    });
  },
  createOrUpdateBookable(tenant) {
    const bookablesForm = store.getters["bookables/form"];
    const t = tenant || store.getters["tenants/currentTenantId"];
    const formData = { ...bookablesForm };
    formData.tenantId = t;

    if (formData.priceEur && typeof formData.priceEur === "string") {
      formData.priceEur = formData.priceEur.replace(",", ".");
      formData.priceEur = Number(formData.priceEur);
    }

    if (
      formData.priceValueAddedTax &&
      typeof formData.priceValueAddedTax === "string"
    ) {
      formData.priceValueAddedTax = formData.priceValueAddedTax.replace(
        ",",
        "."
      );
      formData.priceValueAddedTax = Number(formData.priceValueAddedTax);
    }

    formData.specialOpeningHours = formData.specialOpeningHours.filter(
      (item) => item.date !== null
    );

    return ApiClient.put(`api/${t}/bookables`, formData, {
      withCredentials: true,
    });
  },
  deleteBookable(bookableId) {
    return ApiClient.delete(
      `api/${store.getters["tenants/currentTenantId"]}/bookables/${bookableId}`,
      {
        withCredentials: true,
      }
    );
  },
  duplicateBookable(bookableId) {
    return new Promise((resolve, reject) => {
      ApiClient.get(
        `api/${store.getters["tenants/currentTenantId"]}/bookables/${bookableId}`,
        {
          withCredentials: true,
        }
      )
        .then((getBookingResponse) => {
          const bookable = Object.assign(new Object(), getBookingResponse.data);

          delete bookable.id;
          delete bookable._id;

          bookable.title = `${bookable.title} (Kopie)`;

          if (bookable) {
            ApiClient.put(
              `api/${store.getters["tenants/currentTenantId"]}/bookables`,
              bookable,
              {
                withCredentials: true,
              }
            )
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
  getRelatedOpeningHours(bookableId, tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables/${bookableId}/openingHours`, {
      withCredentials: true,
    });
  },
  getBookableAvailability(bookableId, tenantId, startDate, endDate, amount) {
    return ApiClient.get(
      `api/${tenantId}/bookables/${bookableId}/availability?startDate=${startDate}&endDate=${endDate}&amount=${amount}`,
      {
        withCredentials: true,
      }
    );
  },
  async publicBookableCountCheck(tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return (
      await ApiClient.get(`api/${t}/bookables/count/check`, {
        withCredentials: true,
      })
    ).data;
  },
};
