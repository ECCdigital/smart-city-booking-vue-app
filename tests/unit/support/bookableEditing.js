import _ from "lodash";
import { mountComponent } from "@tests/unit/support/mount";

/**
 * Mounts a component on the `bookableEditing` mixin the way `BookableEdit`
 * hosts it: the bookable goes in as a prop, every `update:bookable` is a
 * partial patch merged flat into the next prop. The spec reads the patches
 * and compares the bookable it handed in with `stored` - a component that
 * changed its prop in place shows up there.
 */
export function mountEditing(component, { bookable, ...options } = {}) {
  const stored = _.cloneDeep(bookable);
  const patches = [];
  let wrapper = null;
  wrapper = mountComponent(component, {
    ...options,
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
