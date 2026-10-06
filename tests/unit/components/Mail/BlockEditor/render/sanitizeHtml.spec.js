import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/components/Mail/BlockEditor/render/sanitizeHtml.js";

const anchor = (href, text = "x") => `<a href="${href}">${text}</a>`;

describe("sanitizeHtml with Handlebars expressions", () => {
  it("keeps {{bookingStatusUrl}} in an href", () => {
    const html = anchor("{{bookingStatusUrl}}", "Status");
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("keeps {{urlEncode customerName}} in a query string", () => {
    const html = anchor(
      "https://example.test/?name={{urlEncode customerName}}"
    );
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("moves an {{#if}} block between <tr> tags behind the table (known behavior)", () => {
    const html =
      "<table><tr><td>a</td></tr>{{#if flag}}<tr><td>b</td></tr>{{/if}}</table>";
    expect(sanitizeHtml(html)).toBe(
      "<table><tbody><tr><td>a</td></tr><tr><td>b</td></tr></tbody></table>{{#if flag}}{{/if}}"
    );
  });
});
