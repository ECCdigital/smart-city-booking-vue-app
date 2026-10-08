import _ from "lodash";
import { expertOptionShown } from "@/utils/bookableExpertMode";
import { BOOKABLE_RULE_NAMES, bookableRules } from "@/utils/bookableValidation";

/**
 * A component that edits the bookable `BookableEdit` holds, in either mode:
 * it reads the `bookable` prop and never changes it. Every change goes out
 * at once as `update:bookable` with only the changed top-level fields, which
 * `BookableEdit` merges flat - so the overview, the checks and the unsaved-
 * changes hint see it the same way in both modes. A deeper field changes by
 * rebuilding its top-level value. See
 * docs/adr/0002-one-field-one-component-one-rule.md.
 *
 * Whether an expert option shows, it asks `expertOptionShown(option)`: the
 * rule of the expert-mode module over the mode and the stored bookable that
 * `BookableEdit` provides, and the bookable as edited. Outside `BookableEdit`
 * expert mode is on.
 *
 * A field takes its rules from `fieldRules.<name>`: the rules of
 * `bookableValidation`, which the save checks too, with German messages
 * (glossary „Meldung“).
 */
export default {
  inject: {
    bookableExpertMode: {
      default: () => ({ enabled: true, stored: null }),
    },
  },
  props: {
    bookable: { type: Object, required: true },
  },
  computed: {
    /** The rules of `bookableValidation` by name, as a field takes them. */
    fieldRules() {
      const translate = (key, params) => this.$t(key, params);
      return BOOKABLE_RULE_NAMES.reduce(
        (rules, name) => ({ ...rules, [name]: bookableRules(name, translate) }),
        {}
      );
    },
  },
  methods: {
    /** Whether the expert option `option` shows, by the expert-mode rule. */
    expertOptionShown(option) {
      return expertOptionShown(option, {
        expertMode: this.bookableExpertMode.enabled !== false,
        stored: this.bookableExpertMode.stored,
        current: this.bookable,
      });
    },
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
