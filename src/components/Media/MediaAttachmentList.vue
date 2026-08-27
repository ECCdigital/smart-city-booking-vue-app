<template>
  <div>
    <div v-if="attachments.length > 0">
      <v-list two-line class="py-0">
        <template v-for="(attachment, index) in attachments">
          <v-list-item
            :key="attachment.id"
            class="attachment-item elevation-1 mb-3 rounded"
            @click="toggleExpand(attachment.id)"
          >
            <v-list-item-avatar>
              <v-avatar :color="attachment.type ? 'primary' : 'grey'" size="40">
                <v-icon dark small>{{ getTypeIcon(attachment.type) }}</v-icon>
              </v-avatar>
            </v-list-item-avatar>

            <v-list-item-content>
              <v-list-item-title class="d-flex align-center">
                <span class="font-weight-medium">
                  {{ attachment.title || "Ohne Titel" }}
                </span>
                <v-chip
                  v-if="attachment.required"
                  x-small
                  color="red"
                  text-color="white"
                  class="ml-2"
                >
                  Pflicht
                </v-chip>
              </v-list-item-title>
              <v-list-item-subtitle class="d-flex align-center flex-wrap">
                <v-chip x-small class="mr-2">
                  {{ getTypeName(attachment.type) }}
                </v-chip>
                <v-icon
                  v-if="attachment.show"
                  x-small
                  color="success"
                  class="mr-1"
                >
                  mdi-eye
                </v-icon>
                <v-icon v-if="attachment.mailAttach" x-small color="primary">
                  mdi-email-outline
                </v-icon>
              </v-list-item-subtitle>
            </v-list-item-content>

            <v-list-item-action>
              <div class="d-flex align-center">
                <v-btn icon small @click.stop="remove(attachment.id)">
                  <v-icon small>mdi-delete-outline</v-icon>
                </v-btn>
                <v-btn icon small>
                  <v-icon>
                    {{
                      isExpanded(attachment.id)
                        ? "mdi-chevron-up"
                        : "mdi-chevron-down"
                    }}
                  </v-icon>
                </v-btn>
              </div>
            </v-list-item-action>
          </v-list-item>

          <v-expand-transition :key="`expand-${attachment.id}`">
            <v-card
              v-show="isExpanded(attachment.id)"
              flat
              class="mx-3 mb-3 pa-4 attachment-card"
              color="grey lighten-5"
            >
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="attachment.title"
                    dense
                    background-color="accent"
                    filled
                    label="Titel *"
                    hide-details="auto"
                    :rules="[(v) => !!v || 'Titel ist erforderlich']"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="attachment.type"
                    dense
                    background-color="accent"
                    filled
                    label="Typ *"
                    hide-details="auto"
                    :items="attachmentTypes"
                    item-text="name"
                    item-value="id"
                    :rules="[(v) => !!v || 'Typ ist erforderlich']"
                  ></v-select>
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12">
                  <MediaReferenceField
                    label="Datei *"
                    kind="document"
                    :scope="scope"
                    :value="referenceOf(attachment)"
                    :public-only="publicOnly"
                    :public-only-reason="publicOnlyReason"
                    empty-label="Keine Datei ausgewählt"
                    @input="setReference(attachment, $event)"
                  />
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="attachment.caption"
                    dense
                    background-color="accent"
                    filled
                    label="Beschreibung"
                    placeholder="Ich habe die Nutzungsbedingungen gelesen und akzeptiere sie."
                    hide-details
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-divider class="my-3"></v-divider>

              <v-row>
                <v-col cols="12" sm="4">
                  <v-switch
                    v-model="attachment.show"
                    dense
                    label="Im Buchungsprozess anzeigen"
                    hide-details
                    color="primary"
                  ></v-switch>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-switch
                    v-model="attachment.required"
                    dense
                    label="Muss akzeptiert werden"
                    hide-details
                    color="primary"
                  ></v-switch>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-switch
                    v-model="attachment.mailAttach"
                    dense
                    label="In E-Mail anhängen"
                    hide-details
                    color="primary"
                  ></v-switch>
                </v-col>
              </v-row>
            </v-card>
          </v-expand-transition>

          <v-divider
            v-if="index < attachments.length - 1"
            :key="`divider-${attachment.id}`"
            class="my-2"
          />
        </template>
      </v-list>
    </div>

    <div v-else class="text-center py-8">
      <v-icon large color="grey lighten-1" class="mb-2">
        mdi-file-outline
      </v-icon>
      <div class="text-h6 grey--text mb-2">Keine Anhänge vorhanden</div>
      <div class="text-body-2 grey--text text--darken-1 mb-4">
        Fügen Sie Dokumente wie Nutzungsbedingungen oder Anleitungen hinzu
      </div>
      <v-btn small text color="primary" @click="add">
        <v-icon left small>mdi-plus</v-icon>
        Ersten Anhang hinzufügen
      </v-btn>
    </div>
  </div>
