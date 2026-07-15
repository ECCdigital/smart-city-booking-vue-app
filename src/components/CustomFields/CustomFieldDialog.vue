<template>
  <v-dialog
    :value="value"
    @input="$emit('input', $event)"
    max-width="750"
    persistent
    scrollable
  >
    <v-card class="custom-field-dialog">
      <v-card-title class="subtitle-1">
        <v-icon left color="primary" small>mdi-form-textbox</v-icon>
        {{ isEdit ? "Feld bearbeiten" : "Neues Feld anlegen" }}
      </v-card-title>
      <v-divider />

      <v-card-text class="pt-4">
        <v-form ref="form" v-model="valid" class="custom-field-dialog-form">
          <!-- Basic info -->
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="local.caption"
                label="Bezeichnung"
                :rules="[rules.required]"
                background-color="accent"
                filled
                dense
              />
            </v-col>
          </v-row>

          <v-row dense>
            <v-col cols="12" md="6">
              <v-select
                v-model="local.inputType"
                :items="inputTypes"
                label="Feldtyp"
                :rules="[rules.required]"
                background-color="accent"
                filled
                dense
              >
                <template v-slot:item="{ item}">
                  <div class="d-flex align-center my-1">

                   <v-icon left small color="primary">
                      {{
                        {
                          string: "mdi-format-paragraph",
                          text: "mdi-format-letter-case",
                          multiselect: "mdi-format-list-bulleted-square",
                          select: "mdi-format-list-bulleted-type",
                          numeric: "mdi-numeric",
                          boolean: "mdi-toggle-switch",
                        }[item.value]
                      }}
                    </v-icon>
                    <div class="mx-1">
                      {{item.text}}
                      <div class="caption">{{ item.description }}</div>
                    </div>
                  </div>
                </template>
              </v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="local.placeholder"
                label="Beispielangabe / Platzhalter"
                background-color="accent"
                filled
                dense
              />
            </v-col>
          </v-row>

          <!-- Options for select type -->
          <template v-if="local.inputType === 'select'">
            <v-divider class="my-3" />
            <div class="text-subtitle-2 mb-2">Auswahloptionen</div>

            <v-row
              v-for="(opt, i) in local.options"
              :key="'opt-' + i"
              dense
              align="center"
            >
              <v-col :cols="showTechnicalValues ? 5 : 10">
                <v-text-field
                  v-model="opt.caption"
                  label="Option"
                  :rules="[rules.required, rules.uniqueOptionCaption(i)]"
                  background-color="accent"
                  filled
                  dense
                  hide-details="auto"
                  @input="onOptionCaptionInput(i)"
                />
              </v-col>
              <v-col v-if="showTechnicalValues" cols="5">
                <v-text-field
                  v-model="opt.value"
                  label="Technischer Wert"
                  :rules="[rules.required, rules.uniqueOptionValue(i)]"
                  background-color="accent"
                  filled
                  dense
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="2" class="d-flex justify-center">
                <v-btn icon small color="error" @click="removeOption(i)">
                  <v-icon small>mdi-close</v-icon>
                </v-btn>
              </v-col>
            </v-row>

            <v-alert
              v-if="local.options.length === 0"
              type="warning"
              dense
              text
              class="mb-2"
            >
              Mindestens eine Option erforderlich.
            </v-alert>

            <v-btn text small color="primary" class="mt-1" @click="addOption">
              <v-icon left small>mdi-plus</v-icon>
              Option hinzufügen
            </v-btn>

            <v-switch
              v-model="showTechnicalValues"
              label="Technische Werte anpassen"
              hint="Standardmäßig werden Werte automatisch aus der Option erzeugt."
              persistent-hint
              color="primary"
              class="mt-2"
              dense
              hide-details="auto"
            />
          </template>

          <!-- Usage options -->
          <template v-if="!hideUsageOptions">
            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">Verwendung</div>

            <v-radio-group
              v-model="local.usageOptions.context"
              hide-details
              class="mt-0 pt-0"
            >
              <v-radio
                v-for="opt in contextOptions"
                :key="opt.value"
                :value="opt.value"
                color="primary"
                class="mb-1"
              >
                <template v-slot:label>
                  <div>
                    <div>{{ opt.text }}</div>
                    <div class="caption text--secondary">{{ opt.hint }}</div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>

            <v-card
              v-if="local.usageOptions.context === 'checkout'"
              outlined
              class="mt-3 pa-3 usage-card"
            >
              <v-switch
                v-model="local.usageOptions.requiredInCheckout"
                label="Pflichtfeld im Buchungsprozess"
                hint="Der Kunde muss dieses Feld ausfüllen, bevor die Buchung abgeschlossen werden kann."
                persistent-hint
                color="primary"
                class="mt-0 pt-0"
                dense
              />
            </v-card>

            <template v-if="local.usageOptions.context === 'catalog'">
              <v-card outlined class="mt-3 pa-3 usage-card">
                <v-switch
                  v-model="local.usageOptions.filterable"
                  label="Als Filter im Katalog anzeigen"
                  hint="Besucher können danach filtern. Ohne Filter wird das Feld nur als Information angezeigt."
                  persistent-hint
                  color="primary"
                  class="mt-0 pt-0"
                  dense
                />

                <template v-if="local.usageOptions.filterable">
                  <v-divider class="my-3" />
                  <v-row dense>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="local.usageOptions.catalogFilterType"
                        :items="filterTypes"
                        label="Filter-Darstellung"
                        :rules="[rules.required]"
                        background-color="accent"
                        filled
                        dense
                      >
                        <template v-slot:item="{ item }">
                          <div class="d-flex align-center my-1">
                            <v-icon left small color="primary">
                              {{
                                {
                                  checkbox: "mdi-checkbox-outline",
                                  select: "mdi-order-bool-ascending-variant",
                                  slider: "mdi-tune-variant",
                                  range: "mdi-tune-variant",
                                }[item.value]
                              }}
                            </v-icon>
                            <div class="mx-1">
                              {{ item.text }}
                              <div class="caption">{{ item.description }}</div>
                            </div>
                          </div>
                        </template>
                      </v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="local.usageOptions.catalogFilterPosition"
                        :items="filterPositions"
                        label="Filter-Position"
                        background-color="accent"
                        filled
                        dense
                      />
                    </v-col>
                  </v-row>
                </template>

                <v-divider class="my-3" />
                <v-select
                  v-model="local.usageOptions.detailDisplayPosition"
                  :items="detailDisplayPositions"
                  label="Anzeige auf der Detailseite"
                  background-color="accent"
                  filled
                  dense
                >
                  <template v-slot:item="{ item }">
                    <div class="d-flex align-center my-1">
                      <div class="mx-1">
                        {{ item.text }}
                        <div class="caption">{{ item.description }}</div>
                      </div>
                    </div>
                  </template>
                </v-select>
              </v-card>
            </template>

            <CustomFieldPreview
              v-if="showPreview"
              :field="local"
              class="mt-4"
            />
          </template>

          <v-expansion-panels v-if="isEdit" flat class="mt-4">
            <v-expansion-panel>
              <v-expansion-panel-header class="px-0 subtitle-2">
                Erweitert
              </v-expansion-panel-header>
              <v-expansion-panel-content>
                <v-text-field
                  v-model="local.id"
                  label="Feld-ID"
                  disabled
                  background-color="accent"
                  filled
                  dense
                  hint="Interne Kennung — nicht änderbar."
                  persistent-hint
                />
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-form>
      </v-card-text>

      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Abbrechen</v-btn>
        <v-btn color="primary" text :disabled="!canSave" @click="save">
          {{ isEdit ? "Speichern" : "Anlegen" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import CustomFieldPreview from "@/components/CustomFields/CustomFieldPreview.vue";

const makeEmptyField = () => ({
  id: "",
  caption: "",
  placeholder: "",
  inputType: "string",
  options: [],
  usageOptions: {
    context: "none",
    requiredInCheckout: false,
    filterable: false,
    catalogFilterType: null,
    catalogFilterPosition: "sidebar",
    detailDisplayPosition: "none",
  },
});

const slugifyOptionValue = (caption) => {
  if (!caption) return "";

  return caption
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const makeUniqueOptionValue = (baseValue, options, excludeIndex = -1) => {
  const normalizedBase = baseValue || "option";
  let candidate = normalizedBase;
  let suffix = 2;

  while (
    options.some(
      (opt, index) => index !== excludeIndex && opt.value === candidate
    )
  ) {
    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

export default {
  name: "CustomFieldDialog",
  components: { CustomFieldPreview },
  props: {
    value: { type: Boolean, default: false },
    field: { type: Object, default: null },
    existingIds: { type: Array, default: () => [] },
    hideUsageOptions: { type: Boolean, default: false },
    hideOverride: { type: Boolean, default: false },
  },
  data() {
    return {
      valid: false,
      local: makeEmptyField(),
      showTechnicalValues: false,
      isInitializing: false,
      inputTypes: [
        { text: "Zahl", value: "numeric", description: "Einfache Zahlenwerte" },
        { text: "Text (einzeilig)", value: "string", description: "Kurze Schlagworte oder Zahlenbereiche" },
        { text: "Text (mehrzeilig)", value: "text", description: "Längere Beschreibungen" },
        //{ text: "Auswahl (mehrfach)", value: "multiselect", description: "Auswahl mehrerer von mehreren vorgegebenen Optionen" },
        { text: "Auswahl (einfach)", value: "select", description: "Auswahl einer von mehreren vorgegebenen Optionen" },
        { text: "Ja / Nein", value: "boolean", description: "Einzelne Ja-Nein-Auswahloption"  },
      ],
      contextOptions: [
        {
          text: "Nur intern",
          value: "none",
          hint: "Nur im Admin-Bereich sichtbar, nicht im Katalog oder Buchungsprozess.",
        },
        {
          text: "Im Buchungsprozess",
          value: "checkout",
          hint: "Der Kunde füllt dieses Feld während der Buchung aus.",
        },
        {
          text: "Im Katalog",
          value: "catalog",
          hint: "Anzeige und optionaler Filter auf der öffentlichen Katalogseite.",
        },
      ],
      filterPositions: [
        { text: "Seitenleiste", value: "sidebar" },
        { text: "Navigation", value: "navigation" },
        { text: "Suchleiste", value: "searchbar" },
      ],
      rules: {
        required: (v) => !!v || "Pflichtfeld",
        uniqueOptionCaption: (index) => (v) => {
          if (!v) return true;
          const duplicates = this.local.options.filter(
            (opt, i) => i !== index && opt.caption.trim() === v.trim()
          );
          return (
            duplicates.length === 0 || "Diese Option existiert bereits"
          );
        },
        uniqueOptionValue: (index) => (v) => {
          if (!v) return true;
          const duplicates = this.local.options.filter(
            (opt, i) => i !== index && opt.value === v
          );
          return (
            duplicates.length === 0 || "Jeder technische Wert darf nur einmal vorkommen"
          );
        },
      },
    };
  },
  computed: {
    isEdit() {
      return this.field !== null;
    },
    canSave() {
      if (!this.valid) return false;
      if (this.local.inputType !== "select") return true;

      return (
        this.local.options.length > 0 &&
        this.local.options.every((opt) => opt.caption && opt.value)
      );
    },
    showPreview() {
      const context = this.local.usageOptions?.context;
      return context === "checkout" || context === "catalog";
    },
    detailDisplayPositions() {
      const all = [
        { text: "Nicht anzeigen", value: "none", description: "Feld erscheint nicht in der Detailansicht" },
        { text: "Label (über Beschreibung)", value: "badge", description: "Als Label oberhalb des Beschreibungstexts" },
        { text: "Unterhalb der Beschreibung", value: "belowDescription", description: "Direkt unter dem Beschreibungstext" },
        { text: "Weitere Informationen", value: "moreInfo", description: "In einem separaten Info-Bereich rechts unterhalb der Preisinformation" },
      ];

      if (this.local.inputType === "text") {
        return all.filter((p) => p.value !== "badge");
      }
      return all;
    },
    filterTypes() {
      const all = [
        {
          text: "Einzelne Checkbox",
          value: "checkbox",
          description: "Eine Checkbox mit der Feldbezeichnung",
        },
        {
          text: "Dropdown-Filter",
          value: "select",
          description: "Alle Optionen als Auswahlliste",
        },
        {
          text: "Maximalwert-Regler",
          value: "slider",
          description: "Schieberegler bis zu einem Maximalwert",
        },
        {
          text: "Von–Bis-Regler",
          value: "range",
          description: "Schieberegler für einen Minimal- und Maximalwert",
        },
      ];

      const type = this.local.inputType;

      if (type === "boolean") {
        return all.filter((f) => f.value === "checkbox");
      }
      if (type === "string" || type === "text") {
        return all.filter((f) => f.value === "select");
      }
      if (type === "select" || type === "numeric") return all.filter((f) => f.value !== "checkbox");
      return all;
    },
  },
  watch: {
    value(open) {
      if (open) {
        this.isInitializing = true;
        this.local = this.field
          ? JSON.parse(JSON.stringify(this.field))
          : makeEmptyField();

        this.local.usageOptions = {
          ...makeEmptyField().usageOptions,
          ...(this.local.usageOptions || {}),
        };
        this.local.options = this.local.options || [];
        this.showTechnicalValues = this.hasCustomOptionValues(this.local.options);

        this.$nextTick(() => {
          this.isInitializing = false;
          if (this.$refs.form) this.$refs.form.resetValidation();
        });
      } else {
        this.showTechnicalValues = false;
        this.isInitializing = false;
      }
    },
    "local.inputType"(v) {
      if (v !== "select") {
        this.local.options = [];
        this.showTechnicalValues = false;
      } else if (!this.local.options.length) {
        this.addOption();
      }
      const allowed = this.filterTypes.map((f) => f.value);
      if (
        this.local.usageOptions.catalogFilterType &&
        !allowed.includes(this.local.usageOptions.catalogFilterType)
      ) {
        if (this.isInitializing) {
          this.local.usageOptions.catalogFilterType = null;
        } else {
          this.applyCatalogSmartDefaults(true);
        }
      }

      const allowedPositions = this.detailDisplayPositions.map((p) => p.value);
      if (
        !allowedPositions.includes(this.local.usageOptions.detailDisplayPosition)
      ) {
        this.local.usageOptions.detailDisplayPosition = "none";
      }

      if (!this.isInitializing) {
        this.applyCatalogSmartDefaults();
      }
    },
    "local.usageOptions.context"(v, oldValue) {
      if (this.isInitializing) return;

      if (v !== "checkout") {
        this.local.usageOptions.requiredInCheckout = false;
      }
      if (v !== "catalog") {
        this.local.usageOptions.filterable = false;
        this.local.usageOptions.catalogFilterType = null;
        this.local.usageOptions.catalogFilterPosition = "sidebar";
        this.local.usageOptions.detailDisplayPosition = "none";
      } else if (oldValue !== "catalog") {
        this.applyCatalogSmartDefaults(true);
      }
    },
    "local.usageOptions.filterable"(v) {
      if (this.isInitializing) return;

      if (!v) {
        this.local.usageOptions.catalogFilterType = null;
      } else {
        this.applyCatalogSmartDefaults(true);
      }
    },
    showTechnicalValues(enabled) {
      if (!enabled) {
        this.syncAllOptionValues();
      }
    },
  },
  methods: {
    hasCustomOptionValues(options = []) {
      return options.some((opt) => {
        const autoValue = slugifyOptionValue(opt.caption);
        return opt.value && opt.value !== autoValue;
      });
    },
    syncOptionValue(index) {
      const option = this.local.options[index];
      if (!option || this.showTechnicalValues) return;

      const baseValue = slugifyOptionValue(option.caption) || `option-${index + 1}`;
      option.value = makeUniqueOptionValue(
        baseValue,
        this.local.options,
        index
      );
    },
    syncAllOptionValues() {
      this.local.options.forEach((_, index) => {
        this.syncOptionValue(index);
      });
    },
    onOptionCaptionInput(index) {
      this.syncOptionValue(index);
    },
    getDefaultCatalogFilterType(inputType) {
      const defaults = {
        boolean: "checkbox",
        string: "select",
        text: "select",
        select: "select",
        numeric: "range",
      };
      return defaults[inputType] || "select";
    },
    getDefaultDetailDisplayPosition(inputType) {
      if (inputType === "text") return "belowDescription";
      if (inputType === "boolean" || inputType === "select") return "badge";
      if (inputType === "numeric") return "belowDescription";
      return "belowDescription";
    },
    applyCatalogSmartDefaults(force = false) {
      const usage = this.local.usageOptions;
      if (usage.context !== "catalog") return;

      if (usage.filterable) {
        const defaultFilter = this.getDefaultCatalogFilterType(
          this.local.inputType
        );
        const allowedFilters = this.filterTypes.map((item) => item.value);

        if (
          force ||
          !usage.catalogFilterType ||
          !allowedFilters.includes(usage.catalogFilterType)
        ) {
          usage.catalogFilterType = allowedFilters.includes(defaultFilter)
            ? defaultFilter
            : allowedFilters[0] || null;
        }
      }

      if (force || usage.detailDisplayPosition === "none") {
        const defaultPosition = this.getDefaultDetailDisplayPosition(
          this.local.inputType
        );
        const allowedPositions = this.detailDisplayPositions.map(
          (item) => item.value
        );
        if (allowedPositions.includes(defaultPosition)) {
          usage.detailDisplayPosition = defaultPosition;
        }
      }
    },
    generateUUID() {
      if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
    addOption() {
      const nextIndex = this.local.options.length;
      this.local.options.push({ caption: "", value: `option-${nextIndex + 1}` });
    },
    removeOption(i) {
      this.local.options.splice(i, 1);
    },
    close() {
      this.$emit("input", false);
    },
    normalizeUsageOptions(usageOptions) {
      const u = { ...usageOptions };

      if (u.context !== "catalog") {
        u.filterable = false;
      }
      if (u.filterable && !u.catalogFilterType) {
        u.filterable = false;
      }
      if (!u.filterable) {
        u.catalogFilterType = null;
      }

      const validDetailPositions = this.detailDisplayPositions.map(
        (p) => p.value
      );
      if (!validDetailPositions.includes(u.detailDisplayPosition)) {
        u.detailDisplayPosition = "none";
      }

      return u;
    },
    save() {
      if (this.local.inputType === "select") {
        if (!this.showTechnicalValues) {
          this.syncAllOptionValues();
        }
        if (!this.local.options.length) {
          return;
        }
      }

      if (!this.$refs.form.validate()) return;
      const payload = JSON.parse(JSON.stringify(this.local));
      payload.usageOptions = this.normalizeUsageOptions(
        payload.usageOptions || {}
      );
      if (!this.isEdit) {
        payload.id = this.generateUUID();
      }
      this.$emit("save", payload);
    },
  },
};
</script>

<style scoped>
/* Override global $card-border-radius (25px) for inner dialog sections */
.custom-field-dialog >>> .usage-card.v-card,
.custom-field-dialog >>> .custom-field-preview.v-card {
  border-radius: 4px !important;
}

.usage-card {
  background: rgba(0, 0, 0, 0.02);
}

.theme--dark .usage-card {
  background: rgba(255, 255, 255, 0.04);
}

.custom-field-dialog >>> .custom-field-dialog-form .v-input__control > .v-input__slot,
.custom-field-dialog >>> .custom-field-preview .v-input__control > .v-input__slot {
  border-radius: 4px !important;
}

.custom-field-dialog >>> .custom-field-dialog-form .v-input__control > .v-input__slot::before,
.custom-field-dialog >>> .custom-field-dialog-form .v-input__control > .v-input__slot::after,
.custom-field-dialog >>> .custom-field-preview .v-input__control > .v-input__slot::before,
.custom-field-dialog >>> .custom-field-preview .v-input__control > .v-input__slot::after {
  border-radius: 4px !important;
}
</style>
