// PROTOTYPE (ECCdigital/tickets#343), throwaway: never merge.
// One rule per field for price, Anzahl and Höchstmenge in both modes, after
// what the backend evaluates (ECCdigital/tickets#338). All variants use it;
// only the form differs.

import {
  bookingModeOf,
  handlesExternalPricing,
  suggestedPriceType,
} from "@/utils/bookableFlow";
import { providerHandles } from "@/utils/bookableExternalProviders";

export { handlesExternalPricing };

export const PRICE_TYPES = Object.freeze([
  "per-hour",
  "per-day",
  "per-item",
  "per-square-meter",
]);

export const VAT_RATES = Object.freeze([19, 7]);

export const toNumber = (value) =>
  Number(typeof value === "string" ? value.replace(",", ".") : value) || 0;

export const euro = (value) =>
  Number(value || 0).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });

// --- Namen ------------------------------------------------------------------
// E = Editor heute, A = Ablauf heute, N = Vorschlag. Switch with `?namen=`.

export const NAMINGS = {
  E: {
    name: "Editor heute",
    priceSection: "Preise & Kapazität",
    capacitySection: "Grundeinstellungen",
    mode: "Preismodell",
    modes: { free: "Kostenfrei", simple: "Einfacher Preis", tiers: "Staffelpreise" },
    priceType: "Preisart",
    priceTypes: {
      "per-hour": "pro Stunde",
      "per-day": "pro Tag",
      "per-item": "pro Stück",
      "per-square-meter": "pro m²",
    },
    price: "Preis (netto)",
    fixed: {
      "per-hour": ["Pauschalpreis", "Der Grundpreis wird immer berechnet"],
      "per-day": ["Pauschalpreis", "Der Grundpreis wird immer berechnet"],
      "per-item": ["Pauschalpreis", "Der Grundpreis wird immer berechnet"],
      "per-square-meter": [
        "Pauschalpreis",
        "Der Grundpreis wird immer berechnet",
      ],
    },
    vat: "MwSt.",
    coupons: ["Rabattcodes aktivieren", "Ermöglicht die Einlösung von Rabattcodes"],
    amount: "Verfügbare Anzahl",
    amountUnlimited: "Anzahl ist unbegrenzt!",
    max: "Höchstmenge je Buchung",
    maxUnlimited: "Höchstmenge ist unbegrenzt!",
    unlimited: "Unbegrenzt",
    limited: "Begrenzt",
  },
  A: {
    name: "Ablauf heute",
    priceSection: "Preis",
    capacitySection: "Anzahl & Kapazität",
    mode: "Preis",
    modes: { free: "Kostenfrei", simple: "Einfacher Preis", tiers: "Tarife" },
    priceType: "Wonach richtet sich der Preis?",
    priceTypes: {
      "per-hour": "Pro Stunde",
      "per-day": "Pro Tag",
      "per-item": "Stück",
      "per-square-meter": "m²",
    },
    price: "Was kostet es? (netto)",
    fixed: {
      "per-hour": ["Pauschalpreis", ""],
      "per-day": ["Angefangene Tage zählen voll", ""],
      "per-item": [
        "Gilt einmal je Buchung",
        "Sonderfall: Die gebuchte Menge multipliziert den Preis dann nicht.",
      ],
      "per-square-meter": [
        "Gilt einmal je Buchung",
        "Sonderfall: Die gebuchte Menge multipliziert den Preis dann nicht.",
      ],
    },
    vat: "Mehrwertsteuer",
    coupons: ["Gutscheine", "Buchende können im Checkout einen Gutschein einlösen."],
    amount: "Anzahl / Kapazität",
    amountUnlimited:
      "Es gibt keine feste Anzahl – jede Buchung wird angenommen, die zu den Zeiten passt.",
    max: "Höchstmenge je Buchung",
    maxUnlimited: "Eine Buchung darf alle freien Einheiten nehmen.",
    unlimited: "Unbegrenzt",
    limited: "Begrenzt",
  },
  N: {
    name: "Vorschlag",
    priceSection: "Preis",
    capacitySection: "Anzahl",
    mode: "Preis",
    modes: { free: "Kostenfrei", simple: "Ein Preis", tiers: "Staffelpreise" },
    priceType: "Preisart",
    priceTypes: {
      "per-hour": "Je Stunde",
      "per-day": "Je Tag",
      "per-item": "Je Stück",
      "per-square-meter": "Je m²",
    },
    price: "Preis (netto)",
    fixed: {
      "per-hour": [
        "Tagespauschale",
        "Jeder angefangene Kalendertag kostet den Preis einmal, egal wie viele Stunden. Rechnet wie „Je Tag“ mit vollen Tagen.",
      ],
      "per-day": [
        "Angefangene Tage zählen voll",
        "Jeder berührte Kalendertag kostet den vollen Preis. Aus: anteilig nach Minuten.",
      ],
      "per-item": [
        "Einmal je Buchung",
        "Der Preis gilt für die ganze Buchung, die Menge zählt nicht.",
      ],
      "per-square-meter": [
        "Einmal je Buchung",
        "Der Preis gilt für die ganze Buchung, die Fläche zählt nicht.",
      ],
    },
    vat: "Mehrwertsteuer",
    coupons: [
      "Rabattcodes",
      "Buchende können im Checkout einen Rabattcode einlösen.",
    ],
    amount: "Anzahl",
    amountUnlimited:
      "Keine feste Anzahl: Jede Buchung wird angenommen, die zu den Zeiten passt.",
    max: "Höchstmenge je Buchung",
    maxUnlimited: "Eine Buchung darf alle freien Einheiten nehmen.",
    unlimited: "Unbegrenzt",
    limited: "Begrenzt",
  },
};

