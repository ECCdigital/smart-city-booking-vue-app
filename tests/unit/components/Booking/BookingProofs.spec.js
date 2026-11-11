import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import BookingProofs from "@/components/Booking/BookingProofs.vue";
import BookingProofReviewDialog from "@/components/Booking/BookingProofReviewDialog.vue";
import BookingProofViewer from "@/components/Booking/BookingProofViewer.vue";
import BookingProofDownloadNotice from "@/components/Booking/BookingProofDownloadNotice.vue";
import ApiMediaService from "@/services/api/ApiMediaService";
import bookingPageShell from "@/mixins/bookingPageShell";
import { proofFieldsOf } from "@/utils/customerUploads";

vi.mock("@/services/api/ApiMediaService", () => ({
  MEDIA_SCOPE: { TENANT: "tenant", INSTANCE: "instance" },
  default: { getMediaFileBlob: vi.fn() },
}));

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

describe("BookingProofs - view and download", () => {
  const waiting = {
    mediaId: "m",
    originalFileName: "ausweis.pdf",
    mimeType: "application/pdf",
    uploadedAt: 1,
    category: "sensitive",
    review: { status: "submitted", fileDeleted: false },
  };

  it("offers to view a stored PDF beside its download, both with the field", async () => {
    const fields = fieldsWith(waiting);
    const wrapper = mountComponent(BookingProofs, { propsData: { fields } });

    await wrapper.find(".booking-proofs__view").trigger("click");
    await wrapper.find(".booking-proofs__download").trigger("click");

    const [field] = fields;
    expect(wrapper.emitted("view")[0][0]).toEqual({
      field,
      upload: field.uploads[0],
    });
    expect(wrapper.emitted("download")[0][0]).toEqual({
      field,
      upload: field.uploads[0],
    });
  });

  it("offers no view for a deleted file", () => {
    const wrapper = noteOf(checked("sensitive", true));

    expect(wrapper.find(".booking-proofs__view").exists()).toBe(false);
  });
});

describe("BookingProofViewer", () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => "blob:proof");
    window.URL.revokeObjectURL = vi.fn();
    ApiMediaService.getMediaFileBlob.mockReset();
  });

  const viewerFor = (upload) =>
    mountComponent(BookingProofViewer, {
      propsData: {
        open: true,
        field: { fieldId: "f", label: "Ausweis", category: "sensitive" },
        upload,
      },
    });

  it("shows a PDF in a frame, fetched with the caller's credentials", async () => {
    ApiMediaService.getMediaFileBlob.mockResolvedValue({ data: "%PDF" });
    const wrapper = viewerFor({
      mediaId: "m",
      originalFileName: "ausweis.pdf",
      mimeType: "application/pdf",
    });
    await vi.waitFor(() =>
      expect(document.querySelector(".booking-proof-viewer__pdf")).not.toBe(
        null
      )
    );

    expect(ApiMediaService.getMediaFileBlob).toHaveBeenCalledWith(
      "tenant",
      "m"
    );
    expect(
      document.querySelector(".booking-proof-viewer__pdf").getAttribute("src")
    ).toBe("blob:proof");
    expect(document.body.textContent).toContain("Besonders schutzwürdig");

    await wrapper.setProps({ open: false });
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:proof");
  });

  it("shows an image as it is", async () => {
    ApiMediaService.getMediaFileBlob.mockResolvedValue({ data: "png" });
    viewerFor({
      mediaId: "i",
      originalFileName: "ausweis.png",
      mimeType: "image/png",
    });
    await vi.waitFor(() =>
      expect(document.querySelector(".booking-proof-viewer__image")).not.toBe(
        null
      )
    );
  });

  it("says so when the file cannot be fetched", async () => {
    ApiMediaService.getMediaFileBlob.mockRejectedValue(new Error("nope"));
    viewerFor({ mediaId: "m", mimeType: "application/pdf" });
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain(
        "Der Nachweis konnte nicht angezeigt werden."
      )
    );
  });
});

describe("BookingProofDownloadNotice", () => {
  it("names the deletion deadline of the tenant", () => {
    mountComponent(BookingProofDownloadNotice, {
      propsData: { open: true, fileName: "ausweis.pdf", retentionDays: 30 },
    });

    expect(document.body.textContent).toContain("sensible Daten");
    expect(document.body.textContent).toContain(
      "akzeptiert oder abgelehnt haben, spätestens aber nach Ablauf der Löschfrist von 30 Tagen."
    );
  });

  it("leaves the number out while the tenant names none", () => {
    mountComponent(BookingProofDownloadNotice, {
      propsData: { open: true, retentionDays: null },
    });

    expect(document.body.textContent).toContain(
      "spätestens aber nach Ablauf der Löschfrist."
    );
  });
});

describe("bookingPageShell - the download of a proof", () => {
  const {
    requestProofDownload,
    confirmProofDownload,
    closeProofDownloadNotice,
  } = bookingPageShell.methods;
  const page = () => ({
    proofDownloadNotice: { open: false, field: null, upload: null },
    downloadProof: vi.fn(),
    closeProofDownloadNotice() {
      closeProofDownloadNotice.call(this);
    },
  });

  it("downloads a normal proof at once", () => {
    const ctx = page();
    const upload = { mediaId: "m", category: "normal" };
    requestProofDownload.call(ctx, { field: {}, upload });

    expect(ctx.downloadProof).toHaveBeenCalledWith(upload);
    expect(ctx.proofDownloadNotice.open).toBe(false);
  });

  it("shows the notice before a sensitive proof, downloads on confirm", () => {
    const ctx = page();
    const upload = { mediaId: "m" };
    requestProofDownload.call(ctx, {
      field: { category: "sensitive" },
      upload,
    });

    expect(ctx.downloadProof).not.toHaveBeenCalled();
    expect(ctx.proofDownloadNotice.open).toBe(true);

    confirmProofDownload.call(ctx);
    expect(ctx.downloadProof).toHaveBeenCalledWith(upload);
    expect(ctx.proofDownloadNotice.open).toBe(false);
  });
});
