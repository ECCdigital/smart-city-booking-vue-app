<template>
  <div>
    <div
      v-for="(entry, index) in entries"
      :key="index"
      class="media-usage__entry d-flex align-center py-1"
    >
      <v-icon small class="mr-2">{{ usageIcon(entry.type) }}</v-icon>
      <span class="mr-1 text--secondary">{{ usageLabel(entry.type) }}:</span>
      <router-link v-if="entry.route" :to="entry.route" class="text-truncate">
        {{ entry.title || entry.id }}
      </router-link>
      <span v-else class="text-truncate">{{ entry.title || entry.id }}</span>
    </div>
  </div>
</template>

<script>
// The usage list and the dialog that a blocked delete or a refused visibility
// downgrade opens name the same entries, so one place decides how a type is
// named, iconed and linked.
const USAGE_PRESENTATION = {
  bookable: { icon: "mdi-cube-outline", label: "Buchungsobjekt" },
  event: { icon: "mdi-calendar", label: "Veranstaltung" },
  booking: { icon: "mdi-book-outline", label: "Buchung" },
  instance: { icon: "mdi-home-edit-outline", label: "Instanz" },
  hero: { icon: "mdi-page-layout-header", label: "Kopfbereich" },
};

export default {
  name: "MediaUsageList",
  props: {
    // Usage entries as the backend answers them (`type`, `id`, `title`), each
    // with the `route` the panel resolved for it - or none, when the reader
    // may not open the target.
    entries: { type: Array, required: true },
  },
  methods: {
    usageIcon(type) {
      return USAGE_PRESENTATION[type]?.icon || "mdi-link-variant";
    },
    usageLabel(type) {
      return USAGE_PRESENTATION[type]?.label || type;
    },
  },
};
</script>
