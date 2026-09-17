import { describe, expect, it } from "vitest";
import {
  expressionForField,
  filterVariablesForField,
  filterVariablesForSnippet,
  hasAggregatedSample,
  isCatalogLoadable,
  requirementFor,
  sampleValuesFor,
  warningsInValue,
} from "@/components/Mail/mailVariableCatalog.js";

function entry(name, kind, extra = {}) {
  return {
    name,
    label: name,
    description: `${name} description`,
    kind,
    sample: "x",
    ...extra,
  };
}

const CATALOG = [
  entry("customerName", "text"),
  entry("refundAmountEur", "number", {
    expr: "{{priceFormatted refundAmountEur}}",
  }),
  entry("hasRefundPreview", "flag", {
    expr: "{{#if hasRefundPreview}}...{{/if}}",
  }),
  entry("bookingStatusUrl", "url"),
  entry("customerContact", "html", { expr: "{{{customerContact}}}" }),
];

const names = (list) => list.map((v) => v.name);

describe("filterVariablesForField", () => {
  it("url: url, text and number", () => {
    expect(names(filterVariablesForField(CATALOG, "url"))).toEqual([
      "customerName",
      "refundAmountEur",
      "bookingStatusUrl",
    ]);
  });

  it("line: text, number and url", () => {
    expect(names(filterVariablesForField(CATALOG, "line"))).toEqual([
      "customerName",
      "refundAmountEur",
      "bookingStatusUrl",
    ]);
  });

  it("text: all five kinds", () => {
    expect(names(filterVariablesForField(CATALOG, "text"))).toEqual(
      names(CATALOG)
    );
  });

  it("html: all five kinds", () => {
    expect(names(filterVariablesForField(CATALOG, "html"))).toEqual(
      names(CATALOG)
    );
  });

  it("subject: text and number only", () => {
    expect(names(filterVariablesForField(CATALOG, "subject"))).toEqual([
      "customerName",
      "refundAmountEur",
    ]);
  });

  it("keeps the catalog order", () => {
    const reversed = [...CATALOG].reverse();
    expect(names(filterVariablesForField(reversed, "text"))).toEqual(
      names(reversed)
    );
  });
});

describe("expressionForField", () => {
  it("url field: a url variable is inserted as is", () => {
    expect(expressionForField(entry("bookingStatusUrl", "url"), "url")).toBe(
      "{{bookingStatusUrl}}"
    );
  });

  it("url field: text and number are url-encoded", () => {
    expect(expressionForField(entry("customerName", "text"), "url")).toBe(
      "{{urlEncode customerName}}"
    );
    expect(
      expressionForField(
        entry("refundAmountEur", "number", {
          expr: "{{priceFormatted refundAmountEur}}",
        }),
        "url"
      )
    ).toBe("{{urlEncode refundAmountEur}}");
  });

  it("line and subject: expr when present, otherwise {{name}}", () => {
    const number = entry("refundAmountEur", "number", {
      expr: "{{priceFormatted refundAmountEur}}",
    });
    expect(expressionForField(number, "line")).toBe(
      "{{priceFormatted refundAmountEur}}"
    );
    expect(expressionForField(number, "subject")).toBe(
      "{{priceFormatted refundAmountEur}}"
    );
    expect(expressionForField(entry("customerName", "text"), "line")).toBe(
      "{{customerName}}"
    );
    expect(expressionForField(entry("customerName", "text"), "subject")).toBe(
      "{{customerName}}"
    );
  });

  it("line and subject: never urlEncode, never triple braces", () => {
    const html = entry("customerContact", "html", {
      expr: "{{{customerContact}}}",
    });
    expect(expressionForField(html, "line")).toBe("{{customerContact}}");
    expect(expressionForField(html, "subject")).toBe("{{customerContact}}");
    expect(expressionForField(entry("bookingStatusUrl", "url"), "line")).toBe(
      "{{bookingStatusUrl}}"
    );
  });

  it("text and html: expr when present, otherwise {{name}}", () => {
    const html = entry("customerContact", "html", {
      expr: "{{{customerContact}}}",
    });
    expect(expressionForField(html, "text")).toBe("{{{customerContact}}}");
    expect(expressionForField(html, "html")).toBe("{{{customerContact}}}");
    expect(expressionForField(entry("tenantName", "text"), "text")).toBe(
      "{{tenantName}}"
    );
    expect(expressionForField(entry("tenantName", "text"), "html")).toBe(
      "{{tenantName}}"
    );
  });
});

describe("filterVariablesForSnippet", () => {
  const catalog = [
    entry("tenantName", "text"),
    entry("refundAmountEur", "number", { snippets: ["booking-cancel"] }),
    entry("paymentUrl", "url", { snippets: ["payment-link-after-approval"] }),
  ];

  it("an entry without snippets is offered everywhere", () => {
    expect(
      names(filterVariablesForSnippet(catalog, "booking-confirmation"))
    ).toEqual(["tenantName"]);
  });

  it("an entry with snippets is offered in those snippets only", () => {
    expect(names(filterVariablesForSnippet(catalog, "booking-cancel"))).toEqual(
      ["tenantName", "refundAmountEur"]
    );
    expect(
      names(filterVariablesForSnippet(catalog, "payment-link-after-approval"))
    ).toEqual(["tenantName", "paymentUrl"]);
  });

  it("an __after key counts as its base key", () => {
    expect(
      names(filterVariablesForSnippet(catalog, "booking-cancel__after"))
    ).toEqual(["tenantName", "refundAmountEur"]);
  });
});

