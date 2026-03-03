<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import { v4 as uuidv4 } from "uuid";
import ChooseFile from "@/components/Files/ChooseFile.vue";
import { mapGetters } from "vuex";

export default {
  name: "BookableEditAttachments",
  components: { ChooseFile, BaseSection },
  props: {
    bookable: { type: Object, required: true },
  },
  data() {
    return {
      valid: true,
      attachmentTypes: [
        { id: "agreement", name: "Nutzervereinbarung" },
        { id: "privacy-agreement", name: "Datenschutzerklärung" },
        { id: "user-manual", name: "Betriebsanleitung" },
        { id: "security-information", name: "Sicherheitshinweise" },
        { id: "product-information", name: "Produktinformationen" },
      ],
      expandedItems: [],
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
    hasAttachments() {
      return this.model.attachments && this.model.attachments.length > 0;
    },
  },
  methods: {
    addNewAttachment() {
      if (!this.model.attachments) {
        this.model.attachments = [];
      }
      const newId = uuidv4();
      this.model.attachments.push({
        id: newId,
        title: "",
        caption: "",
        type: "",
        url: "",
        show: false,
        required: false,
        mailAttach: false,
      });
      this.expandedItems.push(newId);
    },
    removeAttachment(id) {
      this.model.attachments = this.model.attachments.filter(
        (attachment) => attachment.id !== id
      );
      const idx = this.expandedItems.indexOf(id);
      if (idx > -1) this.expandedItems.splice(idx, 1);
    },
    toggleExpand(id) {
      const idx = this.expandedItems.indexOf(id);
      if (idx > -1) {
        this.expandedItems.splice(idx, 1);
      } else {
        this.expandedItems.push(id);
      }
    },
    isExpanded(id) {
      return this.expandedItems.includes(id);
    },
    getTypeIcon(type) {
      const icons = {
        agreement: "mdi-file-document",
        "privacy-agreement": "mdi-shield-lock",
        "user-manual": "mdi-book-open-page-variant",
        "security-information": "mdi-alert-circle",
        "product-information": "mdi-information",
      };
      return icons[type] || "mdi-file";
    },
    getTypeName(type) {
      const found = this.attachmentTypes.find((t) => t.id === type);
      return found ? found.name : type || "Kein Typ";
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Anhänge" icon="mdi-paperclip" />

    <v-card class="mb-6 section-card" elevation="2" outlined>
      <v-card-title
        class="section-header pa-4 d-flex justify-space-between align-center"
      >
        <div>
          <v-icon class="mr-2">mdi-paperclip</v-icon>
          <span class="text-h6 font-weight-bold">Anhänge verwalten</span>
        </div>
        <v-btn small color="primary" @click="addNewAttachment()">
          <v-icon left small>mdi-plus</v-icon>
          Hinzufügen
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <div v-if="hasAttachments">
          <v-list two-line class="py-0">
            <template v-for="(attachment, index) in model.attachments">
              <v-list-item
                :key="attachment.id"
                class="attachment-item elevation-1 mb-3 rounded"
                @click="toggleExpand(attachment.id)"
              >
                <v-list-item-avatar>
                  <v-avatar
                    :color="attachment.type ? 'primary' : 'grey'"
                    size="40"
                  >
                    <v-icon dark small>
                      {{ getTypeIcon(attachment.type) }}
                    </v-icon>
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
                    <v-icon
                      v-if="attachment.mailAttach"
                      x-small
                      color="primary"
                    >
                      mdi-email-outline
                    </v-icon>
                  </v-list-item-subtitle>
                </v-list-item-content>

                <v-list-item-action>
                  <div class="d-flex align-center">
                    <v-btn
                      icon
                      small
                      @click.stop="removeAttachment(attachment.id)"
                      color="error"
                    >
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
                  class="mx-3 mb-3 pa-4"
                  color="grey lighten-5"
                >
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        dense
                        background-color="white"
                        filled
                        label="Titel *"
                        hide-details="auto"
                        v-model="attachment.title"
                        :rules="[(v) => !!v || 'Titel ist erforderlich']"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        dense
                        background-color="white"
                        filled
                        label="Typ *"
                        hide-details="auto"
                        v-model="attachment.type"
                        :items="attachmentTypes"
                        item-text="name"
                        item-value="id"
                        :rules="[(v) => !!v || 'Typ ist erforderlich']"
                      ></v-select>
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col cols="12">
                      <ChooseFile
                        v-model="attachment.url"
                        :allow-protected="false"
                        :tenant-id="tenantId"
                        filled
                        label="Datei *"
                        background-color="white"
                        forced-subdirectory="agreements"
                        hide-details="auto"
                        :rules="[(v) => !!v || 'Datei ist erforderlich']"
                      />
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col cols="12">
                      <v-text-field
                        dense
                        background-color="white"
                        filled
                        label="Beschreibung"
                        placeholder="Ich habe die Nutzungsbedingungen gelesen und akzeptiere sie."
                        hide-details
                        v-model="attachment.caption"
                      ></v-text-field>
                    </v-col>
                  </v-row>

                  <v-divider class="my-3"></v-divider>

                  <v-row>
                    <v-col cols="12" sm="4">
                      <v-switch
                        dense
                        label="Im Buchungsprozess anzeigen"
                        hide-details
                        v-model="attachment.show"
                        color="primary"
                      ></v-switch>
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-switch
                        dense
                        label="Muss akzeptiert werden"
                        hide-details
                        v-model="attachment.required"
                        color="primary"
                      ></v-switch>
                    </v-col>
                    <v-col cols="12" sm="4">
                      <v-switch
                        dense
                        label="In E-Mail anhängen"
                        hide-details
                        v-model="attachment.mailAttach"
                        color="primary"
                      ></v-switch>
                    </v-col>
                  </v-row>
                </v-card>
              </v-expand-transition>

              <v-divider
                v-if="index < model.attachments.length - 1"
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
          <v-btn small text color="primary" @click="addNewAttachment">
            <v-icon left small>mdi-plus</v-icon>
            Ersten Anhang hinzufügen
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-form>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.section-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}

.theme--dark .section-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}

.attachment-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme--dark .attachment-item {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
