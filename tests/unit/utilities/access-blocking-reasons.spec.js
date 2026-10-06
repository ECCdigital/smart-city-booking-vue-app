import { describe, expect, it } from "vitest";
import {
  ACCESS_BLOCKING_REASON,
  formatBlockingReasonMessage,
  formatOpenRefusalMessage,
} from "@/utilities/access-blocking-reasons";

/** A translator that hands back the key, so a spec asserts on the key alone. */
const key = (translationKey) => translationKey;

describe("formatBlockingReasonMessage", () => {
  it("names the most important reason the server sent", () => {
    expect(
      formatBlockingReasonMessage(["not_provisioned", "evidence_missing"], key)
    ).toBe("accessPoint.blockingReasons.not_provisioned");
  });

  it("knows the reason a door without a remote way in is refused with", () => {
    expect(
      formatBlockingReasonMessage(
        [ACCESS_BLOCKING_REASON.NO_REMOTE_ACCESS],
        key
      )
    ).toBe("accessPoint.blockingReasons.no_remote_access");
  });

  it("no longer knows `locker_not_ready`, which the backend enum dropped", () => {
    expect(formatBlockingReasonMessage(["locker_not_ready"], key)).toBe(
      "accessPoint.blockingReasons.unknown"
    );
  });

  it("falls back where no reason was given at all", () => {
    expect(formatBlockingReasonMessage([], key)).toBe(
      "accessPoint.open.error.message"
    );
    expect(formatBlockingReasonMessage(undefined, key)).toBe(
      "accessPoint.open.error.message"
    );
  });
});

/**
 * The two ways an open comes back refused on HTTP 200: the access decision
 * with its reasons, and the provider failing behind a passed decision.
 */
describe("formatOpenRefusalMessage", () => {
  it("names a configuration failure of the provider", () => {
    expect(
      formatOpenRefusalMessage({ openFailure: "configuration" }, key)
    ).toBe("accessPoint.openFailure.configuration");
  });

  it("names a temporary failure of the provider", () => {
    expect(formatOpenRefusalMessage({ openFailure: "temporary" }, key)).toBe(
      "accessPoint.openFailure.temporary"
    );
  });

  it("does not invent a meaning for a failure class it does not know", () => {
    expect(formatOpenRefusalMessage({ openFailure: "wobbly" }, key)).toBe(
      "accessPoint.blockingReasons.unknown"
    );
  });

  it("names the blocking reasons where the decision refused", () => {
    expect(
      formatOpenRefusalMessage({ blockingReasons: ["payment_required"] }, key)
    ).toBe("accessPoint.blockingReasons.payment_required");
  });

  it("falls back on an empty refusal", () => {
    expect(formatOpenRefusalMessage({}, key)).toBe(
      "accessPoint.open.error.message"
    );
    expect(formatOpenRefusalMessage(undefined, key)).toBe(
      "accessPoint.open.error.message"
    );
  });
});
