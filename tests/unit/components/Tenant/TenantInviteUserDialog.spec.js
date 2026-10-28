import { describe, expect, it } from "vitest";
import { mountComponent } from "@tests/unit/support/mount";
import { activeDialog, activeDialogText } from "@tests/unit/support/dialog";
import TenantInviteUserDialog from "@/components/Tenant/TenantInviteUserDialog.vue";

const LABEL = "Besitzer benachrichtigen, wenn eine Einladung angenommen wird";

async function openTab(tabName, propsData) {
  const wrapper = mountComponent(TenantInviteUserDialog, {
    propsData: { open: true, tenantId: "t1", ...propsData },
  });
  await wrapper.vm.$nextTick();
  Array.from(activeDialog().querySelectorAll(".v-tab"))
    .find((t) => t.textContent.includes(tabName))
    .click();
  await wrapper.vm.$nextTick();
  return wrapper;
}

const openLinkTab = (propsData) => openTab("Einladungslink", propsData);

// The dialog detaches into the `data-app` container, so it is read off the
// document - and off the tab shown, as a tab once shown stays in the DOM.
function activeTab() {
  return activeDialog().querySelector(".v-window-item--active");
}

// The label carries the description as its second line.
function noticeLabel() {
  return Array.from(activeTab().querySelectorAll("label")).find((l) =>
    l.textContent.trim().startsWith(LABEL)
  );
}

/** Whether `a` comes before `b` in the dialog. */
function precedes(a, b) {
  return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function dialogElement(selector, text) {
  return Array.from(activeTab().querySelectorAll(selector)).find((el) =>
    el.textContent.includes(text)
  );
}

// The buttons sit in the footer of the dialog, below every tab.
function footerButton(text) {
  return Array.from(
    activeDialog().querySelectorAll(".v-card__actions button")
  ).find((el) => el.textContent.includes(text));
}

function noticeCheckbox() {
  const label = noticeLabel();
  return label ? document.getElementById(label.getAttribute("for")) : null;
}

/**
 * Whether the Besitzer get a mail when someone joins through an invitation is
 * one setting of the tenant, for every invitation, by mail and by link. It
 * sits where both are made, but only a Besitzer of the tenant may see and
 * change it.
 */
describe("TenantInviteUserDialog invitation notice", () => {
  it("shows a Besitzer the setting under „Einladungslink“", async () => {
    await openLinkTab({
      canChangeInvitationNotice: true,
      notifyOwnersOnInvitationAccepted: true,
    });

    expect(noticeCheckbox().checked).toBe(true);
    expect(noticeLabel().textContent).toMatch(/alle Einladungen/);
  });

  it("shows a Besitzer the same setting under „Per E-Mail einladen“", async () => {
    await openTab("Per E-Mail einladen", {
      canChangeInvitationNotice: true,
      notifyOwnersOnInvitationAccepted: true,
    });

    expect(noticeCheckbox().checked).toBe(true);
  });

  it("puts it at the end of „Per E-Mail einladen“, above the buttons", async () => {
    await openTab("Per E-Mail einladen", {
      canChangeInvitationNotice: true,
      notifyOwnersOnInvitationAccepted: true,
    });

    const emails = dialogElement("label", "E-Mail-Adressen");
    const close = footerButton("Schließen");
    expect(precedes(emails, noticeLabel())).toBe(true);
    expect(precedes(noticeLabel(), close)).toBe(true);
  });

  it("puts it at the end of „Einladungslink“, above the buttons", async () => {
    await openLinkTab({
      canChangeInvitationNotice: true,
      notifyOwnersOnInvitationAccepted: true,
    });

    const links = dialogElement("span", "Bestehende Einladungslinks");
    const close = footerButton("Schließen");
    expect(precedes(links, noticeLabel())).toBe(true);
    expect(precedes(noticeLabel(), close)).toBe(true);
  });

  it("keeps it at the end of the form for a new link", async () => {
    const wrapper = await openLinkTab({
      canChangeInvitationNotice: true,
      notifyOwnersOnInvitationAccepted: true,
    });

    dialogElement("button", "Neuen Einladungslink erstellen").click();
    await wrapper.vm.$nextTick();

    const create = footerButton("Link erstellen");
    expect(noticeCheckbox().checked).toBe(true);
    expect(precedes(noticeLabel(), create)).toBe(true);
  });

  it("leaves it out where a member is added without an invitation", async () => {
    await openTab("Manuell hinzufügen", {
      canChangeInvitationNotice: true,
      notifyOwnersOnInvitationAccepted: true,
    });

    expect(noticeCheckbox()).toBeNull();
    expect(activeDialogText()).toMatch(/direkt zum Mandanten hinzufügen/);
  });

  it("shows the setting as off when the Besitzer turned it off", async () => {
    await openLinkTab({
      canChangeInvitationNotice: true,
      notifyOwnersOnInvitationAccepted: false,
    });

    expect(noticeCheckbox().checked).toBe(false);
  });

  it("reports the change instead of saving it itself", async () => {
    const wrapper = await openLinkTab({
      canChangeInvitationNotice: true,
      notifyOwnersOnInvitationAccepted: true,
    });

    noticeCheckbox().click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("change-invitation-notice")).toEqual([[false]]);
  });

  it("does not show the setting to anyone but a Besitzer", async () => {
    await openLinkTab({
      canChangeInvitationNotice: false,
      notifyOwnersOnInvitationAccepted: true,
    });

    expect(noticeCheckbox()).toBeNull();
    expect(activeDialogText()).toMatch(/Bestehende Einladungslinks/);
  });
});
