import { describe, expect, it } from "vitest";
import {
  filledCustomFields,
  formatCustomFieldValue,
} from "@/utils/bookingCustomFields";

function definition(id, inputType, extra = {}) {
  return { id, name: id, inputType, ...extra };
}

/**
 * What the Buchungsseite lists under "Benutzerdefinierte Felder": the
 * booking's definitions joined with their stored values, filled ones only,
 * each value worded as the admin reads it.
 */
describe("filledCustomFields", () => {
  it("joins the definitions with their stored values, in definition order", () => {
    const booking = {
      customFieldDefinitions: [
        definition("phone", "text"),
        definition("guests", "numeric"),
      ],
      customFieldValues: [
        { fieldId: "guests", value: 4 },
        { fieldId: "phone", value: "0151" },
      ],
    };

    expect(
      filledCustomFields(booking).map((f) => [f.id, f.inputType, f.rawValue])
    ).toEqual([
      ["phone", "text", "0151"],
      ["guests", "numeric", 4],
    ]);
  });

  it("keeps false and 0, drops null, empty and missing values", () => {
    const booking = {
      customFieldDefinitions: [
        definition("catering", "boolean"),
        definition("guests", "numeric"),
        definition("note", "text"),
        definition("wish", "text"),
        definition("room", "select"),
      ],
      customFieldValues: [
        { fieldId: "catering", value: false },
        { fieldId: "guests", value: 0 },
        { fieldId: "note", value: "" },
        { fieldId: "wish", value: null },
      ],
    };

    expect(filledCustomFields(booking).map((f) => f.id)).toEqual([
      "catering",
      "guests",
    ]);
  });

  it("lists nothing for a booking without definitions or values", () => {
    expect(filledCustomFields({})).toEqual([]);
    expect(filledCustomFields(null)).toEqual([]);
    expect(
      filledCustomFields({ customFieldDefinitions: [definition("a", "text")] })
    ).toEqual([]);
  });
});

describe("formatCustomFieldValue", () => {
  it("reads a boolean as Ja or Nein", () => {
    expect(
      formatCustomFieldValue({ inputType: "boolean", rawValue: true })
    ).toBe("Ja");
    expect(
      formatCustomFieldValue({ inputType: "boolean", rawValue: false })
    ).toBe("Nein");
  });

  it("reads a select by the caption of its option, the raw value where none matches", () => {
    const options = [
      { value: "s", caption: "Klein" },
      { value: "l", caption: "Groß" },
    ];
    expect(
      formatCustomFieldValue({ inputType: "select", options, rawValue: "l" })
    ).toBe("Groß");
    expect(
      formatCustomFieldValue({ inputType: "select", options, rawValue: "xl" })
    ).toBe("xl");
    expect(
      formatCustomFieldValue({ inputType: "select", rawValue: "xl" })
    ).toBe("xl");
  });

  it("reads a number in German notation", () => {
    expect(
      formatCustomFieldValue({ inputType: "numeric", rawValue: 1234.5 })
    ).toBe("1.234,5");
    expect(formatCustomFieldValue({ inputType: "numeric", rawValue: 0 })).toBe(
      "0"
    );
  });

  it("reads any other field as its text", () => {
    expect(
      formatCustomFieldValue({ inputType: "text", rawValue: "Hallo" })
    ).toBe("Hallo");
    expect(formatCustomFieldValue({ inputType: "date", rawValue: 42 })).toBe(
      "42"
    );
  });
});
