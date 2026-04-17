<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "BookableEditCustomFields",
  components: { BaseSection },
  props: {
    bookable: { type: Object, required: true },
  },
  data() {
    return {
      valid: true,
    };
  },
  computed: {
    resolvedFields() {
      const fields = this.bookable.customFields || [];
      const values = this.bookable.customFieldValues || [];

      return fields.map((field) => {
        const stored = values.find((v) => v.fieldId === field.id);
        const ctx = field.usageOptions?.context || "none";

        return {
          ...field,
          context: ctx,
          currentValue: stored != null ? stored.value : field.value ?? null,
        };
      });
    },
  },
  methods: {
    updateFieldValue(fieldId, newValue) {
      const values = [...(this.bookable.customFieldValues || [])];
      const idx = values.findIndex((v) => v.fieldId === fieldId);

      if (idx !== -1) {
        values[idx] = { ...values[idx], value: newValue };
      } else {
        values.push({ fieldId, value: newValue });
      }

      this.$emit("update:bookable", {
        ...this.bookable,
        customFieldValues: values,
      });
    },

    clearFieldValue(fieldId) {
      const values = (this.bookable.customFieldValues || []).filter(
        (v) => v.fieldId !== fieldId
      );

      this.$emit("update:bookable", {
        ...this.bookable,
        customFieldValues: values,
      });
    },

    fieldIcon(inputType) {
      const icons = {
        string: "mdi-form-textbox",
        text: "mdi-form-textarea",
        numeric: "mdi-numeric",
        boolean: "mdi-toggle-switch-outline",
        select: "mdi-form-dropdown",
      };
      return icons[inputType] || "mdi-form-textbox";
    },

    contextColor(context) {
      const map = {
        checkout: "blue",
        catalog: "green",
        none: "grey",
      };
      return map[context] || "grey";
    },

    contextLabel(context) {
      const map = {
        checkout: "Checkout",
        catalog: "Katalog",
        none: "Intern",
      };
      return map[context] || context;
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Eigene Felder" icon="mdi-form-textbox" />

    <!-- Empty State -->
    <v-card
      v-if="resolvedFields.length === 0"
      class="mb-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-text class="pa-8 text-center">
        <v-icon size="64" color="grey lighten-1" class="mb-4">
          mdi-form-textbox
        </v-icon>
        <div class="text-h6 grey--text mb-2">
          Keine benutzerdefinierten Felder
        </div>
        <div class="text-body-2 grey--text">
          Es wurden noch keine benutzerdefinierten Felder für dieses
          Buchungsobjekt definiert.
        </div>
      </v-card-text>
    </v-card>

    <!-- Field Cards -->
    <v-card
      v-for="(field, index) in resolvedFields"
      :key="field.id"
      class="section-card"
      :class="index < resolvedFields.length - 1 ? 'mb-4' : 'mb-6'"
      elevation="2"
      outlined
    >
      <v-card-text class="pa-5">
        <div class="d-flex align-center mb-4">
          <v-avatar size="36" color="primary" class="mr-3">
            <v-icon small dark>
              {{ fieldIcon(field.inputType) }}
            </v-icon>
          </v-avatar>
          <div class="flex-grow-1">
            <div class="d-flex align-center">
              <span class="text-subtitle-1 font-weight-medium mr-2">
                {{ field.caption }}
              </span>
              <v-chip x-small :color="contextColor(field.context)" dark label>
                {{ contextLabel(field.context) }}
              </v-chip>
              <v-chip
                v-if="
                  field.context === 'checkout' &&
                  field.usageOptions?.requiredInCheckout
                "
                x-small
                color="blue darken-2"
                dark
                label
                class="ml-1"
              >
                Pflicht
              </v-chip>
            </div>
            <div v-if="field.placeholder" class="text-caption text--secondary">
              {{ field.placeholder }}
            </div>
          </div>
        </div>

        <!-- String -->
        <v-text-field
          v-if="field.inputType === 'string'"
          :value="field.currentValue"
          @input="updateFieldValue(field.id, $event)"
          :label="field.caption"
          :placeholder="field.placeholder || ''"
          background-color="accent"
          filled
          dense
          hide-details="auto"
          clearable
          @click:clear="clearFieldValue(field.id)"
        />

        <!-- TextArea -->
        <v-textarea
          v-else-if="field.inputType === 'text'"
          :value="field.currentValue"
          @input="updateFieldValue(field.id, $event)"
          :label="field.caption"
          :placeholder="field.placeholder || ''"
          background-color="accent"
          filled
          dense
          hide-details="auto"
          clearable
          @click:clear="clearFieldValue(field.id)"
        />

        <!-- Numeric -->
        <v-text-field
          v-else-if="field.inputType === 'numeric'"
          :value="field.currentValue"
          @input="
            updateFieldValue(
              field.id,
              $event !== '' && $event !== null ? Number($event) : null
            )
          "
          :label="field.caption"
          :placeholder="field.placeholder || ''"
          type="number"
          background-color="accent"
          filled
          dense
          hide-details="auto"
          clearable
          @click:clear="clearFieldValue(field.id)"
        />

        <!-- Boolean -->
        <v-switch
          v-else-if="field.inputType === 'boolean'"
          :input-value="field.currentValue"
          @change="updateFieldValue(field.id, $event)"
          :label="field.currentValue ? 'Ja' : 'Nein'"
          dense
          hide-details="auto"
          class="mt-0"
        />

        <!-- Select -->
        <v-select
          v-else-if="field.inputType === 'select'"
          :value="field.currentValue"
          @input="updateFieldValue(field.id, $event)"
          :items="field.options || []"
          item-text="caption"
          item-value="value"
          :label="field.caption"
          :placeholder="field.placeholder || ''"
          background-color="accent"
          filled
          dense
          hide-details="auto"
          clearable
          @click:clear="clearFieldValue(field.id)"
        />
      </v-card-text>
    </v-card>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
  transition: box-shadow 0.25s ease, transform 0.2s ease;
}
</style>
