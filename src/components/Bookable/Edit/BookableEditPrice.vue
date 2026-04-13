<template>
  <v-form ref="form" v-model="valid">
    <BaseSection title="Preise" icon="mdi-cash" />

    <v-expand-transition>
      <v-alert
        v-if="showIfbsRecommendation"
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
            <strong>ParkraumService</strong>. Buchungen können auch
            direkt über ParkraumService erfolgen und werden in diesem System
            nicht automatisch erfasst. Um Inkonsistenzen und Fehler bei
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
        v-if="isIfbsActive"
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

              <v-expand-transition>
                <div
                  v-if="
                    externalProvider.handles &&
                    externalProvider.handles.length > 0
                  "
                >
                  <v-divider class="my-4" />

                  <v-progress-linear
                    v-if="isLoadingIfbs"
                    indeterminate
                    color="primary"
                    class="mb-4"
                  />

                  <v-alert
                    v-if="ifbsError"
                    type="error"
                    dense
                    text
                    class="mb-4"
                  >
                    {{ ifbsError }}
                    <template #append>
                      <v-btn small text color="error" @click="fetchIfbsData">
                        Erneut versuchen
                      </v-btn>
                    </template>
                  </v-alert>

                  <div v-if="hasIfbsData && !isLoadingIfbs">
                    <v-row v-if="ifbsStatus && handlesMaxAmount" class="mb-4">
                      <v-col cols="12" md="6">
                        <v-card flat class="pa-3 rounded-lg ifbs-price-tile">
                          <div class="d-flex align-center">
                            <v-icon color="primary" class="mr-3">
                              mdi-locker-multiple
                            </v-icon>
                            <div>
                              <div
                                class="text-caption text--secondary font-weight-medium"
                              >
                                Fahrradboxen gesamt
                              </div>
                              <div class="text-h6 font-weight-bold">
                                {{ ifbsStatus.LocationTotal ?? "–" }}
                              </div>
                            </div>
                          </div>
                        </v-card>
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-card flat class="pa-3 rounded-lg ifbs-price-tile">
                          <div class="d-flex align-center">
                            <v-icon color="primary" class="mr-3">
                              mdi-timer-lock-outline
                            </v-icon>
                            <div>
                              <div
                                class="text-caption text--secondary font-weight-medium"
                              >
                                Pufferzeit
                              </div>
                              <div class="text-h6 font-weight-bold">
                                {{ formatDuration(ifbsStatus.LocationBuffer) }}
                              </div>
                              <div
                                v-if="ifbsStatus.LocationBuffer"
                                class="text-caption text--secondary"
                              >
                                Vor und nach jeder Buchung
                              </div>
                            </div>
                          </div>
                        </v-card>
                      </v-col>
                    </v-row>

                    <v-divider
                      v-if="
                        ifbsStatus &&
                        ifbsPrices &&
                        handlesMaxAmount &&
                        handlesPricing
                      "
                      class="my-4"
                    />

                    <div v-if="ifbsPrices && handlesPricing">
                      <v-row>
                        <v-col
                          v-for="row in ifbsPriceRows"
                          :key="row.key"
                          cols="6"
                          sm="4"
                          md="4"
                          lg="2"
                        >
                          <v-card
                            flat
                            class="pa-3 rounded-lg text-center ifbs-price-tile"
                          >
                            <v-icon color="primary" class="mb-2">
                              {{ row.icon }}
                            </v-icon>
                            <div class="text-h6 font-weight-bold">
                              {{ row.value }}
                            </div>
                            <div class="text-caption text--secondary">
                              {{ row.label }}
                            </div>
                          </v-card>
                        </v-col>
                      </v-row>

                      <v-divider class="my-4" />

                      <v-row>
                        <v-col cols="12" md="6">
                          <v-card flat class="pa-3 rounded-lg ifbs-price-tile">
                            <div class="d-flex align-center">
                              <v-icon color="primary" class="mr-3">
                                mdi-cash-plus
                              </v-icon>
                              <div>
                                <div
                                  class="text-caption text--secondary font-weight-medium"
                                >
                                  Servicegebühr
                                </div>
                                <div class="text-h6 font-weight-bold">
                                  {{
                                    formatPrice(
                                      ifbsPrices["Preis_Servicegebühr"]
                                    )
                                  }}
                                  €
                                </div>
                              </div>
                            </div>
                          </v-card>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-card flat class="pa-3 rounded-lg ifbs-price-tile">
                            <div class="d-flex align-center">
                              <v-icon color="primary" class="mr-3">
                                mdi-timer-outline
                              </v-icon>
                              <div>
                                <div
                                  class="text-caption text--secondary font-weight-medium"
                                >
                                  Mindestnutzungsdauer
                                </div>
                                <div class="text-h6 font-weight-bold">
                                  {{
                                    formatDuration(
                                      ifbsPrices["minimum_usage_time_mins"]
                                    )
                                  }}
                                </div>
                              </div>
                            </div>
                          </v-card>
                        </v-col>
                      </v-row>
                    </div>
                  </div>

                  <div
                    v-if="!hasIfbsData && !isLoadingIfbs && !ifbsError"
                    class="text-center py-6"
                  >
                    <v-icon large color="grey lighten-1">
                      mdi-cloud-question
                    </v-icon>
                    <div class="text-body-2 grey--text mt-2">
                      Keine Daten verfügbar
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
      <v-card class="mb-4 section-card" elevation="2" outlined>
        <v-card-title class="section-header pa-4">
          <v-icon class="mr-2">mdi-cog-outline</v-icon>
          <span class="text-h6 font-weight-bold">Grundeinstellungen</span>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
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
                    <div class="font-weight-medium">Gutscheine aktivieren</div>
                    <div class="text-caption text--secondary">
                      Ermöglicht die Verwendung von Gutscheinen
                    </div>
                  </div>
                </template>
              </v-switch>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

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

      <v-card
        v-if="!isIfbsActive || !handlesPricing"
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
            <div v-if="useGraduatedPrices">
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
import ApiHolidaysService from "@/services/api/ApiHolidaysService";
import ApiLockerService from "@/services/api/ApiLockerService";

