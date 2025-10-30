<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "BookablePermissionsAttributes",
  components: { BaseSection },
  props: {
    bookable: {
      type: Array,
      required: true,
    },
    availableUsers: {
      type: Array,
      required: true,
    },
    availableRoles: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      localBookable: { ...this.bookable },
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
    removePermittedUser(item) {
      this.localBookable.permittedUsers.splice(
        this.localBookable.permittedUsers.indexOf(item),
        1
      );
    },
    removePermittedRole(item) {
      this.localBookable.permittedRoles.splice(
        this.localBookable.permittedRoles.indexOf(item),
        1
      );
    },
    removeFreeBookingUser(item) {
      this.localBookable.freeBookingUsers.splice(
        this.localBookable.freeBookingUsers.indexOf(item),
        1
      );
    },
    removeFreeBookingRole(item) {
      this.localBookable.freeBookingRoles.splice(
        this.localBookable.freeBookingRoles.indexOf(item),
        1
      );
    },
  },
};
</script>

<template>
  <BaseSection title="Berechtigungen" icon="mdi-lock">

    <h3 class="">Ansichtsberechtigungen</h3>

    <v-row>
      <v-col>
        <p>
          Berechtigen Sie <strong>bestimmte Benutzer</strong>, dieses Objekt zu
          sehen. Werden keine Benutzer explizit zur Ansicht berechtigt, bleibt
          dieses Buchungsobjekt für öffentlich einsehbar.
        </p>

        <v-combobox
          v-model="localBookable.permittedUsers"
          :items="availableUsers"
          label="Verfügbar für Benutzer"
          hide-selected
          no-data-text="Keine Benutzer verfügbar"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          @change="emitUpdate"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="removePermittedUser(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <p>
          Berechtigen Sie <strong>alle Benutzer einer Rolle</strong>, dieses
          Objekt zu sehen. Werden keine Benutzer explizit zur Ansicht
          berechtigt, bleibt dieses Buchungsobjekt öffentlich einsehbar.
        </p>

        <v-combobox
          v-model="this.localBookable.permittedRoles"
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
          :return-object="false"
          @change="emitUpdate"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
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
      </v-col>
    </v-row>

    <h3 class="mt-10">Kostenfreie Buchungen</h3>
    <v-row>
      <v-col>
        <p>Berechtigen Sie Nutzer dieses Objekt kostenfrei zu buchen.</p>

        <v-combobox
          v-model="localBookable.freeBookingUsers"
          :items="availableUsers"
          label="Kostenfrei für Benutzer"
          hide-selected
          no-data-text="Keine Benutzer verfügbar"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          @change="emitUpdate"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="removeFreeBookingUser(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <p>
          Berechtigen Sie <strong>alle Benutzer einer Rolle</strong>, dieses
          Objekt kostenfrei zu buchen.
        </p>

        <v-combobox
          v-model="localBookable.freeBookingRoles"
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
          :return-object="false"
          @change="emitUpdate"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
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
      </v-col>
    </v-row>
  </BaseSection>
</template>

<style scoped></style>
