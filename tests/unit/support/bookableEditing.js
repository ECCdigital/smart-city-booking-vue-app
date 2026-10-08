import _ from "lodash";
import { mountComponent } from "@tests/unit/support/mount";

/**
 * Mounts a component on the `bookableEditing` mixin the way `BookableEdit`
 * hosts it: the bookable goes in as a prop, every `update:bookable` is a
 * partial patch merged flat into the next prop. The spec reads the patches
 * and compares the bookable it handed in with `stored` - a component that
 * changed its prop in place shows up there.
 *
 * `expertMode` is handed down as `BookableEdit` does, with the bookable as
 * last loaded or saved: `saved`, by default the one handed in. Without it the
 * component sees expert mode on, as it does outside `BookableEdit`.
 */
export function mountEditing(
  component,
  { bookable, expertMode, saved, ...options } = {}
) {
  const stored = _.cloneDeep(bookable);
  const patches = [];
  const provide = { ...(options.provide || {}) };
  if (expertMode !== undefined) {
    provide.bookableExpertMode = {
      enabled: expertMode,
      stored: _.cloneDeep(saved === undefined ? bookable : saved),
    };
  }
  let wrapper = null;
  wrapper = mountComponent(component, {
    ...options,
    provide,
    propsData: { ...(options.propsData || {}), bookable },
    listeners: {
      "update:bookable": (changes) => {
        patches.push(changes);
        wrapper.setProps({
          bookable: { ...wrapper.props("bookable"), ...changes },
        });
      },
    },
  });
  return { wrapper, patches, bookable, stored };
}

/** The changes of the last patch, by name. */
export const lastPatch = (patches) => patches[patches.length - 1];
