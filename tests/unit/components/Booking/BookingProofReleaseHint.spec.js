import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import BookingProofReleaseHint from "@/components/Booking/BookingProofReleaseHint.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import BookingPermissionService from "@/services/permissions/BookingPermissionService";

vi.mock("@/services/api/ApiBookingService", () => ({
  default: { remindCustomerUploads: vi.fn() },
}));
vi.mock("@/services/permissions/BookingPermissionService", () => ({
  default: { allowReviewProof: vi.fn() },
}));

const field = (label, state, required = true) => ({
  fieldId: label,
  label,
  required,
  state,
});
const booking = (id, fields) => ({
  id,
  tenantId: "t1",
  customerUploadState: { fields },
});

const hintFor = (bookings, series = false) =>
  mountComponent(BookingProofReleaseHint, {
    propsData: { bookings, series },
  });

const find = (wrapper, test) => wrapper.find(`[data-test='${test}']`);

describe("BookingProofReleaseHint", () => {
  beforeEach(() => {
    ApiBookingService.remindCustomerUploads.mockReset();
    BookingPermissionService.allowReviewProof.mockReturnValue(true);
  });

  it("names the required proofs still missing", () => {
    const wrapper = hintFor([
      booking("B1", [
        field("Vereinsausweis", "open"),
        field("Satzung", "rejected"),
        field("Sitzplan", "open", false),
        field("Liste", "submitted"),
      ]),
    ]);

    expect(wrapper.text()).toContain(
      "Es sind 3 Nachweise offen bzw. ungeprüft."
    );
    expect(find(wrapper, "booking-proof-release-missing").text()).toBe(
      "Es fehlt noch: Vereinsausweis, Satzung."
    );
    expect(find(wrapper, "booking-proof-release-remind").text()).toContain(
      "Nachweise anfordern"
    );
  });

  it("asks for nothing where only unchecked proofs are open", () => {
    const wrapper = hintFor([booking("B1", [field("Liste", "submitted")])]);

    expect(wrapper.text()).toContain("Es ist 1 Nachweis offen bzw. ungeprüft.");
    expect(find(wrapper, "booking-proof-release-missing").exists()).toBe(false);
    expect(find(wrapper, "booking-proof-release-remind").exists()).toBe(false);
  });

  it("mails each booking of a series with missing proofs", async () => {
    ApiBookingService.remindCustomerUploads.mockResolvedValue({});
    const wrapper = hintFor(
      [
        booking("B1", [field("Vereinsausweis", "open")]),
        booking("B2", [field("Liste", "submitted")]),
        booking("B3", [field("Vereinsausweis", "overdue")]),
      ],
      true
    );

    expect(find(wrapper, "booking-proof-release-missing").text()).toContain(
      "Buchung #B1: Vereinsausweis"
    );
    expect(find(wrapper, "booking-proof-release-remind").text()).toContain(
      "Nachweise anfordern"
    );

    await find(wrapper, "booking-proof-release-remind").trigger("click");
    await vi.waitFor(() =>
      expect(find(wrapper, "booking-proof-release-sent").exists()).toBe(true)
    );

    expect(ApiBookingService.remindCustomerUploads.mock.calls).toEqual([
      ["t1", "B1"],
      ["t1", "B3"],
    ]);
  });

  it("says so when the mail fails", async () => {
    ApiBookingService.remindCustomerUploads.mockRejectedValue(new Error("x"));
    const wrapper = hintFor([booking("B1", [field("Vereinsausweis", "open")])]);

    expect(find(wrapper, "booking-proof-release-remind").text()).toContain(
      "Nachweis anfordern"
    );
    await find(wrapper, "booking-proof-release-remind").trigger("click");
    await vi.waitFor(() =>
      expect(find(wrapper, "booking-proof-release-error").exists()).toBe(true)
    );
    expect(find(wrapper, "booking-proof-release-sent").exists()).toBe(false);
  });

  it("offers no request without the right to check", () => {
    BookingPermissionService.allowReviewProof.mockReturnValue(false);
    const wrapper = hintFor([booking("B1", [field("Vereinsausweis", "open")])]);

    expect(find(wrapper, "booking-proof-release-missing").exists()).toBe(true);
    expect(find(wrapper, "booking-proof-release-remind").exists()).toBe(false);
  });
});
