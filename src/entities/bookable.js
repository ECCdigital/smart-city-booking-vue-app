import { normalizeBookingDiscounts } from "@/utils/bookingDiscounts";
import { defaultAccessPointDetails } from "@/utilities/access-points";

export default class Bookable {
  constructor(overrides = {}) {
    this.id = "";
    this.tenantId = "";
    this.type = "room";
    this.title = "";
    this.description = "";
    this.isPublic = false;
    // Ordered media references; position 0 is the cover image (§4.8 of the
    // media spec). `imgUrl` stays as the legacy value of unmigrated bookables.
    this.images = [];
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
    this.cancellationPolicy = { userCancellable: true };

    this.isScheduleRelated = true;
    this.isTimePeriodRelated = false;
    this.timePeriods = [];
    this.isOpeningHoursRelated = false;
    this.openingHours = [];
    this.isSpecialOpeningHoursRelated = false;
    this.specialOpeningHours = [];
    this.isLongRange = false;
    this.longRangeOptions = null;
    this.isBlockPeriodRelated = false;
    this.blockPeriods = [];

    this.isLeadTimeRelated = false;
    this.preparationLeadTimeMinutes = 0;
    this.serviceHours = [];
    this.isBufferRelated = false;
    this.bufferTimeBeforeMinutes = null;
    this.bufferTimeAfterMinutes = null;

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
    this.bookingDiscounts = {
      users: [],
      roles: [],
    };

    this.relatedBookableIds = [];
    this.checkoutBookableIds = [];
    this.eventId = "";

    this.attachments = [];
    this.accessPointDetails = defaultAccessPointDetails();
    this.requiredFields = [];

    this.customFieldDefinitions = [];
    this.customFieldValues = [];
    this.customFields = [];

    this.externalProviders = [];

    Object.assign(this, overrides);
    normalizeBookingDiscounts(this);
  }

  toPlain() {
    return JSON.parse(JSON.stringify(this));
  }
}
