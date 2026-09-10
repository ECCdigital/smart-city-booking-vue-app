import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HERO_PREVIEW_DEBOUNCE,
  createHeroPreviewResolver,
} from "@/utils/heroPreviewResolver";
import { serverError } from "@tests/unit/support/api";

/**
 * The resolver debounces with real timers and answers on the microtask queue,
 * so a spec drives the clock and then lets the promises settle.
 */
async function tick(ms = HERO_PREVIEW_DEBOUNCE) {
  await vi.advanceTimersByTimeAsync(ms);
}

function answer(data) {
  return { data };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createHeroPreviewResolver debounce", () => {
  it("sends nothing before the debounce has run out", async () => {
    const resolve = vi.fn().mockResolvedValue(answer({ name: "a" }));
    const resolver = createHeroPreviewResolver({ resolve });

    resolver.send({ name: "a" });
    await tick(HERO_PREVIEW_DEBOUNCE - 1);

    expect(resolve).not.toHaveBeenCalled();
  });

  it("sends only the last of a burst of changes", async () => {
    const resolve = vi.fn().mockResolvedValue(answer({ name: "c" }));
    const resolver = createHeroPreviewResolver({ resolve });

    resolver.send({ name: "a" });
    await tick(100);
    resolver.send({ name: "b" });
    await tick(100);
    resolver.send({ name: "c" });
    await tick();

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith({ name: "c" });
  });

  it("drops a queued Draft when it is cancelled", async () => {
    const resolve = vi.fn().mockResolvedValue(answer({}));
    const resolver = createHeroPreviewResolver({ resolve });

    resolver.send({ name: "a" });
    resolver.cancel();
    await tick();

    expect(resolve).not.toHaveBeenCalled();
  });
});

describe("createHeroPreviewResolver draftId", () => {
  it("counts up from one, so every Draft is told apart", async () => {
    const onResolved = vi.fn();
    const resolver = createHeroPreviewResolver({
      resolve: vi.fn().mockResolvedValue(answer({ name: "a" })),
      onResolved,
    });

    resolver.send({ name: "a" });
    await tick();
    resolver.send({ name: "b" });
    await tick();

    expect(onResolved.mock.calls.map((call) => call[1])).toEqual([1, 2]);
  });

  it("hands the resolved payload of the answer on", async () => {
    const onResolved = vi.fn();
    const resolver = createHeroPreviewResolver({
      resolve: vi.fn().mockResolvedValue(answer({ name: "Marktplatz" })),
      onResolved,
    });

    resolver.send({ name: "Marktplatz" });
    await tick();

    expect(onResolved).toHaveBeenCalledWith({ name: "Marktplatz" }, 1);
  });

  it("discards the answer of a round-trip a newer one has replaced", async () => {
    const onResolved = vi.fn();
    let slow;
    const resolve = vi
      .fn()
      .mockReturnValueOnce(
        new Promise((resolveSlow) => {
          slow = resolveSlow;
        })
      )
      .mockResolvedValueOnce(answer({ name: "second" }));
    const resolver = createHeroPreviewResolver({ resolve, onResolved });

    resolver.send({ name: "first" });
    await tick();
    resolver.send({ name: "second" });
    await tick();

    // The second answer is in; the first arrives afterwards and is stale.
    slow(answer({ name: "first" }));
    await tick(0);

    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledWith({ name: "second" }, 2);
  });

  it("discards the failure of a round-trip a newer one has replaced", async () => {
    const onRejected = vi.fn();
    let slow;
    const resolve = vi
      .fn()
      .mockReturnValueOnce(
        new Promise((_resolve, rejectSlow) => {
          slow = rejectSlow;
        })
      )
      .mockResolvedValueOnce(answer({ name: "second" }));
    const resolver = createHeroPreviewResolver({ resolve, onRejected });

    resolver.send({ name: "first" });
    await tick();
    resolver.send({ name: "second" });
    await tick();

    slow(serverError(400));
    await tick(0);

    expect(onRejected).not.toHaveBeenCalled();
  });
});

describe("createHeroPreviewResolver failures", () => {
  it("reports a refusal with the Draft it belongs to", async () => {
    const onRejected = vi.fn();
    const error = serverError(400);
    const resolver = createHeroPreviewResolver({
      resolve: vi.fn().mockRejectedValue(error),
      onRejected,
    });

    resolver.send({ name: "a" });
    await tick();

    expect(onRejected).toHaveBeenCalledWith(error, 1);
  });

  it("keeps resolving after a refusal", async () => {
    const onResolved = vi.fn();
    const resolver = createHeroPreviewResolver({
      resolve: vi
        .fn()
        .mockRejectedValueOnce(serverError(400))
        .mockResolvedValueOnce(answer({ name: "b" })),
      onResolved,
      onRejected: vi.fn(),
    });

    resolver.send({ name: "a" });
    await tick();
    resolver.send({ name: "b" });
    await tick();

    expect(onResolved).toHaveBeenCalledWith({ name: "b" }, 2);
  });
});
