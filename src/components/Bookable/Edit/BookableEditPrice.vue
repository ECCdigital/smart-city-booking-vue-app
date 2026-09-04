<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Preise & Kapazität" icon="mdi-cash" />

    <v-expand-transition>
      <v-alert
        v-if="expertMode && showIfbsRecommendation"
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
            Empfehlung: Externe Datenquellen aktivieren
          </div>

          <div class="text-body-2 mb-3">
            Sie nutzen Fahrradboxen über
            <strong>ParkraumService</strong>. Buchungen können auch direkt über
            ParkraumService erfolgen und werden in diesem System nicht
            automatisch erfasst. Um Inkonsistenzen und Fehler bei
            Doppelbuchungen zu vermeiden, empfehlen wir dringend, die folgenden
            externen Datenquellen zu aktivieren:
          </div>

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
              Empfohlene Einstellungen übernehmen
            </v-btn>
            <v-btn
              v-else-if="missingRecommendedHandles.length > 0"
              small
              color="warning"
              class="mr-2"
              @click="activateMissingHandles"
            >
              <v-icon left small>mdi-plus-circle-outline</v-icon>
              Fehlende Quellen aktivieren
            </v-btn>
            <v-btn
              small
              text
              color="grey"
              @click="dismissIfbsRecommendation = true"
            >
              Hinweis ausblenden
            </v-btn>
          </div>
        </div>
      </v-alert>
    </v-expand-transition>

    <v-expand-transition>
      <v-card
        v-if="expertMode && isIfbsActive"
        id="be-section-pricing-external"
        class="mb-4 section-card"
        elevation="2"
        outlined
      >
        <v-card-title class="section-header pa-4">
          <v-icon class="mr-2">mdi-cloud-sync-outline</v-icon>
          <span class="text-h6 font-weight-bold">
            Externe Datenquelle (ParkraumService)
          </span>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
          <v-switch
            v-model="externalProvider.active"
            dense
            hide-details
            color="primary"
            class="mt-0 mb-4"
            @change="onExternalProviderChanged"
          >
            <template #label>
              <div>
                <div class="font-weight-medium">
                  Externe Preissteuerung aktivieren
                </div>
                <div class="text-caption text--secondary">
                  Daten von ParkraumService beziehen statt manuell zu pflegen
                </div>
              </div>
            </template>
          </v-switch>

          <v-expand-transition>
            <div v-if="externalProvider.active">
              <v-alert color="info" text dense border="left" class="mb-4">
                <div class="text-body-2">
                  Wählen Sie aus, welche Informationen extern bezogen werden
                  sollen. Nicht ausgewählte Bereiche können weiterhin manuell
                  gepflegt werden.
                </div>
              </v-alert>

              <v-row>
                <v-col cols="12" md="4">
                  <v-checkbox
                    v-model="externalProvider.handles"
                    value="pricing"
                    dense
                    hide-details
                    color="primary"
                    class="mt-0"
                    @change="onExternalProviderChanged"
                  >
                    <template #label>
                      <div>
                        <div class="font-weight-medium d-flex align-center">
                          <v-icon small class="mr-1" color="primary">
                            mdi-cash-multiple
                          </v-icon>
                          Preise
                        </div>
                        <div class="text-caption text--secondary">
                          Preise vom Anbieter beziehen
                        </div>
                      </div>
                    </template>
                  </v-checkbox>
                </v-col>
                <v-col cols="12" md="4">
                  <v-checkbox
                    v-model="externalProvider.handles"
                    value="availability"
                    dense
                    hide-details
                    color="primary"
                    class="mt-0"
                    @change="onExternalProviderChanged"
                  >
                    <template #label>
                      <div>
                        <div class="font-weight-medium d-flex align-center">
                          <v-icon small class="mr-1" color="primary">
                            mdi-calendar-check
                          </v-icon>
                          Verfügbarkeit
                        </div>
                        <div class="text-caption text--secondary">
                          Verfügbarkeit extern prüfen
                        </div>
                      </div>
                    </template>
                  </v-checkbox>
                </v-col>
                <v-col cols="12" md="4">
                  <v-checkbox
                    v-model="externalProvider.handles"
                    value="maxAmount"
                    dense
                    hide-details
                    color="primary"
                    class="mt-0"
                    @change="onExternalProviderChanged"
                  >
                    <template #label>
                      <div>
                        <div class="font-weight-medium d-flex align-center">
                          <v-icon small class="mr-1" color="primary">
                            mdi-counter
                          </v-icon>
                          Anzahl
                        </div>
                        <div class="text-caption text--secondary">
                          Max. Anzahl extern beziehen
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
                            {{ formatPrice(row.priceEur) }} €
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
                                  {{ formatPrice(externalServiceFee) }} €
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

    <template>
      <v-card
        id="be-section-pricing-base"
        class="mb-4 section-card"
        elevation="2"
        outlined
      >
        <v-card-title class="section-header pa-4">
          <v-icon class="mr-2">mdi-cog-outline</v-icon>
          <span class="text-h6 font-weight-bold">Grundeinstellungen</span>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
          <template v-if="expertMode">
            <v-row>
              <v-col cols="12" md="6">
                <v-switch
                  dense
                  hide-details
                  v-model="model.enableCoupons"
                  color="primary"
                >
                  <template v-slot:label>
                    <div>
                      <div class="font-weight-medium">
                        Gutscheine aktivieren
                      </div>
                      <div class="text-caption text--secondary">
                        Ermöglicht die Verwendung von Gutscheinen
                      </div>
                    </div>
                  </template>
                </v-switch>
              </v-col>
            </v-row>

            <v-divider class="my-4" />
          </template>

          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                background-color="accent"
                filled
                dense
                label="Verfügbare Anzahl"
                :hint="!model.amount ? 'Anzahl ist unbegrenzt!' : ''"
                :persistent-hint="!model.amount"
                v-model="model.amount"
                :disabled="handlesMaxAmount"
                :suffix="
                  model.priceType === 'per-square-meter' ? 'm²' : 'Stück'
                "
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                background-color="accent"
                filled
                dense
                label="Preisart"
                hide-details
                :disabled="handlesPricing"
                v-model="model.priceType"
                :items="priceTypes"
                item-text="name"
                item-value="id"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                background-color="accent"
                filled
                dense
                label="MwSt."
                hide-details
                :disabled="handlesPricing"
                v-model="model.priceValueAddedTax"
                suffix="%"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- The own price tiers step aside only where the provider really
           prices: a stale declaration without an assigned locker system must
           not leave the bookable with no price editor at all. -->
      <v-card
        v-if="!isIfbsActive || !handlesPricing"
        id="be-section-pricing-tiers"
        class="mb-4 section-card"
        elevation="2"
        outlined
      >
        <v-card-title
          class="section-header pa-4 d-flex justify-space-between align-center"
        >
          <div>
            <v-icon class="mr-2">mdi-cash-multiple</v-icon>
            <span class="text-h6 font-weight-bold">Preisgestaltung</span>
          </div>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
          <template v-if="expertMode">
            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="useGraduatedPrices"
                  dense
                  hide-details
                  color="primary"
                  class="mt-0"
                >
                  <template #label>
                    <div>
                      <div class="font-weight-medium d-flex align-center">
                        <v-icon small class="mr-2">
                          mdi-chart-line-variant
                        </v-icon>
                        <span>Staffelpreise aktivieren</span>
                        <v-chip
                          v-if="useGraduatedPrices"
                          x-small
                          color="primary"
                          class="ml-2"
                          label
                        >
                          {{ model.priceCategories.length }}
                          {{
                            model.priceCategories.length === 1
                              ? "Kategorie"
                              : "Kategorien"
                          }}
                        </v-chip>
                      </div>
                      <div class="text-caption text--secondary">
                        Definieren Sie unterschiedliche Preise basierend auf
                        Menge, Wochentag oder Feiertagen
                      </div>
                    </div>
                  </template>
                </v-switch>
              </v-col>
            </v-row>

            <v-divider class="my-4" />
          </template>

          <v-alert
            v-if="!expertMode && useGraduatedPrices"
            color="info"
            dense
            text
            class="mb-4"
          >
            {{ $t("bookable.edit.expertMode.graduatedPricesActive") }}
          </v-alert>

          <div v-if="!useGraduatedPrices && model.priceCategories[0]">
            <v-row align="center">
              <v-col cols="12" md="6">
                <v-text-field
                  background-color="accent"
                  filled
                  dense
                  label="Preis (netto)"
                  hide-details
                  v-model="model.priceCategories[0].priceEur"
                  prefix="€"
                  type="number"
                  step="0.01"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-switch
                  v-model="model.priceCategories[0].fixedPrice"
                  dense
                  hide-details
                  color="primary"
                >
                  <template v-slot:label>
                    <div>
                      <div class="font-weight-medium">Pauschalpreis</div>
                      <div class="text-caption text--secondary">
                        Der Grundpreis wird immer berechnet
                      </div>
                    </div>
                  </template>
                </v-switch>
              </v-col>
            </v-row>
          </div>

          <v-expand-transition>
            <div v-if="expertMode && useGraduatedPrices">
              <div class="d-flex justify-space-between align-center mb-3">
                <v-subheader class="pl-0">
                  <v-icon small class="mr-2"> mdi-format-list-numbered </v-icon>
                  Preis-Kategorien
                </v-subheader>
                <v-btn small color="primary" @click="addPriceCategory">
                  <v-icon left small>mdi-plus</v-icon>
                  Kategorie hinzufügen
                </v-btn>
              </div>

              <v-alert
                v-if="hasPriceCategories"
                color="info"
                dense
                text
                class="mb-4"
              >
                <div class="d-flex align-center">
                  <v-icon class="mr-3" color="info">
                    mdi-information-outline
                  </v-icon>
                  <div>
                    <strong>Tipp:</strong> Die Kategorien werden in der
                    angegebenen Reihenfolge geprüft. Die erste passende
                    Kategorie wird angewendet.
                  </div>
                </div>
              </v-alert>

              <div v-if="hasPriceCategories">
                <v-list two-line class="py-0">
                  <template
                    v-for="(priceCategory, idx) in model.priceCategories"
                  >
                    <v-list-item
                      :key="`price-${idx}`"
                      class="price-category-item elevation-1 mb-3 rounded"
                      @click="toggleExpand(idx)"
                    >
                      <v-list-item-avatar>
                        <v-avatar color="green" size="40">
                          <span class="white--text font-weight-bold">
                            {{ idx + 1 }}
                          </span>
                        </v-avatar>
                      </v-list-item-avatar>

                      <v-list-item-content>
                        <v-list-item-title class="d-flex align-center mb-1">
                          <span class="text-h6 font-weight-bold mr-2">
                            {{ formatPrice(priceCategory.priceEur) }} €
                          </span>
                          <v-chip
                            v-if="priceCategory.fixedPrice"
                            x-small
                            color="orange"
                            text-color="white"
                          >
                            Pauschal
                          </v-chip>
                        </v-list-item-title>

                        <v-list-item-subtitle
                          class="d-flex align-center flex-wrap"
                        >
                          <v-chip
                            x-small
                            class="mr-2"
                            color="blue-grey lighten-4"
                          >
                            <v-icon left x-small>mdi-ruler</v-icon>
                            {{ formatPriceRange(priceCategory) }}
                          </v-chip>

                          <v-chip
                            v-if="
                              priceCategory.weekdays &&
                              priceCategory.weekdays.length > 0
                            "
                            x-small
                            class="mr-2"
                            color="primary"
                          >
                            <v-icon left x-small>mdi-calendar-week</v-icon>
                            {{ priceCategory.weekdays.length }} Wochentag(e)
                          </v-chip>

                          <v-chip
                            v-if="
                              priceCategory.holidays &&
                              priceCategory.holidays.length > 0
                            "
                            x-small
                            class="mr-2"
                            color="red"
                          >
                            <v-icon left x-small>mdi-calendar-star</v-icon>
                            {{ priceCategory.holidays.length }} Feiertag(e)
                          </v-chip>
                        </v-list-item-subtitle>
                      </v-list-item-content>

                      <v-list-item-action>
                        <div class="d-flex align-center">
                          <v-btn
                            icon
                            small
                            @click.stop="removePriceCategory(idx)"
                            color="error"
                            :disabled="model.priceCategories.length <= 1"
                          >
                            <v-icon small>mdi-delete-outline</v-icon>
                          </v-btn>
                          <v-btn icon small>
                            <v-icon>
                              {{
                                isExpanded(idx)
                                  ? "mdi-chevron-up"
                                  : "mdi-chevron-down"
                              }}
                            </v-icon>
                          </v-btn>
                        </div>
                      </v-list-item-action>
                    </v-list-item>

                    <v-expand-transition :key="`expand-${idx}`">
                      <v-card
                        v-show="isExpanded(idx)"
                        flat
                        class="mx-3 mb-3 pa-4 price-card"
                        color="grey lighten-5"
                      >
                        <v-row>
                          <v-col cols="12" md="4">
                            <v-text-field
                              background-color="accent"
                              filled
                              dense
                              label="Preis (netto) *"
                              hide-details="auto"
                              v-model="priceCategory.priceEur"
                              prefix="€"
                              type="number"
                              step="0.01"
                              :rules="[
                                (v) => v !== '' || 'Preis ist erforderlich',
                              ]"
                            />
                          </v-col>

                          <v-col cols="12" md="8">
                            <v-switch
                              v-model="priceCategory.fixedPrice"
                              dense
                              hide-details
                              color="primary"
                            >
                              <template v-slot:label>
                                <div>
                                  <div class="font-weight-medium">
                                    Pauschalpreis
                                  </div>
                                  <div class="text-caption text--secondary">
                                    Der Grundpreis wird immer berechnet,
                                    unabhängig von der Menge
                                  </div>
                                </div>
                              </template>
                            </v-switch>
                          </v-col>
                        </v-row>

                        <v-divider class="my-3" />

                        <v-subheader class="pl-0">
                          <v-icon small class="mr-2">mdi-ruler</v-icon>
                          Gültigkeitsbereich
                        </v-subheader>
                        <v-row>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="priceCategory.interval.start"
                              background-color="accent"
                              filled
                              dense
                              label="Gültig ab"
                              type="number"
                              hide-details
                              :suffix="intervalSuffix"
                              clearable
                            />
                          </v-col>
                          <v-col cols="12" md="6">
                            <v-text-field
                              v-model="priceCategory.interval.end"
                              background-color="accent"
                              filled
                              dense
                              label="Gültig bis"
                              type="number"
                              hide-details
                              :suffix="intervalSuffix"
                              clearable
                            />
                          </v-col>
                        </v-row>

                        <v-divider class="my-3" />

                        <v-subheader class="pl-0">
                          <v-icon small class="mr-2">
                            mdi-calendar-clock
                          </v-icon>
                          Zeitliche Einschränkungen
                        </v-subheader>
                        <v-row>
                          <v-col cols="12" md="6">
                            <v-select
                              background-color="accent"
                              filled
                              dense
                              label="Wochentage"
                              hide-details
                              v-model="priceCategory.weekdays"
                              multiple
                              chips
                              small-chips
                              :items="weekdays"
                              item-text="name"
                              item-value="id"
                            >
                              <template v-slot:selection="{ item, index }">
                                <v-chip
                                  v-if="index < 3"
                                  small
                                  color="primary"
                                  class="mr-1"
                                >
                                  {{ getWeekdayName(item.id) }}
                                </v-chip>
                                <span
                                  v-if="
                                    index === 3 &&
                                    priceCategory.weekdays.length > 3
                                  "
                                  class="grey--text text-caption"
                                >
                                  (+{{ priceCategory.weekdays.length - 3 }}
                                  weitere)
                                </span>
                              </template>
                            </v-select>
                          </v-col>

                          <v-col cols="12" md="6">
                            <v-combobox
                              background-color="accent"
                              filled
                              dense
                              multiple
                              chips
                              small-chips
                              clearable
                              label="Feiertage"
                              hide-details
                              :items="availableHolidays"
                              item-text="name"
                              item-value="date"
                              v-model="priceCategory.holidays"
                            >
                              <template v-slot:prepend-item>
                                <v-list-item ripple>
                                  <v-select
                                    v-model="selectedState"
                                    :items="states"
                                    item-text="text"
                                    item-value="value"
                                    dense
                                    hide-details
                                    outlined
                                    label="Bundesland"
                                    prepend-icon="mdi-filter"
                                    @change="fetchHolidays"
                                  />
                                </v-list-item>
                                <v-divider class="mx-2" />
                              </template>
                              <template v-slot:selection="{ item, index }">
                                <v-chip
                                  v-if="index < 2"
                                  small
                                  color="red"
                                  text-color="white"
                                  class="mr-1"
                                >
                                  {{ item.name }}
                                </v-chip>
                                <span
                                  v-if="
                                    index === 2 &&
                                    priceCategory.holidays.length > 2
                                  "
                                  class="grey--text text-caption"
                                >
                                  (+{{ priceCategory.holidays.length - 2 }}
                                  weitere)
                                </span>
                              </template>
                            </v-combobox>
                          </v-col>
                        </v-row>
                      </v-card>
                    </v-expand-transition>

                    <v-divider
                      v-if="idx < model.priceCategories.length - 1"
                      :key="`divider-${idx}`"
                      class="my-2"
                    />
                  </template>
                </v-list>
              </div>

              <div v-else class="text-center py-8">
                <v-icon large color="grey lighten-1" class="mb-2">
                  mdi-cash-remove
                </v-icon>
                <div class="text-h6 grey--text mb-2">
                  Noch keine Preis-Kategorien definiert
                </div>
                <div class="text-body-2 grey--text text--darken-1 mb-4">
                  Fügen Sie Kategorien hinzu, um unterschiedliche Preise zu
                  definieren
                </div>
                <v-btn small text color="primary" @click="addPriceCategory">
                  <v-icon left small>mdi-plus</v-icon>
                  Erste Kategorie hinzufügen
                </v-btn>
              </div>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>
    </template>
  </v-form>
