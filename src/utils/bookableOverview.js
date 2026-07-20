import {
  isBookableExpertOnlyBookingType,
  isBookableExpertOverviewTraitKey,
} from "@/utils/bookableExpertMode";

const BOOKING_MODE_LABELS = {
  schedule: "Freie Zeitwahl",
  timePeriod: "Feste Zeitfenster",
  blockPeriod: "Zeiträume",
  week: "Wochenbuchung",
  month: "Monatsbuchung",
  independent: "Zeitunabhängig",
};

const PRICE_TYPE_SUFFIX = {
  "per-hour": "/h",
  "per-day": "/Tag",
  "per-square-meter": "/m²",
  "per-item": "/Stk.",
};

/** Display order: Mon … Sun (Sunday = 0) */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const WEEKDAYS = {
  1: { short: "Mo.", long: "Montag" },
  2: { short: "Di.", long: "Dienstag" },
  3: { short: "Mi.", long: "Mittwoch" },
  4: { short: "Do.", long: "Donnerstag" },
  5: { short: "Fr.", long: "Freitag" },
  6: { short: "Sa.", long: "Samstag" },
  0: { short: "So.", long: "Sonntag" },
};

function formatCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "0,00 €";
  return (
    num.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

function truncate(text, maxLength = 64) {
  if (!text) return "";
  const normalized = String(text).trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function getLocationLabel(bookable) {
  const loc = bookable?.location;
  if (!loc) return "";
  if (typeof loc === "string") return truncate(loc);
  return truncate(loc.display_address || "");
}

function getBookingMode(bookable) {
  if (!bookable) return "independent";
  if (bookable.isScheduleRelated) return "schedule";
  if (bookable.isTimePeriodRelated) return "timePeriod";
  if (bookable.isBlockPeriodRelated) return "blockPeriod";
  if (bookable.isLongRange) {
    const type = bookable.longRangeOptions?.type;
    if (type === "week") return "week";
    if (type === "month") return "month";
  }
  return "independent";
}

function formatDurationMinutes(minutes) {
  const mins = parseInt(minutes, 10);
  if (!mins || mins <= 0) return "";
  if (mins % 1440 === 0) {
    const days = mins / 1440;
    return `${days} ${days === 1 ? "Tag" : "Tage"}`;
  }
  if (mins % 60 === 0) {
    return `${mins / 60} Std.`;
  }
  return `${mins} Min.`;
}

function getBookingModeLabel(bookable) {
  const mode = getBookingMode(bookable);
  const base = BOOKING_MODE_LABELS[mode] || BOOKING_MODE_LABELS.independent;

  if (mode === "schedule") {
    const parts = [];
    const min = formatDurationMinutes(bookable.minBookingDuration);
    const max = formatDurationMinutes(bookable.maxBookingDuration);
    if (min) parts.push(`min. ${min}`);
    if (max) parts.push(`max. ${max}`);
    return parts.length ? `${base} (${parts.join(", ")})` : base;
  }

  if (mode === "timePeriod") {
    const periods = (bookable.timePeriods || []).filter(
      (p) => p?.weekdays?.length && p.startTime && p.endTime
    );
    if (!periods.length) return base;
    if (periods.length === 1) {
      const p = periods[0];
      return `${base}: ${formatWeekdayRange(p.weekdays)} ${formatTime(
        p.startTime
      )} bis ${formatTime(p.endTime)}`;
    }
    return `${base} (${periods.length})`;
  }

  if (mode === "blockPeriod") {
    const count = Array.isArray(bookable.blockPeriods)
      ? bookable.blockPeriods.length
      : 0;
    return count > 0 ? `${base} (${count})` : base;
  }

  return base;
}

function hasIfbsPricing(bookable) {
  const providers = bookable?.externalProviders;
  if (!Array.isArray(providers)) return false;
  return providers.some(
    (provider) =>
      provider?.provider === "ifbs" &&
      provider?.active === true &&
      Array.isArray(provider.handles) &&
      provider.handles.includes("pricing")
  );
}

function getPriceLabel(bookable) {
  if (hasIfbsPricing(bookable)) {
    return "Externe Preise";
  }

  const categories = bookable?.priceCategories || [];
  const priced = categories.filter(
    (cat) => cat && cat.priceEur != null && Number(cat.priceEur) > 0
  );

  if (!priced.length) {
    return "Kostenfrei";
  }

  const first = priced[0];
  const suffix = PRICE_TYPE_SUFFIX[bookable?.priceType] || "";
  const fixed = first.fixedPrice ? " (Pauschal)" : "";

  if (priced.length === 1) {
    return `${formatCurrency(first.priceEur)}${suffix}${fixed}`;
  }

  const prices = priced.map((c) => Number(c.priceEur));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) {
    return `${formatCurrency(min)}${suffix}`;
  }
  return `${formatCurrency(min)}–${formatCurrency(max)}${suffix}`;
}

function sortWeekdayIds(ids) {
  const unique = [...new Set(ids.map(Number))];
  return WEEKDAY_ORDER.filter((id) => unique.includes(id));
}

function formatWeekdayRange(ids) {
  const sorted = sortWeekdayIds(ids);
  if (!sorted.length) return "";

  const groups = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const prevIndex = WEEKDAY_ORDER.indexOf(prev);
    const currentIndex = WEEKDAY_ORDER.indexOf(current);
    if (currentIndex === prevIndex + 1) {
      prev = current;
      continue;
    }
    groups.push([start, prev]);
    start = current;
    prev = current;
  }
  groups.push([start, prev]);

  return groups
    .map(([from, to]) => {
      if (from === to) return WEEKDAYS[from].short;
      return `${WEEKDAYS[from].short} - ${WEEKDAYS[to].short}`;
    })
    .join(", ");
}

