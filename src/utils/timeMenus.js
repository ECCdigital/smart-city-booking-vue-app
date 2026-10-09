import Vue from "vue";

/**
 * Closes the menu `index` of `menus`, the open states of a list's time or
 * date pickers - once a picker has its value. Reactive, as `$set` is.
 */
export function closeMenu(menus, index) {
  Vue.set(menus, index, false);
}
