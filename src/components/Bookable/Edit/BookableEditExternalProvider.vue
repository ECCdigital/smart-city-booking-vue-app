<template>
  <div>
    <v-expand-transition>
      <v-alert
        v-if="expertOptionShown('externalPrices') && showIfbsRecommendation"
        prominent
        colored-border
        border="left"
        color="warning"
        elevation="1"
        class="mb-4"
      >
        <div class="d-flex flex-column">
          <div class="text-subtitle-1 font-weight-bold mb-1">
            <v-icon left color="warning">mdi-alert-circle-outline</v-icon>
            {{ $t("bookable.edit.externalProvider.recommendation") }}
          </div>

          <div
            class="text-body-2 mb-3"
            v-html="$t('bookable.edit.externalProvider.recommendation-text')"
          />

          <v-row dense class="mb-2">
            <v-col
              v-for="rec in ifbsRecommendations"
              :key="rec.handle"
              cols="12"
              sm="4"
            >
              <div
                class="d-flex align-center pa-2 rounded"
                :class="rec.active ? 'green lighten-5' : 'red lighten-5'"
              >
                <v-icon
                  small
                  :color="rec.active ? 'success' : 'error'"
                  class="mr-2"
                >
                  {{ rec.active ? "mdi-check-circle" : "mdi-close-circle" }}
                </v-icon>
                <div>
                  <div
                    class="text-caption font-weight-bold"
                    :class="rec.active ? 'success--text' : 'error--text'"
                  >
                    {{ rec.label }}
                  </div>
                  <div class="text-caption text--secondary">
                    {{ rec.hint }}
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>

          <div class="d-flex align-center">
            <v-btn
              v-if="!externalProvider.active"
              small
              color="warning"
              class="mr-2"
              @click="activateRecommendedIfbs"
            >
              <v-icon left small>mdi-lightning-bolt</v-icon>
              {{ $t("bookable.edit.externalProvider.apply-recommended") }}
            </v-btn>
            <v-btn
              v-else-if="missingRecommendedHandles.length > 0"
              small
              color="warning"
              class="mr-2"
              @click="activateMissingHandles"
            >
              <v-icon left small>mdi-plus-circle-outline</v-icon>
              {{ $t("bookable.edit.externalProvider.activate-missing") }}
            </v-btn>
            <v-btn
              small
              text
              color="grey"
              @click="dismissIfbsRecommendation = true"
            >
              {{ $t("bookable.edit.externalProvider.dismiss") }}
            </v-btn>
          </div>
        </div>
      </v-alert>
    </v-expand-transition>

    <v-expand-transition>
      <v-card
        v-if="expertOptionShown('externalPrices') && isIfbsActive"
        id="be-section-pricing-external"
        class="mt-4"
        outlined
      >
        <v-card-title class="section-header pa-4">
          <v-icon class="mr-2">mdi-cloud-sync-outline</v-icon>
          <span class="text-h6 font-weight-bold">
            {{
              $t("bookable.edit.externalProvider.title", {
                name: $t("bookable.edit.sections.accessLocksExternal"),
              })
            }}
          </span>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
          <v-switch
            :input-value="externalProvider.active"
            dense
            hide-details
            color="primary"
            class="mt-0 mb-4"
            @change="setProviderActive"
          >
            <template #label>
              <div>
                <div class="font-weight-medium">
                  {{ $t("bookable.edit.externalProvider.switch") }}
                </div>
                <div class="text-caption text--secondary">
                  {{ $t("bookable.edit.externalProvider.switch-hint") }}
                </div>
              </div>
            </template>
          </v-switch>

          <v-expand-transition>
            <div v-if="externalProvider.active">
              <v-alert color="info" text dense border="left" class="mb-4">
                <div class="text-body-2">
                  {{ $t("bookable.edit.externalProvider.handles-hint") }}
                </div>
              </v-alert>

              <v-row>
                <v-col cols="12" md="4">
                  <v-checkbox
                    :input-value="externalProvider.handles"
                    value="pricing"
                    dense
                    hide-details
                    color="primary"
                    class="mt-0"
                    @change="setProviderHandles"
                  >
                    <template #label>
                      <div>
                        <div class="font-weight-medium d-flex align-center">
                          <v-icon small class="mr-1" color="primary">
                            mdi-cash-multiple
                          </v-icon>
                          {{ handleLabel("pricing") }}
                        </div>
                        <div class="text-caption text--secondary">
                          {{
                            $t("bookable.edit.externalProvider.pricing-hint")
                          }}
                        </div>
                      </div>
                    </template>
                  </v-checkbox>
                </v-col>
                <v-col cols="12" md="4">
                  <v-checkbox
                    :input-value="externalProvider.handles"
                    value="availability"
                    dense
                    hide-details
                    color="primary"
                    class="mt-0"
                    @change="setProviderHandles"
                  >
                    <template #label>
                      <div>
                        <div class="font-weight-medium d-flex align-center">
                          <v-icon small class="mr-1" color="primary">
                            mdi-calendar-check
                          </v-icon>
                          {{ handleLabel("availability") }}
                        </div>
                        <div class="text-caption text--secondary">
                          {{
                            $t(
                              "bookable.edit.externalProvider.availability-hint"
                            )
                          }}
                        </div>
                      </div>
                    </template>
                  </v-checkbox>
                </v-col>
                <v-col cols="12" md="4">
                  <v-checkbox
                    :input-value="externalProvider.handles"
                    value="maxAmount"
                    dense
                    hide-details
                    color="primary"
                    class="mt-0"
                    @change="setProviderHandles"
                  >
                    <template #label>
                      <div>
                        <div class="font-weight-medium d-flex align-center">
                          <v-icon small class="mr-1" color="primary">
                            mdi-counter
                          </v-icon>
                          {{ handleLabel("maxAmount") }}
                        </div>
                        <div class="text-caption text--secondary">
                          {{
                            $t("bookable.edit.externalProvider.maxAmount-hint")
                          }}
                        </div>
                      </div>
                    </template>
                  </v-checkbox>
                </v-col>
              </v-row>

              <!-- Only the prices are previewed here: what the provider
                   reports about availability and capacity it reports at
                   checkout, and the 4.3.x API no longer answers it out of
                   band. -->
              <v-expand-transition>
                <div v-if="handlesPricing">
                  <v-divider class="my-4" />

                  <v-progress-linear
                    v-if="isLoadingPrices"
                    indeterminate
                    color="primary"
                    class="mb-4"
                  />

                  <v-alert
                    v-if="priceError"
                    type="error"
                    dense
                    text
                    class="mb-4 external-price-error"
                  >
                    {{ priceError }}
                    <template #append>
                      <v-btn
                        small
                        text
                        color="error"
                        @click="fetchExternalPrices"
                      >
                        {{ $t("bookable.externalPrice.retry") }}
                      </v-btn>
                    </template>
                  </v-alert>

                  <div
                    v-if="hasExternalPriceData && !isLoadingPrices"
                    class="mb-2"
                  >
                    <v-row>
                      <v-col
                        v-for="row in externalPriceTiers"
                        :key="row.unit"
                        cols="6"
                        sm="4"
                        md="4"
                        lg="2"
                      >
                        <v-card
                          flat
                          class="pa-3 rounded-lg text-center ifbs-price-tile external-price-tier"
                        >
                          <v-icon color="primary" class="mb-2">
                            {{ row.icon }}
                          </v-icon>
                          <div class="text-h6 font-weight-bold">
                            {{
                              $t("bookable.edit.priceTiers.price", {
                                price: formatPrice(row.priceEur),
                              })
                            }}
                          </div>
                          <div class="text-caption text--secondary">
                            {{ $t(row.labelKey) }}
                          </div>
                        </v-card>
                      </v-col>
                    </v-row>

                    <template v-if="externalServiceFee !== null">
                      <v-divider class="my-4" />

                      <v-row>
                        <v-col cols="12" md="6">
                          <v-card
                            flat
                            class="pa-3 rounded-lg ifbs-price-tile external-price-fee"
                          >
                            <div class="d-flex align-center">
                              <v-icon color="primary" class="mr-3">
                                mdi-cash-plus
                              </v-icon>
                              <div>
                                <div
                                  class="text-caption text--secondary font-weight-medium"
                                >
                                  {{ $t("bookable.externalPrice.serviceFee") }}
                                </div>
                                <div class="text-h6 font-weight-bold">
                                  {{
                                    $t("bookable.edit.priceTiers.price", {
                                      price: formatPrice(externalServiceFee),
                                    })
                                  }}
                                </div>
                              </div>
                            </div>
                          </v-card>
                        </v-col>
                      </v-row>
                    </template>
                  </div>

                  <div
                    v-if="
                      !hasExternalPriceData && !isLoadingPrices && !priceError
                    "
                    class="text-center py-6 external-price-empty"
                  >
                    <v-icon large color="grey lighten-1">
                      mdi-cloud-question
                    </v-icon>
                    <div class="text-body-2 grey--text mt-2">
                      {{ $t("bookable.externalPrice.empty") }}
                    </div>
                    <div
                      v-if="externalPricesUnavailableReason"
                      class="text-caption grey--text mt-1"
                    >
                      {{ $t(externalPricesUnavailableReason) }}
                    </div>
                  </div>
                </div>
              </v-expand-transition>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>
    </v-expand-transition>
  </div>
