/**
 * The guided setup of a tenant's first bookable (tenant supervision spec §9):
 * the form the wizard asks, how it lands on a bookable, and what the
 * supervision level (glossary "Aufsichtsstufe") changes about the closing
 * step. Pure, so the wizard view only wires it to the API.
 *
 * The wizard stores no progress: it is resumed from the current data, and
 * stored values prove no deliberate choice - price and availability are asked
 * again on every run.
 */

import { SUPERVISION_LEVELS } from "@/utils/supervision";
import { rateLimitOf } from "@/utils/rateLimit";

/**
 * The wizard's route (`tenant-onboarding`) as the return target (backend:
 * `nextUrl`) a verification mail or an SSO sign-in leads back to.
 */
export const ONBOARDING_PATH = "/onboarding";

export { SUPERVISION_LEVELS };

export const WIZARD_STEPS = Object.freeze([
  "tenant",
  "offer",
  "setup",
  "overview",
]);

/** The existing bookable types; the wizard introduces none. */
export const OFFER_TYPES = Object.freeze([
  "room",
  "event-location",
  "resource",
  "ticket",
]);

/** The billing units the wizard offers; the price editor knows more. */
export const OFFER_PRICE_TYPES = Object.freeze([
  "per-hour",
  "per-day",
  "per-item",
]);

/** Monday first, Sunday as `0` - the ids opening hours store. */
export const OFFER_WEEKDAYS = Object.freeze([
  { id: 1, short: "Mo" },
  { id: 2, short: "Di" },
  { id: 3, short: "Mi" },
  { id: 4, short: "Do" },
  { id: 5, short: "Fr" },
  { id: 6, short: "Sa" },
  { id: 0, short: "So" },
]);

const MAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isFormallyValidMail(value) {
  return typeof value === "string" && MAIL_PATTERN.test(value.trim());
}

/**
 * A missing or unknown level reads as free - the backend's default, and what
 * a backend without the supervision answers.
 */
export function completionVariant(level) {
  return Object.values(SUPERVISION_LEVELS).includes(level)
    ? level
    : SUPERVISION_LEVELS.FREE;
}

/** Free gets no supervision explanation in the onboarding (spec §9). */
export function showsSupervisionNotice(level) {
  return completionVariant(level) !== SUPERVISION_LEVELS.FREE;
}

/**
 * Resuming always passes the bookable step, where price and availability are
 * confirmed again.
 */
export function startStep({ tenant }) {
  return tenant ? "offer" : "tenant";
}

export function emptyOfferForm() {
  return {
    type: "",
    title: "",
    description: "",
    images: [],
    amount: 1,
    schedule: "period",
    confirmation: "manual",
    priceChoice: null,
    price: null,
    priceType: "per-hour",
    availability: null,
    weekdays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "18:00",
  };
}

const priceOf = (category) => toNumber(category?.priceEur) || 0;

function toNumber(value) {
  if (typeof value === "string") {
    return Number(value.replace(",", "."));
  }
  return Number(value);
}

/** What the bookable stores, for the hint beside the renewed choice. */
export function storedChoices(bookable) {
  const paid = (bookable?.priceCategories || []).some(
    (category) => priceOf(category) > 0
  );
  return {
    priceChoice: paid ? "paid" : "free",
    availability: bookable?.isOpeningHoursRelated ? "hours" : "always",
  };
}

export function offerFormFromBookable(bookable) {
  const form = emptyOfferForm();
  const hours = bookable.openingHours?.[0];
  const price = priceOf(bookable.priceCategories?.[0]);

  return {
    ...form,
    type: bookable.type || "",
    title: bookable.title || "",
    description: bookable.description || "",
    images: [...(bookable.images || [])],
    amount: bookable.amount ?? form.amount,
    schedule: bookable.isScheduleRelated ? "period" : "none",
    confirmation: bookable.autoCommitBooking ? "auto" : "manual",
    price: price > 0 ? price : null,
    priceType: OFFER_PRICE_TYPES.includes(bookable.priceType)
      ? bookable.priceType
      : form.priceType,
    weekdays: hours ? [...(hours.weekdays || [])] : form.weekdays,
    startTime: hours?.startTime || form.startTime,
    endTime: hours?.endTime || form.endTime,
  };
}

