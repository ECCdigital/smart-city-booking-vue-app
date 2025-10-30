<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import ChooseFile from "@/components/Files/ChooseFile.vue";
import Tiptap from "@/components/Tiptap.vue";
import ApiTagsService from "@/services/api/ApiTagsService";

export default {
  name: "BookableGeneralAttributes",
  props: {
    tenantId: {
      type: String,
      required: true,
    },
    events: {
      type: Array,
      required: false,
      default: () => [],
    },
    bookable: {
      type: Object,
      required: true,
    },
  },
  components: { Tiptap, ChooseFile, BaseSection },
  data() {
    return {
      localBookable: { ...this.bookable },
      bookableTypes: [
        {
          title: "Veranstaltungsort",
          key: "event-location",
        },
        {
          title: "Raum",
          key: "room",
        },
        {
          title: "Resource",
          key: "resource",
        },
        {
          title: "Ticket",
          key: "ticket",
        },
      ],
      tagsAvailable: [],
      flagsAvailable: [],
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
    removeTags(tag) {
      const index = this.localBookable.tags.indexOf(tag);
      if (index > -1) {
        this.localBookable.tags.splice(index, 1);
      }
    },
    removeFlags(flag) {
      const index = this.localBookable.flags.indexOf(flag);
      if (index > -1) {
        this.localBookable.flags.splice(index, 1);
      }
    },
    async fetchAvailableTags() {
      try {
        const response = await ApiTagsService.getTags(this.tenantId);
        this.tagsAvailable = response.data;
      } catch (error) {
        this.tagsAvailable = [];
      }
    },
  },
  mounted() {
    this.fetchAvailableTags();
    // Fetch available flags similarly if needed
  },
};
</script>

<template>
  <BaseSection title="Allgemein" icon="mdi-information-outline">
    <v-row>
      <v-col>
        <v-select
          background-color="accent"
          filled
          label="Typ"
          hide-details
          v-model="localBookable.type"
          :items="bookableTypes"
          item-text="title"
          item-value="key"
          disabled
        ></v-select>
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          label="Mandant ID"
          hide-details
          disabled
          v-model="localBookable.tenantId"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row v-if="localBookable.type === 'ticket'">
      <v-col>
        <v-select
          background-color="accent"
          filled
          label="Veranstaltung"
          hide-details
          v-model="localBookable.eventId"
          item-value="id"
          name="information.name"
          item-text="information.name"
          :items="events"
          @change="emitUpdate"
        ></v-select>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          label="Bezeichnung"
          hide-details
          v-model="localBookable.title"
          @input="emitUpdate"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <ChooseFile
          v-model="localBookable.imgUrl"
          :allow-protected="false"
          :tenant-id="localBookable.tenantId"
          filled
          images-only
          label="Cover-Bild"
          background-color="accent"
          forced-subdirectory="rooms"
          @input="emitUpdate"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <Tiptap
          v-model="localBookable.description"
          label="Beschreibung"
          @input="emitUpdate"
        ></Tiptap>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          label="Ort"
          hide-details
          v-model="localBookable.location"
          @input="emitUpdate"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-combobox
          v-model="localBookable.tags"
          :items="tagsAvailable"
          label="Tags"
          hide-selected
          no-data-text="Keine Tags angelegt"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          @input="emitUpdate"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="removeTags(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
      <v-col>
        <v-combobox
          v-model="localBookable.flags"
          :items="flagsAvailable"
          label="Flags"
          hide-selected
          no-data-text="Keine Flags angelegt"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          @input="emitUpdate"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="removeFlags(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<style scoped></style>
