/**
 * Readers for the headline (`BookingStatusPath`) as a host renders it: the
 * primary action's button, the side-way menu - which detaches into the
 * `data-app` container of `mount.js`, so it is read off the document - and
 * the words a reader sees.
 */

export function primaryButton(wrapper) {
  return wrapper.find("button.booking-action-primary");
}

export function menuButton(wrapper) {
  return wrapper.find("button.booking-action-menu");
}

/** Opens the headline's side-way menu, if any, and reads its entries; `null` without a menu. */
export async function menuEntries(wrapper) {
  const activator = menuButton(wrapper);
  if (!activator.exists()) {
    return null;
  }
  await activator.trigger("click");
  await wrapper.vm.$nextTick();
  return Array.from(
    document.querySelectorAll(".v-menu__content .booking-action-secondary")
  );
}

/** The headline's actions as the reader sees them: the button's word and the menu's words. */
export async function offeredActions(wrapper) {
  const button = primaryButton(wrapper);
  const entries = await menuEntries(wrapper);
  return {
    button: button.exists() ? button.text() : null,
    menu: entries && entries.map((entry) => entry.textContent.trim()),
  };
}

export async function clickMenuEntry(wrapper, label) {
  const entry = (await menuEntries(wrapper)).find(
    (candidate) => candidate.textContent.trim() === label
  );
  entry.click();
  await wrapper.vm.$nextTick();
}
