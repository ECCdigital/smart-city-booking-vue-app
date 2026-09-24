import { describe, expect, it } from "vitest";
import Bookable from "@/entities/bookable";
import {
  applyOfferForm,
  completionVariant,
  contactPrefill,
  creationErrorMessage,
  creationFieldErrorKey,
  emptyOfferForm,
  findCreatedTenant,
  isFormallyValidMail,
  offerFormFromBookable,
  onboardingReturnRoute,
  showsSupervisionNotice,
  startStep,
  storedChoices,
  tenantCreationError,
  validateOfferForm,
} from "@/utils/tenantOnboarding";

const filledForm = (overrides = {}) => ({
  ...emptyOfferForm(),
  type: "room",
  title: "Treffpunkt im Erdgeschoss",
  priceChoice: "free",
  availability: "always",
  ...overrides,
});

describe("emptyOfferForm", () => {
  it("shows the changeable defaults and preselects neither price nor availability", () => {
    const form = emptyOfferForm();

    expect(form.schedule).toBe("period");
    expect(form.amount).toBe(1);
    expect(form.confirmation).toBe("manual");
    expect(form.type).toBe("");
    expect(form.priceChoice).toBeNull();
    expect(form.availability).toBeNull();
  });
});

describe("validateOfferForm", () => {
  it("requires type and title", () => {
    const errors = validateOfferForm(filledForm({ type: "", title: "  " }));

    expect(errors.type).toBe("required");
    expect(errors.title).toBe("required");
  });

  it("requires a deliberate price and availability choice", () => {
    const errors = validateOfferForm(
      filledForm({ priceChoice: null, availability: null })
    );

    expect(errors.priceChoice).toBe("choice-required");
    expect(errors.availability).toBe("choice-required");
  });

  it("requires a price above zero for a paid offer", () => {
    expect(
      validateOfferForm(filledForm({ priceChoice: "paid", price: 0 })).price
    ).toBe("price-required");
    expect(
      validateOfferForm(filledForm({ priceChoice: "paid", price: "12,50" }))
    ).toEqual({});
  });

  it("requires days and a valid span for opening hours", () => {
    expect(
      validateOfferForm(
        filledForm({ availability: "hours", weekdays: [], startTime: "09:00" })
      ).openingHours
    ).toBe("opening-hours-invalid");
    expect(
      validateOfferForm(
        filledForm({
          availability: "hours",
          weekdays: [1],
          startTime: "18:00",
          endTime: "09:00",
        })
      ).openingHours
    ).toBe("opening-hours-invalid");
    expect(
      validateOfferForm(
        filledForm({
          availability: "hours",
          weekdays: [1, 2],
          startTime: "09:00",
          endTime: "18:00",
        })
      )
    ).toEqual({});
  });

  it("takes 0 as the unlimited amount and refuses anything below", () => {
    expect(validateOfferForm(filledForm({ amount: 0 }))).toEqual({});
    expect(validateOfferForm(filledForm({ amount: -1 })).amount).toBe(
      "amount-invalid"
    );
    expect(validateOfferForm(filledForm({ amount: 1.5 })).amount).toBe(
      "amount-invalid"
    );
  });

  it("accepts a complete free, unrestricted offer without image or description", () => {
    expect(validateOfferForm(filledForm())).toEqual({});
  });
});

