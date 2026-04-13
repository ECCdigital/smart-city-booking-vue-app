export default class Bookable {
  constructor(overrides = {}) {
    this.id = "";
    this.tenantId = "";
    this.type = "room";
    this.title = "";
    this.description = "";
    this.isPublic = false;
    this.imgUrl = "";
    this.flags = [];
    this.tags = [];
    this.location = "";

    this.isBookable = false;
    this.amount = null;
    this.minBookingDuration = null;
    this.maxBookingDuration = null;
    this.autoCommitBooking = false;
    this.bookingNotes = "";
    this.groupBooking = { enabled: false, permittedRoles: [] };

    this.isScheduleRelated = false;
    this.isTimePeriodRelated = false;
    this.timePeriods = [];
    this.isOpeningHoursRelated = false;
    this.openingHours = [];
    this.isSpecialOpeningHoursRelated = false;
    this.specialOpeningHours = [];
    this.isLongRange = false;
    this.longRangeOptions = null;

    this.priceCategories = [
      {
        priceEur: 0,
        interval: { start: null, end: null },
        fixedPrice: false,
        holidays: [],
        weekdays: [],
      },
    ];
    this.priceType = "per-item";
    this.priceValueAddedTax = 0;
    this.enableCoupons = true;

    this.permittedUsers = [];
    this.permittedRoles = [];
    this.freeBookingUsers = [];
    this.freeBookingRoles = [];

    this.relatedBookableIds = [];
    this.checkoutBookableIds = [];
    this.eventId = "";

    this.attachments = [];
    this.lockerDetails = { active: false, units: [] };
    this.requiredFields = [];

    Object.assign(this, overrides);
  }

  toPlain() {
    return JSON.parse(JSON.stringify(this));
  }
}
