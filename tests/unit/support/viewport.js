/**
 * The viewport width Vuetify's breakpoint reads when a component mounts.
 * jsdom lays nothing out, so `window.innerWidth` alone decides between the
 * phone and the wide layout. A spec of the phone layout sets it before the
 * mount and puts it back afterwards.
 */

/** A phone held upright (iPhone 12). */
export const PHONE_WIDTH = 390;

/** jsdom's own width, which Vuetify reads as a wide screen. */
const DEFAULT_WIDTH = 1024;

export function setViewportWidth(width) {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
    writable: true,
  });
}

export function resetViewportWidth() {
  setViewportWidth(DEFAULT_WIDTH);
}
