<template>
  <v-card
    v-if="receipts.length > 0 || canReprint"
    class="mb-6 section-card"
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
          <v-list-item :key="receiptKey(item)" class="px-4">
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
    /** The `cancellation` attachments, each with `title`, `timeCreated`, `revision` and (for a series) `bookingId`. */
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
    /** A reprint shares the title (and number) of the receipt it revises; the moment of issue tells them apart. */
    receiptKey(item) {
      return `${item.title}-${item.timeCreated}`;
    },
    issuedAt(item) {
      return Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(item.timeCreated));
    },
  },
};
</script>
