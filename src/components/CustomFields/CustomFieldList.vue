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

    <v-expansion-panels multiple>
      <v-expansion-panel
        v-for="(field, idx) in localFields"
        :key="field.id + '-' + idx"
      >
        <v-expansion-panel-header color="accent" expand-icon="mdi-menu-down">
          <template v-slot:default>
            <v-row no-gutters align="center" class="w-100">
              <v-col class="col-5 d-flex align-center">
                <v-chip
                  x-small
                  :color="inputTypeColor(field.inputType)"
                  text-color="white"
                  label
                  class="mr-2"
                >
                  {{ inputTypeLabel(field.inputType) }}
                </v-chip>
                <strong class="mr-2 text-truncate">
                  {{ field.caption }}
                </strong>
                <span class="text--secondary text-caption">
                  ({{ field.id }})
                </span>
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
                  Checkout
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
                  v-if="field.allowOverride"
                  x-small
                  outlined
                  label
                  class="mr-1 mb-1"
                >
                  Überschreibbar
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
                  v-for="opt in field.options"
                  :key="opt.value"
                  x-small
                  outlined
                  label
                  class="mr-1 mt-1"
                >
                  {{ opt.caption }}
                  <span class="text--disabled ml-1"> ({{ opt.value }}) </span>
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
              </div>
            </v-col>

            <v-col class="col-12 col-md-4">
              <v-switch
                v-model="field.allowOverride"
                color="primary"
                label="Überschreibbar"
                class="mt-0"
                hide-details
                :disabled="readonly"
                @change="emitFields"
              />
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
        text: "Mehrzeilig",
        select: "Auswahl",
        numeric: "Zahl",
        boolean: "Ja / Nein",
      };
      return map[type] || type;
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
        select: "Auswahl",
        slider: "Schieberegler",
        range: "Bereich",
        checkbox: "Checkbox",
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
    hasAnyTag(field) {
      const u = field.usageOptions || {};
      return u.context !== "none" || field.allowOverride;
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
