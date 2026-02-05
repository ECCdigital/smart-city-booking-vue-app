<template>
  <div class="page-content" ref="contentCol">
    <v-form ref="rootForm" v-model="validRoot">
      <v-progress-linear :active="isLoading" indeterminate color="primary" />

      <div class="d-flex align-center mb-2">
        <div>
          <div class="text--secondary">
            ID: {{ bookableID }} • {{ bookable.title || "Unbenannt" }}
          </div>
        </div>
        <v-spacer />
        <v-chip
          v-if="hasUnsavedChanges"
          color="warning"
          text-color="black"
          small
          class="mr-2"
          label
        >
          Ungespeicherte Änderungen
        </v-chip>
      </div>

      <v-row>
        <v-col class="col-12 col-md-auto">
          <v-tabs
            v-model="activeTab"
            color="primary"
            show-arrows
            :vertical="$vuetify.breakpoint.mdAndUp"
          >
            <v-tab
              v-for="t in tabs"
              :key="t.key"
              class="d-flex justify-start"
              style="text-transform: none"
            >
              <v-icon left small>{{ t.icon }}</v-icon>
              {{ t.label }}
            </v-tab>
          </v-tabs></v-col
        >
        <v-col class="col-12 col-md-9">
          <keep-alive>
            <component
              :is="tabs[activeTab].comp"
              v-if="tabs[activeTab].comp"
              :bookable="bookable"
              :valid-root.sync="validRoot"
              @update:bookable="onUpdateBookable"
            />
          </keep-alive>
        </v-col>
      </v-row>
      {{ bookable }}
    </v-form>
  </div>
</template>

<script>
import ApiBookablesService from "@/services/api/ApiBookablesService";
import _ from "lodash";
import BookableEditGeneral from "@/components/Bookable/Edit/BookableEditGeneral.vue";
import BookableEditTags from "@/components/Bookable/Edit/BookableEditTags.vue";
import BookableEditPrice from "@/components/Bookable/Edit/BookableEditPrice.vue";
import BookableEditBookingType from "@/components/Bookable/Edit/BookableEditBookingType.vue";

export default {
  name: "BookableEdit",
  components: {
    BookableEditGeneral,
    BookableEditTags,
    BookableEditPrice,
    BookableEditBookingType,
  },
  data() {
    return {
      isLoading: false,
      inProgress: false,
      validRoot: true,
      activeTab: 0,
      tabs: [
        {
          key: "general",
          label: "Allgemein",
          icon: "mdi-information-outline",
          comp: "BookableEditGeneral",
        },
        {
          key: "tags",
          label: "Tags & Flags",
          icon: "mdi-tag-multiple-outline",
          comp: "BookableEditTags",
        },
        {
          key: "pricing",
          label: "Preise",
          icon: "mdi-cash-multiple",
          comp: "BookableEditPrice",
        },

        {
          key: "bookingType",
          label: "Buchungsart",
          icon: "mdi-calendar-clock",
          comp: "BookableEditBookingType",
        },
      ],
      originalSnapshot: {
        bookable: {},
      },
      bookable: {},
    };
  },
  computed: {
    bookableID() {
      return this.$route.query.id;
    },
    hasUnsavedChanges() {
      return (
        JSON.stringify({
          bookable: this.bookable,
        }) !== this.originalSnapshot
      );
    },
  },
  methods: {
    init() {
      this.fetchBookable(this.bookableID);
      this.$nextTick(() => {
        this.originalSnapshot = JSON.stringify({
          bookable: this.bookable,
        });
      });
    },
    fetchBookable(bookableId) {
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

          this.bookable = _.cloneDeep({
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
        .finally(() => {});
    },
    onUpdateBookable(updatedBookable) {
      this.bookable = { ...this.bookable, ...updatedBookable };
    },
  },
  watch: {
    bookableID: {
      immediate: true,
      handler() {
        this.init();
      },
    },
  },
};
</script>

<style scoped></style>
