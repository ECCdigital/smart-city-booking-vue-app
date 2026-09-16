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

    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="local.copyright"
          background-color="accent"
          filled
          dense
          label="Copyright"
          hint="Nur der Rechteinhaber, z.B. »Stadt Musterstadt« — Jahr und ©-Zeichen ergänzt die Seite selbst."
          persistent-hint
          counter="200"
          maxlength="200"
          :error-messages="copyrightApiErrors"
          @input="onCopyrightInput"
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

// The backend's refusals of the Copyright-Vermerk (shared contract of the
// instance-copyright spec), as the message shown under the field.
const COPYRIGHT_API_MESSAGES = Object.freeze({
  max_length: "Höchstens 200 Zeichen.",
  invalid_format: "Darf keinen Zeilenumbruch enthalten.",
  invalid_type_string: "Muss ein Text sein.",
});

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
      copyrightApiErrors: [],
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

      // An instance stored before the field existed carries none; `""` is the
      // one way the contract says "no rights holder", so the form binds to it.
      next.copyright = typeof next.copyright === "string" ? next.copyright : "";

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
    /**
     * The rights holder as typed. An emptied field sends `""` — the backend
     * refuses `null`, and `""` is what reads back for "none is set".
     */
    onCopyrightInput(value) {
      this.local.copyright = typeof value === "string" ? value : "";
      this.copyrightApiErrors = [];
      this.emitUpdate();
    },
    emitUpdate() {
      this.$emit("update:instance", { ...this.local });
    },
    /**
     * The backend's answer to the tab save, as `details[].field` JSON paths.
     * Only `copyright` belongs to a field of this tab; the rest stays with
     * the toast.
     */
    showApiErrors(details) {
      this.copyrightApiErrors = (details || [])
        .filter((detail) => detail && detail.field === "copyright")
        .map(
          (detail) =>
            COPYRIGHT_API_MESSAGES[detail.code] ||
            detail.message ||
            "Ungültiger Wert"
        );
    },
    validate() {
      this.copyrightApiErrors = [];
      return true;
    },
    resetValidation() {
      this.copyrightApiErrors = [];
    },
  },
};
</script>

<style scoped></style>
