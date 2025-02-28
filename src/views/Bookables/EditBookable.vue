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

    <v-row>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          label="Preis (netto)"
          hide-details
          v-model="priceEur"
          suffix="Euro"
        ></v-text-field>
      </v-col>
      <v-col class="col-2">
        <v-text-field
          background-color="accent"
          filled
          label="MwSt."
          hide-details
          v-model="priceValueAddedTax"
          suffix="%"
        ></v-text-field>
      </v-col>
      <v-col>
        <v-select
          background-color="accent"
          filled
          label="Preisart"
          hide-details
          v-model="priceCategory"
          :items="priceCategories"
          item-text="name"
          item-value="id"
        ></v-select>
      </v-col>
      <v-col>
        <v-text-field
          background-color="accent"
          filled
          label="Verfügbare Anzahl"
          hide-details
          v-model.number="amount"
          suffix="Stück"
        ></v-text-field>
      </v-col>
    </v-row>

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
      :tenant-id="tenantId"
      :amount="amount"
    ></BookableLockingAttributes>

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

    <v-row>
      <v-col>
        <p>
          Berechtigen Sie <strong>alle Benutzer einer Rolle</strong>, dieses
          Objekt kostenfrei zu buchen.
        </p>

        <v-combobox
          v-model="freeBookingRoles"
          :items="availableRoles"
          label="Rollen, die kostenfrei buchen dürfen"
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
              @click:close="removeFreeBookingRole(item)"
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
        <SortableList
          :items="checkoutBookableIds"
          :available-items="bookablesWithoutSelf"
          item-value="id"
          item-text="title"
          item-detail="type"
        >
          <template v-slot:text="{ itemObject }">
            {{ itemObject.title }}
          </template>
          <template v-slot:detail="{ itemObject }">
            {{ itemLabel(`editBookables.types.${itemObject.type}`) }}
          </template>
        </SortableList>
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

export default {
  name: "EditBookable",
  components: {
    ChooseFile,
    SortableList,
    BookableTimeDependantAttributes,
    Tiptap,
    BookableLockingAttributes,
  },

  data() {
    return {
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
      priceCategories: [
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
            attachments,
            parent,
            amount,
            priceCategory,
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
            priceEur,
            priceValueAddedTax,
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
            id: id,
            parent: parent,
            tenantId: tenantId,
            type: type,
            title: title,
            description: description,
            location: location,
            priceEur: priceEur,
            priceValueAddedTax: priceValueAddedTax,
            priceCategory: !_.isNil(priceCategory) ? priceCategory : false,
            amount: !_.isNil(amount) ? amount : 0,
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
      await ApiRolesService.getRoles().then((result) => {
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
    removeFreeBookingRole(item) {
      this.freeBookingRoles.splice(this.freeBookingRoles.indexOf(item), 1);
    },
    async allowSetPublic() {
      const bookableCountCheck =
        await ApiBookablesService.publicBookableCountCheck();
      this.allowPublic = bookableCountCheck || this.isPublic;
    },
  },
  computed: {
    ...mapGetters({
      isLoading: "loading/isLoading",
      attachments: "bookables/attachments",
      bookableForm: "bookables/form",
      currentTenantId: "tenants/currentTenantId",
    }),
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
    priceEur: {
      get() {
        return this.$store.state.bookables.form.priceEur;
      },
      set(value) {
        this.updateValue({ field: "priceEur", value: value });
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
    priceCategory: {
      get() {
        return this.$store.state.bookables.form.priceCategory;
      },
      set(value) {
        this.updateValue({ field: "priceCategory", value: value });
      },
    },
    amount: {
      get() {
        return this.$store.state.bookables.form.amount;
      },
      set(value) {
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
