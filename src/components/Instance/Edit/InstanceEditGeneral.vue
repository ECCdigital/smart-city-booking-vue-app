<template>
  <BaseSection
    title="Allgemeine Informationen"
    icon="mdi-home"
    hint="Kontaktangaben zu Ihrer Instanz"
  >
    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          label="Kontaktadresse"
          placeholder="Muster Amt, Musterstraße 1, 12345 Musterstadt"
          v-model="local.contactAddress"
          @input="emitUpdate"
        />
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          dense
          placeholder="example.com"
          label="Webseite"
          v-model="local.contactUrl"
          @input="emitUpdate"
        />
      </v-col>
    </v-row>

    <v-subheader class="px-0">Rechtsdokumente</v-subheader>
    <p class="caption grey--text mb-4">
      Hinterlegen Sie je Dokument entweder einen externen Link oder laden Sie
      eine Datei über den Datei-Manager hoch.
    </p>

    <v-row>
      <v-col cols="12" md="4" v-for="field in legalFields" :key="field.key">
        <ChooseFile
          :label="field.label"
          background-color="accent"
          :filled="true"
          :allow-protected="false"
          forced-subdirectory="legal"
          :value="local[field.key].url"
          @input="onLegalInput(field.key, $event)"
        />
        <div
          class="caption grey--text mt-1"
          v-if="local[field.key].source === 'file' && local[field.key].fileName"
        >
          <v-icon x-small class="mr-1">mdi-file</v-icon>
          {{ local[field.key].fileName }}
        </div>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import ChooseFile from "@/components/Files/ChooseFile.vue";

const LEGAL_KEYS = ["dataProtection", "legalNotice", "termsAndConditions"];

function emptyLegalField() {
  return { source: "url", url: "", fileName: "" };
}

export default {
  name: "InstanceEditGeneral",
  components: { BaseSection, ChooseFile },
  props: {
    instance: { type: Object, required: true },
  },
  data() {
    return {
      local: this.withLegalDefaults(this.instance),
      legalFields: [
        { key: "dataProtection", label: "Datenschutz" },
        { key: "legalNotice", label: "Impressum" },
        { key: "termsAndConditions", label: "AGB" },
      ],
    };
  },
  watch: {
    instance: {
      handler(n) {
        this.local = this.withLegalDefaults(n);
      },
      deep: true,
    },
  },
  methods: {
    withLegalDefaults(instance) {
      const next = { ...instance };

      delete next.dataProtectionUrl;
      delete next.legalNoticeUrl;

      LEGAL_KEYS.forEach((key) => {
        const existing = instance && instance[key];
        next[key] = {
          ...emptyLegalField(),
          ...(existing || {}),
        };
      });

      return next;
    },
    deriveLegalField(url) {
      if (!url) return emptyLegalField();

      const base = process.env.VUE_APP_SERVER_BASE_URL;
      const isFile = !!base && url.startsWith(base);
      if (!isFile) {
        return { source: "url", url, fileName: "" };
      }

      let fileName = "";
      try {
        const parsed = new URL(url);
        const name = parsed.searchParams.get("name") || "";
        fileName = decodeURIComponent(name.split("/").pop() || "");
      } catch (e) {
        fileName = decodeURIComponent(url.split("/").pop() || "");
      }

      return { source: "file", url, fileName };
    },
    onLegalInput(key, url) {
      this.local = {
        ...this.local,
        [key]: this.deriveLegalField(url),
      };
      this.emitUpdate();
    },
    emitUpdate() {
      this.$emit("update:instance", { ...this.local });
    },
    validate() {
      // minimal validation, could be extended
      return true;
    },
    resetValidation() {
      // placeholder for child validation reset
    },
  },
};
</script>

<style scoped></style>
