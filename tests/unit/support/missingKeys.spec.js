import { describe, expect, it } from "vitest";
import i18n from "@/language/index";
import { takeMissingKeys } from "@tests/unit/support/missingKeys";

describe("missing catalogue keys", () => {
  it("are recorded, so the spec that asked for one fails", () => {
    i18n.t("bookable.edit.no-such-key");
    i18n.tc("bookable.edit.no-such-count", 2);

    expect(takeMissingKeys()).toEqual([
      "bookable.edit.no-such-key",
      "bookable.edit.no-such-count",
    ]);
  });

  it("records nothing for a key the catalogue has", () => {
    i18n.t("bookable.edit.untitled");

    expect(takeMissingKeys()).toEqual([]);
  });
});
