export default {
  getHolidays(countryCode, stateCode, year) {
    return ApiClient.get("api/holidays", {
      params: {
        countryCode: countryCode || "DE",
        stateCode,
        year,
      },
      withCredentials: true,
    });
  },
};