function formatWeekdayListLong(ids) {
  return sortWeekdayIds(ids)
    .map((id) => WEEKDAYS[id].long)
    .join(", ");
}

function formatTime(time) {
  if (!time) return "";
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(time);
  const hours = String(parseInt(match[1], 10));
  return `${hours}:${match[2]}`;
}

/**
 * e.g. "Mo.–Fr. 8:00 bis 18:00, Samstag, Sonntag geschlossen"
 */
function formatOpeningHoursSummary(openingHours) {
  if (!Array.isArray(openingHours) || !openingHours.length) return "";

  const openDayIds = new Set();
  const parts = [];

  for (const entry of openingHours) {
    const days = Array.isArray(entry?.weekdays)
      ? entry.weekdays.map(Number).filter((id) => WEEKDAYS[id])
      : [];
    if (!days.length || !entry.startTime || !entry.endTime) continue;

    days.forEach((id) => openDayIds.add(id));
    parts.push(
      `${formatWeekdayRange(days)} ${formatTime(
        entry.startTime
      )} bis ${formatTime(entry.endTime)}`
    );
  }

  if (!parts.length) return "";

  const closed = WEEKDAY_ORDER.filter((id) => !openDayIds.has(id));
  let summary = parts.join(", ");
  if (closed.length) {
    summary += `, ${formatWeekdayListLong(closed)} geschlossen`;
  }
  return summary;
}

