<template>
  <v-dialog :value="open" max-width="600" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-avatar color="warning" size="48" class="mr-4">
          <v-icon color="white">mdi-account-switch</v-icon>
        </v-avatar>
        <div class="flex-grow-1">
          <div class="text-h5 font-weight-medium">
            {{ $t("booking.owner-change.title") }}
          </div>
          <div class="text-caption grey--text">
            {{ $t("booking.owner-change.subtitle") }}
          </div>
        </div>
        <v-btn icon @click="$emit('cancel')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <p class="text-body-1">{{ $t("booking.owner-change.message") }}</p>
        <p class="text-body-1">
          {{ $t("booking.owner-change.consequence") }}
        </p>

        <v-card outlined class="mb-4">
          <v-list dense>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-subtitle>
                  {{ $t("booking.owner-change.previous") }}
                </v-list-item-subtitle>
                <v-list-item-title>{{ previousOwner }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item>
              <v-list-item-content>
                <v-list-item-subtitle>
                  {{ $t("booking.owner-change.next") }}
                </v-list-item-subtitle>
                <v-list-item-title>{{ newOwner }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card>

        <p class="text-body-1 mb-0">
          {{ $t("booking.owner-change.question") }}
        </p>
      </v-card-text>

      <v-divider />

      <v-card-actions class="justify-end px-6 py-4">
        <v-btn outlined @click="$emit('cancel')">
          {{ $t("booking.owner-change.cancel") }}
        </v-btn>
        <v-btn color="warning" dark @click="$emit('confirm')">
          {{ $t("booking.owner-change.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * Asks before a save hands a booking to another account: the corrected first
 * mail of a booking made by an admin moves it there (see `ownerMovedTo`).
 */
export default {
  name: "BookingOwnerChangeDialog",
  props: {
    open: { type: Boolean, default: false },
    previousOwner: { type: String, default: "" },
    newOwner: { type: String, default: "" },
  },
};
</script>
