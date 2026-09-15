import { describe, expect, it } from "vitest";
import ToastService from "@/services/ToastService";

/** A toast off the catalogue: `<key>.title` and `<key>.message`, with the params both read. */
describe("ToastService.createToast", () => {
  it("fills the title and the message from the catalogue with the params", () => {
    expect(
      ToastService.createToast("booking.page.tenant-switched", "info", 3000, {
        name: "Dev Tenant",
      })
    ).toEqual({
      title: "Mandant gewechselt",
      message: "Mandant zu „Dev Tenant“ gewechselt.",
      type: "info",
      timeout: 3000,
    });
  });

  it("stays five seconds and needs no params for a plain key", () => {
    expect(ToastService.createToast("errors.something-wrong", "error")).toEqual(
      {
        title: "Fehler",
        message:
          "Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
        type: "error",
        timeout: 5000,
      }
    );
  });
});
