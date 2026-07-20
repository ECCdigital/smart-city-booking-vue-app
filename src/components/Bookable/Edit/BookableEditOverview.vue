<template>
  <div
    :class="
      variant === 'sidebar'
        ? 'bookable-overview-sidebar'
        : 'bookable-overview-band'
    "
  >
    <template v-if="variant === 'sidebar'">
      <div class="text-subtitle-2 mb-3">Übersicht</div>
      <button
        v-for="trait in traits"
        :key="trait.key"
        type="button"
        class="overview-row"
        :class="{ 'overview-row--block': isLongTrait(trait) }"
        @click="onNavigate(trait.tabKey)"
      >
        <div class="overview-row__head">
          <v-icon x-small class="mr-2 flex-shrink-0">{{ trait.icon }}</v-icon>
          <span class="overview-row__label text--secondary">{{
            trait.label
          }}</span>
        </div>
        <span class="overview-row__value" :title="trait.value">
          {{ trait.value }}
        </span>
      </button>
    </template>

    <template v-else>
      <div class="d-flex flex-wrap overview-band-chips">
        <v-chip
          v-for="trait in shortTraits"
          :key="trait.key"
          small
          outlined
          label
          class="ma-1"
          @click="onNavigate(trait.tabKey)"
        >
          <v-icon left x-small>{{ trait.icon }}</v-icon>
          {{ trait.label }}: {{ trait.value }}
        </v-chip>
      </div>
      <button
        v-for="trait in longTraits"
        :key="trait.key"
        type="button"
        class="overview-band-detail"
        @click="onNavigate(trait.tabKey)"
      >
        <v-icon x-small class="mr-1">{{ trait.icon }}</v-icon>
        <span class="font-weight-medium mr-1">{{ trait.label }}:</span>
        <span>{{ trait.value }}</span>
      </button>
    </template>
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { getBookableOverviewTraits } from "@/utils/bookableOverview";

let bookableTitlesCache = null;
let bookableTitlesPromise = null;

function loadBookableTitlesById() {
  if (bookableTitlesCache) {
    return Promise.resolve(bookableTitlesCache);
  }
  if (!bookableTitlesPromise) {
    bookableTitlesPromise = ApiBookablesService.getBookables()
      .then((result) => {
        const map = {};
        (result?.data || []).forEach((item) => {
          if (item?.id) {
            map[item.id] = item.title || item.id;
          }
        });
        bookableTitlesCache = map;
        return map;
      })
      .catch((error) => {
        console.error("Error loading bookable titles for overview:", error);
        bookableTitlesPromise = null;
        return {};
      });
  }
  return bookableTitlesPromise;
}

export default {
  name: "BookableEditOverview",
  props: {
    bookable: {
      type: Object,
      default: () => ({}),
    },
    variant: {
      type: String,
      default: "sidebar",
      validator: (value) => ["sidebar", "band"].includes(value),
    },
  },
  data() {
    return {
      bookableTitlesById: bookableTitlesCache || {},
    };
  },
  computed: {
    traits() {
      return getBookableOverviewTraits(this.bookable, {
        bookableTitlesById: this.bookableTitlesById,
      });
    },
    shortTraits() {
      return this.traits.filter((trait) => !this.isLongTrait(trait));
    },
    longTraits() {
      return this.traits.filter((trait) => this.isLongTrait(trait));
    },
  },
  methods: {
    isLongTrait(trait) {
      return (
        trait.key === "openingHours" ||
        trait.key === "specialOpeningHours" ||
        trait.key === "checkoutOptions" ||
        trait.key === "relatedBookables" ||
        (trait.value && trait.value.length > 48)
      );
    },
    onNavigate(tabKey) {
      this.$emit("navigate-tab", tabKey);
    },
    async ensureBookableTitles() {
      const map = await loadBookableTitlesById();
      this.bookableTitlesById = map;
    },
  },
  created() {
    this.ensureBookableTitles();
  },
};
</script>

<style scoped>
.bookable-overview-sidebar {
  padding: 4px 0 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.theme--dark .bookable-overview-sidebar {
  border-top-color: rgba(255, 255, 255, 0.12);
}

@media (min-width: 1264px) {
  .bookable-overview-sidebar {
    border-top: none;
    padding-left: 16px;
    border-left: 1px solid rgba(0, 0, 0, 0.08);
  }

  .theme--dark .bookable-overview-sidebar {
    border-left-color: rgba(255, 255, 255, 0.12);
  }
}

.overview-row {
  display: flex;
  align-items: flex-start;
  width: 100%;
  padding: 6px 4px;
  margin: 0 0 2px;
  border: none;
  border-radius: 4px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: background-color 0.15s ease;
}

.overview-row--block {
  flex-direction: column;
}

.overview-row:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.theme--dark .overview-row:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.overview-row__head {
  display: flex;
  align-items: center;
  flex: 0 0 42%;
  min-width: 0;
  padding-right: 8px;
}

.overview-row--block .overview-row__head {
  flex: none;
  width: 100%;
  margin-bottom: 2px;
  padding-right: 0;
}

.overview-row__label {
  font-size: 0.75rem;
  line-height: 1.3;
}

.overview-row__value {
  flex: 1 1 auto;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.35;
  min-width: 0;
  white-space: normal;
  word-break: break-word;
}

.overview-row--block .overview-row__value {
  width: 100%;
  padding-left: 22px;
}

.bookable-overview-band {
  margin-bottom: 12px;
}

.overview-band-chips {
  margin: -4px;
}

.overview-band-chips .v-chip {
  cursor: pointer;
  max-width: 100%;
}

.overview-band-detail {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: inherit;
}

.theme--dark .overview-band-detail {
  border-color: rgba(255, 255, 255, 0.16);
}

.overview-band-detail:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.theme--dark .overview-band-detail:hover {
  background-color: rgba(255, 255, 255, 0.06);
}
</style>