</template>

<script>
import { v4 as uuidv4 } from "uuid";
import { MEDIA_SCOPE } from "@/services/api/ApiMediaService";
import MediaReferenceField from "@/components/Media/MediaReferenceField.vue";

const ATTACHMENT_TYPES = [
  { id: "agreement", name: "Nutzervereinbarung" },
  { id: "privacy-agreement", name: "Datenschutzerklärung" },
  { id: "user-manual", name: "Betriebsanleitung" },
  { id: "security-information", name: "Sicherheitshinweise" },
  { id: "product-information", name: "Produktinformationen" },
];

const TYPE_ICONS = {
  agreement: "mdi-file-document",
  "privacy-agreement": "mdi-shield-lock",
  "user-manual": "mdi-book-open-page-variant",
  "security-information": "mdi-alert-circle",
  "product-information": "mdi-information",
};

/**
 * The attachment list of a bookable or an event. Both carry the same shape
 * since §4.8 of the media spec: context fields at the usage site, the file
 * itself as a media reference.
 */
export default {
  name: "MediaAttachmentList",
  components: { MediaReferenceField },
  props: {
    value: { type: Array, default: () => [] },
    scope: { type: String, default: MEDIA_SCOPE.TENANT },
    publicOnly: { type: Boolean, default: false },
    publicOnlyReason: {
      type: String,
      default:
        "Dieses Objekt ist öffentlich sichtbar — interne Medien können hier nicht gespeichert werden.",
    },
  },
  data() {
    return {
      attachmentTypes: ATTACHMENT_TYPES,
      expandedItems: [],
    };
  },
  computed: {
    attachments() {
      return this.value || [];
    },
  },
  methods: {
    add() {
      const id = uuidv4();
      this.$emit("input", [
        ...this.attachments,
        {
          id,
          title: "",
          caption: "",
          type: "",
          // The file is a media reference; `url` stays for legacy attachments
          // the media import has not converted yet.
          reference: null,
          url: "",
          show: false,
          required: false,
          mailAttach: false,
        },
      ]);
      this.expandedItems.push(id);
    },
    remove(id) {
      this.$emit(
        "input",
        this.attachments.filter((attachment) => attachment.id !== id)
      );
      const index = this.expandedItems.indexOf(id);
      if (index > -1) this.expandedItems.splice(index, 1);
    },
    toggleExpand(id) {
      const index = this.expandedItems.indexOf(id);
      if (index > -1) {
        this.expandedItems.splice(index, 1);
      } else {
        this.expandedItems.push(id);
      }
    },
    isExpanded(id) {
      return this.expandedItems.includes(id);
    },
    /**
     * The file of an attachment. Legacy attachments hold a raw address in
     * `url` — it reads as an external reference until something is picked
     * here, and is dropped once it is, so both fields never disagree.
     */
    referenceOf(attachment) {
      return attachment.reference || attachment.url || null;
    },
    setReference(attachment, reference) {
      this.$set(attachment, "reference", reference);
      this.$set(attachment, "url", "");
    },
    getTypeIcon(type) {
      return TYPE_ICONS[type] || "mdi-file";
    },
    getTypeName(type) {
      return (
        ATTACHMENT_TYPES.find((item) => item.id === type)?.name ||
        type ||
        "Kein Typ"
      );
    },
  },
};
</script>

<style scoped>
.attachment-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme--dark .attachment-item {
  background-color: rgba(255, 255, 255, 0.05);
}

.attachment-card {
  border-radius: 8px !important;
}
</style>
