<template>
  <v-card outlined class="custom-field-preview">
    <v-card-subtitle class="pb-1">
      <v-icon small left color="primary">mdi-eye-outline</v-icon>
      Vorschau
    </v-card-subtitle>
    <v-card-text class="pt-0">
      <div v-if="context === 'checkout'" class="preview-section">
        <div class="text-caption text--secondary mb-2">
          So sieht das Feld im Buchungsprozess aus:
        </div>
        <CustomFieldInput
          :field="previewField"
          :value="previewValue"
          :required="field.usageOptions?.requiredInCheckout"
          inline
          hide-details
          @input="previewValue = $event"
        />
      </div>

      <div v-else-if="context === 'catalog'" class="preview-section">
        <div class="text-caption text--secondary mb-2">
          So erscheint das Feld im Katalog:
        </div>

        <div v-if="field.usageOptions?.filterable" class="mb-3">
          <div class="text-caption font-weight-medium mb-1">
            Filter ({{ filterPositionLabel }})
          </div>
          <div class="d-flex flex-wrap">
            <template v-if="filterType === 'checkbox'">
              <v-chip small outlined class="mr-1 mb-1">
                <v-icon left small>mdi-checkbox-blank-outline</v-icon>
                {{ field.caption }}
              </v-chip>
            </template>
            <template v-else-if="filterType === 'select'">
              <v-chip
                v-for="(opt, index) in selectPreviewOptions"
                :key="'filter-' + index"
                small
                outlined
                class="mr-1 mb-1"
              >
                {{ opt }}
              </v-chip>
            </template>
            <template v-else-if="filterType === 'slider'">
              <v-slider
                :value="50"
                readonly
                hide-details
                dense
                class="mt-0 pt-0 preview-slider"
              />
            </template>
            <template v-else-if="filterType === 'range'">
              <v-range-slider
                :value="[20, 80]"
                readonly
                hide-details
                dense
                class="mt-0 pt-0 preview-slider"
              />
            </template>
          </div>
        </div>
        <div v-else class="mb-3 text-body-2">
          Nur als Information sichtbar — kein Filter.
        </div>

        <div v-if="detailPosition !== 'none'">
          <div class="text-caption font-weight-medium mb-1">
            Detailansicht ({{ detailPositionLabel }})
          </div>
          <div v-if="detailPosition === 'badge'" class="mb-2">
            <v-chip small color="primary" outlined label>
              {{ previewDetailValue }}
            </v-chip>
          </div>
          <div v-else class="text-body-2 grey--text text--darken-1">
            {{ field.caption }}: {{ previewDetailValue }}
          </div>
        </div>
        <div v-else class="text-body-2 grey--text">
          In der Detailansicht nicht sichtbar.
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import CustomFieldInput from "@/components/Booking/CustomFieldInput.vue";

export default {
  name: "CustomFieldPreview",
  components: { CustomFieldInput },
  props: {
    field: { type: Object, required: true },
  },
  data() {
    return {
      previewValue: null,
    };
  },
  computed: {
    context() {
      return this.field.usageOptions?.context || "none";
    },
    previewField() {
      return {
        ...this.field,
        caption: this.field.caption || "Bezeichnung",
      };
    },
    filterType() {
      return this.field.usageOptions?.catalogFilterType;
    },
    filterPositionLabel() {
      const map = {
        sidebar: "Seitenleiste",
        navigation: "Navigation",
        searchbar: "Suchleiste",
      };
      return map[this.field.usageOptions?.catalogFilterPosition] || "Seitenleiste";
    },
    detailPosition() {
      return this.field.usageOptions?.detailDisplayPosition || "none";
    },
    detailPositionLabel() {
      const map = {
        badge: "Label",
        belowDescription: "unter Beschreibung",
        moreInfo: "Weitere Informationen",
      };
      return map[this.detailPosition] || this.detailPosition;
    },
    selectPreviewOptions() {
      if (this.field.inputType === "select") {
        return (this.field.options || [])
          .map((opt) => opt.caption)
          .filter(Boolean)
          .slice(0, 4);
      }
      if (this.field.inputType === "boolean") {
        return [this.field.caption || "Ja / Nein"];
      }
      return ["Beispiel A", "Beispiel B", "Beispiel C"];
    },
    previewDetailValue() {
      if (this.field.inputType === "boolean") return "Ja";
      if (this.field.inputType === "select") {
        return this.field.options?.[0]?.caption || "Beispielwert";
      }
      if (this.field.inputType === "numeric") return "42";
      if (this.field.inputType === "text") {
        return "Beispielhafte Beschreibung…";
      }
      return this.field.placeholder || "Beispielwert";
    },
  },
  watch: {
    field: {
      deep: true,
      immediate: true,
      handler() {
        this.previewValue = this.getDefaultPreviewValue();
      },
    },
  },
  methods: {
    getDefaultPreviewValue() {
      if (this.field.inputType === "boolean") return false;
      if (this.field.inputType === "select") {
        return this.field.options?.[0]?.value ?? null;
      }
      if (this.field.inputType === "numeric") return null;
      return null;
    },
  },
};
</script>

<style scoped>
.custom-field-preview {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px !important;
}

.theme--dark .custom-field-preview {
  background: rgba(255, 255, 255, 0.04);
}

.preview-slider {
  max-width: 280px;
}
</style>
