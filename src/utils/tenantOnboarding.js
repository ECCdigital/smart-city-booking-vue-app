/**
 * The onboarding of a new tenant (ECCdigital/tickets#326, tenant supervision
 * spec §9): the creation contract of the tenant form, what the supervision
 * level (glossary "Aufsichtsstufe") changes about it, and the way on to the
 * first bookable, which the guided bookable flow creates. Pure, so the views
 * only wire it to the API.
 */

import { SUPERVISION_LEVELS } from "@/utils/supervision";
import { rateLimitOf } from "@/utils/rateLimit";

/**
 * The onboarding's route (`tenant-onboarding`) as the return target
 * (backend: `nextUrl`) a verification mail or an SSO sign-in leads back to.
 */
export const ONBOARDING_PATH = "/onboarding";

export { SUPERVISION_LEVELS };

const MAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isFormallyValidMail(value) {
  return typeof value === "string" && MAIL_PATTERN.test(value.trim());
}

/**
 * A missing or unknown level reads as free - the backend's default, and what
 * a backend without the supervision answers. Wording only: the closing
 * action stores the publication wish whatever the level, and the backend
 * decides what becomes public. Where a level is shown or chosen, read it
 * through `@/utils/supervision`, which never takes an unknown level for free.
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
 * What a refused `POST api/tenants` means for the form (spec §6.3): the
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
 * The i18n message of a `tenantCreationError`, shared by the onboarding and
 * the classic creation dialog. A hit limit without a usable wait says "later".
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
 * The guided flow of a new bookable, the tenant's first one. From the
 * onboarding it may be skipped, which the `onboarding` query tells the flow.
 */
export function firstBookableRoute({ onboarding = false } = {}) {
  return onboarding
    ? { name: "room-edit", query: { onboarding: "1" } }
    : { name: "room-edit" };
}