describe("applyOfferForm", () => {
  it("writes a free, unrestricted draft with the visible defaults", () => {
    const bookable = applyOfferForm(new Bookable(), filledForm());

    expect(bookable.type).toBe("room");
    expect(bookable.title).toBe("Treffpunkt im Erdgeschoss");
    expect(bookable.isPublic).toBe(false);
    expect(bookable.isScheduleRelated).toBe(true);
    expect(bookable.amount).toBe(1);
    expect(bookable.autoCommitBooking).toBe(false);
    expect(bookable.priceCategories[0].priceEur).toBe(0);
    expect(bookable.isOpeningHoursRelated).toBe(false);
  });

  it("writes price and billing unit of a paid offer", () => {
    const bookable = applyOfferForm(
      new Bookable(),
      filledForm({ priceChoice: "paid", price: "12,50", priceType: "per-hour" })
    );

    expect(bookable.priceCategories[0].priceEur).toBe(12.5);
    expect(bookable.priceType).toBe("per-hour");
  });

  it("writes the weekly pattern as the first opening hours row and keeps further rows", () => {
    const stored = new Bookable({
      openingHours: [
        { weekdays: [1], startTime: "08:00", endTime: "10:00" },
        { weekdays: [6], startTime: "10:00", endTime: "12:00" },
      ],
    });

    const bookable = applyOfferForm(
      stored,
      filledForm({
        availability: "hours",
        weekdays: [1, 2],
        startTime: "09:00",
        endTime: "18:00",
      })
    );

    expect(bookable.isOpeningHoursRelated).toBe(true);
    expect(bookable.openingHours).toEqual([
      { weekdays: [1, 2], startTime: "09:00", endTime: "18:00" },
      { weekdays: [6], startTime: "10:00", endTime: "12:00" },
    ]);
  });

  it("drops stored opening hours when the offer becomes unrestricted", () => {
    const stored = new Bookable({
      isOpeningHoursRelated: true,
      openingHours: [{ weekdays: [1], startTime: "08:00", endTime: "10:00" }],
    });

    const bookable = applyOfferForm(
      stored,
      filledForm({ availability: "always" })
    );

    expect(bookable.isOpeningHoursRelated).toBe(false);
    expect(bookable.openingHours).toEqual([]);
  });

  it("keeps what the wizard does not ask for and leaves the source untouched", () => {
    const stored = new Bookable({
      id: "b-1",
      isPublic: true,
      tags: ["a"],
      priceCategories: [
        { priceEur: 5, fixedPrice: true, weekdays: [1] },
        { priceEur: 9, weekdays: [6] },
      ],
    });

    const bookable = applyOfferForm(
      stored,
      filledForm({ priceChoice: "paid", price: 7, confirmation: "auto" })
    );

    expect(bookable.id).toBe("b-1");
    expect(bookable.isPublic).toBe(true);
    expect(bookable.tags).toEqual(["a"]);
    expect(bookable.autoCommitBooking).toBe(true);
    expect(bookable.priceCategories[0]).toMatchObject({
      priceEur: 7,
      fixedPrice: true,
    });
    expect(bookable.priceCategories[1].priceEur).toBe(9);
    expect(stored.priceCategories[0].priceEur).toBe(5);
  });

  it("turns every price category to zero for a free offer", () => {
    const stored = new Bookable({
      priceCategories: [{ priceEur: 5 }, { priceEur: 9 }],
    });

    const bookable = applyOfferForm(stored, filledForm());

    expect(bookable.priceCategories.map((c) => c.priceEur)).toEqual([0, 0]);
  });

  it("writes a booking without period", () => {
    const bookable = applyOfferForm(
      new Bookable(),
      filledForm({ schedule: "none" })
    );

    expect(bookable.isScheduleRelated).toBe(false);
  });
});

describe("offerFormFromBookable", () => {
  const stored = new Bookable({
    type: "resource",
    title: "Beamer",
    description: "<p>Hell</p>",
    amount: 3,
    autoCommitBooking: true,
    isScheduleRelated: false,
    priceCategories: [{ priceEur: 4 }],
    priceType: "per-day",
    isOpeningHoursRelated: true,
    openingHours: [{ weekdays: [1, 3], startTime: "10:00", endTime: "16:00" }],
  });

  it("loads the current data", () => {
    const form = offerFormFromBookable(stored);

    expect(form).toMatchObject({
      type: "resource",
      title: "Beamer",
      description: "<p>Hell</p>",
      amount: 3,
      confirmation: "auto",
      schedule: "none",
      price: 4,
      priceType: "per-day",
      weekdays: [1, 3],
      startTime: "10:00",
      endTime: "16:00",
    });
  });

  it("shows the stored price and availability as the selected choices", () => {
    const form = offerFormFromBookable(stored);

    expect(form.priceChoice).toBe("paid");
    expect(form.availability).toBe("hours");
    expect(offerFormFromBookable(new Bookable())).toMatchObject({
      priceChoice: "free",
      availability: "always",
    });
  });
});

describe("storedChoices", () => {
  it("reads the choices a bookable stores", () => {
    expect(
      storedChoices(
        new Bookable({
          priceCategories: [{ priceEur: 0 }, { priceEur: 3 }],
          isOpeningHoursRelated: true,
        })
      )
    ).toEqual({ priceChoice: "paid", availability: "hours" });
    expect(storedChoices(new Bookable())).toEqual({
      priceChoice: "free",
      availability: "always",
    });
  });
});

describe("startStep", () => {
  it("starts at the tenant without one", () => {
    expect(startStep({ tenant: null })).toBe("tenant");
  });

  it("continues at the bookable, where the choices are confirmed again", () => {
    expect(startStep({ tenant: { id: "t" } })).toBe("offer");
  });
});

describe("supervision levels", () => {
  it("names the closing action per level", () => {
    expect(completionVariant("free")).toBe("free");
    expect(completionVariant("supervised")).toBe("supervised");
    expect(completionVariant("blocked")).toBe("blocked");
  });

  it("reads a missing or unknown level as free, the default of the backend", () => {
    expect(completionVariant(undefined)).toBe("free");
    expect(completionVariant("whatever")).toBe("free");
  });

  it("explains the supervision for supervised and blocked only", () => {
    expect(showsSupervisionNotice("free")).toBe(false);
    expect(showsSupervisionNotice(undefined)).toBe(false);
    expect(showsSupervisionNotice("supervised")).toBe(true);
    expect(showsSupervisionNotice("blocked")).toBe(true);
  });
});

