import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import TenantEndMembershipDialog from "@/components/Tenant/TenantEndMembershipDialog.vue";

const ADDRESS = "lennard.scheffler@e-c-crew.de";

const mountDialog = (propsData) =>
  mountComponent(TenantEndMembershipDialog, {
    propsData: { open: true, address: ADDRESS, ...propsData },
  });

const dialog = () =>
  document.querySelector("[data-test='end-membership-dialog']");

/**
 * The question before „Mitgliedschaft beenden“, in
 * the list of members and in the member dialog alike.
 */
describe("TenantEndMembershipDialog", () => {
  it("asks in three paragraphs, the address bold at its first mention only", () => {
    mountDialog();

    const paragraphs = [...dialog().querySelectorAll("p")].map((p) =>
      p.textContent.replace(/\s+/g, " ").trim()
    );
    expect(paragraphs).toEqual([
      `Möchten Sie die Mitgliedschaft von ${ADDRESS} in diesem Mandanten beenden?`,
      `${ADDRESS} verliert alle Rechte im Mandanten und noch offene Einladungen verfallen. Der User wird umgehend aus der Liste der Mitglieder dieses Mandanten entfernt. Das Konto bleibt.`,
      `Soll ${ADDRESS} dauerhaft von allen Mandanten ausgeschlossen werden (z.B. wegen missbräuchlicher Nutzung oder Spam), melden Sie ${ADDRESS} an die Instanz.`,
    ]);
    const bold = [...dialog().querySelectorAll("strong")];
    expect(bold.map((b) => b.textContent)).toEqual([ADDRESS]);
    expect(dialog().querySelector("p").contains(bold[0])).toBe(true);
  });

  it("confirms or cancels", async () => {
    const wrapper = mountDialog();

    dialog().querySelector("[data-test='end-membership-confirm']").click();
    dialog().querySelector("[data-test='end-membership-cancel']").click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("confirm")).toHaveLength(1);
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("offers „An Instanz melden“ to a role that may report", async () => {
    const wrapper = mountDialog({ allowReport: true });

    const report = dialog().querySelector(
      "[data-test='end-membership-report']"
    );
    expect(report.textContent.trim()).toBe("An Instanz melden");
    report.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("report")).toHaveLength(1);
    expect(wrapper.emitted("confirm")).toBeUndefined();
  });

  it("offers no report to a role that may not report", () => {
    mountDialog({ allowReport: false });

    expect(dialog().querySelector("[data-test='end-membership-report']")).toBe(
      null
    );
  });
});