/** Field → error code; empty when the form may be saved. */
export function validateOfferForm(form) {
  const errors = {};

  if (!OFFER_TYPES.includes(form.type)) errors.type = "required";
  if (!form.title || !form.title.trim()) errors.title = "required";

  const amount = toNumber(form.amount);
  if (!Number.isInteger(amount) || amount < 1) errors.amount = "amount-invalid";

  if (form.priceChoice !== "free" && form.priceChoice !== "paid") {
    errors.priceChoice = "choice-required";
  } else if (form.priceChoice === "paid" && !(toNumber(form.price) > 0)) {
    errors.price = "price-required";
  }

  if (form.availability !== "always" && form.availability !== "hours") {
    errors.availability = "choice-required";
  } else if (
    form.availability === "hours" &&
    (!form.weekdays?.length ||
      !form.startTime ||
      !form.endTime ||
      form.startTime >= form.endTime)
  ) {
    errors.openingHours = "opening-hours-invalid";
  }

  return errors;
}

/**
 * The bookable with the form applied, as a plain copy. What the wizard does
 * not ask for - publication wish, further opening hours rows, the further
 * price categories of a paid offer - stays as stored. A free offer is free in
 * every category.
 */
export function applyOfferForm(bookable, form) {
  const next = JSON.parse(JSON.stringify(bookable));

  next.type = form.type;
  next.title = form.title.trim();
  next.description = form.description || "";
  next.images = [...(form.images || [])];
  next.amount = toNumber(form.amount);
  next.isScheduleRelated = form.schedule === "period";
  next.autoCommitBooking = form.confirmation === "auto";

  const categories = next.priceCategories?.length
    ? next.priceCategories
    : [{ priceEur: 0 }];
  if (form.priceChoice === "paid") {
    categories[0].priceEur = toNumber(form.price);
    next.priceType = form.priceType;
  } else {
    categories.forEach((category) => {
      category.priceEur = 0;
    });
  }
  next.priceCategories = categories;

  next.isOpeningHoursRelated = form.availability === "hours";
  if (next.isOpeningHoursRelated) {
    next.openingHours = [
      {
        weekdays: [...form.weekdays],
        startTime: form.startTime,
        endTime: form.endTime,
      },
      ...(next.openingHours || []).slice(1),
    ];
  }

  return next;
}

/**
 * `POST api/tenants` answers without a body, so the new tenant is the one the
 * list did not know before and that carries the name just stored.
 */
export function findCreatedTenant(before, after, name) {
  const known = new Set((before || []).map((tenant) => tenant.id));
  const wanted = (name || "").trim();
  return (
    (after || []).find(
      (tenant) => !known.has(tenant.id) && tenant.name === wanted
    ) || null
  );
}

/**
 * What a refused `POST api/tenants` means for the wizard (spec §6.3): the
 * i18n key below `tenant.onboarding.errors`, the wait of a hit limit and the
 * field a `400` names.
 */
export function tenantCreationError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data || {};

  const limit = rateLimitOf(error);
  if (limit) return { key: "rate-limited", wait: limit.wait };
  if (status === 403 && data.code === "email_verification_required") {
    return {
      key:
        data.params?.method === "identity_provider"
          ? "verification-identity-provider"
          : "verification-mail",
    };
  }
  if (status === 409 && data.code === "max_tenants_reached") {
    return { key: "max-tenants" };
  }
  if (status === 400 && data.params?.field) {
    return { key: "field", field: data.params.field };
  }
  return { key: "generic" };
}

const ERROR_KEYS = "tenant.onboarding.errors";

/**
 * The i18n message of a `tenantCreationError`, shared by the wizard and the
 * classic creation dialog. A hit limit without a usable wait says "later".
 */
export function creationErrorMessage(error) {
  if (!error) return null;
  if (error.key === "rate-limited" && !error.wait) {
    return { key: `${ERROR_KEYS}.rate-limited-unknown`, params: {} };
  }
  return { key: `${ERROR_KEYS}.${error.key}`, params: { wait: error.wait } };
}

/** The i18n key below the field a `400` named; `null` for every other field. */
export function creationFieldErrorKey(error, field) {
  if (error?.key !== "field" || error.field !== field) return null;
  return field === "mail"
    ? `${ERROR_KEYS}.mail-invalid`
    : "tenant.onboarding.offer.errors.required";
}

/**
 * The contact a creation form starts with (spec §9): the account's name and
 * mail - the user id is the account mail. It stays editable.
 */
export function contactPrefill(user) {
  return {
    contactName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    mail: user?.id || "",
  };
}

/**
 * The way back from an existing tenant form the wizard opened: the query
 * names the step and the bookable of the run. `null` outside a wizard run.
 */
export function onboardingReturnRoute(query, tenantId) {
  const step = query?.onboardingStep;
  if (!step || !tenantId) return null;
  return {
    name: "tenant-onboarding",
    query: { tenant: tenantId, bookable: query.onboardingBookable, step },
  };
}