</template>

<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import debounce from "lodash/debounce";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiHolidaysService from "@/services/api/ApiHolidaysService";
import bookableExpertMode from "@/mixins/bookableExpertMode";
import externalPrices from "@/mixins/externalPrices";
import {
  IFBS_PROVIDER,
  providerHandles,
} from "@/utils/bookableExternalProviders";

const DEFAULT_EXTERNAL_PROVIDER = {
  active: false,
  provider: IFBS_PROVIDER,
  handles: [],
  config: {
    locationId: null,
    amount: 1,
  },
};

export default {
  name: "BookableEditPrice",
  components: { BaseSection },
  mixins: [bookableExpertMode, externalPrices],
  props: { bookable: { type: Object, required: true } },
  data() {
    return {
      useGraduatedPrices: false,
      valid: false,
      expandedCategories: [],
      accessPoints: [],
      priceError: null,
      priceTypes: [
        { id: "per-item", name: "pro Stück" },
        { id: "per-hour", name: "pro Stunde" },
        { id: "per-day", name: "pro Tag" },
        { id: "per-square-meter", name: "pro m²" },
      ],
      weekdays: [
        { id: 1, name: "Montag", short: "Mo" },
        { id: 2, name: "Dienstag", short: "Di" },
        { id: 3, name: "Mittwoch", short: "Mi" },
        { id: 4, name: "Donnerstag", short: "Do" },
        { id: 5, name: "Freitag", short: "Fr" },
        { id: 6, name: "Samstag", short: "Sa" },
        { id: 0, name: "Sonntag", short: "So" },
      ],
      availableHolidays: [],
      selectedState: null,
      states: [
        { text: "Bundesweit", value: null },
        { text: "Brandenburg", value: "BB" },
        { text: "Berlin", value: "BE" },
        { text: "Baden-Württemberg", value: "BW" },
        { text: "Bayern", value: "BY" },
        { text: "Hansestadt Bremen", value: "HB" },
        { text: "Hessen", value: "HE" },
        { text: "Hansestadt Hamburg", value: "HH" },
        { text: "Mecklenburg Vorpommern", value: "MV" },
        { text: "Niedersachsen", value: "NI" },
        { text: "Nordrhein-Westfalen", value: "NW" },
        { text: "Rheinland-Pfalz", value: "RP" },
        { text: "Schleswig-Holstein", value: "SH" },
        { text: "Saarland", value: "SL" },
        { text: "Sachsen", value: "SN" },
        { text: "Sachsen-Anhalt", value: "ST" },
        { text: "Thüringen", value: "TH" },
      ],
      dismissIfbsRecommendation: false,
      // Detached fallback for read/v-model before the provider is persisted.
      _ifbsProviderFallback: JSON.parse(
        JSON.stringify(DEFAULT_EXTERNAL_PROVIDER)
      ),
    };
  },
  computed: {
    model: {
      get() {
        return this.bookable;
      },
      set(val) {
        this._emitDebounced(val);
      },
    },
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
      return this.findIfbsProvider() || this._ifbsProviderFallback;
    },
    handlesPricing() {
      return providerHandles(this.externalProvider, "pricing");
    },
    handlesAvailability() {
      return providerHandles(this.externalProvider, "availability");
    },
    handlesMaxAmount() {
      return providerHandles(this.externalProvider, "maxAmount");
    },
    // Why there is nothing to preview: the prices route is the public one,
    // so it answers only for a stored, publicly visible bookable.
    externalPricesUnavailableReason() {
      return this.externalPricesUnavailableKey(this.bookable);
    },
    intervalSuffix() {
      const map = {
        "per-hour": "Std.",
        "per-day": "Tage",
        "per-square-meter": "m²",
      };
      return map[this.model.priceType] || "Stück";
    },
    hasPriceCategories() {
      return (
        this.model.priceCategories && this.model.priceCategories.length > 0
      );
    },
    ifbsRecommendations() {
      const handles = this.externalProvider.active
        ? this.externalProvider.handles || []
        : [];

      return [
        {
          handle: "availability",
          label: "Verfügbarkeit",
          hint: "Verhindert falsche Anzeigen von verfügbaren Zeiten",
          active: handles.includes("availability"),
          critical: true,
        },
        {
          handle: "maxAmount",
          label: "Max. Anzahl",
          hint: "Korrekte Kapazität sicherstellen",
          active: handles.includes("maxAmount"),
          critical: true,
        },
        {
          handle: "pricing",
          label: "Preise",
          hint: "Einheitliche Preisgestaltung",
          active: handles.includes("pricing"),
          critical: false,
        },
      ];
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
      const criticalMissing = this.ifbsRecommendations.some(
        (r) => r.critical && !handles.includes(r.handle)
      );

      return criticalMissing;
    },
  },
  created() {
    this._emitDebounced = debounce((val) => {
      this.$emit("update:bookable", { ...val });
    }, 200);
  },
  watch: {
    "bookable.id": {
      immediate: true,
      handler() {
        this._ifbsProviderFallback = JSON.parse(
          JSON.stringify(DEFAULT_EXTERNAL_PROVIDER)
        );
        this.fetchHolidays();
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
    bookable: {
      immediate: true,
      handler(val) {
        if (!val?.priceCategories) return;
        const cats = val.priceCategories;
        this.useGraduatedPrices =
          cats.length > 1 ||
          cats.some(
            (c) =>
              c.interval?.start !== null ||
              c.interval?.end !== null ||
              (c.weekdays && c.weekdays.length > 0) ||
              (c.holidays && c.holidays.length > 0)
          );
      },
    },
    useGraduatedPrices(enabled) {
      if (!enabled) {
        const first = this.model.priceCategories[0] || {};
        this.$set(this.model, "priceCategories", [
          {
            priceEur: first.priceEur || 0,
            interval: { start: null, end: null },
            fixedPrice: first.fixedPrice || false,
            holidays: [],
            weekdays: [],
          },
        ]);
        this._emitDebounced({ ...this.model });
      } else {
        if (this.hasPriceCategories) {
          this.expandedCategories = [0];
        }
      }
    },
  },
  methods: {
    findIfbsProvider() {
      return (
        this.model.externalProviders?.find(
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
        // Without the list the panel cannot tell that a locker system is
        // assigned and stays away; the access tab is where that failure has
        // a place to be reported.
        console.error(
          `Could not read the access points of tenant ${this.bookable?.tenantId}`,
          error
        );
        this.accessPoints = [];
      }
    },
    ensureExternalProviderExists() {
      const existing = this.findIfbsProvider();
      if (existing) {
        return existing;
      }

      if (!this.model.externalProviders) {
        this.$set(this.model, "externalProviders", []);
      }

      // Persist current fallback state (may already include UI edits via v-model).
      const provider = JSON.parse(JSON.stringify(this._ifbsProviderFallback));
      this.model.externalProviders.push(provider);
      this.syncExternalProviderConfig();
      this._emitDebounced({ ...this.model });
      return provider;
    },
    // What the provider prices against: the location behind the assigned
    // locker system, and the bookable's own capacity.
    syncExternalProviderConfig() {
      const accessPoint = this.ifbsAccessPoint;
      const provider = this.findIfbsProvider();
      if (!accessPoint || !provider) return;

      const locationId = accessPoint.externalId;
      const amount = Number(this.model.amount) || 1;

      if (
        provider.config?.locationId === locationId &&
        provider.config?.amount === amount
      ) {
        return;
      }

      this.$set(provider, "config", { locationId, amount });
      this._emitDebounced({ ...this.model });
    },
    onExternalProviderChanged() {
      this.ensureExternalProviderExists();
      this.syncExternalProviderConfig();
      this._emitDebounced({ ...this.model });
    },
    activateRecommendedIfbs() {
      const provider = this.ensureExternalProviderExists();

      provider.active = true;
      this.$set(provider, "handles", ["availability", "maxAmount", "pricing"]);
      this.syncExternalProviderConfig();

      this._emitDebounced({ ...this.model });
      this.fetchExternalPrices();
    },

    activateMissingHandles() {
      const provider = this.ensureExternalProviderExists();
      const current = provider.handles || [];

      this.missingRecommendedHandles.forEach((handle) => {
        if (!current.includes(handle)) {
          current.push(handle);
        }
      });

      this.$set(provider, "handles", [...current]);
      this._emitDebounced({ ...this.model });
    },
    async validate() {
      return this.$refs.form ? this.$refs.form.validate() : true;
    },
    resetValidation() {
      this.$refs.form?.resetValidation();
    },
    checkNull(path) {
      const keys = path.split(".");
      let obj = this.model;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      const lastKey = keys[keys.length - 1];
      if (obj[lastKey] === "") {
        obj[lastKey] = null;
      }
    },
    removePriceCategory(index) {
      this.model.priceCategories.splice(index, 1);
      const expandIdx = this.expandedCategories.indexOf(index);
      if (expandIdx > -1) {
        this.expandedCategories.splice(expandIdx, 1);
      }
    },
    async fetchHolidays() {
      const response = await ApiHolidaysService.getHolidays(
        "DE",
        this.selectedState
      );
      this.availableHolidays = response.data
        .filter((h) => h.type === "public")
        .map((h) => ({
          name: h.name,
          countryCode: "DE",
          stateCode: this.selectedState,
        }));
    },
    /**
     * What the provider charges for this bookable. The prices route reads the
     * stored bookable, so a declaration that was only just made answers after
     * the save - and the route answers at all only for a publicly visible
     * bookable, which the empty state names rather than reporting as a
     * provider failure.
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
    addPriceCategory() {
      const last =
        this.model.priceCategories[this.model.priceCategories.length - 1];
      this.model.priceCategories.push({
        priceEur: 0,
        interval: {
          start: last ? last.interval.end : null,
          end: null,
        },
        fixedPrice: false,
        holidays: [],
        weekdays: [],
      });
      this.expandedCategories.push(this.model.priceCategories.length - 1);
    },
    toggleExpand(index) {
      const idx = this.expandedCategories.indexOf(index);
      if (idx > -1) {
        this.expandedCategories.splice(idx, 1);
      } else {
        this.expandedCategories.push(index);
      }
    },
    isExpanded(index) {
      return this.expandedCategories.includes(index);
    },
    getWeekdayName(id) {
      const day = this.weekdays.find((d) => d.id === id);
      return day ? day.short : "";
    },
    formatPriceRange(category) {
      const start = category.interval?.start;
      const end = category.interval?.end;

      if (start !== null && end !== null) {
        return `${start} - ${end} ${this.intervalSuffix}`;
      } else if (start !== null) {
        return `ab ${start} ${this.intervalSuffix}`;
      } else if (end !== null) {
        return `bis ${end} ${this.intervalSuffix}`;
      }
      return "Keine Begrenzung";
    },
    formatPrice(price) {
      return parseFloat(price || 0).toFixed(2);
    },
  },
  beforeCreate() {
    this._emitDebounced = debounce((val) => {
      this.$emit("update:bookable", { ...val });
    }, 200);
  },
};
</script>

<style scoped>
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

.price-category-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme--dark .price-category-item {
  background-color: rgba(255, 255, 255, 0.05);
}

.price-card {
  border-radius: 8px !important;
}

.ifbs-price-tile {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  background-color: var(--v-accent-base, #f5f5f5) !important;
}

.theme--dark .ifbs-price-tile {
  border-color: rgba(255, 255, 255, 0.1) !important;
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>
