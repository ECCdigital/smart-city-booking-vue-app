<template>
  <AppList
    :columns="columns"
    :items="items"
    :loading="loading"
    :error-message="errorMessage"
    :empty-text="$t('supervision.history.empty')"
    :lead="$t('supervision.history.hint')"
    :page="page"
    :page-size="pageSize"
    :total="total"
    class="supervision-history"
    data-test="supervision-history"
    @update:page="onPage"
    @retry="load"
  >
    <!-- The search band (SearchBar) for the offer id, tenant and offer
         type behind the funnel; the reload in the row beneath it. -->
    <template #toolbar>
      <SearchBar
        :value="filters.offerId || ''"
        :fields="$t('supervision.history.filters.offer-id')"
        :filters="filterSections"
        class="supervision-history__search"
        data-test="history-search"
        @input="onFilter('offerId', $event)"
        @filter="onCardFilter"
      >
        <template #actions>
          <ToolbarRow>
            <template #actions>
              <ToolbarAction
                icon="mdi-refresh"
                :disabled="loading"
                data-test="history-reload"
                @click="load"
              >
                {{ $t("supervision.history.reload") }}
              </ToolbarAction>
            </template>
          </ToolbarRow>
        </template>
      </SearchBar>
    </template>

    <!-- The moment as a stamp: the day over the time of day, cut from the
         one "15.11.23, 00:13" stamp the admin's bookings carry. -->
    <template #cell.occurredAt="{ item }">
      <div class="supervision-history__stamp">
        <span>{{ dateLabel(item.occurredAt) }}</span>
        <span class="supervision-history__time">
          {{ timeLabel(item.occurredAt) }}
        </span>
      </div>
    </template>

    <template #cell.tenantId="{ item }">
      {{ tenantLabel(item.tenantId) }}
    </template>

    <!-- What happened, and beneath it who did it and to which offer. -->
    <template #cell.eventType="{ item }">
      <div class="supervision-history__event">
        {{ $t(eventLabelKey(item.eventType)) }}
      </div>
      <div class="supervision-history__by">{{ actorLabel(item) }}</div>
      <div v-if="offerLabel(item)" class="supervision-history__by">
        {{ offerLabel(item) }}
      </div>
    </template>

    <!-- Old → new; the new state is the one that counts. -->
    <template #cell.change="{ item }">
      <span v-if="changeStates(item).from" class="supervision-history__from">
        {{ changeStates(item).from }} →
      </span>
      <span class="supervision-history__to">{{ changeStates(item).to }}</span>
    </template>

    <template #cell.reason="{ item }">
      <span v-if="item.reason" class="supervision-history__reason">
        {{ item.reason }}
      </span>
      <span v-else class="supervision-history__none" aria-hidden="true">
        –
      </span>
    </template>
  </AppList>
</template>

<script>
import AppList from "@/components/commons/AppList.vue";
import SearchBar from "@/components/commons/SearchBar.vue";
import ToolbarRow from "@/components/commons/ToolbarRow.vue";
import ToolbarAction from "@/components/commons/ToolbarAction.vue";
import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import FormatService from "@/services/FormatService";
import pagedLoad from "@/mixins/pagedLoad";
import {
  OFFER_TYPE_ICONS,
  OFFER_TYPE_VALUES,
  historyActorLabelKey,
  historyEventLabelKey,
  historyStateLabelKey,
  offerTypeLabelKey,
} from "@/utils/supervision";

const PAGE_SIZE = 25;

/** The offer type switch's „Alle“: no offer type filter. */
const ALL_OFFER_TYPES = "all";

/**
 * The supervision history (glossary "Aufsichtshistorie"): immutable, newest
 * first, paged and filtered on the server, drawn as the shared list. With a
 * `tenantId` it reads that tenant's history - the only one a tenant owner
 * may see; with `instanceWide` the history of the whole instance, which is
 * the instance owner's and which a tenant filter narrows.
 */
