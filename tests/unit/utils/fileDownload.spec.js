import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openFileUrl, saveBlob } from "@/utils/fileDownload";

/**
 * The one way every "Herunterladen" of the admin hands a file to the
 * browser: a Blob is saved under its name through an object URL that is
 * freed again, a hosted attachment opens in a new tab under its own URL.
 */
describe("fileDownload", () => {
  let click;
  let clicked;

  beforeEach(() => {
    clicked = [];
    click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        clicked.push({
          href: this.getAttribute("href"),
          download: this.getAttribute("download"),
          target: this.getAttribute("target"),
          attached: this.isConnected,
        });
      });
    window.URL.createObjectURL = vi.fn(() => "blob:receipt");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    click.mockRestore();
    delete window.URL.createObjectURL;
    delete window.URL.revokeObjectURL;
  });

  describe("saveBlob", () => {
    it("saves the blob under the file name and frees the object URL afterwards", () => {
      const blob = new Blob(["%PDF"], { type: "application/pdf" });

      saveBlob(blob, "beleg-1.pdf");

      expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(clicked).toEqual([
        {
          href: "blob:receipt",
          download: "beleg-1.pdf",
          target: null,
          attached: true,
        },
      ]);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:receipt");
      expect(document.querySelector("a[download='beleg-1.pdf']")).toBeNull();
    });
  });

  describe("openFileUrl", () => {
    it("opens the hosted file in a new tab under its own URL", () => {
      openFileUrl("https://files.example.org/plan.pdf", "plan.pdf");

      expect(clicked).toEqual([
        {
          href: "https://files.example.org/plan.pdf",
          download: "plan.pdf",
          target: "_blank",
          attached: false,
        },
      ]);
      expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });
  });
});
