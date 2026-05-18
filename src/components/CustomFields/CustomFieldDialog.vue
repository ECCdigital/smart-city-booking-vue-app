<template>
  <v-dialog
    :value="value"
    @input="$emit('input', $event)"
    max-width="750"
    persistent
    scrollable
  >
    <v-card>
      <v-card-title class="subtitle-1">
        <v-icon left color="primary" small>mdi-form-textbox</v-icon>
        {{ isEdit ? "Feld bearbeiten" : "Neues Feld anlegen" }}
      </v-card-title>
      <v-divider />

      <v-card-text class="pt-4">
        <v-form ref="form" v-model="valid">
          <!-- Basic info -->
          <v-row dense>
            <v-col v-if="isEdit" cols="12" md="6">
              <v-text-field
                v-model="local.id"
                label="Feld-ID"
                disabled
                background-color="accent"
                filled
                dense
              />
            </v-col>
            <v-col cols="12" :md="isEdit ? 6 : 12">
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
              <v-col cols="5">
                <v-text-field
                  v-model="opt.caption"
                  label="Anzeigename"
                  :rules="[rules.required]"
                  background-color="accent"
                  filled
                  dense
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="5">
                <v-text-field
                  v-model="opt.value"
                  label="Wert"
                  :rules="[rules.required]"
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

            <v-btn text small color="primary" class="mt-1" @click="addOption">
              <v-icon left small>mdi-plus</v-icon>
              Option hinzufügen
            </v-btn>
          </template>

          <!-- Usage options -->
          <template v-if="!hideUsageOptions">
            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">Verwendung</div>

            <v-row dense>
              <v-col cols="12" md="6">
                <v-select
                  v-model="local.usageOptions.context"
                  :items="contextOptions"
                  label="Verwendungskontext"
                  background-color="accent"
                  hide-details
                  filled
                  dense
                />
              </v-col>
              <v-col
                v-if="local.usageOptions.context === 'checkout'"
                cols="12"
                md="6"
                class="d-flex align-center justify-center"
              >
                <v-switch
                  v-model="local.usageOptions.requiredInCheckout"
                  label="Pflichtfeld im Checkout"
                  color="primary"
                  class="mt-0 pt-0"
                  dense
                  hide-details
                />
              </v-col>
            </v-row>

            <template v-if="local.usageOptions.context === 'catalog'">
              <v-row dense class="mt-2">
                <v-col cols="12" md="6">
                  <v-select
                    v-model="local.usageOptions.catalogFilterType"
                    :items="filterTypes"
                    label="Filtertyp im Katalog"
                    background-color="accent"
                    filled
                    dense
                    clearable
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="local.usageOptions.catalogFilterPosition"
                    :items="filterPositions"
                    label="Filterposition"
                    background-color="accent"
                    filled
                    dense
                    disabled
                  />
                </v-col>
              </v-row>
            </template>
          </template>
        </v-form>
      </v-card-text>

      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Abbrechen</v-btn>
        <v-btn color="primary" text :disabled="!valid" @click="save">
          {{ isEdit ? "Speichern" : "Anlegen" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
const makeEmptyField = () => ({
  id: "",
  caption: "",
  placeholder: "",
  inputType: "string",
  options: [],
  usageOptions: {
    context: "none",
    requiredInCheckout: false,
    catalogFilterType: null,
    catalogFilterPosition: "sidebar",
  },
});

export default {
  name: "CustomFieldDialog",
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
      inputTypes: [
        { text: "Zahl", value: "numeric", description: "Einfache Zahlenwerte" },
        { text: "Text (einzeilig)", value: "string", description: "Kurze Schlagworte oder Zahlenbereiche" },
        { text: "Text (mehrzeilig)", value: "text", description: "Längere Beschreibungen" },
        //{ text: "Auswahl (mehrfach)", value: "multiselect", description: "Auswahl mehrerer von mehreren vorgegebenen Optionen" },
        { text: "Auswahl (einfach)", value: "select", description: "Auswahl einer von mehreren vorgegebenen Optionen" },
        { text: "Ja / Nein", value: "boolean", description: "Einzelne Ja-Nein-Auswahloption"  },
      ],
      contextOptions: [
        { text: "Nicht verwendet", value: "none" },
        { text: "Im Buchungsprozess (Kunde füllt aus)", value: "checkout" },
        { text: "Im Katalog (Info / Filter)", value: "catalog" },
      ],
      filterPositions: [
        { text: "Seitenleiste", value: "sidebar" },
        { text: "Navigation", value: "navigation" },
        { text: "Suchleiste", value: "searchbar" },
      ],
      rules: {
        required: (v) => !!v || "Pflichtfeld",
      },
    };
  },
  computed: {
    isEdit() {
      return this.field !== null;
    },
    filterTypes() {
      const all = [
        { text: "Auswahl (Select)", value: "select" },
        { text: "Schieberegler", value: "slider" },
        { text: "Bereich", value: "range" },
        { text: "Checkbox", value: "checkbox" },
      ];

      const type = this.local.inputType;

      if (type === "boolean") {
        return all.filter((f) => f.value === "checkbox");
      }
      if (type === "string" || type === "text") {
        return all.filter((f) => !["slider", "range"].includes(f.value));
      }
      if (type === "select") return all.filter((f) => f.value !== "checkbox");
      return all;
    },
  },
  watch: {
    value(open) {
      if (open) {
        this.local = this.field
          ? JSON.parse(JSON.stringify(this.field))
          : makeEmptyField();

        this.local.usageOptions = {
          ...makeEmptyField().usageOptions,
          ...(this.local.usageOptions || {}),
        };
        this.local.options = this.local.options || [];

        this.$nextTick(() => {
          if (this.$refs.form) this.$refs.form.resetValidation();
        });
      }
    },
    "local.inputType"(v) {
      if (v !== "select") this.local.options = [];
      const allowed = this.filterTypes.map((f) => f.value);
      if (
        this.local.usageOptions.catalogFilterType &&
        !allowed.includes(this.local.usageOptions.catalogFilterType)
      ) {
        this.local.usageOptions.catalogFilterType = null;
      }
    },
    "local.usageOptions.context"(v) {
      if (v !== "checkout") {
        this.local.usageOptions.requiredInCheckout = false;
      }
      if (v !== "catalog") {
        this.local.usageOptions.catalogFilterType = null;
        this.local.usageOptions.catalogFilterPosition = "sidebar";
      }
    },
  },
  methods: {
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
      this.local.options.push({ caption: "", value: "" });
    },
    removeOption(i) {
      this.local.options.splice(i, 1);
    },
    close() {
      this.$emit("input", false);
    },
    save() {
      if (!this.$refs.form.validate()) return;
      const payload = JSON.parse(JSON.stringify(this.local));
      if (!this.isEdit) {
        payload.id = this.generateUUID();
      }
      this.$emit("save", payload);
    },
  },
};
</script>
