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
    groupedFields() {
      const fields = this.bookable.customFields || [];
      const values = this.bookable.customFieldValues || [];

      const filteredFields = fields.filter(
        (field) => field.usageOptions?.context !== "checkout"
      );

      const mapped = filteredFields.map((field) => {
        const stored = values.find((v) => v.fieldId === field.id);
        const ctx = field.usageOptions?.context || "none";

        return {
          ...field,
          context: ctx,
          currentValue: stored != null ? stored.value : field.value ?? null,
        };
      });

      const groups = {};
      for (const field of mapped) {
        const origin = field._origin || "unknown";
        if (!groups[origin]) {
          groups[origin] = [];
        }
        groups[origin].push(field);
      }

      const originOrder = ["instance", "tenant", "bookable"];
      return originOrder
        .filter((key) => groups[key]?.length)
        .map((key) => ({
          origin: key,
          fields: groups[key],
        }));
    },

    resolvedFields() {
      const fields = this.bookable.customFields || [];
      const values = this.bookable.customFieldValues || [];

      const filteredFields = fields.filter(
        (field) => field.usageOptions?.context !== "checkout"
      );

      return filteredFields.map((field) => {
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

    originLabel(origin) {
      const map = {
        instance: "Instanz",
        tenant: "Mandant",
        bookable: "Buchungsobjekt",
      };
      return map[origin] || origin;
    },

    originIcon(origin) {
      const map = {
        instance: "mdi-home-outline",
        tenant: "mdi-domain",
        bookable: "mdi-book-open-page-variant",
      };
      return map[origin] || "mdi-cube";
    },

    originTooltip(origin) {
      const map = {
        instance:
          "Dieses Feld ist auf Instanz-Ebene definiert und gilt für alle Mandanten und Buchungsobjekte.",
        tenant:
          "Dieses Feld ist auf Mandanten-Ebene definiert und gilt für alle Buchungsobjekte dieses Mandanten.",
        bookable:
          "Dieses Feld ist speziell für dieses Buchungsobjekt definiert.",
      };
      return map[origin] || "";
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Eigene Felder" icon="mdi-form-textbox" />

    <!-- Empty State -->
    <v-card
      v-if="groupedFields.length === 0"
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

    <!-- Eine Karte pro Origin-Gruppe -->
    <v-card
      v-for="(group, gIndex) in groupedFields"
      :key="group.origin"
      class="section-card"
      :class="gIndex < groupedFields.length - 1 ? 'mb-4' : 'mb-6'"
      elevation="2"
      outlined
    >
      <!-- Gruppen-Header -->
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">{{ originIcon(group.origin) }}</v-icon>
          <span class="text-h6 font-weight-bold">{{
            originLabel(group.origin)
          }}</span>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-icon small class="ml-2" v-bind="attrs" v-on="on">
                mdi-information-outline
              </v-icon>
            </template>
            <span>{{ originTooltip(group.origin) }}</span>
          </v-tooltip>
        </div>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text class="pa-5">
        <div
          v-for="(field, fIndex) in group.fields"
          :key="field.id"
          :class="{ 'mt-6': fIndex > 0 }"
        >
          <v-divider v-if="fIndex > 0" class="mb-6" />

          <!-- Feld-Header -->
          <div class="d-flex align-center mb-3">
            <v-avatar size="32" color="primary" class="mr-3">
              <v-icon x-small dark>
                {{ fieldIcon(field.inputType) }}
              </v-icon>
            </v-avatar>
            <div class="flex-grow-1">
              <div class="d-flex align-center flex-wrap">
                <span class="text-subtitle-2 font-weight-medium mr-2">
                  {{ field.caption }}
                </span>
                <v-chip
                  x-small
                  :color="contextColor(field.context)"
                  dark
                  class="mr-1"
                >
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
                >
                  Pflicht
                </v-chip>
              </div>
              <div
                v-if="field.placeholder"
                class="text-caption text--secondary"
              >
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
        </div>
      </v-card-text>
    </v-card>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
  transition: box-shadow 0.25s ease, transform 0.2s ease;
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
</style>
