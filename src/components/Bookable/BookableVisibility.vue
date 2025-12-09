<script>
export default {
  name: "BookableVisibility",
  props: {
    bookable: {
      type: Object,
      required: true,
    },
    allowPublic: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      localBookable: { ...this.bookable },
    };
  },
  methods: {
    emitUpdate() {
      this.$emit("update:bookable", this.localBookable);
    },
  },
};
</script>

<template>
  <div>
    <div class="px-3 pt-2 pb-1">Veröffentlichung & Buchbarkeit</div>
    <v-divider />

    <v-list dense class="py-0">
      <v-list-item class="py-1">
        <v-list-item-content class="mr-2">
          <div class="d-flex align-center">
            <v-icon x-small class="mr-2" color="primary">
              mdi-clipboard-check-outline
            </v-icon>
            <span class="text-body-2">Automatisch freigeben</span>
          </div>
        </v-list-item-content>

        <v-list-item-action class="my-0">
          <v-switch
            hide-details
            v-model="localBookable.autoCommitBooking"
            :aria-label="'Automatisch freigeben'"
            @change="emitUpdate()"
          />
        </v-list-item-action>
      </v-list-item>

      <v-list-item class="py-1">
        <v-list-item-content class="mr-2">
          <div class="d-flex align-center">
            <v-icon x-small class="mr-2" color="primary">
              mdi-calendar-check
            </v-icon>
            <span class="text-body-2">Buchbar</span>
          </div>
        </v-list-item-content>

        <v-list-item-action class="my-0">
          <v-switch
            hide-details
            v-model="localBookable.isBookable"
            :aria-label="'Buchbar'"
            @change="emitUpdate()"
          />
        </v-list-item-action>
      </v-list-item>

      <v-list-item class="py-1">
        <v-list-item-content class="mr-2">
          <div class="d-flex align-center">
            <v-icon
              x-small
              class="mr-2"
              :color="allowPublic ? 'primary' : 'grey'"
            >
              mdi-eye
            </v-icon>
            <span class="text-body-2">Sichtbar</span>
            <v-tooltip bottom v-if="!allowPublic">
              <template v-slot:activator="{ on }">
                <v-icon x-small class="ml-1" color="warning" v-on="on">
                  mdi-alert-circle-outline
                </v-icon>
              </template>
              <span>Maximale Anzahl öffentlicher Objekte erreicht.</span>
            </v-tooltip>
          </div>
        </v-list-item-content>

        <v-list-item-action class="my-0">
          <v-switch
            hide-details
            :disabled="!allowPublic"
            v-model="localBookable.isPublic"
            :aria-label="'Sichtbar'"
            @change="emitUpdate()"
          />
        </v-list-item-action>
      </v-list-item>
    </v-list>
  </div>
</template>

<style scoped></style>
