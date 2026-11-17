<script>
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";

/**
 * One person of an event, as a contact person or a speaker: name, e-mail,
 * phone and photo from the media library. The fields are named by the
 * caller (`fields`), since the contact person and the speakers store them
 * under different keys. Emits `change` with `{ field, value }` and
 * `remove`.
 */
export default {
  name: "EventEditPerson",
  components: { MediaReferenceField },
  props: {
    person: { type: Object, required: true },
    // The keys of name, e-mail, phone and photo in `person`.
    fields: { type: Object, required: true },
    removeLabel: { type: String, required: true },
    errors: { type: Object, default: () => ({}) },
    publicOnly: { type: Boolean, default: false },
    publicOnlyReason: { type: String, default: "" },
    dataTest: { type: String, default: "event-person" },
  },
  methods: {
    change(key, value) {
      this.$emit("change", { field: this.fields[key], value });
    },
    errorsOf(key) {
      return this.errors[this.fields[key]] || [];
    },
  },
};
</script>

<template>
  <div class="event-person" :data-test="dataTest">
    <div class="event-person__fields">
      <v-text-field
        :value="person[fields.name]"
        :label="$t('event.edit.people.name')"
        :error-messages="errorsOf('name')"
        :data-field="fields.name"
        outlined
        dense
        hide-details="auto"
        @input="change('name', $event)"
      />
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            :value="person[fields.email]"
            :label="$t('event.edit.people.email')"
            :error-messages="errorsOf('email')"
            :data-field="fields.email"
            type="email"
            outlined
            dense
            hide-details="auto"
            @input="change('email', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            :value="person[fields.phone]"
            :label="$t('event.edit.people.phone')"
            :error-messages="errorsOf('phone')"
            :data-field="fields.phone"
            type="tel"
            outlined
            dense
            hide-details="auto"
            @input="change('phone', $event)"
          />
        </v-col>
      </v-row>
      <MediaReferenceField
        :value="person[fields.image]"
        :label="$t('event.edit.people.photo')"
        :empty-label="$t('event.edit.people.photoEmpty')"
        :public-only="publicOnly"
        :public-only-reason="publicOnlyReason"
        @input="change('image', $event)"
      />
    </div>
    <v-btn
      icon
      small
      :title="removeLabel"
      :aria-label="removeLabel"
      @click="$emit('remove')"
    >
      <v-icon small>mdi-delete-outline</v-icon>
    </v-btn>
  </div>
</template>

<style scoped>
.event-person {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--scb-space-3);
  align-items: start;
  padding: var(--scb-space-3);
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-control);
}

.event-person + .event-person {
  margin-top: var(--scb-space-2);
}

.event-person__fields {
  display: grid;
  gap: var(--scb-space-3);
  min-width: 0;
}
</style>
