import _ from "lodash";

/**
 * A component that edits the bookable `BookableEdit` holds, in either mode:
 * it reads the `bookable` prop and never changes it. Every change goes out
 * at once as `update:bookable` with only the changed top-level fields, which
 * `BookableEdit` merges flat - so the overview, the checks and the unsaved-
 * changes hint see it the same way in both modes. A deeper field changes by
 * rebuilding its top-level value. See
 * docs/adr/0002-one-field-one-component-one-rule.md.
 */
export default {
  props: {
    bookable: { type: Object, required: true },
  },
  methods: {
    /** Hands on `changes`: the new values of top-level fields, by name. */
    patch(changes) {
      this.$emit("update:bookable", { ...changes });
    },
    /**
     * Runs `change` on a deep copy - for the rules that set a bookable in
     * place, like `applyBookingMode` - and hands on the top-level fields it
     * changed. Nothing changed, nothing is handed on.
     */
    apply(change) {
      const next = _.cloneDeep(this.bookable);
      change(next);
      const changed = _.union(Object.keys(next), Object.keys(this.bookable))
        .filter((key) => !_.isEqual(next[key], this.bookable[key]))
        .reduce((changes, key) => ({ ...changes, [key]: next[key] }), {});
      if (Object.keys(changed).length) this.patch(changed);
    },
  },
};
