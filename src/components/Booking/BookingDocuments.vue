<template>
  <div class="booking-documents">
    <div
      v-for="group in groups"
      :key="group.key"
      class="booking-documents__group"
    >
      <div class="d-flex align-center justify-space-between mb-1">
        <div class="booking-documents__heading text-subtitle-2">
          {{ $t(`booking.page.documents.${group.key}`) }} ({{
            group.items.length
          }})
        </div>
        <slot :name="`${group.key}-action`" />
      </div>
      <div
        v-if="group.items.length === 0"
        class="booking-documents__empty text-body-2 grey--text"
      >
        {{ $t("booking.page.documents.none") }}
      </div>
      <v-list v-else dense class="pa-0">
        <v-list-item
          v-for="(item, index) in group.items"
          :key="`${group.key}-${index}`"
          class="booking-documents__row px-0"
          dense
        >
          <v-list-item-icon class="mr-2 my-auto">
            <v-icon small>mdi-file-pdf-box</v-icon>
          </v-list-item-icon>
          <v-list-item-content class="py-1">
            <v-list-item-title class="text-body-2">
              {{ documentName(item) }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="subtitle(group.key, item)">
              {{ subtitle(group.key, item) }}
            </v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action class="my-0">
            <v-btn
              icon
              small
              class="booking-documents__download"
              :title="$t('booking.page.documents.download')"
              @click="$emit('download', { group: group.key, item })"
            >
              <v-icon small>mdi-download</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
      <slot :name="`${group.key}-footer`" />
    </div>
  </div>
</template>

<script>
import FormatService from "@/services/FormatService";

/**
 * The Dokumente block of a Buchungsseite (CONTEXT.md): the booking's
 * attachments in their four groups - Belege, Rechnungen, Stornobelege,
 * Anhänge - as dense lists with a counter per group, "keine" for an empty
 * one and a download icon per row. The producing action of a group goes into
 * its `<group>-action` slot, an error under its list into `<group>-footer`;
 * the block itself only lists and emits `download` with the group and item.
 */
const GROUP_KEYS = ["receipts", "invoices", "cancellations", "attachments"];
const TYPE_OF_GROUP = {
  receipts: "receipt",
  invoices: "invoice",
  cancellations: "cancellation",
};
const TYPED = Object.values(TYPE_OF_GROUP);

export default {
  name: "BookingDocuments",
  props: {
    attachments: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    groups() {
      const items = Array.isArray(this.attachments) ? this.attachments : [];
      return GROUP_KEYS.map((key) => ({
        key,
        items: items.filter((item) =>
          key === "attachments"
            ? !TYPED.includes(item?.type)
            : item?.type === TYPE_OF_GROUP[key]
        ),
      }));
    },
  },
  methods: {
    /** Receipts and attachments carry `title`, invoices `name`. */
    documentName(item) {
      return item.title || item.name || "";
    },
    subtitle(groupKey, item) {
      if (groupKey === "attachments") {
        return this.$t(
          item.accepted
            ? "booking.page.documents.accepted"
            : "booking.page.documents.not-accepted"
        );
      }
      if (!item.timeCreated) {
        return null;
      }
      return this.$t("booking.page.documents.issued-at", {
        date: FormatService.dateTime(item.timeCreated),
      });
    },
  },
};
</script>