const DEFAULT_EXTERNAL_PROVIDER = {
  active: false,
  provider: "ifbs",
  handles: [],
  config: {
    locationId: null,
    amount: 1,
  },
};

export default {
  name: "BookableEditPrice",
  components: { BaseSection },
  props: { bookable: { type: Object, required: true } },
  data() {
    return {
      useGraduatedPrices: false,
      valid: false,
      expandedCategories: [],
      isLoadingIfbs: false,
      ifbsPrices: null,
      ifbsStatus: null,
      ifbsError: null,
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
    isIfbsActive() {
      const details = this.bookable?.lockerDetails;
      if (!details?.active) return false;
      return details.units?.some((u) => u.lockerSystem === "ifbs") ?? false;
    },
    ifbsUnit() {
      if (!this.isIfbsActive) return null;
      return this.bookable.lockerDetails.units.find(
        (u) => u.lockerSystem === "ifbs"
      );
    },
    externalProvider() {
      return this.getOrCreateIfbsProvider();
    },
    handlesPricing() {
      return (
        this.externalProvider.active &&
        this.externalProvider.handles.includes("pricing")
      );
    },
    handlesAvailability() {
      return (
        this.externalProvider.active &&
        this.externalProvider.handles.includes("availability")
      );
    },
    handlesMaxAmount() {
      return (
        this.externalProvider.active &&
        this.externalProvider.handles.includes("maxAmount")
      );
    },
    hasIfbsData() {
      return !!this.ifbsPrices || !!this.ifbsStatus;
    },
    ifbsPriceRows() {
      if (!this.ifbsPrices) return [];
      return [
        {
          key: "1min",
          label: "pro Minute",
          value: this.formatPrice(this.ifbsPrices["Preis_1 Minute"]) + " €",
          icon: "mdi-timer-sand",
        },
        {
          key: "1h",
          label: "pro Stunde",
          value: this.formatPrice(this.ifbsPrices["Preis_1h"]) + " €",
          icon: "mdi-clock-outline",
        },
        {
          key: "1d",
          label: "pro Tag",
          value: this.formatPrice(this.ifbsPrices["Preis_1d"]) + " €",
          icon: "mdi-calendar-today",
        },
        {
          key: "1w",
          label: "pro Woche",
          value: this.formatPrice(this.ifbsPrices["Preis_1w"]) + " €",
          icon: "mdi-calendar-week",
        },
        {
          key: "1m",
          label: "pro Monat",
          value: this.formatPrice(this.ifbsPrices["Preis_1m"]) + " €",
          icon: "mdi-calendar-month",
        },
        {
          key: "1y",
          label: "pro Jahr",
          value: this.formatPrice(this.ifbsPrices["Preis_1y"]) + " €",
          icon: "mdi-calendar-star",
        },
      ];
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
        this.fetchHolidays();
      },
    },
    isIfbsActive: {
      immediate: true,
      handler(active) {
        if (active) {
          this.ensureExternalProviderExists();
          this.syncExternalProviderConfig();
          if (this.externalProvider.active) {
            this.fetchIfbsData();
          }
        } else {
          this.ifbsPrices = null;
          this.ifbsStatus = null;
          this.ifbsError = null;
        }
      },
    },
    "externalProvider.active"(active) {
      if (active && this.isIfbsActive) {
        this.fetchIfbsData();
      }
    },
    "externalProvider.handles": {
      deep: true,
      handler() {
        if (
          this.externalProvider.active &&
          this.isIfbsActive &&
          !this.hasIfbsData &&
          !this.isLoadingIfbs
        ) {
          this.fetchIfbsData();
        }
      },
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
    ensureExternalProviderExists() {
      if (!this.model.externalProviders) {
        this.$set(this.model, "externalProviders", []);
      }

      const existing = this.model.externalProviders.find(
        (p) => p.provider === "ifbs"
      );

      if (!existing) {
        this.model.externalProviders.push({
          ...JSON.parse(JSON.stringify(DEFAULT_EXTERNAL_PROVIDER)),
        });
        this._emitDebounced({ ...this.model });
      }
    },
    getOrCreateIfbsProvider() {
      if (!this.model.externalProviders) {
        this.$set(this.model, "externalProviders", []);
      }

      let provider = this.model.externalProviders.find(
        (p) => p.provider === "ifbs"
      );

      if (!provider) {
        provider = {
          ...JSON.parse(JSON.stringify(DEFAULT_EXTERNAL_PROVIDER)),
        };
        this.model.externalProviders.push(provider);
        this._emitDebounced({ ...this.model });
      }

      return provider;
    },
    syncExternalProviderConfig() {
      const unit = this.ifbsUnit;
      if (!unit) return;

      const provider = this.externalProvider;
      const needsUpdate =
        provider.config.locationId !== unit.locationId ||
        provider.config.amount !== (unit.amount || 1);

      if (needsUpdate) {
        this.$set(provider, "config", {
          locationId: unit.locationId,
          amount: unit.amount || 1,
        });
        this._emitDebounced({ ...this.model });
      }
    },
    onExternalProviderChanged() {
      this._emitDebounced({ ...this.model });
    },
    activateRecommendedIfbs() {
      this.ensureExternalProviderExists();
      const provider = this.externalProvider;

      provider.active = true;
      this.$set(provider, "handles", ["availability", "maxAmount", "pricing"]);

      this._emitDebounced({ ...this.model });
      this.fetchIfbsData();
    },

    activateMissingHandles() {
      const provider = this.externalProvider;
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
    formatDuration(minutes) {
      const mins = parseInt(minutes, 10);
      if (!mins || mins === 0) return "Keine";

      const weeks = Math.floor(mins / 10080);
      const days = Math.floor((mins % 10080) / 1440);
      const hours = Math.floor((mins % 1440) / 60);
      const remainingMins = mins % 60;

      const parts = [];
      if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? "Woche" : "Wochen"}`);
      if (days > 0) parts.push(`${days} ${days === 1 ? "Tag" : "Tage"}`);
      if (hours > 0)
        parts.push(`${hours} ${hours === 1 ? "Stunde" : "Stunden"}`);
      if (remainingMins > 0) parts.push(`${remainingMins} Min.`);

      return parts.join(", ");
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
    async fetchIfbsData() {
      const unit = this.ifbsUnit;
      if (!unit?.locationId || !this.bookable?.tenantId) return;

      this.isLoadingIfbs = true;
      this.ifbsError = null;

      const tenantId = this.bookable.tenantId;
      const locationId = unit.locationId;

      const [priceResult, statusResult] = await Promise.allSettled([
        ApiLockerService.getPrice(tenantId, "ifbs", locationId),
        ApiLockerService.getLocationStatus(tenantId, "ifbs", locationId),
      ]);

      if (priceResult.status === "fulfilled") {
        this.ifbsPrices = priceResult.value.data;
      } else {
        this.ifbsPrices = null;
      }

      if (statusResult.status === "fulfilled") {
        this.ifbsStatus = statusResult.value.data;
      } else {
        this.ifbsStatus = null;
      }

      if (
        priceResult.status === "rejected" &&
        statusResult.status === "rejected"
      ) {
        this.ifbsError = "Daten konnten nicht vom IFBS-Dienst geladen werden.";
      } else if (priceResult.status === "rejected") {
        this.ifbsError =
          "Preise konnten nicht geladen werden. Status wurde erfolgreich abgerufen.";
      } else if (statusResult.status === "rejected") {
        this.ifbsError =
          "Status konnte nicht geladen werden. Preise wurden erfolgreich abgerufen.";
      }

      this.isLoadingIfbs = false;
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
