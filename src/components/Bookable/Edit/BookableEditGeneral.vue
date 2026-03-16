<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import Tiptap from "@/components/Tiptap.vue";
import ChooseFile from "@/components/Files/ChooseFile.vue";
import debounce from "lodash/debounce";
import ApiEventService from "@/services/api/ApiEventService";
import AddressLookup from "@/components/commons/AddressLookup.vue";

export default {
  name: "BookableEditGeneral",
  components: { AddressLookup, ChooseFile, Tiptap, BaseSection },
  props: { bookable: { type: Object, required: true } },
  data() {
    {
      return {
        valid: false,
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
        events: [],
      };
    }
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
    <BaseSection
      title="Allgemeine Informationen"
      icon="mdi-information-outline"
    >
      <v-row>
        <v-col cols="12" md="6">
          <v-select
            background-color="accent"
            filled
            dense
            label="Typ"
            hide-details
            v-model="model.type"
            :items="bookableTypes"
            item-text="title"
            item-value="key"
            disabled
          ></v-select>
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            background-color="accent"
            filled
            dense
            label="Mandant"
            hide-details
            disabled
            v-model="model.tenantId"
          ></v-text-field>
        </v-col>
      </v-row>

      <v-row v-if="model.type === 'ticket'" class="mt-2">
        <v-col cols="12">
          <v-select
            background-color="accent"
            filled
            dense
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

      <v-row class="mt-2">
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
          <Tiptap v-model="model.description" label="Beschreibung"></Tiptap>
        </v-col>
      </v-row>

      <v-row class="mt-2">
        <v-col cols="12">
          <AddressLookup
            v-model="location"
            label="Adresse"
          ></AddressLookup>
        </v-col>
      </v-row>
    </BaseSection>
  </v-form>
</template>

<style scoped></style>
