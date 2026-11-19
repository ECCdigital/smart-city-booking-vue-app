import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises, serverError } from "@tests/unit/support/api";
import { activeDialogText } from "@tests/unit/support/dialog";
import i18n from "@/language/index";

vi.mock("@/services/api/ApiBookingService", () => ({
  default: { getCancellationRefundPreview: vi.fn() },
}));
vi.mock("@/services/api/ApiGroupBookingService", () => ({
  default: { getCancellationRefundPreview: vi.fn() },
}));

import GroupBookingRejectConformationDialog from "@/components/Booking/GroupBookingRejectConformationDialog.vue";
import ApiBookingService from "@/services/api/ApiBookingService";
import ApiGroupBookingService from "@/services/api/ApiGroupBookingService";

function member(id, status, priceEur = 25) {
  return { id, status, priceEur };
}

/**
 * Mounted closed and then opened, the way `BookingTransitions` drives it, so
 * that the dialog's own opening runs.
 */
async function openDialog(
  groupBookings,
  toReject = groupBookings[0],
  props = {}
) {
  const wrapper = mountComponent(GroupBookingRejectConformationDialog, {
    propsData: {
      open: false,
      toReject,
      groupBookingId: "grp-1",
      groupBookings,
      ...props,
    },
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
  await wrapper.vm.$nextTick();
  return wrapper;
}

function radio(label) {
  return Array.from(
    document.querySelectorAll(".v-dialog--active .v-radio")
  ).find((el) => el.textContent.trim() === label);
}

function paymentHint() {
  return document
    .querySelector(".v-dialog--active .booking-reject-payment")
    .textContent.replace(/\u00a0/g, " ");
}

/** A promise the spec settles by hand, to order the answers of the API. */
function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function submitWithReason(wrapper) {
  await wrapper.find("textarea").setValue("Grund");
  // A request offers no checkbox: the backend issues it no document.
  const skip = wrapper.find("input[type=checkbox]");
  if (skip.exists()) await skip.setChecked(true);
  await wrapper.vm.$nextTick();
  await wrapper.find("form").trigger("submit");
  await flushPromises();
  await wrapper.vm.$nextTick();
}

/**
 * The series cancel dialog shows the state of the series (spec E9) and offers
 * "Gesamte Serie stornieren" only while the members share a state that can
 * be cancelled; a mixed series says so, greys the series option and starts
 * on "Nur diese Buchung". The bank-details rule of spec E12 stays: asked at
 * Bestätigt with a price, for the series only where every member is.
 */
describe("GroupBookingRejectConformationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ApiBookingService.getCancellationRefundPreview.mockResolvedValue({
      originalAmountEur: 25,
    });
    ApiGroupBookingService.getCancellationRefundPreview.mockResolvedValue({
      originalAmountEur: 50,
    });
  });

  describe("with every member confirmed", () => {
    const members = [member("bk-1", "confirmed"), member("bk-2", "confirmed")];

    it("shows the shared state, starts on the whole series and asks for bank details", async () => {
      await openDialog(members);

      expect(activeDialogText()).toContain("Zustand der Serie");
      expect(activeDialogText()).not.toContain("Gemischt");
      expect(radio("Gesamte Serie stornieren").className).not.toContain(
        "v-radio--is-disabled"
      );
      expect(activeDialogText()).toContain(
        i18n.t("booking.cancellationRefund.bankDetailsTitle")
      );
    });

    it("cancels the whole series", async () => {
      const wrapper = await openDialog(members);

      await submitWithReason(wrapper);

      expect(wrapper.emitted("reject-group-booking")[0]).toEqual([
        "bk-1",
        "Grund",
        true,
        undefined,
        undefined,
      ]);
    });
  });

  describe("with every member requested", () => {
    const members = [
      member("bk-1", "requested", 20),
      member("bk-2", "requested", 30),
    ];

    it("rejects the series free of charge: its own words, no document, no refund preview", async () => {
      const wrapper = await openDialog(members);

      expect(activeDialogText()).toContain("Buchungsanfrage ablehnen");
      expect(activeDialogText()).toContain("Begründung der Ablehnung");
      expect(radio("Gesamte Serie ablehnen")).toBeTruthy();
      expect(radio("Nur diese Buchung ablehnen")).toBeTruthy();
      expect(activeDialogText()).not.toContain("Kein Stornobeleg erstellen");
      expect(activeDialogText()).not.toContain("Erstattungsvorschau");
      expect(activeDialogText()).toContain(
        "Die abgelehnte Buchungsanfrage ist für den Buchenden kostenfrei. Es steht somit keine Zahlung mehr aus."
      );
      expect(
        ApiGroupBookingService.getCancellationRefundPreview
      ).not.toHaveBeenCalled();

      await submitWithReason(wrapper);

      expect(wrapper.emitted("reject-group-booking")[0]).toEqual([
        "bk-1",
        "Grund",
        false,
        undefined,
        undefined,
      ]);
    });
  });

  describe("with every member confirmed and paid", () => {
    it("names the amount paid and the refund of the series", async () => {
      ApiGroupBookingService.getCancellationRefundPreview.mockResolvedValue({
        bookings: [
          { bookingId: "bk-1", originalAmountEur: 25, refundAmountEur: 25 },
          { bookingId: "bk-2", originalAmountEur: 25, refundAmountEur: 12.5 },
        ],
      });

      await openDialog([
        member("bk-1", "confirmed"),
        member("bk-2", "confirmed"),
      ]);

      const hint = document
        .querySelector(".v-dialog--active .booking-reject-payment")
        .textContent.replace(/\u00a0/g, " ");
      expect(hint).toContain("Bereits bezahlt: 50,00 €");
      expect(hint).toContain("Der Buchende bekommt 37,50 € zurück.");
    });

    it("says the refund is unknown when the preview failed and no document is made", async () => {
      ApiGroupBookingService.getCancellationRefundPreview.mockRejectedValue(
        serverError(500)
      );
      const wrapper = await openDialog([
        member("bk-1", "confirmed"),
        member("bk-2", "confirmed"),
      ]);

      await wrapper.find("input[type=checkbox]").setChecked(true);
      await wrapper.vm.$nextTick();

      const hint = document
        .querySelector(".v-dialog--active .booking-reject-payment")
        .textContent.replace(/\u00a0/g, " ");
      expect(hint).toContain("Bereits bezahlt: 50,00 €");
      expect(hint).toContain(
        "Betrag unbekannt: Die Erstattung konnte nicht berechnet werden. Der Buchende bekommt trotzdem zurück, was die Staffel des Mandanten vorsieht."
      );
    });
  });

  describe("when the admin switches the scope before the series preview arrives", () => {
    it("shows the preview of this booking, not the late one of the series", async () => {
      const seriesAnswer = deferred();
      const singleAnswer = deferred();
      ApiGroupBookingService.getCancellationRefundPreview.mockReturnValue(
        seriesAnswer.promise
      );
      ApiBookingService.getCancellationRefundPreview.mockReturnValue(
        singleAnswer.promise
      );
      const wrapper = await openDialog([
        member("bk-1", "confirmed"),
        member("bk-2", "confirmed"),
      ]);

      radio("Nur diese Buchung stornieren").querySelector("input").click();
      await flushPromises();
      singleAnswer.resolve({ originalAmountEur: 25, refundAmountEur: 20 });
      await flushPromises();
      seriesAnswer.resolve({
        bookings: [
          { bookingId: "bk-1", originalAmountEur: 25, refundAmountEur: 25 },
          { bookingId: "bk-2", originalAmountEur: 25, refundAmountEur: 12.5 },
        ],
      });
      await flushPromises();
      await wrapper.vm.$nextTick();

      expect(paymentHint()).toContain("Bereits bezahlt: 25,00 €");
      expect(paymentHint()).toContain("Der Buchende bekommt 20,00 € zurück.");
    });
  });

  describe("with members in mixed states", () => {
    const members = [member("bk-1", "requested"), member("bk-2", "confirmed")];

    it("says the series is mixed and shows the members' own states", async () => {
      await openDialog(members);

      expect(activeDialogText()).toContain("Gemischt");
      expect(activeDialogText()).toContain(
        i18n.t("group-booking.transition.mixed.message")
      );
      expect(activeDialogText()).toContain("Angefragt");
      expect(activeDialogText()).toContain("Bestätigt");
    });

    it("greys the series option and cancels only this one booking", async () => {
      const wrapper = await openDialog(members);

      expect(radio("Gesamte Serie stornieren").className).toContain(
        "v-radio--is-disabled"
      );
      expect(
        ApiGroupBookingService.getCancellationRefundPreview
      ).not.toHaveBeenCalled();

      await submitWithReason(wrapper);

      expect(wrapper.emitted("reject-group-booking")).toBeUndefined();
      expect(wrapper.emitted("reject-single-booking")[0]).toEqual([
        "bk-1",
        "Grund",
        false,
        undefined,
        undefined,
      ]);
    });

    it("asks for no bank details for a requested member", async () => {
      await openDialog(members);

      expect(activeDialogText()).not.toContain(
        i18n.t("booking.cancellationRefund.bankDetailsTitle")
      );
    });

    it("asks for bank details for a confirmed, priced member", async () => {
      await openDialog(members, members[1]);

      expect(activeDialogText()).toContain(
        i18n.t("booking.cancellationRefund.bankDetailsTitle")
      );
    });
  });

  it("offers only the series scope where the host acts on the series as a whole", async () => {
    const members = [member("bk-1", "confirmed"), member("bk-2", "confirmed")];
    const wrapper = await openDialog(members, members[0], {
      seriesOnly: true,
    });

    expect(radio("Gesamte Serie stornieren")).toBeDefined();
    expect(radio("Nur diese Buchung stornieren")).toBeUndefined();

    await submitWithReason(wrapper);

    expect(wrapper.emitted("reject-group-booking")).toHaveLength(1);
    expect(wrapper.emitted("reject-single-booking")).toBeUndefined();
  });

  /**
   * A host that hands over no members (the edit form still mounts the
   * dialog on its own) knows nothing about the series - the dialog offers
   * it as before, and the route refuses a mixed one.
   */
  it("offers the series as before when it was not handed the members", async () => {
    const wrapper = await openDialog([], member("bk-1", "confirmed"));

    expect(activeDialogText()).not.toContain("Zustand der Serie");
    expect(radio("Gesamte Serie stornieren").className).not.toContain(
      "v-radio--is-disabled"
    );
    expect(
      ApiGroupBookingService.getCancellationRefundPreview
    ).toHaveBeenCalled();

    await submitWithReason(wrapper);

    expect(wrapper.emitted("reject-group-booking")).toHaveLength(1);
  });

  /**
   * Without the members the dialog knows only the one booking's price; on
   * the series it names what the preview of the series says was paid, never
   * the price of the one booking against the refund of the series.
   */
  it("names the amount paid for the series from its preview when it was not handed the members", async () => {
    ApiGroupBookingService.getCancellationRefundPreview.mockResolvedValue({
      originalAmountEur: 300,
      refundAmountEur: 150,
    });

    await openDialog([], member("bk-1", "confirmed", 100));

    const hint = document
      .querySelector(".v-dialog--active .booking-reject-payment")
      .textContent.replace(/\u00a0/g, " ");
    expect(hint).toContain("Bereits bezahlt: 300,00 €");
    expect(hint).toContain("Der Buchende bekommt 150,00 € zurück.");
  });
});
