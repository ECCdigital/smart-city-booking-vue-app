import { mapActions, mapGetters } from "vuex";

/**
 * What every card of the event editing page (`EventEdit`) shares: the event
 * form of the `events` store, a way to change one field of it, and the
 * message of a required field that is missing - shown at the field at
 * once, as the navigation and the overview show it. The page provides
 * `eventEditIssues` ({ list }), filled from `eventIssues`.
 */
export default {
  inject: {
    eventEditIssues: { default: () => ({ list: [] }) },
  },
  computed: {
    ...mapGetters({
      form: "events/form",
      registrationMode: "events/registrationMode",
    }),
    // A publicly listed event carries public media only.
    isPublic() {
      return Boolean(this.form.isPublic);
    },
  },
  methods: {
    ...mapActions({ updateForm: "events/updateForm" }),
    /** Sets `field` of the form, or of its part `parent`. */
    update(parent, field, value) {
      this.updateForm(parent ? { parent, field, value } : { field, value });
    },
    /** The messages of `field` while it keeps the event from being saved. */
    errorsFor(field) {
      return this.eventEditIssues.list
        .filter((issue) => issue.field === field)
        .map((issue) => this.$t(`event.edit.issues.${issue.key}`));
    },
  },
};
