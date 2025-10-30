<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import ChooseFile from "@/components/Files/ChooseFile.vue";
import { v4 as uuidv4 } from "uuid";

export default {
  name: "BookableAttachmentsAttributes",
  components: { ChooseFile, BaseSection },
  props: {
    bookable: {
      type: Object,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      localBookable: { ...this.bookable },
      attachmentTypes: [
        {
          id: "agreement",
          name: "Nutzervereinbarung",
        },
        {
          id: "privacy-agreement",
          name: "Datenschutzerklärung",
        },
        {
          id: "user-manual",
          name: "Betriebsanleitung",
        },
        {
          id: "security-information",
          name: "Sicherheitshinweise",
        },
        {
          id: "product-information",
          name: "Produktinformationen",
        },
      ],
    };
  },
  watch: {
    bookable: {
      handler(v) {
        this.localBookable = { ...v };
      },
    },
  },
  methods: {
    emitUpdate() {
      this.$emit("update:bookable", this.localBookable);
    },
    removeAttachment(attachmentId) {
      this.localBookable.attachments = this.localBookable.attachments.filter(
        (attachment) => attachment.id !== attachmentId
      );
      this.emitUpdate();
    },
    addNewAttachment() {
      const newAttachment = {
        id: uuidv4(),
        title: "",
        caption: "",
        type: "",
        url: "",
      };
      this.localBookable.attachments.push(newAttachment);
      this.emitUpdate();
    },
  },
};
</script>

<template>
  <BaseSection title="Anhänge" icon="mdi-paperclip">
    <div
      v-for="(attachment, index) in localBookable.attachments"
      :key="attachment.id"
    >
      <v-card flat outlined rounded>
        <v-card-text>
          <v-row class="">
            <v-col class="col">
              <v-row>
                <v-col>
                  <v-text-field
                    dense
                    background-color="accent"
                    filled
                    label="Titel"
                    hide-details
                    v-model="attachment.title"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-select
                    dense
                    background-color="accent"
                    filled
                    label="Typ"
                    hide-details
                    v-model="attachment.type"
                    :items="attachmentTypes"
                    item-text="name"
                    item-value="id"
                  ></v-select>
                </v-col>
                <v-col>
                  <ChooseFile
                    v-model="attachment.url"
                    :allow-protected="false"
                    :tenant-id="tenantId"
                    filled
                    label="Datei"
                    background-color="accent"
                    forced-subdirectory="agreements"
                  />
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    dense
                    background-color="accent"
                    filled
                    label="Beschreibung"
                    placeholder="Ich habe die Nutzungsbedingungen gelesen und akzeptiere sie."
                    hide-details
                    v-model="attachment.caption"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-switch
                    dense
                    label="Im Buchungsprozess anzeigen"
                    hide-details
                    v-model="attachment.show"
                  ></v-switch>
                </v-col>
                <v-col>
                  <v-switch
                    dense
                    label="Muss vom Nutzer akzeptiert werden"
                    hide-details
                    v-model="attachment.required"
                  ></v-switch>
                </v-col>
              </v-row>
            </v-col>
            <v-col class="col-auto">
              <v-btn icon small @click="removeAttachment(attachment.id)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      <v-divider
        class="my-5"
        v-if="index < localBookable.attachments.length - 1"
        :key="`divider-${index}`"
      />
    </div>

    <v-row>
      <v-col class="col-auto">
        <v-btn outlined class="mt-2" @click="addNewAttachment()"
          >Neuer Anhang</v-btn
        >
      </v-col>
    </v-row>
  </BaseSection>
</template>

<style scoped></style>
