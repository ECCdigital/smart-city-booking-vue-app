import store from "@/store";
import { prunedAmounts } from "@/utilities/access-point-amounts";
export default {
  getBookables(tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables?populate=${populate}`);
  },
  getPublicBookables(tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables/public?populate=${populate}`);
  },
  getBookable(id, tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables/${id}?populate=${populate}`);
  },
  getPublicBookable(id, tenant, populate) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `api/${t}/bookables/public/${id}?populate=${populate}`
    );
  },
  getBookablePrices(bookableId, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables/${bookableId}/prices`);
  },
  async createOrUpdateBookable(bookable, tenant) {
    const t = tenant || store.getters["tenants/currentTenantId"];
    const formData = { ...bookable };
    formData.tenantId = t;

    // Derived from the access points on the way out, dropped on the way in:
    // sending it would claim a write permission that does not exist.
    delete formData.lockerDetails;

    // An amount distributed to an access point the bookable no longer
    // references means nothing. The backend discards it as well - doing it
    // here too keeps the request free of what it cannot mean. A bookable that
    // carries no distribution at all keeps carrying none: the field is
    // additive, and an empty map is not the same statement as its absence.
    const accessDetails = formData.accessPointDetails;
    if (accessDetails && accessDetails.accessPointAmounts !== undefined) {
      formData.accessPointDetails = {
        ...accessDetails,
        accessPointAmounts: prunedAmounts(
          accessDetails.accessPointAmounts,
          accessDetails.accessPointIds
        ),
      };
    }

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

    return ApiClient.put(`api/${t}/bookables`, formData);
  },
  deleteBookable(bookableId) {
    return ApiClient.delete(
      `api/${store.getters["tenants/currentTenantId"]}/bookables/${bookableId}`
    );
  },
  duplicateBookable(bookableId) {
    return new Promise((resolve, reject) => {
      ApiClient.get(
        `api/${store.getters["tenants/currentTenantId"]}/bookables/${bookableId}`
      )
        .then((getBookingResponse) => {
          const bookable = Object.assign(new Object(), getBookingResponse.data);

          delete bookable.id;
          delete bookable._id;
          delete bookable.lockerDetails;

          bookable.title = `${bookable.title} (Kopie)`;

          if (bookable) {
            ApiClient.put(
              `api/${store.getters["tenants/currentTenantId"]}/bookables`,
              bookable
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
  getBookableTemplate(tenantId) {
    return ApiClient.get(`api/${tenantId}/bookables/_template`);
  },
  getRelatedOpeningHours(bookableId, tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(`api/${t}/bookables/${bookableId}/openingHours`);
  },
  getBookableAvailability(bookableId, tenantId, startDate, endDate, amount) {
    return ApiClient.get(
      `api/${tenantId}/bookables/${bookableId}/availability?startDate=${startDate}&endDate=${endDate}&amount=${amount}`
    );
  },
  getBlockPeriods(bookableId, tenantId, startDate, endDate, amount = 1) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return ApiClient.get(
      `api/${t}/bookables/${bookableId}/block-periods?startDate=${startDate}&endDate=${endDate}&amount=${amount}`
    );
  },
  async publicBookableCountCheck(tenantId) {
    const t = tenantId || store.getters["tenants/currentTenantId"];
    return (await ApiClient.get(`api/${t}/bookables/count/check`)).data;
  },
};
