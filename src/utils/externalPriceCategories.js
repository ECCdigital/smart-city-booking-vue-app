/**
 * The prices an external provider answers for a bookable.
 *
 * Since 4.3.x they arrive as a flat array of `{ priceEur, unit, external }`
 * entries - the very array the checkout prices with - instead of the
 * provider's own record with its German keys (`Preis_1h`,
 * `Preis_Servicegebühr`). A tier the provider does not charge is not in the
 * array at all, so an absent unit means "not offered" and is left out rather
 * than shown as 0,00 €.
 *
 * The same route answers the bookable's own `priceCategories` when no
 * provider handles its pricing. Those carry neither `unit` nor
 * `external: true`, which is what tells the two apart here.
 */

/** The entry that is a one-off fee rather than a rate. */
export const SERVICE_FEE_UNIT = "service-fee";

/** The rates, shortest first - the order the tiles are shown in. */
const TIER_UNITS = ["minute", "hour", "day", "week", "month", "year"];

const TIER_ICONS = {
  minute: "mdi-timer-sand",
  hour: "mdi-clock-outline",
  day: "mdi-calendar-today",
  week: "mdi-calendar-week",
  month: "mdi-calendar-month",
  year: "mdi-calendar-star",
};

/**
 * The price of one answered category, as a number.
 *
 * @param {Object} category One entry of the answer
 * @returns {number|null} The price, or `null` when the entry carries none
 */
function priceOf(category) {
  if (category?.external !== true) return null;
  const raw = category.priceEur;
  if (raw === null || raw === undefined || raw === "") return null;
  const price = Number(raw);
  return Number.isFinite(price) ? price : null;
}

/**
 * The rates the provider charges, shortest unit first.
 *
 * @param {Object[]} categories What the prices route answered
 * @returns {{unit: string, priceEur: number, labelKey: string, icon: string}[]}
 *   One row per offered rate, ready to render
 */
export function externalPriceTiers(categories) {
  if (!Array.isArray(categories)) return [];

  return TIER_UNITS.flatMap((unit) => {
    const category = categories.find((entry) => entry?.unit === unit);
    const priceEur = priceOf(category);
    if (priceEur === null) return [];

    return [
      {
        unit,
        priceEur,
        labelKey: `bookable.externalPrice.units.${unit}`,
        icon: TIER_ICONS[unit],
      },
    ];
  });
}

/**
 * The one-off fee the provider adds to every booking.
 *
 * @param {Object[]} categories What the prices route answered
 * @returns {number|null} The fee, or `null` when the provider charges none
 */
export function externalServiceFee(categories) {
  if (!Array.isArray(categories)) return null;

  return priceOf(categories.find((entry) => entry?.unit === SERVICE_FEE_UNIT));
}

/**
 * Whether the answer holds anything the provider priced.
 *
 * @param {Object[]} categories What the prices route answered
 * @returns {boolean} True when there is at least one rate or a fee
 */
export function hasExternalPrices(categories) {
  return (
    externalPriceTiers(categories).length > 0 ||
    externalServiceFee(categories) !== null
  );
}
