<template>
  <v-container v-if="!isLoading" style="max-width: 1200px">
    <div class="d-flex">
      <v-btn icon class="ms-n14 me-5 accent" @click="goBack">
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <h2 class="mb-4">
        Buchungsobjekt {{ this.mode === "create" ? "erstellen" : "bearbeiten" }}
      </h2>
    </div>
    <v-row>
      <v-col>
        <v-select
          background-color="accent"
          filled
          label="Typ"
          hide-details
          v-model="type"
          :items="bookableTypes"
          item-text="title"
          item-value="key"
          disabled
        ></v-select>
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          label="Mandant"
          hide-details
          disabled
          v-model="tenantId"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row v-if="type === 'ticket'">
      <v-col>
        <v-select
          background-color="accent"
          filled
          label="Veranstaltung"
          hide-details
          v-model="eventId"
          item-value="id"
          name="information.name"
          item-text="information.name"
          :items="events"
        ></v-select>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          label="Bezeichnung"
          hide-details
          v-model="title"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <ChooseFile
          v-model="imgUrl"
          :allow-protected="false"
          :tenant-id="tenantId"
          filled
          images-only
          label="Cover-Bild"
          background-color="accent"
          forced-subdirectory="rooms"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <Tiptap v-model="description" label="Beschreibung"></Tiptap>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          label="Ort"
          hide-details
          v-model="location"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-combobox
          v-model="tags"
          :items="tagsAvailable"
          label="Tags"
          hide-selected
          no-data-text="Keine Tags angelegt"
          multiple
          background-color="accent"
          clearable
          chips
          filled
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="removeTags(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
      <v-col>
        <v-combobox
          v-model="flags"
          :items="flagsAvailable"
          label="Flags"
          hide-selected
          no-data-text="Keine Flags angelegt"
          multiple
          background-color="accent"
          clearable
          chips
          filled
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="removeFlags(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
    </v-row>

    <h3 class="mt-10 mb-4">Preise</h3>
    <div class="d-flex align-center mb-4">
      <v-tooltip bottom max-width="300" open-delay="200">
        <template v-slot:activator="{ on, attrs }">
          <div v-on="on" v-bind="attrs">
            <v-switch
              dense
              label="Gutscheine aktivieren"
              hide-details
              v-model="enableCoupons"
            ></v-switch>
          </div>
        </template>
        <span>
          Aktivieren Sie diese Option, um Gutscheine für dieses Buchungsobjekt
          zu ermöglichen. Gutscheine können dann beim Checkout eingelöst werden.
        </span>
      </v-tooltip>
    </div>
    <v-row>
      <v-col class="col-12 col-md-3">
        <v-select
          background-color="accent"
          filled
          label="Preisart"
          hide-details
          v-model="priceType"
          :items="priceTypes"
          item-text="name"
          item-value="id"
        ></v-select>
      </v-col>
      <v-col class="col-12 col-md-2">
        <v-text-field
          background-color="accent"
          filled
          label="Verfügbare Anzahl"
          :hint="!amount ? 'Anzahl ist unbegrenzt!' : ''"
          :persistent-hint="!amount"
          v-model="amount"
          :suffix="priceType === 'per-square-meter' ? 'm²' : 'Stück'"
        ></v-text-field>
      </v-col>
      <v-col v-if="!useGraduatedPrices" class="col-12 col-md-3">
        <v-text-field
          v-if="priceCategories[0]"
          background-color="accent"
          filled
          label="Preis (netto)"
          hide-details
          v-model="priceCategories[0].priceEur"
          suffix="Euro"
        ></v-text-field>
      </v-col>
      <v-col class="col-12 col-md-2">
        <v-text-field
          background-color="accent"
          filled
          label="MwSt."
          hide-details
          v-model="priceValueAddedTax"
          suffix="%"
        ></v-text-field>
      </v-col>

      <v-col v-if="!useGraduatedPrices" class="col-12 col-md-1">
        <v-tooltip top max-width="300" open-delay="400">
          <template v-slot:activator="{ on, attrs }">
            <div v-bind="attrs" v-on="on">
              <v-checkbox
                v-if="priceCategories[0]"
                v-model="priceCategories[0].fixedPrice"
                label="Pauschalpreis"
              >
              </v-checkbox>
            </div>
          </template>
          <span> Bei Aktivierung wird immer der Grundpreis berechnet. </span>
        </v-tooltip>
      </v-col>
    </v-row>

    <v-row>
      <v-col v-if="!useGraduatedPrices">
        <v-btn dense outlined hide-details @click="useGraduatedPrices = true">
          Staffelpreise
        </v-btn>
      </v-col>
    </v-row>

    <v-card v-if="useGraduatedPrices" flat outlined rounded class="mt-3">
      <v-card-subtitle
        class="d-flex justify-space-between mb-4"
        style="background-color: var(--v-accent-base)"
      >
        <span class="text-h6">Preis-Kategorien</span>
      </v-card-subtitle>
      <v-card-text>
        <div v-for="(priceCategory, idx) in priceCategories" :key="idx">
          <div>
            <v-row>
              <v-col class="col-12 col-md-3">
                <v-text-field
                  background-color="accent"
                  filled
                  label="Preis (netto)"
                  hide-details
                  v-model="priceCategory.priceEur"
                  suffix="Euro"
                ></v-text-field>
              </v-col>
              <v-col class="col-6 col-md-2">
                <v-text-field
                  v-model="priceCategory.interval.start"
                  background-color="accent"
                  filled
                  label="Gültig ab"
                  type="number"
                  :suffix="intervalSuffix"
                  @blur="checkNull('priceCategories.interval.start')"
                ></v-text-field>
              </v-col>
              <v-col class="col-6 col-md-2">
                <v-text-field
                  v-model="priceCategory.interval.end"
                  background-color="accent"
                  filled
                  label="Gültig bis"
                  type="number"
                  :suffix="intervalSuffix"
                  @blur="checkNull('priceCategories.interval.start')"
                ></v-text-field>
              </v-col>
              <v-col class="col-12 col-md-2">
                <v-tooltip top max-width="300" open-delay="400">
                  <template v-slot:activator="{ on, attrs }">
                    <div v-bind="attrs" v-on="on">
                      <v-checkbox
                        v-model="priceCategory.fixedPrice"
                        label="Pauschalpreis"
                      >
                      </v-checkbox>
                    </div>
                  </template>
                  <span>
                    Bei Aktivierung wird immer der Grundpreis berechnet.
                  </span>
                </v-tooltip>
              </v-col>
              <v-col class="" style="text-align: right">
                <v-btn
                  :disabled="idx === 0"
                  icon
                  @click="removePriceCategory(idx)"
                  class="mt-4"
                  color="error"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-select
                  background-color="accent"
                  filled
                  label="Wochentage"
                  hide-details
                  v-model="priceCategory.weekdays"
                  multiple
                  chips
                  :items="weekdays"
                  item-text="name"
                  item-value="id"
                ></v-select>
              </v-col>
              <v-col>
                <v-combobox
                  background-color="accent"
                  filled
                  multiple
                  chips
                  clearable
                  label="Feiertage"
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
                </v-combobox>
              </v-col>
            </v-row>
          </div>
          <v-divider
            v-if="
              priceCategories.length > 1 && idx !== priceCategories.length - 1
            "
            class="mb-5"
          ></v-divider>
        </div>
        <div>
          <v-btn outlined class="mt-2" @click="addPriceCategory"
            >Neue Preis-Kategorie</v-btn
          >
        </div>
      </v-card-text>
    </v-card>

    <h3 class="mt-10 mb-4">Öffnungszeiten und Buchungszeiträume</h3>
    <BookableTimeDependantAttributes
      :bookable-type="type"
    ></BookableTimeDependantAttributes>

    <v-row>
      <v-col class="col-md-3 col-12">
        <v-switch
          dense
          label="Buchungen automatisch freigeben"
          hide-details
          v-model="autoCommitBooking"
        ></v-switch>
      </v-col>
      <v-col class="col-md-3 col-sm-12">
        <v-switch
          dense
          label="Buchungsobjekt ist buchbar"
          hide-details
          v-model="isBookable"
        ></v-switch>
      </v-col>
      <v-col class="col-md-3 col-sm-12">
        <v-switch
          :disabled="!allowPublic"
          dense
          label="Buchungsobjekt ist sichtbar"
          hide-details
          v-model="isPublic"
        ></v-switch>
      </v-col>
    </v-row>

    <h3 class="mt-10">Schließsysteme</h3>
    <v-row>
      <v-col>
        <p>
          Buchungsobjekte, die mit Schließsystemen verbunden sind, können
          automatisch geöffnet und geschlossen werden.
        </p>
      </v-col>
    </v-row>
    <BookableLockingAttributes
      v-if="amount"
      :tenant-id="tenantId"
      :amount="amount"
    ></BookableLockingAttributes>

    <v-alert v-else type="warning" dense outlined>
      Um Schließsysteme zu konfigurieren, geben Sie bitte die Anzahl der
      verfügbaren Buchungsobjekte an.
    </v-alert>

    <h3 class="mt-10">Individuelle Berechtigungen</h3>

    <v-row>
      <v-col>
        <p>
          Berechtigen Sie <strong>bestimmte Benutzer</strong>, dieses Objekt zu
          sehen. Werden keine Benutzer explizit zur Ansicht berechtigt, bleibt
          dieses Buchungsobjekt für öffentlich einsehbar.
        </p>

        <v-combobox
          v-model="permittedUsers"
          :items="availableUsers"
          label="Verfügbar für Benutzer"
          hide-selected
          no-data-text="Keine Benutzer verfügbar"
          multiple
          background-color="accent"
          clearable
          chips
          filled
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="removePermittedUser(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <p>
          Berechtigen Sie <strong>alle Benutzer einer Rolle</strong>, dieses
          Objekt zu sehen. Werden keine Benutzer explizit zur Ansicht
          berechtigt, bleibt dieses Buchungsobjekt öffentlich einsehbar.
        </p>

        <v-combobox
          v-model="permittedRoles"
          :items="availableRoles"
          label="Verfügbar für Rollen"
          item-text="name"
          item-value="id"
          hide-selected
          no-data-text="Keine Rollen verfügbar"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          :return-object="false"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="removePermittedRole(item)"
            >
              <strong>{{
                availableRoles.find((r) => r.id === item)?.name
              }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
    </v-row>

    <h3 class="mt-10">Kostenfreie Buchungen</h3>
    <v-row>
      <v-col>
        <p>Berechtigen Sie Nutzer dieses Objekt kostenfrei zu buchen.</p>

        <v-combobox
          v-model="freeBookingUsers"
          :items="availableUsers"
          label="Kostenfrei für Benutzer"
          hide-selected
          no-data-text="Keine Benutzer verfügbar"
          multiple
          background-color="accent"
          clearable
          chips
          filled
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="removeFreeBookingUser(item)"
            >
              <strong>{{ item }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
    </v-row>

    <h3 class="mt-10">Serienbuchungen</h3>
    <v-row>
      <v-col class="col-auto">
        <v-switch
          dense
          label="Serienbuchung erlauben"
          hide-details
          v-model="allowGroupBooking"
        ></v-switch>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <p>
          Berechtigen Sie <strong>alle Benutzer einer Rolle</strong>, die für
          diese Objekt eine Buchungsserie erstellen dürfen
        </p>
        <v-combobox
          v-model="permittedGroupBookingRoles"
          :items="availableRoles"
          label="Rollen, die eine Buchungsserie erstellen dürfen"
          item-text="name"
          item-value="id"
          hide-selected
          no-data-text="Keine Rollen verfügbar"
          multiple
          background-color="accent"
          clearable
          chips
          filled
          :return-object="false"
        >
          <template v-slot:selection="{ attrs, item, select, selected }">
            <v-chip
              v-bind="attrs"
              :input-value="selected"
              close
              color="secondary"
              @click="select"
              @click:close="removeGroupBookingRole(item)"
            >
              <strong>{{
                availableRoles.find((r) => r.id === item)?.name
              }}</strong>
            </v-chip>
          </template>
        </v-combobox>
      </v-col>
    </v-row>

    <h2 class="mt-10">Beziehungen zu anderen Buchungsobjekten</h2>

    <h3 class="mt-5">Zusätzliche Buchungsoptionen</h3>
    <p>
      Buchungsobjekte, die Sie als zusätzliche Buchungsoptionen definieren,
      werden ihren Kund*innen beim Checkout als ergänzende Buchungsobjekte
      angezeigt.
    </p>
    <v-row>
      <v-col>
        <BookableCheckoutBookables
          :items="checkoutBookableIds"
          :available-items="bookablesWithoutSelf"
        >
        </BookableCheckoutBookables>
      </v-col>
    </v-row>

    <h3 class="mt-10">Abhängige Objekte (Hierarchie)</h3>
    <p>
      Es gibt abhängige Buchungsobjekte, die darauf basieren, dass eine Buchung
      nur durchgeführt werden kann, wenn das dazugehörige Elternobjekt noch
      verfügbar ist und das zugehörige Kinderobjekt noch keine gleichzeitige
      Buchung hat.
    </p>
    <p>
      Dieses Buchungsobjekte wird über die Schnittstelle mit allen hier
      definierten abhängigen Objekten ausgegeben.
    </p>
    <v-row>
      <v-col>
        <SortableList
          :items="relatedBookableIds"
          :available-items="bookablesWithoutSelf"
          item-value="id"
          item-text="title"
          item-detail="type"
        >
          <template v-slot:detail="{ itemObject }">
            {{ itemLabel(`editBookables.types.${itemObject.type}`) }}
          </template>
        </SortableList>
      </v-col>
    </v-row>

    <h3 class="mt-10 mb-4">Anhänge</h3>
    <div v-for="(attachment, index) in attachments" :key="attachment.id">
      <v-card flat outlined rounded>
        <v-card-text>
          <v-row class="">
            <v-col class="col">
              <v-row>
                <v-col>
                  <v-text-field
                    dense
                    background-color="accent"
                    filled
                    label="Titel"
                    hide-details
                    v-model="attachment.title"
                  ></v-text-field>
                </v-col>
                <v-col>
                  <v-select
                    dense
                    background-color="accent"
                    filled
                    label="Typ"
                    hide-details
                    v-model="attachment.type"
                    :items="attachmentTypes"
                    item-text="name"
                    item-value="id"
                  ></v-select>
                </v-col>
                <v-col>
                  <ChooseFile
                    v-model="attachment.url"
                    :allow-protected="false"
                    :tenant-id="tenantId"
                    filled
                    label="Datei"
                    background-color="accent"
                    forced-subdirectory="agreements"
                  />
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-text-field
                    dense
                    background-color="accent"
                    filled
                    label="Beschreibung"
                    placeholder="Ich habe die Nutzungsbedingungen gelesen und akzeptiere sie."
                    hide-details
                    v-model="attachment.caption"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-switch
                    dense
                    label="Im Buchungsprozess anzeigen"
                    hide-details
                    v-model="attachment.show"
                  ></v-switch>
                </v-col>
                <v-col>
                  <v-switch
                    dense
                    label="Muss vom Nutzer akzeptiert werden"
                    hide-details
                    v-model="attachment.required"
                  ></v-switch>
                </v-col>
              </v-row>
            </v-col>
            <v-col class="col-auto">
              <v-btn icon small @click="removeAttachment(attachment.id)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      <v-divider
        class="my-5"
        v-if="index < attachments.length - 1"
        :key="`divider-${index}`"
      />
    </div>
    <v-row>
      <v-col class="col-auto">
        <v-btn outlined class="mt-2" @click="addNewAttachment()"
          >Neuer Anhang</v-btn
        >
      </v-col>
    </v-row>
    <h3 class="mt-10 mb-4">Zusätzliche Optionen</h3>
    <v-row>
      <v-col class="col-auto">
        <v-switch
          dense
          label="Firma erforderlich"
          hide-details
          v-model="companyRequired"
        ></v-switch>
      </v-col>
      <v-col class="col-auto">
        <v-switch
          dense
          label="Kommentarfeld erforderlich"
          hide-details
          v-model="commentRequired"
        ></v-switch>
      </v-col>
    </v-row>

    <h3 class="mt-10 mb-4">Buchungshinweise</h3>
    <v-row>
      <v-col>
        <Tiptap v-model="bookingNotes" label="Buchungshinweise"></Tiptap>
      </v-col>
    </v-row>

    <v-divider class="mt-10"></v-divider>

    <div class="d-flex mt-2">
      <v-spacer></v-spacer>
      <v-btn
        large
        color="primary"
        elevation="0"
        class="me-3"
        @click="createOrUpdate"
        >{{ this.mode === "create" ? "Erstellen" : "Speichern" }}</v-btn
      >
      <v-btn large outlined elevation="0" @click="goBack">Abbrechen</v-btn>
    </div>

    <!--{{bookable}}-->
  </v-container>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import { mapActions, mapGetters } from "vuex";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import ApiEventService from "@/services/api/ApiEventService";
import ApiUsersService from "@/services/api/ApiUsersService";
import BookableTimeDependantAttributes from "@/components/Bookable/BookableTimeDependantAttributes";
import SortableList from "@/components/SortableList";
import Tiptap from "@/components/Tiptap";
import ApiRolesService from "@/services/api/ApiRolesService";
import ChooseFile from "@/components/Files/ChooseFile.vue";
import BookableLockingAttributes from "@/components/Bookable/BookableLockingAttributes";
import BookableCheckoutBookables from "@/components/Bookable/BookableCheckoutBookables.vue";
import ApiHolidaysService from "@/services/api/ApiHolidaysService";

export default {
  name: "EditBookable",
  components: {
    BookableCheckoutBookables,
    ChooseFile,
    SortableList,
    BookableTimeDependantAttributes,
    Tiptap,
    BookableLockingAttributes,
  },

  data() {
    return {
      useGraduatedPrices: false,
      allowPublic: true,
      bookableType: null,
      bookable: {},
      bookableTypes: [
        {
          title: "Veranstaltungsort",
          key: "event-location",
        },
        {
          title: "Raum",
          key: "room",
        },
        {
          title: "Resource",
          key: "resource",
        },
        {
          title: "Ticket",
          key: "ticket",
        },
      ],
      attachmentTypes: [
        {
          id: "agreement",
          name: "Nutzervereinbarung",
        },
        {
          id: "privacy-agreement",
          name: "Datenschutzerklärung",
        },
        {
          id: "user-manual",
          name: "Betriebsanleitung",
        },
        {
          id: "security-information",
          name: "Sicherheitshinweise",
        },
        {
          id: "product-information",
          name: "Produktinformationen",
        },
      ],
      priceTypes: [
        {
          id: "per-item",
          name: "pro Stück",
        },
        {
          id: "per-hour",
          name: "pro Stunde",
        },
        {
          id: "per-day",
          name: "pro Tag",
        },
        {
          id: "per-square-meter",
          name: "pro m²",
        },
      ],
      tagsAvailable: [],
      flagsAvailable: [],
      events: [],
      bookables: [],
      weekdays: [
        {
          id: 1,
          name: "Montag",
        },
        {
          id: 2,
          name: "Dienstag",
        },
        {
          id: 3,
          name: "Mittwoch",
        },
        {
          id: 4,
          name: "Donnerstag",
        },
        {
          id: 5,
          name: "Freitag",
        },
        {
          id: 6,
          name: "Samstag",
        },
        {
          id: 0,
          name: "Sonntag",
        },
      ],
      availableUsers: [],
      availableRoles: [],
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
    };
  },
  watch: {
    attachments: {
      handler: function (val) {
        val.forEach((attachment) => {
          if (attachment.required === true) {
            attachment.show = true;
          }
        });
      },
      deep: true,
    },
    priceCategories: {
      handler: function () {
        if (!this.useGraduatedPrices) {
          this.setUseGraduatedPrices();
        }
      },
      deep: true,
    },
  },
  methods: {
    ...mapActions({
      updateValue: "bookables/updateForm",
      removeAttachment: "bookables/removeAttachment",
      addAttachment: "bookables/addAttachment",
      clearForm: "bookables/clearForm",
      restoreFromApi: "bookables/restoreFromApi",
      removeTimePeriod: "bookables/removeTimePeriod",
      startLoading: "loading/start",
      stopLoading: "loading/stop",
    }),
    checkNull(field) {
      if (this[field] === "") {
        this[field] = null;
      }
    },
    setUseGraduatedPrices() {
      this.useGraduatedPrices = !!(
        this.priceCategories.length > 1 ||
        this.priceCategories.some((pC) => pC.interval.start !== null) ||
        this.priceCategories.some((pC) => pC.interval.end !== null)
      );
    },
    addPriceCategory() {
      const lastCategory =
        this.priceCategories[this.priceCategories.length - 1];
      this.priceCategories.push({
        priceEur: 0,
        priceValueAddedTax: 0,
        interval: {
          start: lastCategory ? lastCategory.interval.end : null,
          end: null,
        },
        fixedPrice: false,
      });
    },
    removePriceCategory(index) {
      this.priceCategories.splice(index, 1);
    },
    itemLabel(key) {
      return this.$i18n.t(key);
    },
    addNewAttachment() {
      this.addAttachment({
        id: uuidv4(),
        title: "",
        caption: "",
        type: "",
        url: "",
      });
    },
    prepareCreateForm() {
      // Clear all form fields
      this.clearForm();

      // Set default bookable type based on route meta settings
      this.updateValue({
        field: "type",
        value: this.$router.currentRoute.meta.type,
      });
    },
    createOrUpdate() {
      this.startLoading("crud-bookable");
      ApiBookablesService.createOrUpdateBookable()
        .then(() => {})
        .then(() => {
          this.goBack();
        })
        .finally(() => {
          this.stopLoading("crud-bookable");
        });
    },
    fetchBookable(bookableId) {
      this.startLoading("fetch-bookable");
      ApiBookablesService.getBookable(bookableId)
        .then((response) => {
          const {
            groupBooking,
            attachments,
            parent,
            amount,
            autoCommitBooking,
            minBookingDuration,
            maxBookingDuration,
            description,
            isScheduleRelated,
            isTimePeriodRelated,
            isOpeningHoursRelated,
            isSpecialOpeningHoursRelated,
            timePeriods,
            openingHours,
            specialOpeningHours,
            flags,
            id,
            location,
            priceCategories,
            priceType,
            priceValueAddedTax,
            enableCoupons,
            tags,
            tenantId,
            title,
            type,
            eventId,
            relatedBookableIds,
            checkoutBookableIds,
            imgUrl,
            isBookable,
            isPublic,
            permittedUsers,
            permittedRoles,
            freeBookingUsers,
            freeBookingRoles,
            isLongRange,
            longRangeOptions,
            lockerDetails,
            requiredFields,
            bookingNotes,
          } = response.data;

          this.restoreFromApi({
            groupBooking: groupBooking,
            id: id,
            parent: parent,
            tenantId: tenantId,
            type: type,
            title: title,
            description: description,
            location: location,
            priceCategories: priceCategories || [
              {
                priceEur: 0,
                interval: {
                  start: null,
                  end: null,
                },
                fixedPrice: false,
              },
            ],
            priceType: !_.isNil(priceType) ? priceType : false,
            priceValueAddedTax: !_.isNil(priceValueAddedTax)
              ? priceValueAddedTax
              : 0,
            enableCoupons: enableCoupons,
            amount: !_.isNil(amount) ? amount : null,
            isScheduleRelated: !_.isNil(isScheduleRelated)
              ? isScheduleRelated
              : false,
            isTimePeriodRelated: !_.isNil(isTimePeriodRelated)
              ? isTimePeriodRelated
              : false,
            isOpeningHoursRelated: !_.isNil(isOpeningHoursRelated)
              ? isOpeningHoursRelated
              : false,
            isSpecialOpeningHoursRelated: !_.isNil(isSpecialOpeningHoursRelated)
              ? isSpecialOpeningHoursRelated
              : false,
            minBookingDuration: !_.isNil(minBookingDuration)
              ? minBookingDuration
              : null,
            maxBookingDuration: !_.isNil(maxBookingDuration)
              ? maxBookingDuration
              : null,
            autoCommitBooking: autoCommitBooking,
            attachments: attachments,
            timePeriods: timePeriods,
            openingHours: openingHours,
            specialOpeningHours: specialOpeningHours ?? [],
            tags: tags,
            flags: flags,
            eventId: eventId,
            relatedBookableIds: relatedBookableIds,
            checkoutBookableIds: checkoutBookableIds || [],
            imgUrl: imgUrl,
            isBookable: isBookable,
            isPublic: isPublic,
            permittedUsers: permittedUsers,
            permittedRoles: permittedRoles,
            freeBookingUsers: freeBookingUsers,
            freeBookingRoles: freeBookingRoles,
            isLongRange: isLongRange,
            longRangeOptions: longRangeOptions,
            lockerDetails: lockerDetails,
            requiredFields: requiredFields,
            bookingNotes: bookingNotes,
          });
        })
        .finally(() => {
          this.stopLoading("fetch-bookable");
        });
    },

    async fetchEvents() {
      await ApiEventService.getEvents().then((result) => {
        this.events = result?.data;
      });
    },

    async fetchBookables() {
      await ApiBookablesService.getBookables().then((result) => {
        this.bookables = result?.data;
      });
    },

    async fetchUsers() {
      await ApiUsersService.getUserIds().then((result) => {
        this.availableUsers = result?.data;
      });
    },

    async fetchRoles() {
      await ApiRolesService.getTenantRoles(true).then((result) => {
        this.availableRoles = result?.data;
      });
    },

    initialize() {
      const bookableId = this.$route.query.id;
      if (!_.isNil(bookableId)) {
        this.fetchBookable(bookableId);
        this.fetchBookables();
      } else {
        this.fetchBookables();
        this.prepareCreateForm();
      }
      this.fetchEvents();
      this.fetchUsers();
      this.fetchRoles();
    },

    goBack() {
      if (_.isNil(this.$route.query.fromRoute)) {
        this.$router.push({ name: "dashboard" });
      } else {
        this.$router.push({ name: this.$route.query.fromRoute });
      }
    },
    removeFlags(item) {
      this.flags.splice(this.flags.indexOf(item), 1);
    },
    removeTags(item) {
      this.tags.splice(this.tags.indexOf(item), 1);
    },
    removeRelatedBookableIds(item) {
      this.relatedBookableIds.splice(this.relatedBookableIds.indexOf(item), 1);
    },
    addNewTimePeriod() {
      this.timeStartMenu.push(false);
      this.timeEndMenu.push(false);
      this.timePeriods.push({
        weekdays: null,
        startTime: null,
        endTime: null,
      });
    },
    setEndTime(index, time) {
      this.timePeriods[index].endTime = time;
      this.timeEndMenu[index] = false;
    },
    setStartTime(index, time) {
      this.timePeriods[index].startTime = time;
      this.timeStartMenu[index] = false;
    },
    removeWeekdays(index, item) {
      this.timePeriods[index].weekdays.splice(
        this.timePeriods[index].weekdays.indexOf(item),
        1
      );
    },
    removeTimePeriod(index) {
      this.timePeriods.splice(index, 1);
      this.timeStartMenu.splice(index, 1);
      this.timeEndMenu.splice(index, 1);
    },
    addNewOpeningHours() {
      this.timeStartOpeningHoursMenu.push(false);
      this.timeEndOpeningHoursMenu.push(false);
      this.openingHours.push({
        weekdays: null,
        startTime: null,
        endTime: null,
      });
    },
    setEndOpeningHoursTime(index, time) {
      this.openingHours[index].endTime = time;
      this.timeEndOpeningHoursMenu[index] = false;
    },
    setStartOpeningHoursTime(index, time) {
      this.openingHours[index].startTime = time;
      this.timeStartOpeningHoursMenu[index] = false;
    },
    removeOpeningHoursWeekdays(index, item) {
      this.openingHours[index].weekdays.splice(
        this.openingHours[index].weekdays.indexOf(item),
        1
      );
    },
    removeOpeningHours(index) {
      this.openingHours.splice(index, 1);
      this.timeStartOpeningHoursMenu.splice(index, 1);
      this.timeEndOpeningHoursMenu.splice(index, 1);
    },
    removePermittedUser(item) {
      this.permittedUsers.splice(this.permittedUsers.indexOf(item), 1);
    },
    removePermittedRole(item) {
      this.permittedRoles.splice(this.permittedRoles.indexOf(item), 1);
    },
    removeFreeBookingUser(item) {
      this.freeBookingUsers.splice(this.freeBookingUsers.indexOf(item), 1);
    },
    removeGroupBookingRole(item) {
      this.permittedGroupBookingRoles.splice(
        this.permittedGroupBookingRoles.indexOf(item),
        1
      );
    },
    removeFreeBookingRole(item) {
      this.freeBookingRoles.splice(this.freeBookingRoles.indexOf(item), 1);
    },
    async allowSetPublic() {
      const bookableCountCheck =
        await ApiBookablesService.publicBookableCountCheck();
      this.allowPublic = bookableCountCheck || this.isPublic;
    },
    async fetchHolidays() {
      const response = await ApiHolidaysService.getHolidays(
        "DE",
        this.selectedState
      );
      this.availableHolidays = response.data
        .map((holiday) =>
          holiday.type === "public"
            ? {
                name: holiday.name,
                countryCode: "DE",
                stateCode: this.selectedState,
              }
            : null
        )
        .filter(Boolean);
    },
  },
  computed: {
    ...mapGetters({
      isLoading: "loading/isLoading",
      attachments: "bookables/attachments",
      bookableForm: "bookables/form",
      currentTenantId: "tenants/currentTenantId",
    }),
    intervalSuffix: {
      get() {
        if (this.priceType === "per-hour") {
          return "Std.";
        } else if (this.priceType === "per-day") {
          return "Tage";
        } else if (this.priceType === "per-square-meter") {
          return "m²";
        } else {
          return "Stück";
        }
      },
    },

    id: {
      get() {
        return this.$store.state.bookables.form.id;
      },
      set(value) {
        this.updateValue({ field: "id", value: value });
      },
    },
    tenantId: {
      get() {
        if (this.mode === "create") {
          return this.currentTenantId;
        } else {
          return this.$store.state.bookables.form.tenantId;
        }
      },
      set(value) {
        this.updateValue({ field: "tenantId", value: value });
      },
    },
    type: {
      get() {
        return this.$store.state.bookables.form.type;
      },
      set(value) {
        this.updateValue({ field: "type", value: value });
      },
    },
    parent: {
      get() {
        return this.$store.state.bookables.form.parent;
      },
      set(value) {
        this.updateValue({ field: "parent", value: value });
      },
    },
    title: {
      get() {
        return this.$store.state.bookables.form.title;
      },
      set(value) {
        this.updateValue({ field: "title", value: value });
      },
    },
    test() {
      return this.$store.state.bookables.form;
    },
    description: {
      get() {
        return this.$store.state.bookables.form.description;
      },
      set(value) {
        this.updateValue({ field: "description", value: value });
      },
    },
    location: {
      get() {
        return this.$store.state.bookables.form.location;
      },
      set(value) {
        this.updateValue({ field: "location", value: value });
      },
    },
    enableCoupons: {
      get() {
        return this.$store.state.bookables.form.enableCoupons;
      },
      set(value) {
        this.updateValue({ field: "enableCoupons", value: value });
      },
    },
    priceCategories: {
      get() {
        return this.$store.state.bookables.form.priceCategories;
      },
      set(value) {
        this.updateValue({ field: "priceCategories", value: value });
      },
    },
    priceType: {
      get() {
        return this.$store.state.bookables.form.priceType;
      },
      set(value) {
        this.updateValue({ field: "priceType", value: value });
      },
    },
    priceValueAddedTax: {
      get() {
        return this.$store.state.bookables.form.priceValueAddedTax;
      },
      set(value) {
        this.updateValue({ field: "priceValueAddedTax", value: value });
      },
    },
    amount: {
      get() {
        return this.$store.state.bookables.form.amount;
      },
      set(value) {
        if (value === "" || value === undefined) {
          value = null;
        } else if (value !== null) {
          value = parseInt(value);
        }
        this.updateValue({ field: "amount", value: value });
      },
    },
    autoCommitBooking: {
      get() {
        return this.$store.state.bookables.form.autoCommitBooking;
      },
      set(value) {
        this.updateValue({ field: "autoCommitBooking", value: value });
      },
    },
    isBookable: {
      get() {
        if (this.$store.state.bookables.form.isBookable) {
          return this.$store.state.bookables.form.isBookable;
        } else {
          return false;
        }
      },
      set(value) {
        if (value) {
          this.updateValue({ field: "isBookable", value: value });
        } else {
          this.updateValue({ field: "isBookable", value: false });
        }
      },
    },
    isPublic: {
      get() {
        if (this.$store.state.bookables.form.isPublic) {
          return this.$store.state.bookables.form.isPublic;
        } else {
          return false;
        }
      },
      set(value) {
        if (value) {
          this.updateValue({ field: "isPublic", value: value });
        } else {
          this.updateValue({ field: "isPublic", value: false });
        }
      },
    },
    tags: {
      get() {
        return this.$store.state.bookables.form.tags;
      },
      set(value) {
        this.updateValue({ field: "tags", value: value });
      },
    },
    flags: {
      get() {
        return this.$store.state.bookables.form.flags;
      },
      set(value) {
        this.updateValue({ field: "flags", value: value });
      },
    },
    eventId: {
      get() {
        return this.$store.state.bookables.form.eventId;
      },
      set(value) {
        this.updateValue({ field: "eventId", value: value });
      },
    },
    relatedBookableIds: {
      get() {
        return this.$store.state.bookables.form.relatedBookableIds;
      },
      set(value) {
        this.updateValue({ field: "relatedBookableIds", value: value });
      },
    },
    imgUrl: {
      get() {
        return this.$store.state.bookables.form.imgUrl;
      },
      set(value) {
        this.updateValue({ field: "imgUrl", value: value });
      },
    },
    permittedUsers: {
      get() {
        return this.$store.state.bookables.form.permittedUsers;
      },
      set(value) {
        this.updateValue({ field: "permittedUsers", value: value });
      },
    },
    permittedRoles: {
      get() {
        return this.$store.state.bookables.form.permittedRoles;
      },
      set(value) {
        this.updateValue({ field: "permittedRoles", value: value });
      },
    },
    freeBookingUsers: {
      get() {
        return this.$store.state.bookables.form.freeBookingUsers;
      },
      set(value) {
        this.updateValue({ field: "freeBookingUsers", value: value });
      },
    },
    freeBookingRoles: {
      get() {
        return this.$store.state.bookables.form.freeBookingRoles;
      },
      set(value) {
        this.updateValue({ field: "freeBookingRoles", value: value });
      },
    },
    checkoutBookableIds: {
      get() {
        return this.$store.state.bookables.form.checkoutBookableIds;
      },
      set(value) {
        this.updateValue({ field: "checkoutBookableIds", value: value });
      },
    },
    allowGroupBooking: {
      get() {
        return this.$store.state.bookables.form.groupBooking.enabled;
      },
      set(value) {
        this.updateValue({ field: "groupBooking.enabled", value: value });
      },
    },
    permittedGroupBookingRoles: {
      get() {
        return this.$store.state.bookables.form.groupBooking.permittedRoles;
      },
      set(value) {
        this.updateValue({
          field: "groupBooking.permittedRoles",
          value: value,
        });
      },
    },
    commentRequired: {
      get() {
        return this.$store.state.bookables.form.requiredFields?.includes(
          "comment"
        );
      },
      set(value) {
        if (value) {
          if (
            !this.$store.state.bookables.form.requiredFields?.includes(
              "comment"
            )
          ) {
            this.updateValue({
              field: "requiredFields",
              value: [
                ...(this.$store.state.bookables.form.requiredFields || []),
                "comment",
              ],
            });
          }
        } else {
          this.updateValue({
            field: "requiredFields",
            value: (
              this.$store.state.bookables.form.requiredFields || []
            ).filter((f) => f !== "comment"),
          });
        }
      },
    },
    companyRequired: {
      get() {
        return this.$store.state.bookables.form.requiredFields?.includes(
          "company"
        );
      },
      set(value) {
        if (value) {
          if (
            !this.$store.state.bookables.form.requiredFields?.includes(
              "company"
            )
          ) {
            this.updateValue({
              field: "requiredFields",
              value: [
                ...(this.$store.state.bookables.form.requiredFields || []),
                "company",
              ],
            });
          }
        } else {
          this.updateValue({
            field: "requiredFields",
            value: (
              this.$store.state.bookables.form.requiredFields || []
            ).filter((f) => f !== "company"),
          });
        }
      },
    },
    bookingNotes: {
      get() {
        return this.$store.state.bookables.form.bookingNotes;
      },
      set(value) {
        this.updateValue({ field: "bookingNotes", value: value });
      },
    },
    mode: function () {
      return this.id ? "edit" : "create";
    },
    bookablesWithoutSelf: function () {
      if (_.isNil(this.id)) {
        return this.bookables;
      } else {
        return this.bookables.filter((b) => b.id !== this.id);
      }
    },
  },

  mounted() {
    this.initialize();
    this.allowSetPublic();
    this.setUseGraduatedPrices();
    this.fetchHolidays();
  },
};
</script>

<style scoped>
.add-time-period[disabled] {
  opacity: 0.6;
}
.panel {
  box-shadow: 0 1px 1px rgb(0 0 0 / 0.2);
}
.panel-header {
  padding: 13px 13px 13px 13px;
}
</style>