describe("findCreatedTenant", () => {
  it("picks the tenant that is new since the creation and carries the name", () => {
    const before = [{ id: "a", name: "Verein" }];
    const after = [
      { id: "a", name: "Verein" },
      { id: "c", name: "Anderer" },
      { id: "b", name: "Verein" },
    ];

    expect(findCreatedTenant(before, after, " Verein ")).toEqual({
      id: "b",
      name: "Verein",
    });
  });

  it("answers null when the list shows no new tenant of that name", () => {
    expect(findCreatedTenant([], [{ id: "a", name: "X" }], "Y")).toBeNull();
  });
});

describe("tenantCreationError", () => {
  const refused = (status, data = {}, headers = {}) => ({
    response: { status, data, headers },
  });

  it("reads the wait of a hit creation limit from Retry-After", () => {
    expect(
      tenantCreationError(refused(429, {}, { "retry-after": "5400" }))
    ).toEqual({ key: "rate-limited", wait: "1 Std. 30 Min." });
    expect(
      tenantCreationError(refused(429, { params: { retryAfterSeconds: 60 } }))
    ).toEqual({ key: "rate-limited", wait: "1 Min." });
  });

  it("points to the fitting verification path", () => {
    expect(
      tenantCreationError(
        refused(403, {
          code: "email_verification_required",
          params: { method: "email" },
        })
      ).key
    ).toBe("verification-mail");
    expect(
      tenantCreationError(
        refused(403, {
          code: "email_verification_required",
          params: { method: "identity_provider" },
        })
      ).key
    ).toBe("verification-identity-provider");
  });

  it("names the tenant cap and the field of a 400", () => {
    expect(
      tenantCreationError(refused(409, { code: "max_tenants_reached" })).key
    ).toBe("max-tenants");
    expect(
      tenantCreationError(
        refused(400, { code: "invalid_mail", params: { field: "mail" } })
      )
    ).toEqual({ key: "field", field: "mail" });
  });

  it("falls back to the generic failure", () => {
    expect(tenantCreationError(new Error("offline")).key).toBe("generic");
    expect(tenantCreationError(refused(403, { code: "forbidden" })).key).toBe(
      "generic"
    );
  });
});

describe("creationErrorMessage", () => {
  it("names the wait of a hit limit, or says later without one", () => {
    expect(
      creationErrorMessage({ key: "rate-limited", wait: "2 Min." })
    ).toEqual({
      key: "tenant.onboarding.errors.rate-limited",
      params: { wait: "2 Min." },
    });
    expect(creationErrorMessage({ key: "rate-limited", wait: "" }).key).toBe(
      "tenant.onboarding.errors.rate-limited-unknown"
    );
  });

  it("answers nothing without an error", () => {
    expect(creationErrorMessage(null)).toBeNull();
  });
});

describe("creationFieldErrorKey", () => {
  it("marks only the field the backend named", () => {
    const error = { key: "field", field: "mail" };
    expect(creationFieldErrorKey(error, "mail")).toBe(
      "tenant.onboarding.errors.mail-invalid"
    );
    expect(creationFieldErrorKey(error, "name")).toBeNull();
    expect(
      creationFieldErrorKey(
        { key: "field", field: "contactName" },
        "contactName"
      )
    ).toBe("tenant.onboarding.offer.errors.required");
    expect(creationFieldErrorKey({ key: "generic" }, "mail")).toBeNull();
  });
});

describe("isFormallyValidMail", () => {
  it("accepts what the backend accepts, surrounding whitespace included", () => {
    expect(isFormallyValidMail("erika@example.org")).toBe(true);
    expect(isFormallyValidMail(" erika@example.org ")).toBe(true);
  });

  it("refuses an empty, incomplete or spaced address", () => {
    [
      "",
      null,
      undefined,
      "erika",
      "erika@example",
      "e rika@example.org",
    ].forEach((value) => expect(isFormallyValidMail(value)).toBe(false));
  });
});

describe("contactPrefill", () => {
  it("takes contact person and mail from the user account", () => {
    expect(
      contactPrefill({
        id: "erika@example.org",
        firstName: "Erika",
        lastName: "Muster",
      })
    ).toEqual({ contactName: "Erika Muster", mail: "erika@example.org" });
  });

  it("stays empty without an account", () => {
    expect(contactPrefill(null)).toEqual({ contactName: "", mail: "" });
  });
});

describe("onboardingReturnRoute", () => {
  it("leads back to the step and bookable the wizard left", () => {
    expect(
      onboardingReturnRoute(
        { tab: "legal", onboardingStep: "overview", onboardingBookable: "b-1" },
        "t-1"
      )
    ).toEqual({
      name: "tenant-onboarding",
      query: { tenant: "t-1", bookable: "b-1", step: "overview" },
    });
  });

  it("is absent when the form was not opened from the wizard", () => {
    expect(onboardingReturnRoute({ tab: "legal" }, "t-1")).toBeNull();
    expect(onboardingReturnRoute({ onboardingStep: "setup" }, null)).toBeNull();
  });
});
