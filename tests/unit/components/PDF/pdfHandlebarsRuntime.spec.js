import { describe, expect, it } from "vitest";
import Handlebars from "handlebars";
import { registerPdfRuntime } from "@/components/PDF/pdfHandlebarsRuntime.js";

/** A fresh Handlebars instance set up as the template editor's preview does. */
function previewHandlebars() {
  const hb = Handlebars.create();
  registerPdfRuntime(hb);
  return hb;
}

describe("the PDF preview runtime", () => {
  it("renders the page number partial of the backend's default templates", () => {
    // The footer every default template (and so every new tenant) carries.
    const footer =
      "<template data-pdf-footer><span>{{ title }} {{ invoiceNumber }}</span><span>{{> pdfPageNumbers }}</span></template>";

    const html = previewHandlebars().compile(footer)({
      title: "Rechnung",
      invoiceNumber: "R-1",
    });

    expect(html).toContain("Rechnung R-1");
    expect(html).toContain('<span class="pageNumber"></span>');
    expect(html).toContain('<span class="totalPages"></span>');
  });
});
