<script>
import BaseSection from "@/components/commons/BaseSection.vue";

export default {
  name: "BookableSeriesAttributes",
  components: { BaseSection },
  props: {
    bookable: {
      type: Object,
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
    removeGroupBookingRole(item) {
      this.localBookable.groupBooking.permittedRoles.splice(
        this.localBookable.groupBooking.permittedRoles.indexOf(item),
        1
      );
    },
  },
};
</script>

<template>
  <BaseSection title="Serienbuchungen" icon="mdi-repeat">
    <v-row>
      <v-col class="col-auto">
        <v-switch
          dense
          label="Serienbuchung erlauben"
          hide-details
          v-model="localBookable.groupBooking.enabled"
        ></v-switch>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <p>
          Berechtigen Sie <strong>alle Benutzer einer Rolle</strong>, die für
          diese Objekt eine Buchungsserie erstellen dürfen
        </p>
        <v-combobox
          v-model="localBookable.groupBooking.permittedRoles"
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
  </BaseSection>
</template>

<style scoped></style>
