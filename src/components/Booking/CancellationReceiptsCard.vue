<template>
  <v-card
    v-if="receipts.length > 0 || canReprint"
    class="mb-6 section-card"
    elevation="2"
    outlined
  >
    <v-card-title
      class="section-header pa-4 d-flex justify-space-between align-center"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-book-cancel-outline</v-icon>
        <span class="text-h6 font-weight-bold">
          {{ $t("booking.cancellationReceipt.title") }}
        </span>
      </div>
      <v-tooltip v-if="canReprint" bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            small
            class="cancellation-receipt-reprint"
            :loading="busy"
            v-bind="attrs"
            v-on="on"
            @click="$emit('reprint')"
          >
            <v-icon left small>mdi-file-replace-outline</v-icon>
            {{ $t("booking.cancellationReceipt.reprint.label") }}
          </v-btn>
        </template>
        {{ $t("booking.cancellationReceipt.reprint.hint") }}
      </v-tooltip>
    </v-card-title>
    <v-divider></v-divider>
    <v-card-text class="pa-4" v-if="error">
      <v-alert type="error" dense outlined border="left" class="mb-0">
        {{ error }}
      </v-alert>
    </v-card-text>
    <v-card-text class="pa-0" v-if="receipts.length > 0">
      <v-list dense>
        <template v-for="(item, index) in receipts">
          <v-list-item :key="item.title" class="px-4">
            <v-list-item-avatar color="success lighten-4">
              <v-icon color="success">mdi-file-pdf-box</v-icon>
            </v-list-item-avatar>
            <v-list-item-content>
              <v-list-item-title class="font-weight-bold">
                {{ item.title }}
              </v-list-item-title>
              <v-list-item-subtitle v-if="item.timeCreated">
                <v-icon x-small>mdi-calendar</v-icon>
                {{ $t("booking.cancellationReceipt.issuedAt") }}
                {{ issuedAt(item) }}
              </v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-btn
                icon
                class="cancellation-receipt-download"
                @click="$emit('download', item)"
              >
                <v-icon>mdi-download</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
          <v-divider
            v-if="index < receipts.length - 1"
            :key="`divider-${index}`"
          />
        </template>
      </v-list>
    </v-card-text>
    <v-card-text v-else class="pa-4 text-center grey--text">
      <v-icon large color="grey lighten-1" class="mb-2">
        mdi-book-cancel-outline
      </v-icon>
      <div>{{ $t("booking.cancellationReceipt.empty") }}</div>
    </v-card-text>
  </v-card>
</template>

<script>
/**
 * The "Stornobelege" card of the detail drawers (spec E8): the receipts
 * issued so far, each with its download, and - where the host allows it -
 * the reprint that issues a further revision under the same number. The
 * host owns the calls; the card reports `reprint` and `download(item)`.
 */
export default {
  name: "CancellationReceiptsCard",
  props: {
    /** The `cancellation` attachments, each with `title`, `timeCreated` and (for a series) `bookingId`. */
    receipts: {
      type: Array,
      default: () => [],
    },
    /** Whether the reprint is offered: at Abgelehnt / Storniert, for `booking.reprint`. */
    canReprint: {
      type: Boolean,
      default: false,
    },
    /** True while the reprint runs. */
    busy: {
      type: Boolean,
      default: false,
    },
    /** The last reprint's message, shown inline. */
    error: {
      type: String,
      default: null,
    },
  },
  methods: {
    issuedAt(item) {
      return Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(item.timeCreated));
    },
  },
};
</script>

<style scoped lang="scss">
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
