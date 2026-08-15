<template>
  <div>
    <v-row class="mb-1">
      <v-col class="col-12 col-md-8">
        <slot name="description">
          <p v-if="description" class="text--secondary body-2 mb-0">
            {{ description }}
          </p>
        </slot>
      </v-col>
      <v-col
        v-if="!readonly"
        class="col-12 col-md-4 d-flex justify-end align-center"
      >
        <v-btn color="primary" @click="openCreate" :disabled="readonly">
          <v-icon left>mdi-plus</v-icon>
          Feld hinzufügen
        </v-btn>
      </v-col>
    </v-row>

    <v-alert
      v-if="inheritedFieldGroups.length"
      type="info"
      dense
      text
      icon="mdi-lock-outline"
      class="mb-4"
    >
      Geerbte Felder sind hier nur zur Information sichtbar. Sie können auf
      dieser Ebene nicht bearbeitet oder gelöscht werden — Änderungen erfolgen
      auf Instanz- oder Mandanten-Ebene.
    </v-alert>

    <div
      v-for="group in inheritedFieldGroups"
      :key="'inherited-' + group.originLabel"
      class="mb-4"
    >
      <div class="d-flex align-center mb-2 flex-wrap">
        <v-icon small color="grey" class="mr-2">{{ group.originIcon }}</v-icon>
        <span class="text-subtitle-2">
          Geerbt von {{ group.originLabel }}
        </span>
        <v-chip x-small outlined label class="ml-2">
          {{ group.fields.length }}
        </v-chip>
        <v-chip x-small outlined label color="grey" class="ml-2">
          <v-icon x-small left>mdi-lock-outline</v-icon>
          Schreibgeschützt
        </v-chip>
      </div>

      <div class="inherited-field-list mb-2">
        <div
          v-for="(field, idx) in group.fields"
          :key="group.originLabel + '-' + (field.id || idx)"
          class="inherited-field-row"
        >
          <div class="field-row-type">
            <v-icon small :color="inputTypeColor(field.inputType)" class="mr-1">
              {{ inputTypeIcon(field.inputType) }}
            </v-icon>
            <span class="field-row-type-label">
              {{ inputTypeLabel(field.inputType) }}
            </span>
          </div>

          <div class="field-row-caption text-truncate">
            {{ field.caption }}
          </div>

          <div class="field-row-tags">
            <v-chip
              v-for="tag in usageContextChips(field)"
              :key="tag.text"
              x-small
              :color="tag.color"
              :outlined="tag.outlined"
              :dark="tag.dark"
              label
              class="ml-1"
            >
              {{ tag.text }}
            </v-chip>
          </div>
        </div>
      </div>
    </div>

    <div v-if="ownFieldsLabel" class="text-subtitle-2 mb-2">
      {{ ownFieldsLabel }}
    </div>

    <v-expansion-panels multiple>
      <v-expansion-panel
        v-for="(field, idx) in localFields"
        :key="field.id + '-' + idx"
      >
        <v-expansion-panel-header color="accent" expand-icon="mdi-menu-down">
          <template v-slot:default>
            <v-row no-gutters align="center" class="w-100">
              <v-col class="col-5 d-flex align-center min-width-0">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-chip
                      x-small
                      :color="inputTypeColor(field.inputType)"
                      text-color="white"
                      label
                      class="mr-2 flex-shrink-0 type-chip"
                      v-bind="attrs"
                      v-on="on"
                    >
                      <v-icon x-small>{{ inputTypeIcon(field.inputType) }}</v-icon>
                    </v-chip>
                  </template>
                  <span>Feldtyp: {{ inputTypeLabel(field.inputType) }}</span>
                </v-tooltip>
                <strong class="mr-2 text-truncate min-width-0">
                  {{ field.caption }}
                </strong>
                <v-tooltip v-if="field.id" bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon
                      small
                      color="grey"
                      class="ml-1"
                      v-bind="attrs"
                      v-on="on"
                    >
                      mdi-information-outline
                    </v-icon>
                  </template>
                  <span>Feld-ID: {{ field.id }}</span>
                </v-tooltip>
              </v-col>

              <v-col class="col-4 d-flex align-center flex-wrap">
                <v-chip
                  v-if="
                    field.usageOptions &&
                    field.usageOptions.context === 'checkout'
                  "
                  x-small
                  color="blue"
                  dark
                  label
                  class="mr-1 mb-1"
                >
                  Buchungsprozess
                </v-chip>
                <v-chip
                  v-if="
                    field.usageOptions &&
                    field.usageOptions.context === 'checkout' &&
                    field.usageOptions.requiredInCheckout
                  "
                  x-small
                  color="blue darken-2"
                  dark
                  label
                  class="mr-1 mb-1"
                >
                  Pflicht
                </v-chip>
                <v-chip
                  v-if="
                    field.usageOptions &&
                    field.usageOptions.context === 'catalog'
                  "
                  x-small
                  color="green"
                  dark
                  label
                  class="mr-1 mb-1"
                >
                  Katalog
                </v-chip>
                <v-chip
                  v-if="
                    field.usageOptions &&
                    field.usageOptions.context === 'catalog' &&
                    field.usageOptions.filterable
                  "
                  x-small
                  color="green darken-2"
                  dark
                  label
                  class="mr-1 mb-1"
                >
                  Filter
                </v-chip>
                <v-chip
                  v-if="
                    field.usageOptions &&
                    field.usageOptions.detailDisplayPosition &&
                    field.usageOptions.detailDisplayPosition !== 'none'
                  "
                  x-small
                  color="deep-purple"
                  dark
                  label
                  class="mr-1 mb-1"
                >
                  Detailansicht
                </v-chip>
                <span
                  v-if="!hasAnyTag(field)"
                  class="text--disabled text-caption"
                >
                  –
                </span>
              </v-col>

              <v-col class="col-3 d-flex justify-end align-center">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      icon
                      small
                      v-bind="attrs"
                      v-on="on"
                      :disabled="readonly"
                      @click.stop="openEdit(idx)"
                    >
                      <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                  </template>
                  <span>Bearbeiten</span>
                </v-tooltip>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn
                      icon
                      small
                      color="error"
                      v-bind="attrs"
                      v-on="on"
                      :disabled="readonly"
                      @click.stop="askRemove(idx)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                  <span>Löschen</span>
                </v-tooltip>
              </v-col>
            </v-row>
          </template>
        </v-expansion-panel-header>

        <v-expansion-panel-content class="pt-2">
          <v-row>
            <v-col class="col-12 col-md-8">
              <div v-if="field.placeholder" class="mb-2">
                <span class="text-caption text--secondary"> Platzhalter: </span>
                {{ field.placeholder }}
              </div>

              <div
                v-if="field.inputType === 'select' && field.options.length"
                class="mb-2"
              >
                <span class="text-caption text--secondary">Optionen:</span>
                <v-chip
                  v-for="(opt, optIndex) in field.options"
                  :key="field.id + '-opt-' + optIndex"
                  x-small
                  outlined
                  label
                  class="mr-1 mt-1"
                >
                  {{ opt.caption }}
                </v-chip>
              </div>

              <div
                v-if="
                  field.usageOptions && field.usageOptions.context === 'catalog'
                "
                class="mb-2"
              >
                <span class="text-caption text--secondary">
                  Katalog-Filter:
                </span>
                <template v-if="field.usageOptions.filterable">
                  {{
                    field.usageOptions.catalogFilterType
                      ? filterTypeLabel(field.usageOptions.catalogFilterType)
                      : "Keiner"
                  }}
                  <span class="text--secondary">
                    ({{
                      filterPositionLabel(
                        field.usageOptions.catalogFilterPosition
                      )
                    }})
                  </span>
                </template>
                <template v-else> Nicht filterbar (nur Info) </template>
              </div>

              <div
                v-if="
                  field.usageOptions &&
                  field.usageOptions.detailDisplayPosition &&
                  field.usageOptions.detailDisplayPosition !== 'none'
                "
                class="mb-2"
              >
                <span class="text-caption text--secondary">
                  Detailansicht:
                </span>
                {{
                  detailDisplayPositionLabel(
                    field.usageOptions.detailDisplayPosition
                  )
                }}
              </div>
            </v-col>
          </v-row>

          <!-- Slot for context-specific content in the detail area -->
          <slot name="panel-detail" :field="field" :index="idx" />
        </v-expansion-panel-content>
      </v-expansion-panel>

      <v-expansion-panel v-if="!localFields.length" disabled>
        <v-expansion-panel-header>
          Keine eigenen Felder definiert. Klicke auf „Feld hinzufügen".
        </v-expansion-panel-header>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Edit / Create -->
    <CustomFieldDialog
      v-model="dialogOpen"
      :field="editingField"
      :existing-ids="existingIds"
      :hide-usage-options="hideUsageOptions"
      :hide-override="hideOverride"
      @save="onSaveField"
    />

    <!-- Delete confirmation -->
    <v-dialog v-model="confirmDelete.open" max-width="420">
      <v-card>
        <v-card-title class="subtitle-1">Feld löschen?</v-card-title>
        <v-card-text>
          Das Feld
          <strong>{{ deletingCaption }}</strong>
          wird entfernt. Bereits gespeicherte Werte bleiben erhalten, werden
          aber nicht mehr angezeigt.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="confirmDelete.open = false">Abbrechen</v-btn>
          <v-btn color="error" text @click="doRemove">Löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import CustomFieldDialog from "@/components/CustomFields/CustomFieldDialog.vue";

