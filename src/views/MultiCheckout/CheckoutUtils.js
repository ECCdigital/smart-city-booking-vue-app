export default {
  formatDateTime(d) {
    let year = new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(d);
    let month = new Intl.DateTimeFormat("en", { month: "2-digit" }).format(d);
    let day = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(d);

    let hour = new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      hourCycle: "h23",
    }).format(d);
    let minute = new Intl.DateTimeFormat("en", { minute: "2-digit" }).format(d);

    return year + "-" + month + "-" + day + " " + hour + ":" + minute;
  },

  dateToLocaleString(d, showDate = true, showTime = true) {
    if (!d) return "-";
    if (showDate && showTime) return new Date(d).toLocaleString();

    if (showDate) return new Date(d).toLocaleDateString();
    if (showTime) return new Date(d).toLocaleTimeString();
  },

  formatCurrency: function (value) {
    if (value == null) return undefined;

    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  },

  calculateBookablePrice: function (
    bookable,
    amount,
    timeBegin,
    timeEnd,
    coupon,
    userId
  ) {
    if (
      !!bookable.freeBookingUsers &&
      bookable.freeBookingUsers.includes(userId)
    ) {
      return 0;
    }

    const duration = (timeEnd - timeBegin) / 1000 / 60 / 60; // Hours
    let price = bookable.priceEur * amount;

    if (coupon && coupon.type === "percentage") {
      price = price * (1 - coupon.discount / 100);
    } else if (coupon && coupon.type === "fixed") {
      price = Math.max(0, price - coupon.discount);
    }

    if (bookable.priceCategory === "per-hour") {
      if (timeBegin && timeEnd) {
        return Math.round(price * duration * amount * 100) / 100;
      } else {
        return undefined;
      }
    } else if (bookable.priceCategory === "per-day") {
      if (timeBegin && timeEnd) {
        return Math.round(((price * duration * amount) / 24) * 100) / 100;
      } else {
        return undefined;
      }
    } else {
      return Math.round(price * 100) / 100;
    }
  },

  addHoursToTime(time, min) {
    let timeBegin = new Date(`01/01/1970 ${time}`);
    timeBegin.setHours(timeBegin.getHours() + min);
    return this.getHHMMFormat(timeBegin);
  },

  getHHMMFormat(time) {
    if (!time) return undefined;
    return (
      this.padTo2Digits(time.getHours()) +
      ":" +
      this.padTo2Digits(time.getMinutes())
    );
  },

  padTo2Digits(num) {
    return num.toString().padStart(2, "0");
  },

  bookingDuration(timeBegin, timeEnd) {
    const duration = timeEnd - timeBegin;

    const time = {
      day: Math.floor(duration / 86400000),
      hour: Math.floor(duration / 3600000) % 24,
      minute: Math.floor(duration / 60000) % 60,
      second: Math.floor(duration / 1000) % 60,
      millisecond: Math.floor(duration) % 1000,
    };

    let timeString = time.minute + " Min.";

    if (time.hour > 0) {
      timeString = time.hour + " Std. " + timeString;
    }

    if (time.day > 0) {
      timeString = `${time.day} Tag${time.day > 1 ? "e" : ""} ${timeString}`;
    }

    return timeString;
  },

  bookingDurationLongRange(timeBegin, timeEnd) {
    const duration = timeEnd - timeBegin;

    const time = {
      day: Math.floor(duration / 86400000),
      hour: Math.floor(duration / 3600000) % 24,
      minute: Math.floor(duration / 60000) % 60,
      second: Math.floor(duration / 1000) % 60,
      millisecond: Math.floor(duration) % 1000,
    };

    let timeString = "";

    if (time.day > 0) {
      timeString = `${time.day + 1} Tage`;
    }

    return timeString;
  },
};
