<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import CustomFieldList from "@/components/CustomFields/CustomFieldList.vue";
import ApiInstanceService from "@/services/api/ApiInstanceService";
import { mapGetters } from "vuex";
import bookableExpertMode from "@/mixins/bookableExpertMode";

const ORIGIN_META = {
  instance: {
    originLabel: "Instanz",
    originIcon: "mdi-home-outline",
  },
  tenant: {
    originLabel: "Mandant",
    originIcon: "mdi-domain",
  },
};

export default {
  name: "BookableEditCustomFields",
  components: { BaseSection, CustomFieldList },
  mixins: [bookableExpertMode],
  props: {
    bookable: { type: Object, required: true },
    sectionTarget: { type: String, default: null },
  },
  data() {
    return {
      valid: true,
      activeView: 0,
      expandedOrigins: [0],
      fetchedInstanceFields: [],
    };
  },
  computed: {
    ...mapGetters({
      currentTenant: "tenants/currentTenant",
    }),
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
    valueFieldCount() {
      return this.groupedFields.reduce(
        (sum, group) => sum + group.fields.length,
        0
      );
    },
    hasCheckoutFields() {
      return (this.bookable.customFields || []).some(
        (field) => field.usageOptions?.context === "checkout"
      );
    },
    ownDefinitionCount() {
      return (this.bookable.customFieldDefinitions || []).length;
    },
    inheritedFieldGroups() {
      const fromBookable = this.groupFieldsByOrigin(
        (this.bookable.customFields || []).filter(
          (field) => field._origin && field._origin !== "bookable"
        )
      );
      if (fromBookable.length) return fromBookable;

      const fallbackGroups = [];
      if (this.fetchedInstanceFields.length) {
        fallbackGroups.push({
          ...ORIGIN_META.instance,
          fields: this.fetchedInstanceFields,
        });
      }

      const tenantFields = this.currentTenant?.bookableCustomFields || [];
      if (tenantFields.length) {
        fallbackGroups.push({
          ...ORIGIN_META.tenant,
          fields: tenantFields,
        });
      }

      return fallbackGroups;
    },
  },
  watch: {
    expertMode(enabled) {
      if (!enabled) {
        this.activeView = 0;
      }
    },
    sectionTarget: {
      immediate: true,
      handler(sectionId) {
        this.goToSection(sectionId);
      },
    },
    groupedFields: {
      immediate: true,
      handler(groups) {
        if (groups.length && !this.expandedOrigins.length) {
          this.expandedOrigins = [0];
        }
      },
    },
  },
  async mounted() {
    const hasInheritedFromApi = (this.bookable.customFields || []).some(
      (field) => field._origin && field._origin !== "bookable"
    );
    if (!hasInheritedFromApi) {
      await this.loadFallbackInheritedFields();
    }
  },
  methods: {
    goToSection(sectionId) {
      if (sectionId === "customFields-definitions" && this.expertMode) {
        this.activeView = 1;
        return;
      }
      if (sectionId === "customFields-values" || !sectionId) {
        this.activeView = 0;
      }
    },
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      this.$refs.form?.resetValidation();
    },
    groupFieldsByOrigin(fields) {
      const grouped = {};
      for (const field of fields) {
        const origin = field._origin;
        if (!grouped[origin]) grouped[origin] = [];
        grouped[origin].push(field);
      }

      return ["instance", "tenant"]
        .filter((origin) => grouped[origin]?.length)
        .map((origin) => ({
          ...ORIGIN_META[origin],
          fields: grouped[origin],
        }));
    },
    async loadFallbackInheritedFields() {
      try {
        this.fetchedInstanceFields =
          (await ApiInstanceService.getBookableCustomFields()) || [];
      } catch (error) {
        console.error("Failed to load instance custom fields:", error);
        this.fetchedInstanceFields = [];
      }
    },
    onDefinitionsChanged(fields) {
      this.$emit("update:bookable", {
        ...this.bookable,
        customFieldDefinitions: fields,
      });
    },
    switchToDefinitions() {
      if (!this.expertMode) return;
      this.activeView = 1;
    },
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
        checkout: "Buchungsprozess",
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
          "Definiert auf Instanz-Ebene — gilt für alle Mandanten und Buchungsobjekte.",
        tenant:
          "Definiert auf Mandanten-Ebene — gilt für alle Buchungsobjekte dieses Mandanten.",
        bookable: "Definiert speziell für dieses Buchungsobjekt.",
      };
      return map[origin] || "";
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Eigene Felder" icon="mdi-form-textbox">
      <v-tabs
        v-if="expertMode"
        v-model="activeView"
        class="mb-4 custom-fields-tabs"
        grow
      >
        <v-tab>
          <v-icon left small>mdi-pencil-outline</v-icon>
          Werte pflegen
          <v-chip v-if="valueFieldCount" x-small class="ml-2" label>
            {{ valueFieldCount }}
          </v-chip>
        </v-tab>
        <v-tab>
          <v-icon left small>mdi-tune-variant</v-icon>
          Felder definieren
          <v-chip v-if="ownDefinitionCount" x-small class="ml-2" label outlined>
            {{ ownDefinitionCount }}
          </v-chip>
        </v-tab>
      </v-tabs>

      <v-tabs-items v-if="expertMode" v-model="activeView">
        <v-tab-item>
          <div class="custom-fields-values">
            <p class="text-body-2 text--secondary mb-3">
              Werte eintragen, die im Katalog oder intern angezeigt werden.
            </p>

            <v-alert
              v-if="hasCheckoutFields"
              type="info"
              dense
              text
              class="mb-3"
            >
              Buchungsprozess-Felder füllt der Kunde bei der Buchung aus.
            </v-alert>

            <v-card
              v-if="groupedFields.length === 0"
              outlined
              class="section-card pa-6 text-center"
            >
              <v-icon size="48" color="grey lighten-1" class="mb-3">
                mdi-form-textbox
              </v-icon>
              <div class="text-subtitle-1 grey--text mb-2">
                Noch keine Felder zum Ausfüllen
              </div>
              <div class="text-body-2 grey--text mb-4">
                Felder kommen von Instanz oder Mandant — oder du legst sie unter
                „Felder definieren“ an.
              </div>
              <v-btn color="primary" text @click="switchToDefinitions">
                <v-icon left small>mdi-plus-box-outline</v-icon>
                Feld definieren
              </v-btn>
            </v-card>

            <v-expansion-panels
              v-else
              v-model="expandedOrigins"
              multiple
              flat
              class="values-panels"
            >
              <v-expansion-panel
                v-for="group in groupedFields"
                :key="'values-' + group.origin"
                class="section-card mb-2"
              >
                <v-expansion-panel-header class="origin-header py-2 px-3">
                  <div class="d-flex align-center">
                    <v-icon small class="mr-2">{{
                      originIcon(group.origin)
                    }}</v-icon>
                    <span class="subtitle-2 font-weight-bold">
                      {{ originLabel(group.origin) }}
                    </span>
                    <v-chip x-small label class="ml-2">
                      {{ group.fields.length }}
                    </v-chip>
                    <v-tooltip bottom>
                      <template v-slot:activator="{ on, attrs }">
                        <v-icon
                          x-small
                          class="ml-1"
                          color="grey"
                          v-bind="attrs"
                          v-on="on"
                        >
                          mdi-information-outline
                        </v-icon>
                      </template>
                      <span>{{ originTooltip(group.origin) }}</span>
                    </v-tooltip>
                  </div>
                </v-expansion-panel-header>

                <v-expansion-panel-content class="px-0 pb-0">
                  <v-divider />
                  <div
                    v-for="(field, fIndex) in group.fields"
                    :key="field.id"
                    class="field-row px-3 py-2"
                    :class="{ 'field-row--border': fIndex > 0 }"
                  >
                    <v-row dense align="center">
                      <v-col cols="12" sm="5" class="field-row-label py-1">
                        <div class="d-flex align-center flex-wrap">
                          <span class="body-2 font-weight-medium mr-2">
                            {{ field.caption }}
                          </span>
                          <v-chip
                            x-small
                            :color="contextColor(field.context)"
                            dark
                            label
                          >
                            {{ contextLabel(field.context) }}
                          </v-chip>
                        </div>
                      </v-col>

                      <v-col cols="12" sm="7" class="field-row-input py-1">
                        <v-text-field
                          v-if="field.inputType === 'string'"
                          :value="field.currentValue"
                          :placeholder="field.placeholder || ''"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          clearable
                          @input="updateFieldValue(field.id, $event)"
                          @click:clear="clearFieldValue(field.id)"
                        />

                        <v-textarea
                          v-else-if="field.inputType === 'text'"
                          :value="field.currentValue"
                          :placeholder="field.placeholder || ''"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          rows="2"
                          auto-grow
                          clearable
                          @input="updateFieldValue(field.id, $event)"
                          @click:clear="clearFieldValue(field.id)"
                        />

                        <v-text-field
                          v-else-if="field.inputType === 'numeric'"
                          :value="field.currentValue"
                          :placeholder="field.placeholder || ''"
                          type="number"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          clearable
                          @input="
                            updateFieldValue(
                              field.id,
                              $event !== '' && $event !== null
                                ? Number($event)
                                : null
                            )
                          "
                          @click:clear="clearFieldValue(field.id)"
                        />

                        <v-switch
                          v-else-if="field.inputType === 'boolean'"
                          :input-value="field.currentValue"
                          :label="field.currentValue ? 'Ja' : 'Nein'"
                          dense
                          hide-details
                          class="mt-0 pt-0"
                          @change="updateFieldValue(field.id, $event)"
                        />

                        <v-select
                          v-else-if="field.inputType === 'select'"
                          :value="field.currentValue"
                          :items="field.options || []"
                          item-text="caption"
                          item-value="value"
                          :placeholder="field.placeholder || 'Auswählen…'"
                          background-color="accent"
                          filled
                          dense
                          hide-details
                          clearable
                          :menu-props="{
                            offsetY: true,
                            offsetOverflow: true,
                          }"
                          @input="updateFieldValue(field.id, $event)"
                          @click:clear="clearFieldValue(field.id)"
                        />
                      </v-col>
                    </v-row>
                  </div>
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </v-tab-item>

        <v-tab-item>
          <p class="text-body-2 text--secondary mb-3">
            Zusätzliche Felder nur für dieses Buchungsobjekt. Geerbte Felder
            sind schreibgeschützt. Nach dem Speichern erscheinen neue Felder
            unter „Werte pflegen“.
          </p>

          <v-card outlined class="section-card pa-4">
            <CustomFieldList
              :fields="bookable.customFieldDefinitions || []"
              :inherited-field-groups="inheritedFieldGroups"
              own-fields-label="Eigene Felder auf Buchungsobjekt-Ebene"
              hide-override
              @update:fields="onDefinitionsChanged"
            />
          </v-card>
        </v-tab-item>
      </v-tabs-items>

      <!-- Simple mode: values only, no definition sub-tab -->
      <div v-else class="custom-fields-values">
        <p class="text-body-2 text--secondary mb-3">
          Werte eintragen, die im Katalog oder intern angezeigt werden.
        </p>

        <v-alert v-if="hasCheckoutFields" type="info" dense text class="mb-3">
          Buchungsprozess-Felder füllt der Kunde bei der Buchung aus.
        </v-alert>

        <v-card
          v-if="groupedFields.length === 0"
          outlined
          class="section-card pa-6 text-center"
        >
          <v-icon size="48" color="grey lighten-1" class="mb-3">
            mdi-form-textbox
          </v-icon>
          <div class="text-subtitle-1 grey--text mb-2">
            Noch keine Felder zum Ausfüllen
          </div>
          <div class="text-body-2 grey--text">
            Felder kommen von Instanz oder Mandant. Eigene Felder kannst du im
            Experten-Modus unter „Felder definieren“ anlegen.
          </div>
        </v-card>

        <v-expansion-panels
          v-else
          v-model="expandedOrigins"
          multiple
          flat
          class="values-panels"
        >
          <v-expansion-panel
            v-for="group in groupedFields"
            :key="'simple-values-' + group.origin"
            class="section-card mb-2"
          >
            <v-expansion-panel-header class="origin-header py-2 px-3">
              <div class="d-flex align-center">
                <v-icon small class="mr-2">{{
                  originIcon(group.origin)
                }}</v-icon>
                <span class="subtitle-2 font-weight-bold">
                  {{ originLabel(group.origin) }}
                </span>
                <v-chip x-small label class="ml-2">
                  {{ group.fields.length }}
                </v-chip>
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-icon
                      x-small
                      class="ml-1"
                      color="grey"
                      v-bind="attrs"
                      v-on="on"
                    >
                      mdi-information-outline
                    </v-icon>
                  </template>
                  <span>{{ originTooltip(group.origin) }}</span>
                </v-tooltip>
              </div>
            </v-expansion-panel-header>

            <v-expansion-panel-content class="px-0 pb-0">
              <v-divider />
              <div
                v-for="(field, fIndex) in group.fields"
                :key="field.id"
                class="field-row px-3 py-2"
                :class="{ 'field-row--border': fIndex > 0 }"
              >
                <v-row dense align="center">
                  <v-col cols="12" sm="5" class="field-row-label py-1">
                    <div class="d-flex align-center flex-wrap">
                      <span class="body-2 font-weight-medium mr-2">
                        {{ field.caption }}
                      </span>
                      <v-chip
                        x-small
                        :color="contextColor(field.context)"
                        dark
                        label
                      >
                        {{ contextLabel(field.context) }}
                      </v-chip>
                    </div>
                  </v-col>

                  <v-col cols="12" sm="7" class="field-row-input py-1">
                    <v-text-field
                      v-if="field.inputType === 'string'"
                      :value="field.currentValue"
                      :placeholder="field.placeholder || ''"
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      clearable
                      @input="updateFieldValue(field.id, $event)"
                      @click:clear="clearFieldValue(field.id)"
                    />

                    <v-textarea
                      v-else-if="field.inputType === 'text'"
                      :value="field.currentValue"
                      :placeholder="field.placeholder || ''"
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      rows="2"
                      auto-grow
                      clearable
                      @input="updateFieldValue(field.id, $event)"
                      @click:clear="clearFieldValue(field.id)"
                    />

                    <v-text-field
                      v-else-if="field.inputType === 'numeric'"
                      :value="field.currentValue"
                      :placeholder="field.placeholder || ''"
                      type="number"
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      clearable
                      @input="
                        updateFieldValue(
                          field.id,
                          $event !== '' && $event !== null
                            ? Number($event)
                            : null
                        )
                      "
                      @click:clear="clearFieldValue(field.id)"
                    />

                    <v-switch
                      v-else-if="field.inputType === 'boolean'"
                      :input-value="field.currentValue"
                      :label="field.currentValue ? 'Ja' : 'Nein'"
                      dense
                      hide-details
                      class="mt-0 pt-0"
                      @change="updateFieldValue(field.id, $event)"
                    />

                    <v-select
                      v-else-if="field.inputType === 'select'"
                      :value="field.currentValue"
                      :items="field.options || []"
                      item-text="caption"
                      item-value="value"
                      :placeholder="field.placeholder || 'Auswählen…'"
                      background-color="accent"
                      filled
                      dense
                      hide-details
                      clearable
                      :menu-props="{ offsetY: true, offsetOverflow: true }"
                      @input="updateFieldValue(field.id, $event)"
                      @click:clear="clearFieldValue(field.id)"
                    />
                  </v-col>
                </v-row>
              </div>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </BaseSection>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
}

.custom-fields-tabs >>> .v-tab {
  text-transform: none;
  letter-spacing: normal;
}

.values-panels >>> .v-expansion-panel {
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  border-radius: 8px !important;
  overflow: hidden;
}

.theme--dark .values-panels >>> .v-expansion-panel {
  border-color: rgba(255, 255, 255, 0.12) !important;
}

.origin-header {
  min-height: 44px !important;
  background: rgba(0, 0, 0, 0.02);
}

.theme--dark .origin-header {
  background: rgba(255, 255, 255, 0.03);
}

.field-row--border {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.theme--dark .field-row--border {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.field-row-label {
  line-height: 1.3;
}

.field-row-input >>> .v-input {
  margin-top: 0;
  padding-top: 0;
}

@media (min-width: 600px) {
  .field-row-input >>> .v-input__control {
    min-height: 36px;
  }
}
</style>
