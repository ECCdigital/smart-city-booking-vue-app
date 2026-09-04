import { describe, expect, it } from "vitest";
import i18n from "@/language/index";
import PdfTemplateEditorDialog from "@/components/PDF/PdfTemplateEditorDialog.vue";

/**
 * The preview asks for a Blob, so an error body arrives as one. Status first,
 * body second - the central reader translates a 403, and a 404 (ambiguous
 * since 4.3.x: template gone, or tenant out of reach) gets its own neutral
 * sentence instead of falling through to "PDF-Vorschau konnte nicht erzeugt
 * werden", which names no reason at all.
 *
 * Exercised through the method with a stand-in context: the editor is a
 * full-screen dialog with a block palette, an expert HTML mode and a preview
 * renderer, and none of that is what decides this sentence.
 */
function extract(error) {
  return PdfTemplateEditorDialog.methods.extractPdfPreviewError.call(
    { $t: (key) => i18n.t(key) },
    error
  );
}

describe("PdfTemplateEditorDialog.extractPdfPreviewError", () => {
  it("names the two readings of a 404", async () => {
    const message = await extract({ response: { status: 404, data: {} } });
    expect(message).toBe(i18n.t("errors.not-found-or-forbidden.message"));
  });

  it("names a 404 even when its body arrived as a Blob", async () => {
    const error = {
      response: { status: 404, data: new Blob(["Not Found"]) },
    };
    expect(await extract(error)).toBe(
      i18n.t("errors.not-found-or-forbidden.message")
    );
  });

  it("still translates a 403 through the central reader", async () => {
    const error = {
      response: {
        status: 403,
        data: { error: "ForbiddenError", code: "forbidden", statusCode: 403 },
      },
    };
    expect(await extract(error)).toBe(
      i18n.t("errors.forbidden-codes.forbidden")
    );
  });

  it("falls back to the generic sentence for anything else", async () => {
    const message = await extract({ response: { status: 500, data: {} } });
    expect(message).toBe("PDF-Vorschau konnte nicht erzeugt werden.");
  });
});
