import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { flushPromises } from "@tests/unit/support/api";
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
async function openDialog(groupBookings, toReject = groupBookings[0]) {
  const wrapper = mountComponent(GroupBookingRejectConformationDialog, {
    propsData: {
      open: false,
      toReject,
      groupBookingId: "grp-1",
      groupBookings,
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

async function submitWithReason(wrapper) {
  await wrapper.find("textarea").setValue("Grund");
  await wrapper.find("input[type=checkbox]").setChecked(true);
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
        true,
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
});