export default {
  name: "SupervisionHistoryList",
  components: { AppList, SearchBar, ToolbarRow, ToolbarAction },
  mixins: [pagedLoad],
  props: {
    tenantId: { type: String, default: null },
    // Asked for by name: a tenant id that is still missing must never widen
    // the list to the whole instance.
    instanceWide: { type: Boolean, default: false },
    // Names for the tenant filter and column of the instance-wide history.
    tenants: { type: Array, default: () => [] },
  },
  data() {
    return {
      page: 1,
      pageSize: PAGE_SIZE,
      filters: { tenantId: null, offerType: null, offerId: null },
    };
  },
  computed: {
    columns() {
      const t = (key) => this.$t(`supervision.history.columns.${key}`);
      const columns = [
        { key: "occurredAt", label: t("time"), width: "76px" },
        { key: "eventType", label: t("event"), width: "minmax(180px, 1.4fr)" },
        { key: "change", label: t("change"), width: "minmax(150px, 1fr)" },
        { key: "reason", label: t("reason"), width: "minmax(160px, 1.6fr)" },
      ];
      if (this.instanceWide) {
        columns.splice(1, 0, {
          key: "tenantId",
          label: t("tenant"),
          width: "minmax(120px, 0.8fr)",
        });
      }
      return columns;
    },
    /**
     * The offer type as a switch, as the booking list's type, and below it
     * the tenant (instance-wide only); the server filters.
     */
    filterSections() {
      const offerType = {
        key: "offerType",
        label: this.$t("supervision.history.filters.offer-type"),
        multiple: false,
        segmented: true,
        empty: ALL_OFFER_TYPES,
        selected: this.filters.offerType || ALL_OFFER_TYPES,
        options: [
          {
            value: ALL_OFFER_TYPES,
            label: this.$t("supervision.history.filters.all-offer-types"),
            icon: "mdi-view-grid-outline",
          },
          ...OFFER_TYPE_VALUES.map((value) => ({
            value,
            label: this.$t(offerTypeLabelKey(value)),
            icon: OFFER_TYPE_ICONS[value],
          })),
        ],
      };
      if (!this.instanceWide) return [offerType];
      const tenant = {
        key: "tenantId",
        label: this.$t("supervision.history.filters.tenant"),
        multiple: false,
        selected: this.filters.tenantId,
        options: this.tenants.map((tenant) => ({
          value: tenant.id,
          label: tenant.name,
          icon: "mdi-domain",
        })),
      };
      return [offerType, tenant];
    },
  },
  watch: {
    tenantId: {
      immediate: true,
      handler() {
        this.page = 1;
        this.load();
      },
    },
  },
  methods: {
    load() {
      if (!this.instanceWide && !this.tenantId) return;
      const params = { page: this.page, pageSize: PAGE_SIZE };
      Object.entries(this.filters).forEach(([name, value]) => {
        if (value) params[name] = value;
      });
      return this.loadPaged(
        () =>
          this.instanceWide
            ? ApiSupervisionService.getInstanceHistory(params)
            : ApiSupervisionService.getTenantHistory(this.tenantId, params),
        "supervision.history.load-failed"
      );
    },
    onFilter(name, value) {
      const next = typeof value === "string" ? value.trim() : value;
      this.filters[name] = next || null;
      this.page = 1;
      this.load();
    },
    onCardFilter(key, selection) {
      this.onFilter(key, selection === ALL_OFFER_TYPES ? null : selection);
    },
    onPage(page) {
      this.page = page;
      this.load();
    },
    eventLabelKey: historyEventLabelKey,
    dateLabel: (occurredAt) =>
      FormatService.dateTime(occurredAt).split(", ")[0],
    timeLabel: (occurredAt) =>
      FormatService.dateTime(occurredAt).split(", ")[1],
    tenantLabel(tenantId) {
      return (
        this.tenants.find((tenant) => tenant.id === tenantId)?.name || tenantId
      );
    },
    actorLabel(row) {
      const key = historyActorLabelKey(row);
      return key ? this.$t(key) : row.actor.userId;
    },
    // A first state (creation, migration, first submission of a level event)
    // has no old one to name; a level without a label shows as stored.
    changeStates(row) {
      const label = (state) => {
        const key = historyStateLabelKey(row.eventType, state);
        return key ? this.$t(key) : state || "";
      };
      return { from: label(row.from), to: label(row.to) };
    },
    // The offer by its type and current title (`offerTitle`); an offer that
    // is gone, or a backend without the field, shows by its id.
    offerLabel(row) {
      if (!row.offerType && !row.offerId) return "";
      const typeKey = offerTypeLabelKey(row.offerType);
      const type = typeKey ? this.$t(typeKey) : row.offerType;
      return [type, row.offerTitle || row.offerId].filter(Boolean).join(" ");
    },
  },
};
</script>

<style scoped>
.supervision-history__search {
  flex: 1 1 100%;
  margin-bottom: 0;
}

.supervision-history__stamp {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
}

.supervision-history__time {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.supervision-history__event {
  font-weight: var(--scb-font-weight-semibold);
}

.supervision-history__by {
  font-size: var(--scb-font-size-xs);
  color: var(--scb-text-muted);
}

.supervision-history__from {
  margin-right: var(--scb-space-1);
}

.supervision-history__to {
  font-weight: var(--scb-font-weight-semibold);
}

.supervision-history__reason {
  white-space: pre-wrap;
}

.supervision-history__none {
  color: var(--scb-text-caption);
}
</style>
