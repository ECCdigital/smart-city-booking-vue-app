import { describe, expect, it } from "vitest";
import {
  findMissingRequiredVariables,
  getPdfTemplateCatalogEntry,
  isValidPdfTemplate,
} from "@/components/PDF/pdfTemplateCatalog";
import { getVariablesForContext } from "@/components/Mail/templateVariables";

/** The HTML of a catalog entry's default blocks, as the block editor holds it. */
function defaultBlocksHtml(entry) {
  return entry
    .defaultBlocks()
    .flatMap((row) => row.columns)
    .flatMap((column) => column.blocks)
    .map((block) => block.html || block.text || "")
    .join("\n");
}

/** The withdrawal receipt („Widerrufbeleg“) beside the cancellation template. */
describe("the withdrawal receipt template", () => {
  const entry = getPdfTemplateCatalogEntry("withdrawal");

  it("is a catalog entry with its own variables and sample data", () => {
    expect(entry.title).toBe("Widerrufbeleg-Vorlage");
    expect(getVariablesForContext("withdrawal")).toBe(entry.variables);
    expect(entry.sampleData).toMatchObject({
      title: "Widerrufbeleg",
      withdrawalNumber: expect.any(String),
    });
  });

  it("starts from default blocks that carry every required variable", () => {
    const html = defaultBlocksHtml(entry);

    expect(findMissingRequiredVariables(html, entry.requiredVariables)).toEqual(
      []
    );
    expect(html).toContain("{{withdrawalNumber}}");
    expect(html).toContain("keine Kosten");
    expect(html).not.toContain("cancellationFee");
  });

  it("offers only variables the backend fills for a withdrawal", () => {
    const names = entry.variables.map((variable) => variable.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "withdrawalNumber",
        "withdrawalDate",
        "hasOriginalDocument",
        "alreadyPaid",
        "refundAmount",
      ])
    );
    expect(names).not.toContain("cancellationFee");
    expect(names).not.toContain("refundCalculations");
  });

  it("wraps its body into a valid document", () => {
    expect(
      isValidPdfTemplate(
        entry.buildDocument("<p>x</p>", entry.defaultPageTemplates())
      )
    ).toBe(true);
  });
});
