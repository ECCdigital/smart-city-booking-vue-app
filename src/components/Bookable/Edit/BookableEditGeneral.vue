<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import Tiptap from "@/components/Tiptap.vue";
import ChooseFile from "@/components/Files/ChooseFile.vue";
import debounce from "lodash/debounce";
import ApiEventService from "@/services/api/ApiEventService";
import AddressLookup from "@/components/commons/AddressLookup.vue";
import bookableExpertMode from "@/mixins/bookableExpertMode";

export default {
  name: "BookableEditGeneral",
  components: { AddressLookup, ChooseFile, Tiptap, BaseSection },
  mixins: [bookableExpertMode],
  props: { bookable: { type: Object, required: true } },
  data() {
    return {
      valid: false,
      tagsAvailable: [],
      flagsAvailable: [],
      events: [],
    };
  },
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this._emitDebounced(val);
      },
    },
    location: {
      get() {
        const loc = this.model.location;
        if (typeof loc === "string") {
          return {
            display_address: loc,
          };
        }

        return loc || { display_address: null, lat: null, lng: null };
      },
      set(value) {
        this.model.location = value;
      },
    },
  },
  created() {
    this._emitDebounced = debounce((val) => {
      this.$emit("update:bookable", { ...val });
    }, 200);
  },
  methods: {
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      this.$refs.form?.resetValidation();
    },
    async fetchEvents() {
      await ApiEventService.getEvents().then((result) => {
        console.log("Fetched events for bookable edit:", result);
        this.events = result?.data;
      });
    },
    removeTag(item) {
      const tags = this.model.tags || [];
      const index = tags.indexOf(item);
      if (index > -1) tags.splice(index, 1);
    },
    removeFlag(item) {
      const flags = this.model.flags || [];
      const index = flags.indexOf(item);
      if (index > -1) flags.splice(index, 1);
    },
  },
  watch: {
    "model.id": {
      immediate: true,
      handler() {
        if (this.model.type === "ticket") {
          this.fetchEvents();
        }
      },
    },
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Allgemein" icon="mdi-information-outline" />

    <v-card
      id="be-section-general-info"
      class="mb-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-information-outline</v-icon>
        <span class="text-h6 font-weight-bold">Allgemeine Informationen</span>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <v-row v-if="model.type === 'ticket'">
          <v-col cols="12">
            <v-select
              background-color="accent"
              filled
              dense
              clearable
              label="Veranstaltung"
              hide-details
              v-model="model.eventId"
              item-value="id"
              name="information.name"
              item-text="information.name"
              :items="events"
            ></v-select>
          </v-col>
        </v-row>

        <v-row :class="{ 'mt-2': model.type === 'ticket' }">
          <v-col cols="12">
            <v-text-field
              background-color="accent"
              filled
              dense
              label="Bezeichnung"
              hide-details
              v-model="model.title"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12">
            <ChooseFile
              v-model="model.imgUrl"
              :allow-protected="false"
              :tenant-id="model.tenantId"
              filled
              dense
              images-only
              label="Cover-Bild"
              background-color="accent"
              forced-subdirectory="rooms"
            />
          </v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12">
            <Tiptap
              v-model="model.description"
              label="Beschreibung"
              :min-height="220"
            ></Tiptap>
          </v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12">
            <AddressLookup v-model="location" label="Adresse"></AddressLookup>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card
      id="be-section-general-booker-info"
      class="mb-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-account-eye-outline</v-icon>
        <span class="text-h6 font-weight-bold">Informationen für Buchende</span>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <p class="mb-4 text-caption" style="max-width: 700px">
          Sichtbar für Personen, die dieses Objekt buchen — z.&nbsp;B. auf der
          Karte oder in der Detailansicht (WLAN, Barrierefreiheit, Bestuhlung).
        </p>
        <v-combobox
          v-model="model.flags"
          :items="flagsAvailable"
          label="Informationen für Buchende"
          hide-selected
          no-data-text="Noch keine Einträge"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          dense
          hide-details
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              small
              color="secondary"
              @click="select"
              @click:close="removeFlag(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-card-text>
    </v-card>

    <v-card
      v-if="expertMode"
      id="be-section-general-tags"
      class="mb-6 section-card"
      elevation="2"
      outlined
    >
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-tag-multiple-outline</v-icon>
        <span class="text-h6 font-weight-bold">Interne Tags</span>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <p class="mb-4 text-caption" style="max-width: 700px">
          Nur für die interne Verwaltung — zum Filtern und Gruppieren. Für
          Buchende nicht sichtbar.
        </p>
        <v-combobox
          v-model="model.tags"
          :items="tagsAvailable"
          label="Interne Tags"
          hide-selected
          no-data-text="Noch keine Tags"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          dense
          hide-details
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              small
              color="secondary"
              @click="select"
              @click:close="removeTag(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>
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
</style>