</template>

<script>
import _ from "lodash";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import bookableEditing from "@/mixins/bookableEditing";
import externalPrices from "@/mixins/externalPrices";
import {
  IFBS_PROVIDER,
  providerHandles,
} from "@/utils/bookableExternalProviders";

const HANDLE_LABELS = Object.freeze({
  availability: "bookable.flow.steps.availability.title",
  maxAmount: "bookable.edit.sections.pricingAmount",
  pricing: "bookable.edit.externalProvider.pricing",
});

const DEFAULT_EXTERNAL_PROVIDER = {
  active: false,
  provider: IFBS_PROVIDER,
  handles: [],
  config: {
    locationId: null,
    amount: 1,
  },
};

/**
 * The settings of ParkraumService for a bookable with one of its locker
 * systems assigned: the recommendation of the sources to take over, the
 * switch, what the provider handles (prices, availability, Anzahl) and the
 * preview of its prices. Part of Schließsysteme, because they belong to the
 * assigned locker system; the price and the Anzahl only show a note while
 * the provider handles them. Shown by the expert option „Externe Preise“.
 */
export default {
  name: "BookableEditExternalProvider",
  mixins: [bookableEditing, externalPrices],
  data() {
    return {
      accessPoints: [],
      priceError: null,
      dismissIfbsRecommendation: false,
    };
  },
  computed: {
    /**
     * The locker system of the provider this bookable hands out - an access
     * point since the fold, referenced by id like every other. Its
     * `externalId` is the location the provider prices and books against.
     */
    ifbsAccessPoint() {
      const details = this.bookable?.accessPointDetails;
      if (details?.active !== true) return null;
      const ids = details.accessPointIds || [];
      return (
        this.accessPoints.find(
          (point) => point.provider === IFBS_PROVIDER && ids.includes(point.id)
        ) || null
      );
    },
    isIfbsActive() {
      return this.ifbsAccessPoint !== null;
    },
    externalProvider() {
      return this.findIfbsProvider() || DEFAULT_EXTERNAL_PROVIDER;
    },
    handlesPricing() {
      return providerHandles(this.externalProvider, "pricing");
    },
    // Why there is nothing to preview: the prices route reads the stored
    // bookable, so it has nothing to say before the first save.
    externalPricesUnavailableReason() {
      return this.externalPricesUnavailableKey(this.bookable);
    },
    ifbsRecommendations() {
      const handles = this.externalProvider.active
        ? this.externalProvider.handles || []
        : [];

      return [
        { handle: "availability", critical: true },
        { handle: "maxAmount", critical: true },
        { handle: "pricing", critical: false },
      ].map((rec) => ({
        ...rec,
        label: this.handleLabel(rec.handle),
        hint: this.$t(`bookable.edit.externalProvider.why.${rec.handle}`),
        active: handles.includes(rec.handle),
      }));
    },
    missingRecommendedHandles() {
      return this.ifbsRecommendations
        .filter((r) => !r.active)
        .map((r) => r.handle);
    },
    showIfbsRecommendation() {
      if (!this.isIfbsActive) return false;
      if (this.dismissIfbsRecommendation) return false;

      if (!this.externalProvider.active) return true;

      const handles = this.externalProvider.handles || [];
      return this.ifbsRecommendations.some(
        (r) => r.critical && !handles.includes(r.handle)
      );
    },
  },
  watch: {
    "bookable.id": {
      immediate: true,
      handler() {
        this.fetchAccessPoints();
      },
    },
    isIfbsActive: {
      immediate: true,
      handler(active) {
        if (active) {
          this.fetchExternalPrices();
        } else {
          this.externalPrices = null;
          this.priceError = null;
        }
      },
    },
    handlesPricing() {
      this.fetchExternalPrices();
    },
    externalPricesUnavailableReason() {
      this.fetchExternalPrices();
    },
  },
  methods: {
    /**
     * What the provider may take over, named as the field it takes over:
     * the Verfügbarkeit, the Anzahl, the prices.
     */
    handleLabel(handle) {
      return this.$t(HANDLE_LABELS[handle]);
    },
    findIfbsProvider() {
      return (
        this.bookable.externalProviders?.find(
          (p) => p.provider === IFBS_PROVIDER
        ) || null
      );
    },
    /**
     * The tenant's access points, so that the assigned ids can say which of
     * them is a locker system of the provider. A bookable only ever
     * references access points by id since the fold.
     */
    async fetchAccessPoints() {
      try {
        const response = await ApiAccessPointService.getAccessPoints(
          this.bookable?.tenantId
        );
        this.accessPoints = response.data || [];
      } catch (error) {
        // Without the list the settings cannot tell that a locker system is
        // assigned and stay away; the assignment above reports the failure.
        console.error(
          `Could not read the access points of tenant ${this.bookable?.tenantId}`,
          error
        );
        this.accessPoints = [];
      }
    },
    /**
     * Hands on the provider with `changes` as the rebuilt list of providers,
     * pointed at what it prices against: the location behind the assigned
     * locker system, and the bookable's own capacity.
     */
    saveProvider(changes) {
      const current = this.findIfbsProvider();
      const next = {
        ..._.cloneDeep(current || DEFAULT_EXTERNAL_PROVIDER),
        ...changes,
      };
      const accessPoint = this.ifbsAccessPoint;
      if (accessPoint) {
        next.config = {
          locationId: accessPoint.externalId,
          amount: Number(this.bookable.amount) || 1,
        };
      }
      const providers = [...(this.bookable.externalProviders || [])];
      const index = providers.indexOf(current);
      providers.splice(index < 0 ? providers.length : index, 1, next);
      this.patch({ externalProviders: providers });
    },
    setProviderActive(active) {
      this.saveProvider({ active: !!active });
    },
    setProviderHandles(handles) {
      this.saveProvider({ handles: handles || [] });
    },
    activateRecommendedIfbs() {
      this.saveProvider({
        active: true,
        handles: ["availability", "maxAmount", "pricing"],
      });
    },
    activateMissingHandles() {
      this.saveProvider({
        handles: _.union(
          this.externalProvider.handles || [],
          this.missingRecommendedHandles
        ),
      });
    },
    /**
     * What the provider charges for this bookable. The prices route reads the
     * stored bookable, so a declaration that was only just made answers after
     * the save - which the empty state names rather than reporting as a
     * provider failure. A bookable that is not yet listed is asked for like
     * a public one: the route answers it to whoever may read the bookable.
     */
    async fetchExternalPrices() {
      this.priceError = null;

      if (
        !this.isIfbsActive ||
        !this.handlesPricing ||
        this.externalPricesUnavailableReason
      ) {
        this.externalPrices = null;
        return;
      }

      const error = await this.loadExternalPrices(this.bookable);
      if (error) {
        this.priceError = this.$t("bookable.externalPrice.loadFailed");
      }
    },
    formatPrice(price) {
      return parseFloat(price || 0).toFixed(2);
    },
  },
};
</script>

<style scoped>
.ifbs-price-tile {
  transition: transform var(--scb-motion-base),
    box-shadow var(--scb-motion-base);
  border: 1px solid var(--scb-rule-strong) !important;
  background-color: var(--scb-surface-raised) !important;
}
</style>
