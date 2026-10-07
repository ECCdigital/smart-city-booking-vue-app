import { describe, expect, it, vi } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";

vi.mock("@/components/dashboard/DashboardChart.vue", () => ({
  default: {
    name: "DashboardChart",
    render(h) {
      return h("div", { class: "dashboard-chart-stub" });
    },
  },
}));
vi.mock("@/components/dashboard/ChartExportMenu.vue", () => ({
  default: {
    name: "ChartExportMenu",
    render(h) {
      return h("div", { class: "chart-export-menu-stub" });
    },
  },
}));

import DashboardData from "@/components/dashboard/DashboardData.vue";

/** The figure beside `label` in the dashboard, or `undefined` without one. */
function metric(wrapper, label) {
  const row = wrapper
    .findAll(".metric-row")
    .filter((r) => r.find("span").text() === label);
  return row.length ? row.at(0).find("strong").text() : undefined;
}

describe("DashboardData", () => {
  it("names the gap to the catalogue revenue „Entgangener Umsatz (brutto)“", () => {
    const wrapper = mountComponent(DashboardData, {
      propsData: {
        dashboardData: {
          data: { totals: { regularRevenueEur: 120, revenueEur: 100 } },
        },
      },
    });

    expect(metric(wrapper, "Entgangener Umsatz (brutto)")).toMatch(/20,00\s€/);
  });
});