// --- Preis ------------------------------------------------------------------

/** One rule for both modes: `!= null`, so a missing bound is no tier. */
export function isTierCategory(category) {
  return (
    (category?.interval &&
      (category.interval.start != null || category.interval.end != null)) ||
    category?.weekdays?.length > 0 ||
    category?.holidays?.length > 0
  );
}

/**
 * Derived from the bookable alone. „Ein Preis“ at 0 € is the same data as
 * „Kostenfrei“, „Staffelpreise“ with one plain category the same as „Ein
 * Preis“: the component may hold the chosen mode as transient state while
 * the data cannot tell, because losing it loses nothing.
 */
export function priceModeOf(bookable) {
  const categories = bookable?.priceCategories || [];
  if (categories.length > 1 || categories.some(isTierCategory)) return "tiers";
  return categories.some((c) => toNumber(c.priceEur) > 0) ? "simple" : "free";
}

function plainCategory(priceEur, fixedPrice) {
  return {
    priceEur,
    interval: { start: null, end: null },
    fixedPrice: !!fixedPrice,
    holidays: [],
    weekdays: [],
  };
}

/** What `fixedPrice` defaults to per Preisart: full days for a day price. */
export function defaultFixedPrice(priceType) {
  return priceType === "per-day";
}

/**
 * Leaving Kostenfrei takes the Preisart the Buchungsart suggests and its
 * default `fixedPrice`. Staffelpreise keep what is stored.
 */
export function applyPriceMode(bookable, mode) {
  const categories = bookable.priceCategories || [];
  const first = categories[0] || plainCategory(0, false);
  const wasFree = priceModeOf(bookable) === "free";

  if (mode === "free") {
    bookable.priceCategories = [plainCategory(0, false)];
    return bookable;
  }
  if (wasFree) {
    bookable.priceType = suggestedPriceType(bookable);
    first.fixedPrice = defaultFixedPrice(bookable.priceType);
  }
  if (mode === "simple") {
    bookable.priceCategories = [
      plainCategory(toNumber(first.priceEur), first.fixedPrice),
    ];
  } else if (!categories.length) {
    bookable.priceCategories = [plainCategory(0, first.fixedPrice)];
  }
  return bookable;
}

/**
 * A new Preisart changes what `fixedPrice` means (full days vs. once per
 * booking), so it falls back to the new type's default in every category
 * rather than silently changing meaning.
 */
export function applyPriceType(bookable, priceType) {
  if (bookable.priceType === priceType) return bookable;
  bookable.priceType = priceType;
  (bookable.priceCategories || []).forEach((category) => {
    category.fixedPrice = defaultFixedPrice(priceType);
  });
  return bookable;
}

/**
 * `fixedPrice` is offered where it means something of its own: full days for
 * a day price, once per booking for item and m². For an hour price it is the
 * same as a day price with full days, so it shows only when it is set.
 */
export function offersFixedPrice(bookable) {
  if (bookable?.priceType !== "per-hour") return true;
  return (bookable.priceCategories || []).some((c) => c.fixedPrice);
}

/** Tiers are an expert option (#339): shown when used or in expert mode. */
export function offersTiers(bookable, expertMode) {
  return expertMode || priceModeOf(bookable) === "tiers";
}

/** Backend default is true, so only `false` is „used“ (#339). */
export function couponsOn(bookable) {
  return bookable?.enableCoupons !== false;
}

export function offersCoupons(bookable, expertMode) {
  return expertMode || !couponsOn(bookable);
}

