<template>
  <BaseSection
    title="Rechtliches"
    icon="mdi-scale-balance"
    hint="Datenschutzerklärung, Impressum und AGB Ihrer Instanz"
  >
    <p class="caption grey--text mb-4">
      Wählen Sie je Dokument eine Datei aus der Mediathek der Instanz oder
      tragen Sie einen externen Link ein. Die Dokumente werden jedem Besucher
      angezeigt, daher sind nur öffentliche Medien wählbar.
    </p>

    <v-row>
      <v-col cols="12" v-for="field in legalFields" :key="field.key">
        <MediaReferenceField
          :label="field.label"
          kind="document"
          :scope="mediaScope"
          :value="referenceOf(field.key)"
          public-only
          :public-only-reason="publicOnlyReason"
          empty-label="Kein Dokument ausgewählt"
          :hint="field.hint"
          @input="setReference(field.key, $event)"
        />
      </v-col>
    </v-row>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import {
  LEGAL_DOCUMENT_KEYS,
  defaultLegalDocument,
  legalDocumentReference,
  legalDocumentWithReference,
} from "@/utils/instanceLegalDocuments";

// The legal documents are linked wherever a user registers or accepts them, so
// they may only ever point at public media — the backend serves nothing else
// without credentials.
const PUBLIC_ONLY_REASON =
  "Rechtsdokumente werden öffentlich verlinkt — interne Medien sind hier nicht wählbar.";

const LEGAL_FIELDS = Object.freeze([
  {
    key: "dataProtection",
    label: "Datenschutzerklärung",
    hint: "Wird bei der Registrierung und beim Login verlinkt.",
  },
  {
    key: "legalNotice",
    label: "Impressum",
    hint: "Wird im Fußbereich der Anmeldeseiten verlinkt.",
  },
  {
    key: "termsAndConditions",
    label: "AGB",
    hint: "Wird bei der Registrierung zur Zustimmung verlinkt.",
  },
]);

export default {
  name: "InstanceEditLegal",
  components: { BaseSection, MediaReferenceField },
  props: {
    instance: { type: Object, required: true },
  },
  data() {
    return {
      local: this.withDocumentDefaults(this.instance),
      legalFields: LEGAL_FIELDS,
      mediaScope: MEDIA_SCOPE.INSTANCE,
      publicOnlyReason: PUBLIC_ONLY_REASON,
    };
  },
  watch: {
    instance: {
      handler(n) {
        const next = this.withDocumentDefaults(n);
        if (JSON.stringify(next) !== JSON.stringify(this.local)) {
          this.local = next;
        }
      },
      deep: true,
    },
  },
  methods: {
    withDocumentDefaults(instance) {
      const next = { ...instance };

      LEGAL_DOCUMENT_KEYS.forEach((key) => {
        next[key] = {
          ...defaultLegalDocument(),
          ...((instance && instance[key]) || {}),
        };
      });

      return next;
    },
    referenceOf(key) {
      return legalDocumentReference(this.local[key]);
    },
    /**
     * Writes the reference — and only the reference. `url` and `fileName` are
     * derived by the backend from what stands here (§7.2 of the
     * legal-documents spec), so the editor drops them along with the change.
     */
    setReference(key, reference) {
      this.local = {
        ...this.local,
        [key]: legalDocumentWithReference(this.local[key], reference),
      };
      this.emitUpdate();
    },
    emitUpdate() {
      this.$emit("update:instance", { ...this.local });
    },
    validate() {
      return true;
    },
    resetValidation() {},
  },
};
</script>

<style scoped></style>
