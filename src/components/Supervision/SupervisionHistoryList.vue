<template>
  <div data-test="supervision-history">
    <p class="text-body-2 text--secondary">
      {{ $t("supervision.history.hint") }}
    </p>
    <div class="d-flex align-center flex-wrap mb-2">
      <v-select
        v-if="instanceWide"
        ref="tenantFilter"
        :value="filters.tenantId"
        :items="tenants"
        item-text="name"
        item-value="id"
        :label="$t('supervision.history.filters.tenant')"
        dense
        outlined
        hide-details
        clearable
        class="mr-2 mb-2 history-filter"
        data-test="history-filter-tenant"
        @input="onFilter('tenantId', $event)"
      />
      <v-select
        ref="offerTypeFilter"
        :value="filters.offerType"
        :items="offerTypeItems"
        :label="$t('supervision.history.filters.offer-type')"
        dense
        outlined
        hide-details
        clearable
        class="mr-2 mb-2 history-filter"
        data-test="history-filter-offer-type"
        @input="onFilter('offerType', $event)"
      />
      <v-text-field
        :value="filters.offerId"
        :label="$t('supervision.history.filters.offer-id')"
        dense
        outlined
        hide-details
        clearable
        class="mr-2 mb-2 history-filter"
        data-test="history-filter-offer-id"
        @change="onFilter('offerId', $event)"
        @click:clear="onFilter('offerId', null)"
      />
      <v-spacer />
      <v-btn
        small
        text
        color="primary"
        :disabled="loading"
        data-test="history-reload"
        @click="load"
      >
        <v-icon left small>mdi-refresh</v-icon>
        {{ $t("supervision.history.reload") }}
      </v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <v-alert v-if="errorMessage" type="warning" text dense>
      {{ errorMessage }}
    </v-alert>
    <p
      v-else-if="!loading && items.length === 0"
      class="text--secondary"
      data-test="history-empty"
    >
      {{ $t("supervision.history.empty") }}
    </p>
    <v-simple-table v-else-if="items.length > 0" dense>
      <thead>
        <tr>
          <th>{{ $t("supervision.history.columns.time") }}</th>
          <th v-if="instanceWide">
            {{ $t("supervision.history.columns.tenant") }}
          </th>
          <th>{{ $t("supervision.history.columns.event") }}</th>
          <th>{{ $t("supervision.history.columns.actor") }}</th>
          <th>{{ $t("supervision.history.columns.change") }}</th>
          <th>{{ $t("supervision.history.columns.offer") }}</th>
          <th>{{ $t("supervision.history.columns.reason") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in items" :key="row.id" data-test="history-row">
          <td class="text-no-wrap">{{ timeLabel(row.occurredAt) }}</td>
          <td v-if="instanceWide">{{ tenantLabel(row.tenantId) }}</td>
          <td>{{ $t(eventLabelKey(row.eventType)) }}</td>
          <td>{{ actorLabel(row) }}</td>
          <td class="text-no-wrap">{{ changeLabel(row) }}</td>
          <td>{{ offerLabel(row) }}</td>
          <td class="history-reason">{{ row.reason }}</td>
        </tr>
      </tbody>
    </v-simple-table>

    <v-pagination
      v-if="pageCount > 1"
      :value="page"
      :length="pageCount"
      :total-visible="7"
      class="mt-2"
      @input="onPage"
    />
  </div>
</template>

<script>
import ApiSupervisionService from "@/services/api/ApiSupervisionService";
import { getApiErrorMessage } from "@/services/api/apiErrorMessage";
import {
  historyActorLabelKey,
  historyEventLabelKey,
  historyStateLabelKey,
} from "@/utils/supervision";

const PAGE_SIZE = 25;
const OFFER_TYPES = ["bookable", "event"];

/**
 * The supervision history (glossary "Aufsichtshistorie"): immutable, newest
 * first, paged and filtered on the server. With a `tenantId` it reads that
 * tenant's history - the only one a tenant owner may see; with
 * `instanceWide` the history of the whole instance, which is the instance
 * owner's and which a tenant filter narrows.
 */
export default {
  name: "SupervisionHistoryList",
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
      loading: false,
      errorMessage: "",
      items: [],
      total: 0,
      page: 1,
      filters: { tenantId: null, offerType: null, offerId: null },
    };
  },
  computed: {
    pageCount() {
      return Math.ceil(this.total / PAGE_SIZE);
    },
    offerTypeItems() {
      return OFFER_TYPES.map((value) => ({
        value,
        text: this.$t(`supervision.history.offer-types.${value}`),
      }));
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
    async load() {
      if (!this.instanceWide && !this.tenantId) return;
      // Loads overlap (filter, page, reload): the last one asked for wins.
      const run = (this.latestRun = {});
      const params = { page: this.page, pageSize: PAGE_SIZE };
      Object.entries(this.filters).forEach(([name, value]) => {
        if (value) params[name] = value;
      });
      this.loading = true;
      this.errorMessage = "";
      try {
        const result = this.instanceWide
          ? await ApiSupervisionService.getInstanceHistory(params)
          : await ApiSupervisionService.getTenantHistory(this.tenantId, params);
        if (run !== this.latestRun) return;
        this.items = result?.items || [];
        this.total = result?.total || 0;
      } catch (error) {
        console.error(error);
        if (run !== this.latestRun) return;
        this.items = [];
        this.total = 0;
        this.errorMessage = getApiErrorMessage(
          error,
          this.$t("supervision.history.load-failed")
        );
      } finally {
        if (run === this.latestRun) this.loading = false;
      }
    },
    onFilter(name, value) {
      const next = typeof value === "string" ? value.trim() : value;
      this.filters[name] = next || null;
      this.page = 1;
      this.load();
    },
    onPage(page) {
      this.page = page;
      this.load();
    },
    eventLabelKey: historyEventLabelKey,
    timeLabel(occurredAt) {
      return new Date(occurredAt).toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    tenantLabel(tenantId) {
      return (
        this.tenants.find((tenant) => tenant.id === tenantId)?.name || tenantId
      );
    },
    actorLabel(row) {
      const key = historyActorLabelKey(row);
      return key ? this.$t(key) : row.actor.userId;
    },
    // Old → new; a first state (creation, migration, first submission of a
    // level event) has no old one to name.
    changeLabel(row) {
      return [row.from, row.to]
        .map((state) => historyStateLabelKey(row.eventType, state))
        .filter(Boolean)
        .map((key) => this.$t(key))
        .join(" → ");
    },
    // The history row carries the offer's type and id, no title.
    offerLabel(row) {
      if (!row.offerType && !row.offerId) return "";
      const typeKey = `supervision.history.offer-types.${row.offerType}`;
      const type = this.$te(typeKey) ? this.$t(typeKey) : row.offerType;
      return [type, row.offerId].filter(Boolean).join(" ");
    },
  },
};
</script>

<style scoped>
.history-filter {
  max-width: 220px;
}
.history-reason {
  white-space: pre-wrap;
}
</style>
