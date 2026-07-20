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
      <component
        :is="isTraitNavigable(trait) ? 'button' : 'div'"
        v-for="trait in traits"
        :key="trait.key"
        :type="isTraitNavigable(trait) ? 'button' : undefined"
        class="overview-row"
        :class="{
          'overview-row--block': isLongTrait(trait),
          'overview-row--static': !isTraitNavigable(trait),
          'overview-row--expert': isExpertTraitHint(trait),
        }"
        @click="onTraitActivate(trait)"
      >
        <div class="overview-row__head">
          <v-icon x-small class="mr-2 flex-shrink-0">{{ trait.icon }}</v-icon>
          <span class="overview-row__label text--secondary">{{
            trait.label
          }}</span>
          <span
            v-if="isExpertTraitHint(trait)"
            class="overview-row__expert-badge"
          >
            {{ $t("bookable.edit.expertMode.traitBadge") }}
          </span>
        </div>
        <span class="overview-row__value" :title="trait.value">
          {{ trait.value }}
        </span>
        <v-btn
          v-if="trait.openRoute"
          icon
          x-small
          class="overview-row__external flex-shrink-0"
          :title="$t('bookable.edit.openEvent')"
          @click.stop="openTraitRoute(trait)"
        >
          <v-icon x-small>mdi-open-in-new</v-icon>
        </v-btn>
      </component>
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
          :class="{
            'overview-chip--static': !isTraitNavigable(trait),
            'overview-chip--expert': isExpertTraitHint(trait),
          }"
          @click="onTraitActivate(trait)"
        >
          <v-icon left x-small>{{ trait.icon }}</v-icon>
          {{ trait.label }}: {{ trait.value }}
          <span
            v-if="isExpertTraitHint(trait)"
            class="overview-chip__expert-badge"
          >
            {{ $t("bookable.edit.expertMode.traitBadge") }}
          </span>
          <v-btn
            v-if="trait.openRoute"
            icon
            x-small
            class="ml-1"
            :title="$t('bookable.edit.openEvent')"
            @click.stop="openTraitRoute(trait)"
          >
            <v-icon x-small>mdi-open-in-new</v-icon>
          </v-btn>
        </v-chip>
      </div>
      <component
        :is="isTraitNavigable(trait) ? 'button' : 'div'"
        v-for="trait in longTraits"
        :key="trait.key"
        :type="isTraitNavigable(trait) ? 'button' : undefined"
        class="overview-band-detail"
        :class="{
          'overview-band-detail--static': !isTraitNavigable(trait),
          'overview-band-detail--expert': isExpertTraitHint(trait),
        }"
        @click="onTraitActivate(trait)"
      >
        <v-icon x-small class="mr-1">{{ trait.icon }}</v-icon>
        <span class="font-weight-medium mr-1">{{ trait.label }}:</span>
        <span>{{ trait.value }}</span>
        <span
          v-if="isExpertTraitHint(trait)"
          class="overview-band-detail__expert-badge"
        >
          {{ $t("bookable.edit.expertMode.traitBadge") }}
        </span>
        <v-btn
          v-if="trait.openRoute"
          icon
          x-small
          class="ml-1"
          :title="$t('bookable.edit.openEvent')"
          @click.stop="openTraitRoute(trait)"
        >
          <v-icon x-small>mdi-open-in-new</v-icon>
        </v-btn>
      </component>
    </template>
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiEventService from "@/services/api/ApiEventService";
import { getBookableOverviewTraits } from "@/utils/bookableOverview";
import bookableExpertMode from "@/mixins/bookableExpertMode";

let bookableTitlesCache = null;
let bookableTitlesPromise = null;
let eventTitlesCache = null;
let eventTitlesPromise = null;

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

function loadEventTitlesById() {
  if (eventTitlesCache) {
    return Promise.resolve(eventTitlesCache);
  }
  if (!eventTitlesPromise) {
    eventTitlesPromise = ApiEventService.getEvents()
      .then((result) => {
        const map = {};
        (result?.data || []).forEach((item) => {
          if (item?.id) {
            map[item.id] = item.information?.name || item.id;
          }
        });
        eventTitlesCache = map;
        return map;
      })
      .catch((error) => {
        console.error("Error loading event titles for overview:", error);
        eventTitlesPromise = null;
        return {};
      });
  }
  return eventTitlesPromise;
}

export default {
  name: "BookableEditOverview",
  mixins: [bookableExpertMode],
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
      eventTitlesById: eventTitlesCache || {},
    };
  },
  computed: {
    traits() {
      return getBookableOverviewTraits(this.bookable, {
        bookableTitlesById: this.bookableTitlesById,
        eventTitlesById: this.eventTitlesById,
      });
    },
    shortTraits() {
      return this.traits.filter((trait) => !this.isLongTrait(trait));
    },
    longTraits() {
      return this.traits.filter((trait) => this.isLongTrait(trait));
    },
    needsEventTitles() {
      return (
        this.bookable?.type === "ticket" || Boolean(this.bookable?.eventId)
      );
    },
  },
  watch: {
    needsEventTitles: {
      immediate: true,
      handler(needsTitles) {
        if (needsTitles) {
          this.ensureEventTitles();
        }
      },
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
    isExpertTraitHint(trait) {
      return !this.expertMode && !!trait.expert;
    },
    isTraitNavigable(trait) {
      if (trait.navigable === false) {
        return false;
      }
      return this.expertMode || !trait.expert;
    },
    onTraitActivate(trait) {
      if (!this.isTraitNavigable(trait)) {
        return;
      }
      this.$emit("navigate-tab", trait.tabKey);
    },
    openTraitRoute(trait) {
      if (!trait?.openRoute) return;
      const routeData = this.$router.resolve(trait.openRoute);
      window.open(routeData.href, "_blank", "noopener,noreferrer");
    },
    async ensureBookableTitles() {
      const map = await loadBookableTitlesById();
      this.bookableTitlesById = map;
    },
    async ensureEventTitles() {
      const map = await loadEventTitlesById();
      this.eventTitlesById = map;
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

.overview-row:not(.overview-row--static):hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.theme--dark .overview-row:not(.overview-row--static):hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.overview-row--static {
  cursor: default;
}

.overview-row--expert {
  opacity: 0.85;
}

.overview-row__head {
  display: flex;
  align-items: center;
  flex: 0 0 42%;
  min-width: 0;
  padding-right: 8px;
  flex-wrap: wrap;
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

.overview-row__expert-badge,
.overview-chip__expert-badge,
.overview-band-detail__expert-badge {
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.4;
  text-transform: uppercase;
  color: var(--v-warning-base);
  background-color: rgba(251, 140, 0, 0.12);
  white-space: nowrap;
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

.overview-row__external {
  margin-top: -2px;
  margin-left: 2px;
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

.overview-band-chips .overview-chip--static {
  cursor: default;
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

.overview-band-detail:not(.overview-band-detail--static):hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.theme--dark .overview-band-detail:not(.overview-band-detail--static):hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.overview-band-detail--static {
  cursor: default;
}

.overview-band-detail--expert {
  opacity: 0.9;
}
</style>
