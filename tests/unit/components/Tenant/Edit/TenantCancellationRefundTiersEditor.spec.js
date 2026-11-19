import { describe, expect, it } from "vitest";
import TenantCancellationRefundTiersEditor from "@/components/Tenant/Edit/TenantCancellationRefundTiersEditor.vue";
import { flushPromises } from "@tests/unit/support/api";
import { mountComponent } from "@tests/unit/support/mount";

function withoutTimeSpanField(wrapper) {
  return wrapper
    .findAll(".v-text-field")
    .wrappers.find((field) =>
      field.text().includes("Erstattung ohne Zeitraum")
    );
}

describe("TenantCancellationRefundTiersEditor — booking without a time span", () => {
  it("says that such a booking is refunded in full by default", () => {
    const wrapper = mountComponent(TenantCancellationRefundTiersEditor);

    expect(wrapper.text()).toContain(
      "Sie werden standardmäßig zu 100 % erstattet."
    );
    expect(withoutTimeSpanField(wrapper).find("input").element.value).toBe(
      "100"
    );
  });

  it("shows the tenant's own value", () => {
    const wrapper = mountComponent(TenantCancellationRefundTiersEditor, {
      propsData: { withoutTimeSpanPercentage: 40 },
    });

    expect(withoutTimeSpanField(wrapper).find("input").element.value).toBe(
      "40"
    );
  });

  it("emits a valid percentage as a number", async () => {
    const wrapper = mountComponent(TenantCancellationRefundTiersEditor);

    await withoutTimeSpanField(wrapper).find("input").setValue("25");

    expect(wrapper.emitted("update:withoutTimeSpanPercentage")).toEqual([[25]]);
  });

  it.each(["", "101", "-1", "12.5"])("keeps %j back", async (value) => {
    const wrapper = mountComponent(TenantCancellationRefundTiersEditor);

    await withoutTimeSpanField(wrapper).find("input").setValue(value);

    expect(wrapper.emitted("update:withoutTimeSpanPercentage")).toBeUndefined();
  });
});

const tiers = [
  { hoursBeforeStart: 48, refundPercentage: 100 },
  { hoursBeforeStart: 12, refundPercentage: 50 },
  { hoursBeforeStart: 0, refundPercentage: 0 },
];

async function editing(tier, index = -1) {
  const wrapper = mountComponent(TenantCancellationRefundTiersEditor, {
    propsData: { tiers },
  });
  if (index >= 0) wrapper.vm.openEdit(index);
  else wrapper.vm.openCreate();
  await wrapper.setData({ editingTier: tier });
  await flushPromises();
  return wrapper;
}

describe("TenantCancellationRefundTiersEditor — a deadline in hours", () => {
  it("suggests whole days past 48 hours", async () => {
    const wrapper = await editing({
      amount: 72,
      unit: "hours",
      refundPercentage: 100,
    });

    expect(wrapper.vm.daysSuggestion).toBe("3 Tage");
    expect(wrapper.vm.preferDaysHint).toBe(
      "Für Buchende ist eine Frist in ganzen Tagen verständlicher. Statt „72 Stunden“ besser etwa „3 Tage“."
    );
  });

  it("suggests nothing up to 48 hours, nor for a deadline in days", async () => {
    for (const tier of [
      { amount: 48, unit: "hours", refundPercentage: 100 },
      { amount: 5, unit: "days", refundPercentage: 100 },
    ]) {
      const wrapper = await editing(tier);

      expect(wrapper.vm.daysSuggestion).toBeNull();
      expect(wrapper.vm.preferDaysHint).toBe("");
    }
  });
});

describe("TenantCancellationRefundTiersEditor — the refund a tier may name", () => {
  it("lies between the tiers with the next shorter and the next longer deadline", async () => {
    const wrapper = await editing({
      amount: 24,
      unit: "hours",
      refundPercentage: 40,
    });

    expect(wrapper.vm.allowedRefundRange).toMatchObject({ min: 50, max: 100 });
    expect(wrapper.vm.refundRangeHint).toBe("Möglich: 50 bis 100 %");
    expect(wrapper.vm.refundRangeMessage).toBe(
      "Für diese Frist sind 50 bis 100 % möglich. Nicht mehr als bei „2 Tage“ und nicht weniger als bei „12 Stunden“."
    );
    expect(wrapper.vm.isCandidateMonotonic).toBe(false);
  });

  it("is open towards 100 % above the longest deadline", async () => {
    const wrapper = await editing({
      amount: 5,
      unit: "days",
      refundPercentage: 90,
    });

    expect(wrapper.vm.refundRangeMessage).toBe(
      "Für diese Frist sind 100 bis 100 % möglich. Nicht weniger als bei „2 Tage“."
    );
  });

  it("leaves the tier being edited out of its own range", async () => {
    const wrapper = await editing(
      { amount: 12, unit: "hours", refundPercentage: 70 },
      1
    );

    expect(wrapper.vm.allowedRefundRange).toMatchObject({ min: 0, max: 100 });
    expect(wrapper.vm.isCandidateMonotonic).toBe(true);
  });
});
