export default {
  getHolidays(countryCode, stateCode, year = null) {
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
