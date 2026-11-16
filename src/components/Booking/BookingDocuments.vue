<template>
  <div class="booking-documents">
    <div
      v-for="(section, index) in sections"
      :key="section.key"
      class="booking-documents__section"
      :class="[
        `booking-documents__section--${section.key}`,
        { 'mt-4': index > 0 },
      ]"
    >
      <div class="d-flex align-center justify-space-between flex-wrap mb-1">
        <div
          class="booking-documents__heading text-subtitle-2 font-weight-bold"
        >
          {{ $t(`booking.page.documents.${section.key}`) }} ({{
            section.items.length
          }})
        </div>
        <div class="d-flex flex-wrap">
          <slot v-for="kind in section.kinds" :name="`${kind}-action`" />
        </div>
      </div>
      <div
        v-if="section.items.length === 0"
        class="booking-documents__empty text-body-2 grey--text"
      >
        {{ $t("booking.page.documents.none") }}
      </div>
      <v-list v-else dense class="pa-0">
        <v-list-item
          v-for="(entry, row) in section.items"
          :key="`${section.key}-${row}`"
          class="booking-documents__row px-0"
          :class="`booking-documents__row--${entry.kind}`"
          dense
        >
          <v-list-item-icon class="mr-2 my-auto">
            <v-icon small>mdi-file-pdf-box</v-icon>
          </v-list-item-icon>
          <v-list-item-content class="py-1">
            <v-list-item-title class="text-body-2">
              {{ documentName(entry.item) }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="subtitle(entry)">
              {{ subtitle(entry) }}
            </v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action class="my-0">
            <v-btn
              icon
              small
              class="booking-documents__download"
              :title="$t('booking.page.documents.download')"
              @click="
                $emit('download', { group: entry.kind, item: entry.item })
              "
            >
              <v-icon small>mdi-download</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
      <slot v-for="kind in section.kinds" :name="`${kind}-footer`" />
    </div>
  </div>
</template>

<script>
import FormatService from "@/services/FormatService";

/**
 * The Dokumente block of a Buchungsseite (CONTEXT.md): the booking's
 * attachments in two sections - Belege and Anhänge - as dense lists with a
 * counter each, "keine" for an empty one and a download icon per row. Belege
 * gathers every document the system issues - receipts, invoices,
 * cancellation and withdrawal receipts, in that order - each row naming its
 * kind. The producing action of a kind goes into its `<kind>-action` slot
 * beside the heading of Belege, an error into `<kind>-footer` under the list;
 * the block itself only lists and emits `download` with the kind and item.
 * `groups` narrows the block to some kinds; Widerrufbelege is listed only
 * where asked for.
 */
const GROUP_KEYS = [
  "receipts",
  "invoices",
  "cancellations",
  "withdrawals",
  "attachments",
];
const DEFAULT_GROUP_KEYS = GROUP_KEYS.filter((key) => key !== "withdrawals");
const TYPE_OF_GROUP = {
  receipts: "receipt",
  invoices: "invoice",
  cancellations: "cancellation",
  withdrawals: "withdrawal",
};
const TYPED = Object.values(TYPE_OF_GROUP);

export default {
  name: "BookingDocuments",
  props: {
    attachments: {
      type: Array,
      default: () => [],
    },
    /** The group keys to list; all but Widerrufbelege by default. */
    groups: {
      type: Array,
      default: () => DEFAULT_GROUP_KEYS,
    },
  },
  computed: {
    sections() {
      const items = Array.isArray(this.attachments) ? this.attachments : [];
      const shown = GROUP_KEYS.filter((key) => this.groups.includes(key));
      const kinds = shown.filter((key) => key !== "attachments");
      const sections = [];
      if (kinds.length > 0) {
        sections.push({
          key: "receipts",
          kinds,
          items: kinds.flatMap((kind) =>
            items
              .filter((item) => item?.type === TYPE_OF_GROUP[kind])
              .map((item) => ({ kind, item }))
          ),
        });
      }
      if (shown.includes("attachments")) {
        sections.push({
          key: "attachments",
          kinds: [],
          items: items
            .filter((item) => !TYPED.includes(item?.type))
            .map((item) => ({ kind: "attachments", item })),
        });
      }
      return sections;
    },
  },
  methods: {
    /** Receipts and attachments carry `title`, invoices `name`. */
    documentName(item) {
      return item.title || item.name || "";
    },
    /** Attachments say whether they were accepted, the issued documents their kind and date. */
    subtitle({ kind, item }) {
      if (kind === "attachments") {
        return this.$t(
          item.accepted
            ? "booking.page.documents.accepted"
            : "booking.page.documents.not-accepted"
        );
      }
      const label = this.$t(`booking.page.documents.kinds.${kind}`);
      if (!item.timeCreated) {
        return label;
      }
      const issued = this.$t("booking.page.documents.issued-at", {
        date: FormatService.dateTime(item.timeCreated),
      });
      return `${label} · ${issued}`;
    },
  },
};
</script>