export default {
  name: "CustomFieldList",
  components: { CustomFieldDialog },
  props: {
    /** The array of custom field definitions */
    fields: { type: Array, default: () => [] },
    /** Optional helper text shown above the list */
    description: { type: String, default: "" },
    /** Disable all mutations (view-only) */
    readonly: { type: Boolean, default: false },
    /** Hide usage-options section in dialog (e.g. on tenant level) */
    hideUsageOptions: { type: Boolean, default: false },
    /** Hide the override toggle (irrelevant on tenant level) */
    hideOverride: { type: Boolean, default: false },
    /** Read-only groups of inherited field definitions */
    inheritedFieldGroups: { type: Array, default: () => [] },
    /** Optional heading above editable fields when inherited fields exist */
    ownFieldsLabel: { type: String, default: "" },
  },
  data() {
    return {
      localFields: [],
      dialogOpen: false,
      editingField: null,
      editingIndex: -1,
      confirmDelete: { open: false, idx: -1 },
    };
  },
  computed: {
    existingIds() {
      return this.localFields.map((f) => f.id);
    },
    deletingCaption() {
      const idx = this.confirmDelete.idx;
      return idx >= 0 && this.localFields[idx]
        ? this.localFields[idx].caption
        : "";
    },
  },
  watch: {
    fields: {
      deep: true,
      immediate: true,
      handler(v) {
        const incoming = JSON.stringify(v || []);
        if (incoming !== JSON.stringify(this.localFields)) {
          this.localFields = JSON.parse(incoming);
        }
      },
    },
  },
  methods: {
    // ---- labels ----
    inputTypeLabel(type) {
      const map = {
        string: "Text",
        text: "Langtext",
        select: "Auswahl",
        multiselect: "Mehrfach",
        numeric: "Zahl",
        boolean: "Ja/Nein",
      };
      return map[type] || type;
    },
    inputTypeIcon(type) {
      const map = {
        string: "mdi-format-paragraph",
        text: "mdi-format-letter-case",
        select: "mdi-format-list-bulleted-type",
        multiselect: "mdi-format-list-bulleted-square",
        numeric: "mdi-numeric",
        boolean: "mdi-toggle-switch",
      };
      return map[type] || "mdi-form-textbox";
    },
    inputTypeColor(type) {
      const map = {
        string: "blue-grey",
        text: "blue-grey darken-1",
        select: "indigo",
        numeric: "teal",
        boolean: "orange",
      };
      return map[type] || "grey";
    },
    filterTypeLabel(t) {
      const map = {
        select: "Dropdown-Filter",
        slider: "Maximalwert-Regler",
        range: "Von–Bis-Regler",
        checkbox: "Einzelne Checkbox",
      };
      return map[t] || t;
    },
    filterPositionLabel(p) {
      const map = {
        sidebar: "Seitenleiste",
        navigation: "Navigation",
        searchbar: "Suchleiste",
      };
      return map[p] || p;
    },
    detailDisplayPositionLabel(p) {
      const map = {
        none: "Nicht anzeigen",
        badge: "Label (über Beschreibung)",
        belowDescription: "Unterhalb der Beschreibung",
        moreInfo: "Mehr Informationen (rechts)",
      };
      return map[p] || p;
    },
    hasAnyTag(field) {
      const u = field.usageOptions || {};
      return (
        u.context !== "none" ||
        (u.detailDisplayPosition && u.detailDisplayPosition !== "none")
      );
    },
    usageContextChips(field) {
      const u = field.usageOptions || {};
      const chips = [];

      if (u.context === "checkout") {
        chips.push({ text: "Buchungsprozess", color: "blue", dark: true });
        if (u.requiredInCheckout) {
          chips.push({ text: "Pflicht", color: "blue darken-2", dark: true });
        }
      } else if (u.context === "catalog") {
        chips.push({ text: "Katalog", color: "green", dark: true });
        if (u.filterable) {
          chips.push({ text: "Filter", color: "green darken-2", dark: true });
        }
      } else {
        chips.push({ text: "Intern", color: "blue-grey", outlined: true });
      }

      if (
        u.detailDisplayPosition &&
        u.detailDisplayPosition !== "none"
      ) {
        chips.push({
          text: "Detailansicht",
          color: "deep-purple",
          dark: true,
        });
      }

      return chips;
    },

    // ---- CRUD ----
    openCreate() {
      this.editingField = null;
      this.editingIndex = -1;
      this.dialogOpen = true;
    },
    openEdit(idx) {
      this.editingIndex = idx;
      this.editingField = JSON.parse(JSON.stringify(this.localFields[idx]));
      this.dialogOpen = true;
    },
    onSaveField(field) {
      const copy = [...this.localFields];
      if (this.editingIndex >= 0) {
        copy.splice(this.editingIndex, 1, field);
      } else {
        copy.push(field);
      }
      this.localFields = copy;
      this.dialogOpen = false;
      this.emitFields();
    },
    askRemove(idx) {
      this.confirmDelete = { open: true, idx };
    },
    doRemove() {
      if (this.confirmDelete.idx >= 0) {
        this.localFields.splice(this.confirmDelete.idx, 1);
        this.emitFields();
      }
      this.confirmDelete.open = false;
    },

    emitFields() {
      this.$emit("update:fields", JSON.parse(JSON.stringify(this.localFields)));
    },
  },
};
</script>

<style scoped>
.inherited-field-list {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  overflow: hidden;
}

.theme--dark .inherited-field-list {
  border-color: rgba(255, 255, 255, 0.12);
}

.inherited-field-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.theme--dark .inherited-field-row {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.inherited-field-row:last-child {
  border-bottom: none;
}

.field-row-type {
  display: flex;
  align-items: center;
  min-width: 0;
}

.field-row-type-label {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.field-row-caption {
  font-size: 0.875rem;
  font-weight: 500;
}

.field-row-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.type-chip {
  max-width: none;
}

.min-width-0 {
  min-width: 0;
}

.flex-shrink-0 {
  flex-shrink: 0;
}
</style>
