import _ from "lodash";

/**
 * A step of the guided bookable flow: it reads the editor's bookable and
 * hands every change back as a new object (`update:bookable`), so the
 * editor's unsaved-changes snapshot sees it.
 */
export default {
  props: {
    bookable: { type: Object, required: true },
  },
  methods: {
    patch(changes) {
      this.$emit("update:bookable", { ...this.bookable, ...changes });
    },
    /** Applies `change` to a deep copy - for the pure `apply*` helpers. */
    apply(change) {
      const next = _.cloneDeep(this.bookable);
      change(next);
      this.$emit("update:bookable", next);
    },
  },
};
