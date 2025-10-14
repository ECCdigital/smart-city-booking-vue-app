import moment from "moment";
import "moment/locale/de";

moment.locale("de");

function createDateTimeObject(input) {
  let dateTimeObject = input;

  // If we've just a time, we're creating a date object of today to format it correctly
  if (typeof input === "string" && input.includes(":") && input.length === 5) {
    const today = new Date();
    today.setHours(input.split(":")[0]);
    today.setMinutes(input.split(":")[1]);

    return today;
  }

  if (!_.isDate(input)) {
    dateTimeObject = new Date(input);
  }

  return dateTimeObject;
}

export default {
  currency(number, currency = "EUR", locale = "de-DE") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(number);
  },
  date(date, dateStyle = "short", locale = "de-DE") {
    if (!date) return "";
    return new Intl.DateTimeFormat(locale, { dateStyle }).format(
      createDateTimeObject(date)
    );
  },
  time(time, timeStyle = "short", locale = "de-DE") {
    if (!time) return "";
    return new Intl.DateTimeFormat(locale, { timeStyle }).format(
      createDateTimeObject(time)
    );
  },
  fullDateTime(dateString) {
    if (!dateString) return "";
    return moment(dateString).format("LLLL");
  },
  fullDateTimeRange(startDate, endDate) {
    if (!startDate && !endDate) return "";
    if (startDate && endDate) {
      const start = moment(startDate).format("LLLL");
      const end = moment(endDate).format("LLLL");
      return `${start} - ${end}`;
    } else {
      return "Zeitraum nicht verfügbar";
    }
  },
};
