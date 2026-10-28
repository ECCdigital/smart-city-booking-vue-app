import { describe, expect, it } from "vitest";
import TenantCancellationRefundTiersEditor from "@/components/Tenant/Edit/TenantCancellationRefundTiersEditor.vue";
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