function formatDateDe(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * e.g. "24.12.2026 10:00 bis 14:00, 31.12.2026 10:00 bis 12:00"
 */
function formatSpecialOpeningHoursSummary(specialOpeningHours, maxItems = 3) {
  if (!Array.isArray(specialOpeningHours) || !specialOpeningHours.length) {
    return "";
  }

  const parts = specialOpeningHours
    .filter((entry) => entry?.date && entry.startTime && entry.endTime)
    .map(
      (entry) =>
        `${formatDateDe(entry.date)} ${formatTime(
          entry.startTime
        )} bis ${formatTime(entry.endTime)}`
    );

  if (!parts.length) return "";
  if (parts.length <= maxItems) return parts.join(", ");
  return `${parts.slice(0, maxItems).join(", ")} +${parts.length - maxItems}`;
}

function joinList(items, maxItems = 4) {
  if (!Array.isArray(items) || !items.length) return "";
  const clean = items.map((item) => String(item).trim()).filter(Boolean);
  if (!clean.length) return "";
  if (clean.length <= maxItems) return clean.join(", ");
  return `${clean.slice(0, maxItems).join(", ")} +${clean.length - maxItems}`;
}

/**
 * Normalize related/checkout entries to bookable IDs.
 * Supports plain IDs and checkout objects `{ bookableId, mandatory }`.
 * @param {Array<string|{ bookableId?: string }>} refs
 * @returns {string[]}
 */
function normalizeBookableRefIds(refs) {
  if (!Array.isArray(refs) || !refs.length) return [];
  return refs
    .map((ref) => {
      if (typeof ref === "string") return ref;
      if (ref && typeof ref === "object") {
        return ref.bookableId || ref.id || "";
      }
      return "";
    })
    .filter(Boolean);
}

/**
 * Resolve bookable IDs to titles (fallback: id), quantity-limited.
 * @param {Array<string|{ bookableId?: string }>} refs
 * @param {Record<string, string>} titlesById
 * @param {number} maxItems
 */
function formatBookableRefList(refs, titlesById = {}, maxItems = 2) {
  const ids = normalizeBookableRefIds(refs);
  if (!ids.length) return "";
  const labels = ids.map((id) => titlesById[id] || String(id));
  return joinList(labels, maxItems);
}

function hasGraduatedPrices(bookable) {
  const categories = bookable?.priceCategories || [];
  const priced = categories.filter(
    (cat) => cat && cat.priceEur != null && Number(cat.priceEur) > 0
  );
  if (priced.length > 1) return true;
  return categories.some(
    (cat) =>
      cat?.interval?.start != null ||
      cat?.interval?.end != null ||
      (Array.isArray(cat?.weekdays) && cat.weekdays.length > 0) ||
      (Array.isArray(cat?.holidays) && cat.holidays.length > 0)
  );
}

/**
 * @returns {{ key: string, label: string, value: string, tabKey: string, icon: string, expert: boolean }|null}
 */
function trait(key, label, value, tabKey, icon, expert = false) {
  if (value == null || value === "") return null;
  return {
    key,
    label,
    value,
    tabKey,
    icon,
    expert: expert || isBookableExpertOverviewTraitKey(key),
  };
}

function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getAccessLabel(bookable) {
  const users = Array.isArray(bookable?.permittedUsers)
    ? bookable.permittedUsers.length
    : 0;
  const roles = Array.isArray(bookable?.permittedRoles)
    ? bookable.permittedRoles.length
    : 0;

  // Default is open to everyone — only show when restricted
  if (!users && !roles) {
    return "";
  }

  const parts = [];
  if (users) parts.push(countLabel(users, "Benutzer", "Benutzer"));
  if (roles) parts.push(countLabel(roles, "Rolle", "Rollen"));
  return parts.join(" und ");
}

function getGroupBookingLabel(bookable) {
  if (!bookable?.groupBooking?.enabled) return "";
  const roles = Array.isArray(bookable.groupBooking.permittedRoles)
    ? bookable.groupBooking.permittedRoles.length
    : 0;
  if (roles > 0) {
    return `Erlaubt für ${countLabel(roles, "Rolle", "Rollen")}`;
  }
  return "Erlaubt";
}

function getDiscountsLabel(bookable) {
  const discounts = bookable?.bookingDiscounts;
  if (!discounts) return "";

  const users = Array.isArray(discounts.users) ? discounts.users.length : 0;
  const roles = Array.isArray(discounts.roles) ? discounts.roles.length : 0;
  if (!users && !roles) return "";

  const parts = [];
  if (users) parts.push(countLabel(users, "Benutzer", "Benutzer"));
  if (roles) parts.push(countLabel(roles, "Rolle", "Rollen"));
  return parts.join(", ");
}

const LOCKER_SYSTEM_LABELS = {
  ifbs: "IFBS",
  pareva: "Pareva",
};

function getLockerSystemsLabel(bookable) {
  const details = bookable?.lockerDetails;
  if (!details?.active) return "";

  const units = Array.isArray(details.units) ? details.units : [];
  if (!units.length) return "Aktiviert";

  const types = [
    ...new Set(
      units
        .map((unit) => unit?.lockerSystem)
        .filter(Boolean)
        .map((type) => LOCKER_SYSTEM_LABELS[type] || type)
    ),
  ];

  if (!types.length) return "Konfiguriert";
  return types.join(", ");
}

/**
 * Build overview traits focused on identity and how booking works.
 * Absent / empty traits are omitted.
 * @param {object} bookable
 * @param {{
 *   bookableTitlesById?: Record<string, string>,
 *   eventTitlesById?: Record<string, string>,
 * }} [options]
 * @returns {Array<{ key: string, label: string, value: string, tabKey: string, icon: string, expert: boolean, openRoute?: object }>}
 */
export function getBookableOverviewTraits(bookable, options = {}) {
  const titlesById = options.bookableTitlesById || {};
  const eventTitlesById = options.eventTitlesById || {};
  const traits = [];
  const bookingMode = getBookingMode(bookable);

  const title = truncate(bookable?.title, 64);
  if (title) {
    traits.push(
      trait("title", "Bezeichnung", title, "general", "mdi-format-title")
    );
  }

  if (bookable?.eventId) {
    const eventName =
      truncate(eventTitlesById[bookable.eventId], 64) ||
      truncate(String(bookable.eventId), 32);
    const eventTrait = trait(
      "event",
      "Veranstaltung",
      eventName,
      "general",
      "mdi-calendar-star"
    );
    if (eventTrait) {
      eventTrait.navigable = false;
      traits.push(eventTrait);
    }
  }

  const location = getLocationLabel(bookable);
  if (location) {
    traits.push(
      trait(
        "location",
        "Adresse",
        location,
        "general",
        "mdi-map-marker-outline"
      )
    );
  }

  const flags = joinList(bookable?.flags);
  if (flags) {
    traits.push(
      trait(
        "flags",
        "Für Buchende",
        flags,
        "general",
        "mdi-account-eye-outline"
      )
    );
  }

  const tags = joinList(bookable?.tags);
  if (tags) {
    traits.push(
      trait("tags", "Interne Tags", tags, "general", "mdi-tag-multiple-outline")
    );
  }

  traits.push(
    trait(
      "bookingMode",
      "Buchung",
      getBookingModeLabel(bookable),
      "bookingType",
      "mdi-calendar-clock",
      isBookableExpertOnlyBookingType(bookingMode)
    )
  );

  traits.push(
    trait(
      "price",
      "Preis",
      getPriceLabel(bookable),
      "pricing",
      "mdi-cash",
      hasIfbsPricing(bookable) || hasGraduatedPrices(bookable)
    )
  );

  if (bookable?.amount != null && bookable.amount !== "") {
    traits.push(
      trait(
        "amount",
        "Anzahl",
        String(bookable.amount),
        "pricing",
        "mdi-counter"
      )
    );
  }

  if (bookable?.isOpeningHoursRelated) {
    const hours = formatOpeningHoursSummary(bookable.openingHours);
    if (hours) {
      traits.push(
        trait(
          "openingHours",
          "Öffnungszeiten",
          hours,
          "openingHours",
          "mdi-clock-outline"
        )
      );
    }
  }

  if (bookable?.isSpecialOpeningHoursRelated) {
    const specialHours = formatSpecialOpeningHoursSummary(
      bookable.specialOpeningHours
    );
    if (specialHours) {
      traits.push(
        trait(
          "specialOpeningHours",
          "Sonderöffnungszeiten",
          specialHours,
          "openingHours",
          "mdi-calendar-clock"
        )
      );
    }
  }

  const lockerSystems = getLockerSystemsLabel(bookable);
  if (lockerSystems) {
    traits.push(
      trait(
        "lockerSystems",
        "Schließsystem",
        lockerSystems,
        "lockerSystems",
        "mdi-lock-outline"
      )
    );
  }

  const checkoutOptions = formatBookableRefList(
    bookable?.checkoutBookableIds,
    titlesById,
    2
  );
  if (checkoutOptions) {
    traits.push(
      trait(
        "checkoutOptions",
        "Zusätzliche Optionen",
        checkoutOptions,
        "relatedBookables",
        "mdi-cart-plus"
      )
    );
  }

  const relatedBookables = formatBookableRefList(
    bookable?.relatedBookableIds,
    titlesById,
    2
  );
  if (relatedBookables) {
    traits.push(
      trait(
        "relatedBookables",
        "Abhängigkeiten",
        relatedBookables,
        "relatedBookables",
        "mdi-file-tree"
      )
    );
  }

  traits.push(
    trait(
      "access",
      "Buchbar für",
      getAccessLabel(bookable),
      "permissions",
      "mdi-account-lock-outline"
    )
  );

  if (bookable?.requiresLogin) {
    traits.push(
      trait(
        "login",
        "Login",
        "Erforderlich zum Buchen",
        "permissions",
        "mdi-login-variant"
      )
    );
  }

  const groupBooking = getGroupBookingLabel(bookable);
  if (groupBooking) {
    traits.push(
      trait(
        "groupBooking",
        "Serienbuchung",
        groupBooking,
        "permissions",
        "mdi-calendar-multiple"
      )
    );
  }

  if (bookable?.cancellationPolicy?.userCancellable === false) {
    traits.push(
      trait(
        "cancellation",
        "Stornierung",
        "Nur durch Administratoren",
        "permissions",
        "mdi-book-cancel-outline"
      )
    );
  }

  const discounts = getDiscountsLabel(bookable);
  if (discounts) {
    traits.push(
      trait(
        "discounts",
        "Preisrabatte",
        discounts,
        "permissions",
        "mdi-ticket-percent-outline"
      )
    );
  }

  return traits.filter(Boolean);
}
