/**
 * Readers for the one Vuetify dialog that is open. `v-dialog` detaches into
 * the `data-app` container of `mount.js`, so a spec reads it off the
 * document rather than off the wrapper.
 */

export function activeDialog() {
  return document.querySelector(".v-dialog--active");
}

export function activeDialogText() {
  return activeDialog()?.textContent ?? "";
}

/** The button with `label` inside the open dialog, or `undefined`. */
export function dialogButton(label) {
  return Array.from(document.querySelectorAll(".v-dialog--active button")).find(
    (el) => el.textContent.trim() === label
  );
}
