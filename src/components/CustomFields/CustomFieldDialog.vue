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
            <v-col cols="12" md="6">
              <v-text-field
                v-model="local.id"
                label="Feld-ID"
                hint="Eindeutiger technischer Schlüssel (z. B. 'color')"
                persistent-hint
                :disabled="isEdit"
                :rules="idRules"
                background-color="accent"
                filled
                dense
              />
            </v-col>
            <v-col cols="12" md="6">
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
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="local.placeholder"
                label="Platzhalter"
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
                  />
                </v-col>
              </v-row>
            </template>
          </template>

          <!-- Override toggle -->
          <template v-if="!hideOverride">
            <v-divider class="my-4" />
            <v-switch
              v-model="local.allowOverride"
              label="Mandanten dürfen den Wert überschreiben"
              color="primary"
              dense
              hide-details
            />
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
  allowOverride: true,
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
        { text: "Text (einzeilig)", value: "string" },
        { text: "Text (mehrzeilig)", value: "text" },
        { text: "Auswahl", value: "select" },
        { text: "Zahl", value: "numeric" },
        { text: "Ja / Nein", value: "boolean" },
      ],
      contextOptions: [
        { text: "Nicht verwendet", value: "none" },
        { text: "Im Checkout (Kunde füllt aus)", value: "checkout" },
        { text: "Im Katalog (Info / Filter)", value: "catalog" },
      ],
      filterTypes: [
        { text: "Auswahl (Select)", value: "select" },
        { text: "Schieberegler", value: "slider" },
        { text: "Bereich", value: "range" },
        { text: "Checkbox", value: "checkbox" },
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
    idRules() {
      return [
        (v) => !!v || "Pflichtfeld",
        (v) =>
          /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(v) ||
          "Nur Buchstaben, Zahlen, - und _ erlaubt",
        (v) =>
          this.isEdit ||
          !this.existingIds.includes(v) ||
          "Diese ID existiert bereits",
      ];
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
      this.$emit("save", JSON.parse(JSON.stringify(this.local)));
    },
  },
};
</script>
