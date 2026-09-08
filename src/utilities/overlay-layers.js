/**
 * Die Ebene der fixierten SaveBar und die Ebene, auf der Dropdowns darüber
 * liegen müssen. Vuetify 2 berechnet den z-index eines v-menu selbst
 * (getMaxZIndex + 2) und landet ohne z-index an den Vorfahren unterhalb der
 * SaveBar — deshalb setzen Selects auf SaveBar-Seiten ihn explizit.
 *
 * Bewusst deutlich unter Vuetifys Dialog-Ebene (200+): ein Dropdown in einem
 * v-dialog braucht weiterhin den vom Dialog berechneten Wert, nicht diesen.
 */
export const SAVE_BAR_Z_INDEX = 4;

export const MENU_PROPS_ABOVE_SAVE_BAR = { zIndex: SAVE_BAR_Z_INDEX + 2 };
