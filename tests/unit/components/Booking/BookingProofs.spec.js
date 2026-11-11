import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import BookingProofs from "@/components/Booking/BookingProofs.vue";
import BookingProofReviewDialog from "@/components/Booking/BookingProofReviewDialog.vue";
import { proofFieldsOf } from "@/utils/customerUploads";

const checked = (category, fileDeleted) => ({
  mediaId: `m-${category}`,
  originalFileName: fileDeleted ? "" : "satzung.pdf",
  mimeType: "application/pdf",
  uploadedAt: 1,
  category,
  review: {
    status: "accepted",
    reason: "",
    reviewedAt: Date.UTC(2026, 10, 2, 9, 30),
    reviewedByName: "Sabine Sachbearbeiterin",
    autoDeleted: false,
    fileDeleted,
  },
});

const fieldsWith = (upload) =>
  proofFieldsOf({
    customerUploadState: {
      state: "fulfilled",
      fields: [
        {
          fieldId: "f",
          label: "Satzung",
          required: true,
          state: "fulfilled",
          deadline: null,
          uploads: [upload],
        },
      ],
    },
  });

const noteOf = (upload) =>
  mountComponent(BookingProofs, {
    propsData: { fields: fieldsWith(upload) },
  });

describe("BookingProofs - the note of a checked proof", () => {
  it("keeps a normal file downloadable and says nothing of a deletion", () => {
    const wrapper = noteOf(checked("normal", false));

    expect(wrapper.find(".booking-proofs__note").text()).toContain(
      "Sabine Sachbearbeiterin"
    );
    expect(wrapper.text()).not.toContain("gelöscht");
    expect(wrapper.find(".booking-proofs__download").exists()).toBe(true);
  });

  it("says „Datei gelöscht“ for a sensitive file, without download", () => {
    const wrapper = noteOf(checked("sensitive", true));

    expect(wrapper.find(".booking-proofs__note").text()).toContain(
      "Sabine Sachbearbeiterin"
    );
    expect(wrapper.find(".booking-proofs__note").text()).toContain(
      "Datei gelöscht"
    );
    expect(wrapper.find(".booking-proofs__download").exists()).toBe(false);
  });
});

describe("BookingProofReviewDialog - what a check does to the file", () => {
  const dialogFor = (category) =>
    mountComponent(BookingProofReviewDialog, {
      propsData: {
        open: true,
        target: {
          action: "accepted",
          field: { fieldId: "f", label: "Satzung", category },
          upload: {
            mediaId: "m",
            originalFileName: "satzung.pdf",
            category,
            review: { status: "submitted" },
          },
        },
      },
    });
  const dialogText = () =>
    document.querySelector(".v-dialog--active")?.textContent ?? "";

  it("warns that a sensitive file is deleted", async () => {
    const wrapper = dialogFor("sensitive");
    await wrapper.vm.$nextTick();

    expect(dialogText()).toContain("Die Datei wird danach gelöscht.");
  });

  it("warns of nothing for a normal file: it stays with the booking", async () => {
    const wrapper = dialogFor("normal");
    await wrapper.vm.$nextTick();

    expect(dialogText()).toContain("Nachweis akzeptieren");
    expect(dialogText()).not.toContain("gelöscht");
  });
});
