<template>
  <BaseSection
    :title="$t('tenant.legalDocuments.title')"
    icon="mdi-scale-balance"
    :hint="$t('tenant.legalDocuments.hint')"
  >
    <v-row class="mb-1">
      <v-col class="col-12 col-md-8">
        <p class="text--secondary body-2 mb-0">
          {{ $t("tenant.legalDocuments.description") }}
        </p>
      </v-col>
      <v-col class="col-12 col-md-4 d-flex justify-end align-center">
        <v-btn color="primary" @click="addDocument">
          <v-icon left>mdi-plus</v-icon>
          {{ $t("tenant.legalDocuments.add") }}
        </v-btn>
      </v-col>
    </v-row>

    <v-form ref="form" v-model="valid">
      <v-card
        v-for="(legalDocument, index) in localDocuments"
        :key="rowKeys[index]"
        outlined
        class="mb-4 pa-4"
      >
        <v-row dense align="center">
          <v-col cols="12" :md="isOther(legalDocument) ? 5 : 11">
            <v-select
              :value="legalDocument.type"
              :items="typeItems(index)"
              :label="$t('tenant.legalDocuments.type')"
              background-color="accent"
              filled
              dense
              hide-details="auto"
              @change="setType(index, $event)"
            />
          </v-col>
          <v-col v-if="isOther(legalDocument)" cols="12" md="6">
            <v-text-field
              :value="legalDocument.title"
              :label="$t('tenant.legalDocuments.documentTitle')"
              :rules="titleRules"
              :error-messages="duplicateTitleErrors(index)"
              background-color="accent"
              filled
              dense
              hide-details="auto"
              @input="setTitle(index, $event)"
            />
          </v-col>
          <v-col cols="12" md="1" class="d-flex justify-end">
            <v-tooltip bottom>
              <template v-slot:activator="{ on, attrs }">
                <v-btn
                  icon
                  small
                  color="error"
                  v-bind="attrs"
                  v-on="on"
                  @click="removeDocument(index)"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
              <span>{{ $t("tenant.legalDocuments.remove") }}</span>
            </v-tooltip>
          </v-col>
          <v-col cols="12" class="mt-2">
            <MediaReferenceField
              :label="$t('tenant.legalDocuments.document')"
              kind="document"
              :scope="mediaScope"
              :value="legalDocument.reference"
              public-only
              :public-only-reason="$t('tenant.legalDocuments.publicOnlyReason')"
              :empty-label="$t('tenant.legalDocuments.empty')"
              @input="setReference(index, $event)"
            />
          </v-col>
        </v-row>
      </v-card>
    </v-form>

    <v-alert
      v-if="!localDocuments.length"
      type="info"
      dense
      text
      icon="mdi-information-outline"
      class="mb-0"
    >
      {{ $t("tenant.legalDocuments.none") }}
    </v-alert>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import {
  availableLegalDocumentTypes,
  cloneLegalDocuments,
  defaultLegalDocument,
  hasDuplicateOtherTitle,
  isOtherType,
  nextLegalDocumentType,
} from "@/utils/tenantLegalDocuments";

/**
 * Where a tenant files its own legal documents (§7.3 of the legal-documents
 * spec). The list is an archive, not a delivery: nothing here is shown to an
 * end user by this app, the storefront or any mail.
 *
 * A row holds a type, a document, and — for the freely named `other` — a
 * title. The uniqueness rules are enforced here already: a taken type is no
 * longer offered, and two `other` rows may not share a title. The server
 * checks the same rules again (§2.3); this is the convenience, not the
 * safeguard.
 */
export default {
  name: "TenantEditLegal",
  components: { BaseSection, MediaReferenceField },
  props: {
    tenant: { type: Object, required: true },
  },
  data() {
    return {
      valid: true,
      localDocuments: [],
      rowKeys: [],
      lastRowKey: 0,
      mediaScope: MEDIA_SCOPE.TENANT,
    };
  },
  computed: {
    titleRules() {
      return [
        (value) => !!(value || "").trim() || this.$t("validation.required"),
      ];
    },
    hasDuplicateTitles() {
      return this.localDocuments.some((row, index) =>
        hasDuplicateOtherTitle(this.localDocuments, index)
      );
    },
  },
  watch: {
    tenant: {
      deep: true,
      immediate: true,
      handler(tenant) {
        const next = cloneLegalDocuments(tenant?.legalDocuments);
        if (JSON.stringify(next) !== JSON.stringify(this.localDocuments)) {
          this.setDocuments(next);
        }
      },
    },
  },
  methods: {
    isOther(legalDocument) {
      return isOtherType(legalDocument?.type);
    },
    /**
     * Rows are keyed by a running number, not by their position or their
     * content: the document field carries state of its own — a half-typed
     * external address — that removing a row above it must not throw away, and
     * that renaming the row must not throw away either.
     */
    setDocuments(documents) {
      this.localDocuments = documents;
      this.rowKeys = documents.map(() => (this.lastRowKey += 1));
    },
    /**
     * A type this app has no label for shows as the bare type, so a row never
     * renders as an empty select the user would overwrite without noticing.
     */
    typeItems(index) {
      return availableLegalDocumentTypes(this.localDocuments, index).map(
        (type) => {
          const key = `tenant.legalDocuments.types.${type}`;

          return { value: type, text: this.$te(key) ? this.$t(key) : type };
        }
      );
    },
    /**
     * Whether this row's title collides with another freely named document.
     * The check reads the whole list, so it belongs on `error-messages` and
     * not among the rules: Vuetify only re-runs rules when the field's own
     * value changes, which would leave a row accusing a neighbour that has
     * long since been renamed.
     */
    duplicateTitleErrors(index) {
      return hasDuplicateOtherTitle(this.localDocuments, index)
        ? [this.$t("tenant.legalDocuments.duplicateTitle")]
        : [];
    },
    addDocument() {
      this.localDocuments.push(
        defaultLegalDocument(nextLegalDocumentType(this.localDocuments))
      );
      this.rowKeys.push((this.lastRowKey += 1));
      this.emitDocuments();
    },
    removeDocument(index) {
      this.localDocuments.splice(index, 1);
      this.rowKeys.splice(index, 1);
      this.emitDocuments();
    },
    /**
     * A row that leaves `other` drops its title: a known type takes its label
     * from the translation and the server rejects a title beside it (§2.3).
     */
    setType(index, type) {
      this.replaceDocument(index, {
        type,
        title: isOtherType(type) ? this.localDocuments[index].title : "",
      });
    },
    setTitle(index, title) {
      this.replaceDocument(index, { title });
    },
    setReference(index, reference) {
      this.replaceDocument(index, { reference: reference || null });
    },
    replaceDocument(index, changes) {
      this.localDocuments.splice(index, 1, {
        ...this.localDocuments[index],
        ...changes,
      });
      this.emitDocuments();
    },
    emitDocuments() {
      this.$emit("update:tenant", {
        legalDocuments: cloneLegalDocuments(this.localDocuments),
      });
    },
    /**
     * A colliding title stands as an external message, which the form's own
     * validation does not see — it only knows the rules of a single field. The
     * save has to ask for it separately.
     */
    async validate() {
      const formValid = this.$refs.form ? this.$refs.form.validate() : true;

      return formValid && !this.hasDuplicateTitles;
    },
    resetValidation() {
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
  },
};
</script>

<style scoped></style>
