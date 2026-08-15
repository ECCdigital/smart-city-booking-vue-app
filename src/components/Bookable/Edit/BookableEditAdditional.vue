<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import Tiptap from "@/components/Tiptap.vue";
import bookableExpertMode from "@/mixins/bookableExpertMode";

export default {
  name: "BookableEditAdditional",
  components: { Tiptap, BaseSection },
  mixins: [bookableExpertMode],
  props: { bookable: { type: Object, required: true } },
  data() {
    return {
      valid: true,
      availableFields: [
        {
          id: "phone",
          name: "Telefonnummer",
          icon: "mdi-phone",
          description: "Kontakttelefonnummer",
        },
        {
          id: "company",
          name: "Firma",
          icon: "mdi-office-building",
          description: "Firmenname des Kunden",
        },
        {
          id: "address",
          name: "Straße & Hausnummer",
          icon: "mdi-map-marker",
          description: "Adressangaben des Kunden",
        },
        {
          id: "zipCode",
          name: "Postleitzahl",
          icon: "mdi-mailbox-outline",
          description: "Adressangaben des Kunden",
        },
        {
          id: "city",
          name: "Stadt",
          icon: "mdi-city",
          description: "Adressangaben des Kunden",
        },
        {
          id: "comment",
          name: "Kommentar",
          icon: "mdi-comment-text-outline",
          description: "Zusätzliche Anmerkungen zur Buchung",
        },
        /**
        {
          id: "address",
          name: "Adresse",
          icon: "mdi-map-marker",
          description: "Vollständige Lieferadresse",
        },
          **/
      ],
    };
  },
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    requiredFields: {
      get() {
        return this.model.requiredFields || [];
      },
      set(value) {
        this.model.requiredFields = value;
      },
    },
    selectedCount() {
      return this.requiredFields.length;
    },
  },
  methods: {
    toggleField(fieldId) {
      const index = this.requiredFields.indexOf(fieldId);
      if (index > -1) {
        this.requiredFields = this.requiredFields.filter(
          (id) => id !== fieldId
        );
      } else {
        this.requiredFields = [...this.requiredFields, fieldId];
      }
    },
    isFieldRequired(fieldId) {
      return this.requiredFields.includes(fieldId);
    },
    removeField(fieldId) {
      this.requiredFields = this.requiredFields.filter((id) => id !== fieldId);
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Sonstiges" icon="mdi-dots-horizontal" />

    <v-card
      v-if="expertMode"
      id="be-section-additional-required-fields"
      class="mb-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-form-select</v-icon>
          <span class="text-h6 font-weight-bold"
            >Pflichtfelder im Buchungsprozess</span
          >
        </div>
        <v-chip small color="primary" v-if="selectedCount > 0">
          {{ selectedCount }} ausgewählt
        </v-chip>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <v-alert color="info" dense text class="mb-4">
          <div class="d-flex align-center">
            <v-icon class="mr-3" color="info"> mdi-information-outline </v-icon>
            <div>
              Wählen Sie die Felder aus, die beim Checkout ausgefüllt werden
              müssen
            </div>
          </div>
        </v-alert>

        <!-- Selected Fields Summary -->
        <div v-if="requiredFields.length > 0" class="mb-4">
          <div class="text-subtitle-2 mb-2 grey--text">
            Ausgewählte Pflichtfelder:
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
              {{
                availableFields.find((f) => f.id === fieldId)?.icon ||
                "mdi-check"
              }}
            </v-icon>
            {{ availableFields.find((f) => f.id === fieldId)?.name }}
          </v-chip>
        </div>

        <v-divider v-if="requiredFields.length > 0" class="mb-4"></v-divider>

        <!-- Available Fields List -->
        <div class="text-subtitle-2 mb-3 grey--text">Verfügbare Felder:</div>
        <v-list class="py-0">
          <v-list-item
            v-for="(field) in availableFields"
            :key="field.id"
            @click="toggleField(field.id)"
            class="field-item rounded mb-2"
            :class="{ 'field-item--selected': isFieldRequired(field.id) }"
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
                :color="
                  isFieldRequired(field.id) ? 'primary' : 'grey lighten-2'
                "
                size="40"
              >
                <v-icon
                  :color="isFieldRequired(field.id) ? 'white' : 'grey'"
                  small
                >
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
                Aktiv
              </v-chip>
            </v-list-item-action>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-card
      id="be-section-additional-notes"
      class="mb-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-information-variant</v-icon>
        <span class="text-h6 font-weight-bold">Buchungshinweise</span>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <Tiptap v-model="model.bookingNotes" label="Buchungshinweise"></Tiptap>
      </v-card-text>
    </v-card>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.section-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}

.theme--dark .section-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.field-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.field-item:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.theme--dark .field-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.field-item--selected {
  border-color: var(--v-primary-base);
  background-color: rgba(var(--v-primary-base), 0.05);
}

.theme--dark .field-item--selected {
  background-color: rgba(var(--v-primary-base), 0.1);
}
</style>
