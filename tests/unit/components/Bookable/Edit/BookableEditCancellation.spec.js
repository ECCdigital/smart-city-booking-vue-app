import { describe, expect, it } from "vitest";
import { mountEditing } from "@tests/unit/support/bookableEditing";
import { switchByLabel, toggleSwitch } from "@tests/unit/support/vuetify";
import Bookable from "@/entities/bookable";
import BookableEditCancellation from "@/components/Bookable/Edit/BookableEditCancellation.vue";

const SELF = "Buchende dürfen ihre Buchungen selbst stornieren";

const bookable = (overrides = {}) =>
  new Bookable({ tenantId: "t1", title: "Saal", ...overrides }).toPlain();

describe("BookableEditCancellation (Stornierung)", () => {
  it("changes nothing when it mounts", () => {
    const {
      patches,
      bookable: handed,
      stored,
    } = mountEditing(BookableEditCancellation, { bookable: bookable() });

    expect(patches).toEqual([]);
    expect(handed).toEqual(stored);
  });

  it("lets only the administration cancel with only the policy as the patch", async () => {
    const {
      wrapper,
      patches,
      bookable: handed,
      stored,
    } = mountEditing(BookableEditCancellation, { bookable: bookable() });

    await toggleSwitch(wrapper, SELF);

    expect(patches).toEqual([
      { cancellationPolicy: { userCancellable: false } },
    ]);
    expect(handed).toEqual(stored);
  });

  it("lets bookers cancel again, keeping the rest of the policy", async () => {
    const { wrapper, patches } = mountEditing(BookableEditCancellation, {
      bookable: bookable({
        cancellationPolicy: { userCancellable: false, deadlineHours: 24 },
      }),
    });

    await toggleSwitch(wrapper, SELF);

    expect(patches).toEqual([
      { cancellationPolicy: { userCancellable: true, deadlineHours: 24 } },
    ]);
  });

  it("reads a missing policy as bookers cancel", () => {
    const { wrapper } = mountEditing(BookableEditCancellation, {
      bookable: bookable({ cancellationPolicy: null }),
    });

    expect(switchByLabel(wrapper, SELF).props("inputValue")).toBe(true);
  });
});
