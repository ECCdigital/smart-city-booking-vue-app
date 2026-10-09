<script>
import bookableEditing from "@/mixins/bookableEditing";

const FIELDS = "bookable.areas.requiredFields.fields";

// The contact fields the checkout can ask for, in the order offered.
const AVAILABLE_FIELDS = [
  { id: "phone", icon: "mdi-phone" },
  { id: "company", icon: "mdi-office-building" },
  { id: "address", icon: "mdi-map-marker" },
  { id: "zipCode", icon: "mdi-mailbox-outline" },
  { id: "city", icon: "mdi-city" },
  { id: "comment", icon: "mdi-comment-text-outline" },
];

/**
 * Pflichtfelder: the contact fields bookers must fill in at the checkout.
 * The area as the editing page frames it in a card and the step „Weitere
 * Einstellungen“ in a row.
 */
export default {
  name: "BookableEditRequiredFields",
  mixins: [bookableEditing],
  computed: {
    availableFields() {
      return AVAILABLE_FIELDS.map((field) => ({
        ...field,
        name: this.$t(`${FIELDS}.${field.id}.name`),
        description: this.$t(`${FIELDS}.${field.id}.description`),
      }));
    },
    requiredFields() {
      return this.bookable.requiredFields || [];
    },
  },
  methods: {
    fieldOf(id) {
      return this.availableFields.find((field) => field.id === id);
    },
    isFieldRequired(id) {
      return this.requiredFields.includes(id);
    },
    toggleField(id) {
      if (this.isFieldRequired(id)) {
        this.removeField(id);
      } else {
        this.patch({ requiredFields: [...this.requiredFields, id] });
      }
    },
    removeField(id) {
      this.patch({
        requiredFields: this.requiredFields.filter((field) => field !== id),
      });
    },
  },
};
</script>

<template>
  <div>
    <v-alert color="info" dense text class="mb-4">
      <div class="d-flex align-center">
        <v-icon class="mr-3" color="info"> mdi-information-outline </v-icon>
        <div>{{ $t("bookable.areas.requiredFields.intro") }}</div>
      </div>
    </v-alert>

    <div v-if="requiredFields.length > 0" class="mb-4">
      <div class="text-subtitle-2 mb-2 grey--text">
        {{ $t("bookable.areas.requiredFields.selected") }}
      </div>
      <v-chip
        v-for="fieldId in requiredFields"
        :key="`chip-${fieldId}`"
        class="mr-2 mb-2"
        close
        color="primary"
        outlined
        @click:close="removeField(fieldId)"
      >
        <v-icon left small>
          {{ fieldOf(fieldId)?.icon || "mdi-check" }}
        </v-icon>
        {{ fieldOf(fieldId)?.name }}
      </v-chip>
    </div>

    <v-divider v-if="requiredFields.length > 0" class="mb-4"></v-divider>

    <div class="text-subtitle-2 mb-3 grey--text">
      {{ $t("bookable.areas.requiredFields.available") }}
    </div>
    <v-list class="py-0">
      <v-list-item
        v-for="field in availableFields"
        :key="field.id"
        :data-test="`required-field-${field.id}`"
        class="field-item rounded mb-2"
        :class="{ 'field-item--selected': isFieldRequired(field.id) }"
        @click="toggleField(field.id)"
      >
        <v-list-item-action class="mr-4">
          <v-checkbox
            :input-value="isFieldRequired(field.id)"
            color="primary"
            @click.stop="toggleField(field.id)"
          ></v-checkbox>
        </v-list-item-action>

        <v-list-item-avatar class="mr-2">
          <v-avatar
            :color="isFieldRequired(field.id) ? 'primary' : 'grey lighten-2'"
            size="40"
          >
            <v-icon :color="isFieldRequired(field.id) ? 'white' : 'grey'" small>
              {{ field.icon }}
            </v-icon>
          </v-avatar>
        </v-list-item-avatar>

        <v-list-item-content>
          <v-list-item-title class="font-weight-medium">
            {{ field.name }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ field.description }}
          </v-list-item-subtitle>
        </v-list-item-content>

        <v-list-item-action v-if="isFieldRequired(field.id)">
          <v-chip x-small color="success" text-color="white">
            <v-icon x-small left>mdi-check</v-icon>
            {{ $t("bookable.areas.requiredFields.active") }}
          </v-chip>
        </v-list-item-action>
      </v-list-item>
    </v-list>
  </div>
</template>

<style scoped>
.field-item {
  cursor: pointer;
  transition: all var(--scb-motion-base);
  border: 2px solid transparent;
}

.field-item:hover {
  background-color: var(--scb-surface-tint);
}

.field-item--selected {
  border-color: var(--v-primary-base);
  background-color: var(--scb-selected-tint-faint);
}
</style>
