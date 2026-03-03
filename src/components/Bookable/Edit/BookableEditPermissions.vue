<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import ApiRolesService from "@/services/api/ApiRolesService";

export default {
  name: "BookableEditPermissions",
  components: { BaseSection },
  props: { bookable: { type: Object, required: true } },
  data() {
    return {
      valid: true,
      availableUsers: [],
      availableRoles: [],
    };
  },
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this.$emit("update:bookable", { ...val });
      },
    },
  },
  methods: {
    removePermittedUser(item) {
      this.model.permittedUsers.splice(
        this.model.permittedUsers.indexOf(item),
        1
      );
    },
    removePermittedRole(item) {
      this.model.permittedRoles.splice(
        this.model.permittedRoles.indexOf(item),
        1
      );
    },
    removeFreeBookingUser(item) {
      this.model.freeBookingUsers.splice(
        this.model.freeBookingUsers.indexOf(item),
        1
      );
    },
    removeGroupBookingRole(item) {
      this.model.permittedGroupBookingRoles.splice(
        this.model.permittedGroupBookingRoles.indexOf(item),
        1
      );
    },
    removeFreeBookingRole(item) {
      this.model.freeBookingRoles.splice(
        this.model.freeBookingRoles.indexOf(item),
        1
      );
    },
    async fetchRoles() {
      await ApiRolesService.getTenantRoles(true).then((result) => {
        this.availableRoles = result?.data;
      });
    },
  },
  mounted() {
    this.fetchRoles();
  },
};
</script>

<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Berechtigungen" icon="mdi-account-lock-outline">
    </BaseSection>
    <v-card class="mb-6 section-card" elevation="2" outlined>
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-account-lock-outline</v-icon>
        <span class="text-h6 font-weight-bold"
          >Individuelle Berechtigungen</span
        >
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <div class="info-label mb-3">
          <v-icon small class="mr-2">mdi-account-multiple</v-icon>
          Verfügbar für Benutzer
        </div>
        <p class="mb-3 text-caption">
          Berechtigen Sie <strong>bestimmte Benutzer</strong>, dieses Objekt zu
          sehen. Werden keine Benutzer explizit zur Ansicht berechtigt, bleibt
          dieses Buchungsobjekt für öffentlich einsehbar.
        </p>
        <v-combobox
          v-model="model.permittedUsers"
          :items="availableUsers"
          label="Verfügbar für Benutzer"
          hide-selected
          no-data-text="Keine Benutzer verfügbar"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          dense
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              small
              color="secondary"
              @click="select"
              @click:close="removePermittedUser(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>

        <div class="info-label mb-3 mt-5">
          <v-icon small class="mr-2">mdi-account-group</v-icon>
          Verfügbar für Rollen
        </div>
        <p class="mb-3 text-caption">
          Berechtigen Sie <strong>alle Benutzer einer Rolle</strong>, dieses
          Objekt zu sehen. Werden keine Benutzer explizit zur Ansicht
          berechtigt, bleibt dieses Buchungsobjekt öffentlich einsehbar.
        </p>
        <v-combobox
          v-model="model.permittedRoles"
          :items="availableRoles"
          label="Verfügbar für Rollen"
          item-text="name"
          item-value="id"
          hide-selected
          no-data-text="Keine Rollen verfügbar"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          dense
          :return-object="false"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              small
              color="secondary"
              @click="select"
              @click:close="removePermittedRole(item)"
            >
              <strong>{{
                availableRoles.find((r) => r.id === item)?.name
              }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-card-text>
    </v-card>

    <v-card class="mb-6 section-card" elevation="2" outlined>
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-ticket-percent-outline</v-icon>
        <span class="text-h6 font-weight-bold">Kostenfreie Buchungen</span>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <div class="info-label mb-3">
          <v-icon small class="mr-2">mdi-account-multiple</v-icon>
          Kostenfrei für Benutzer
        </div>
        <p class="mb-3 text-caption">
          Berechtigen Sie Nutzer dieses Objekt kostenfrei zu buchen.
        </p>
        <v-combobox
          v-model="model.freeBookingUsers"
          :items="availableUsers"
          label="Kostenfrei für Benutzer"
          hide-selected
          no-data-text="Keine Benutzer verfügbar"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          dense
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              small
              color="secondary"
              @click="select"
              @click:close="removeFreeBookingUser(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>

        <div class="info-label mb-3 mt-5">
          <v-icon small class="mr-2">mdi-account-group</v-icon>
          Kostenfrei für Rollen
        </div>
        <p class="mb-3 text-caption">
          Berechtigen Sie <strong>alle Benutzer einer Rolle</strong>, dieses
          Objekt kostenfrei zu buchen.
        </p>
        <v-combobox
          v-model="model.freeBookingRoles"
          :items="availableRoles"
          label="Kostenfrei für Rollen"
          item-text="name"
          item-value="id"
          hide-selected
          no-data-text="Keine Rollen verfügbar"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          dense
          :return-object="false"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              small
              color="secondary"
              @click="select"
              @click:close="removeFreeBookingRole(item)"
            >
              <strong>{{
                availableRoles.find((r) => r.id === item)?.name
              }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-card-text>
    </v-card>

    <v-card class="mb-6 section-card" elevation="2" outlined>
      <v-card-title class="section-header pa-4">
        <v-icon class="mr-2">mdi-calendar-multiple</v-icon>
        <span class="text-h6 font-weight-bold">Serienbuchungen</span>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <v-row>
          <v-col cols="12">
            <v-switch
              dense
              label="Serienbuchung erlauben"
              hide-details
              v-model="model.allowGroupBooking"
            ></v-switch>
          </v-col>
        </v-row>
        <p class="mb-3 mt-5 text-caption" style="max-width: 700px">
          Serienbuchungen ermöglichen es Benutzern, mehrere Termine in einer
          Buchungsserie zusammenzufassen. Dadurch können z.B. wöchentliche
          Meetings oder Kurse mit mehreren Terminen einfacher gebucht und
          verwaltet werden.
        </p>
        <v-row v-if="model.allowGroupBooking" class="mt-4">
          <v-col cols="12">
            <v-alert color="info" dense text class="mb-4">
              <div class="d-flex align-center">
                <v-icon class="mr-3" color="info">
                  mdi-information-outline
                </v-icon>
                <div>
                  <strong>Hinweis:</strong>
                  Sie können die Möglichkeit zur Erstellung von Buchungsserien
                  weiter einschränken, indem Sie nur bestimmten Rollen die
                  Berechtigung dazu erteilen. Benutzer ohne diese Berechtigung
                  können weiterhin einzelne Termine buchen, aber keine Serien
                  erstellen.
                </div>
              </div>
            </v-alert>

            <v-combobox
              v-model="model.permittedGroupBookingRoles"
              :items="availableRoles"
              label="Rollen, die eine Buchungsserie erstellen dürfen"
              item-text="name"
              item-value="id"
              hide-selected
              no-data-text="Keine Rollen verfügbar"
              multiple
              background-color="accent"
              clearable
              chips
              filled
              dense
              :return-object="false"
            >
              <template v-slot:selection="{ attrs, item, select, selected }">
                <v-chip
                  v-bind="attrs"
                  :input-value="selected"
                  close
                  small
                  color="secondary"
                  @click="select"
                  @click:close="removeGroupBookingRole(item)"
                >
                  <strong>{{
                    availableRoles.find((r) => r.id === item)?.name
                  }}</strong>
                </v-chip>
              </template>
            </v-combobox>
          </v-col>
        </v-row>
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
