<template>
  <v-row>
    <v-col cols="12">
      <validation-observer ref="observer" v-slot="{ invalid }">
        <v-container>
          <v-row class="pa-2">
            <v-col cols="12">
              <h4 class="title">Informationen</h4>
              <validation-provider
                v-slot="{ errors }"
                name="Name der Veranstaltung*"
                rules="required"
              >
                <v-text-field
                  v-model="name"
                  background-color="accent"
                  filled
                  label="Name der Veranstaltung*"
                  :error-messages="errors"
                  required
                ></v-text-field>
              </validation-provider>
            </v-col>

            <v-col cols="12">
              <ChooseFile
                :tenant-id="tenantId"
                v-model="teaserImage"
                background-color="accent"
                label="Titelbild der Veranstaltung"
                images-only
                filled
                forced-subdirectory="events"

              ></ChooseFile>
            </v-col>

            <v-col cols="12">
              <Tiptap label="Kurzbeschreibung" v-model="teaserText"></Tiptap>
            </v-col>

            <v-col cols="12">
              <Tiptap label="Beschreibung" v-model="description"></Tiptap>
            </v-col>
            <v-col cols="12" md="6">
              <v-combobox
                v-model="eventTags"
                :items="api.tags"
                label="Tags"
                hide-selected
                no-data-text="Keine Tags angelegt"
                multiple
                background-color="accent"
                clearable
                chips
                filled
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
            <v-col cols="12" md="6">
              <v-combobox
                v-model="eventFlags"
                :items="eventFlags"
                label="Flags"
                no-data-text="Keine Flags angelegt"
                background-color="accent"
                multiple
                filled
                hide-selected
                clearable
                chips
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

            <v-col cols="12">
              <h4 class="title">Zeitraum</h4>
            </v-col>
            <v-col cols="12" md="6">
              <validation-provider
                v-slot="{ errors }"
                name="Startdatum"
                rules="required"
              >
                <v-text-field
                  filled
                  v-model="startDate"
                  background-color="accent"
                  :error-messages="errors"
                  label="Startdatum*"
                  type="date"
                  required
                ></v-text-field>
              </validation-provider>
            </v-col>

            <v-col cols="12" md="6">
              <validation-provider
                v-slot="{ errors }"
                name="Startdatum"
                rules="required"
              >
                <v-text-field
                  filled
                  :disabled="!startDate"
                  v-model="startTime"
                  background-color="accent"
                  label="Startuhrzeit*"
                  :error-messages="errors"
                  type="time"
                  required
                ></v-text-field>
              </validation-provider>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                filled
                v-model="endDate"
                background-color="accent"
                label="Enddatum*"
                type="date"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                filled
                v-model="endTime"
                :disabled="!endDate"
                background-color="accent"
                label="Enduhrzeit*"
                type="time"
              ></v-text-field>
            </v-col>
            <v-col class="col-12 text-subtitle-2">*Pflichtfelder</v-col>
          </v-row>
        </v-container>
        <Pager :invalid="invalid" />
      </validation-observer>
    </v-col>
  </v-row>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import { required, email, max } from "vee-validate/dist/rules";
import {
  extend,
  ValidationObserver,
  ValidationProvider,
  setInteractionMode,
} from "vee-validate";
import Pager from "@/components/Events/Form/Pager";
import ApiEventService from "@/services/api/ApiEventService";
import Tiptap from "@/components/Tiptap";
import ChooseFile from "@/components/Files/ChooseFile.vue";

setInteractionMode("eager");

extend("required", {
  ...required,
  message: "{_field_} muss ausgefüllt sein.",
});

extend("email", {
  ...email,
  message: "E-Mail ist ungültig.",
});

extend("max", {
  ...max,
  message:
    "{_field_} Die Anzahl an Zeichen darf nicht größer als {length} sein.",
});

export default {
  data() {
    return {
      api: {
        tags: [],
      },
    };
  },
  components: {
    ChooseFile,
    ValidationProvider,
    ValidationObserver,
    Pager,
    Tiptap,
  },
  methods: {
    ...mapActions({
      updateValue: "events/updateForm",
    }),
    removeFlags(item) {
      this.flags.splice(this.flags.indexOf(item), 1);
    },
    removeTags(item) {
      this.eventTags.splice(this.eventTags.indexOf(item), 1);
    },
    fetchTags() {
      ApiEventService.getTags()
        .then((response) => {
          this.api.tags = response.data;
        })
        .catch((error) => {
          console.log(error);
        });
    },
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    name: {
      get() {
        return this.$store.state.events.form.information.name;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "name",
          value: value,
        });
      },
    },
    teaserText: {
      get() {
        return this.$store.state.events.form.information.teaserText;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "teaserText",
          value: value,
        });
      },
    },
    description: {
      get() {
        return this.$store.state.events.form.information.description;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "description",
          value: value,
        });
      },
    },
    teaserImage: {
      get() {
        return this.$store.state.events.form.information.teaserImage;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "teaserImage",
          value: value,
        });
      },
    },
    eventFlags: {
      get() {
        return this.$store.state.events.form.information.flags;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "flags",
          value: value,
        });
      },
    },
    eventTags: {
      get() {
        return this.$store.state.events.form.information.tags;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "tags",
          value: value,
        });
      },
    },
    startDate: {
      get() {
        return this.$store.state.events.form.information.startDate;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "startDate",
          value: value,
        });
      },
    },
    startTime: {
      get() {
        return this.$store.state.events.form.information.startTime;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "startTime",
          value: value,
        });
      },
    },
    endDate: {
      get() {
        return this.$store.state.events.form.information.endDate;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "endDate",
          value: value,
        });
      },
    },
    endTime: {
      get() {
        return this.$store.state.events.form.information.endTime;
      },
      set(value) {
        this.updateValue({
          parent: "information",
          field: "endTime",
          value: value,
        });
      },
    },
    ...mapGetters({
      form: "events/form",
    }),
  },
  created() {
    this.fetchTags();
  },
};
</script>

<style scoped></style>