/**
 * What one booking costs, as the backend reckons it
 * (`_internalRegularPriceEur`): split into calendar days; `fixedPrice`
 * switches off the time factor per day (hour, day); item and m² take the
 * highest day, and with `fixedPrice` ignore the quantity. `hours` from
 * Friday 14:00.
 */
export function samplePrice(bookable, { hours, quantity }) {
  const category = bookable?.priceCategories?.[0] || {};
  const price = toNumber(category.priceEur);
  const fixed = !!category.fixedPrice;
  const start = 14; // Friday 14:00
  const days = Math.max(1, Math.ceil((start + hours) / 24));
  let net;
  let how;
  switch (bookable?.priceType) {
  case "per-hour":
    net = fixed ? price * days : price * hours;
    how = fixed
      ? `${days} angefangene Kalendertage × ${euro(price)}`
      : `${fmt(hours)} Std. × ${euro(price)}`;
    break;
  case "per-day":
    net = fixed ? price * days : (price * hours) / 24;
    how = fixed
      ? `${days} angefangene Kalendertage × ${euro(price)}`
      : `${fmt(hours)} Std. ÷ 24 × ${euro(price)}`;
    break;
  default:
    net = fixed ? price : price * quantity;
    how = fixed
      ? "einmal je Buchung"
      : `${quantity} ${bookable?.priceType === "per-square-meter" ? "m²" : "Stück"} × ${euro(price)}`;
  }
  // The quantity multiplies always, except item and m² once per booking
  // (`ignoreAmount` in the backend).
  if (["per-hour", "per-day"].includes(bookable?.priceType)) {
    net *= quantity;
    if (quantity > 1) how += ` × ${quantity} Stück`;
  }
  const vat = toNumber(bookable?.priceValueAddedTax);
  return { net, vat, gross: net * (1 + vat / 100), how, days };
}

const fmt = (n) => Number(n).toLocaleString("de-DE");

// --- Anzahl und Höchstmenge ---------------------------------------------------

/** Empty, null and 0 are all unlimited in the backend (#338). */
export function isUnlimited(value) {
  return !toNumber(value);
}

export function handlesExternalAmount(bookable) {
  return (bookable?.externalProviders || []).some((p) =>
    providerHandles(p, "maxAmount")
  );
}

/**
 * The Höchstmenge matters only where one booking can take more than one
 * unit: shown when Anzahl is not 1, or when it is set.
 */
export function offersMax(bookable) {
  return (
    toNumber(bookable?.amount) !== 1 ||
    !isUnlimited(bookable?.maxAmountPerBooking)
  );
}

/** More than one unit of a room is rarely meant: a hint, not a rule. */
export function warnsAboutAmount(bookable) {
  return (
    ["room", "event-location"].includes(bookable?.type) &&
    toNumber(bookable?.amount) > 1
  );
}

export function unitOf(bookable) {
  return bookable?.priceType === "per-square-meter" ? "m²" : "Stück";
}

// --- Prüfung (wie bookableValidation.js nach #340) ----------------------------

/**
 * Errors per field. Each rule names its reason: the backend refuses it, or
 * the meaning would otherwise be lost.
 */
export function priceIssues(bookable) {
  const issues = {};
  (bookable?.priceCategories || []).forEach((c, i) => {
    // Backend: priceEur required Number.
    if (c.priceEur === "" || c.priceEur == null || isNaN(toNumber(c.priceEur)))
      issues[`price.${i}`] = "Bitte einen Preis eingeben.";
    else if (toNumber(c.priceEur) < 0)
      issues[`price.${i}`] = "Der Preis darf nicht negativ sein.";
  });
  const vat = bookable?.priceValueAddedTax;
  if (vat !== "" && vat != null && (toNumber(vat) < 0 || toNumber(vat) > 100))
    issues.vat = "Bitte einen Satz zwischen 0 und 100 % eingeben.";
  // Backend: whole number from 1, or null.
  const max = bookable?.maxAmountPerBooking;
  if (
    max !== "" &&
    max != null &&
    !(Number.isInteger(Number(max)) && Number(max) >= 1)
  )
    issues.max = "Bitte eine ganze Zahl ab 1 eingeben oder Unbegrenzt wählen.";
  const amount = bookable?.amount;
  if (
    amount !== "" &&
    amount != null &&
    Number(amount) !== 0 &&
    !(Number.isInteger(Number(amount)) && Number(amount) >= 1)
  )
    issues.amount = "Bitte eine ganze Zahl ab 1 eingeben oder Unbegrenzt wählen.";
  return issues;
}

export { bookingModeOf };