describe("isCatalogLoadable", () => {
  it("a non-empty list whose entries all carry kind is loadable", () => {
    expect(isCatalogLoadable(CATALOG)).toBe(true);
  });

  it("an entry without kind (old backend) makes the catalog unloadable", () => {
    expect(
      isCatalogLoadable([
        { name: "tenantName", description: "Anzeigename des Mandanten" },
      ])
    ).toBe(false);
    expect(
      isCatalogLoadable([entry("tenantName", "text"), { name: "x" }])
    ).toBe(false);
  });

  it("an empty list, a missing catalog or a non-array is not loadable", () => {
    expect(isCatalogLoadable([])).toBe(false);
    expect(isCatalogLoadable(undefined)).toBe(false);
    expect(isCatalogLoadable(null)).toBe(false);
    expect(isCatalogLoadable({ tenantName: {} })).toBe(false);
  });
});

describe("sampleValuesFor", () => {
  const variables = [
    entry("customerName", "text", { sample: "Erika Mustermann" }),
    entry("bookingId", "text", { sample: "BK-1001", sampleAggregated: "" }),
    entry("groupBookingId", "text", { sample: "", sampleAggregated: "GB-7" }),
    entry("isAggregated", "flag", {
      sample: false,
      sampleAggregated: true,
    }),
    { name: "noSample", kind: "text" },
  ];

  it("off takes sample and skips entries without one", () => {
    expect(sampleValuesFor(variables, false)).toEqual({
      customerName: "Erika Mustermann",
      bookingId: "BK-1001",
      groupBookingId: "",
      isAggregated: false,
    });
  });

  it("on takes sampleAggregated where present, else sample", () => {
    expect(sampleValuesFor(variables, true)).toEqual({
      customerName: "Erika Mustermann",
      bookingId: "",
      groupBookingId: "GB-7",
      isAggregated: true,
    });
  });

  it("tolerates a missing list", () => {
    expect(sampleValuesFor(undefined, true)).toEqual({});
  });
});

describe("hasAggregatedSample", () => {
  it("is true when at least one entry carries sampleAggregated, even empty", () => {
    expect(
      hasAggregatedSample([
        entry("customerName", "text"),
        entry("bookingId", "text", { sampleAggregated: "" }),
      ])
    ).toBe(true);
  });

  it("is false without any sampleAggregated or without a list", () => {
    expect(hasAggregatedSample([entry("customerName", "text")])).toBe(false);
    expect(hasAggregatedSample(undefined)).toBe(false);
  });
});

describe("requirementFor", () => {
  const statusUrl = entry("bookingStatusUrl", "url", {
    label: "Link zur Status-Seite",
    requires: {
      text: "leer, wenn die öffentliche Status-Seite deaktiviert ist",
      tenantSetting: {
        key: "enablePublicStatusView",
        label: "Öffentliche Status-Seite",
      },
    },
  });
  const cancelUrl = entry("cancellationUrl", "url", {
    requires: { text: "leer, wenn die Buchung nicht stornierbar ist" },
  });

  it("no requires: nothing", () => {
    expect(requirementFor(entry("customerName", "text"), {})).toBeNull();
  });

  it("tenant flag off: warning with the sentence from the spec, lead on the setting label", () => {
    expect(
      requirementFor(statusUrl, { enablePublicStatusView: false })
    ).toEqual({
      level: "warning",
      icon: "mdi-alert-outline",
      lead: "Öffentliche Status-Seite",
      text: "Öffentliche Status-Seite ist in den Mandanten-Einstellungen deaktiviert – Link zur Status-Seite bleibt leer.",
    });
    expect(requirementFor(statusUrl, undefined).level).toBe("warning");
  });

  it("tenant flag on: info with requires.text", () => {
    expect(requirementFor(statusUrl, { enablePublicStatusView: true })).toEqual(
      {
        level: "info",
        icon: "mdi-information-outline",
        lead: "",
        text: "leer, wenn die öffentliche Status-Seite deaktiviert ist",
      }
    );
  });

  it("requires without tenantSetting: warning with requires.text", () => {
    expect(requirementFor(cancelUrl, { enablePublicStatusView: true })).toEqual(
      {
        level: "warning",
        icon: "mdi-alert-outline",
        lead: "",
        text: "leer, wenn die Buchung nicht stornierbar ist",
      }
    );
  });

  describe("warningsInValue", () => {
    const vars = [entry("customerName", "text"), statusUrl, cancelUrl];

    it("finds warning-level variables referenced inside any {{ … }}", () => {
      const found = warningsInValue(
        "{{bookingStatusUrl}} {{#if cancellationUrl}}x{{/if}} {{customerName}}",
        vars,
        {}
      );
      expect(found.map((w) => w.variable.name)).toEqual([
        "bookingStatusUrl",
        "cancellationUrl",
      ]);
      expect(found[0].text).toContain("Öffentliche Status-Seite");
    });

    it("matches the name as a whole word only and skips info-level entries", () => {
      expect(warningsInValue("{{bookingStatusUrlX}}", vars, {})).toEqual([]);
      expect(
        warningsInValue("{{bookingStatusUrl}}", vars, {
          enablePublicStatusView: true,
        })
      ).toEqual([]);
      expect(warningsInValue("", vars, {})).toEqual([]);
      expect(warningsInValue(null, vars, {})).toEqual([]);
    });
  });
});
