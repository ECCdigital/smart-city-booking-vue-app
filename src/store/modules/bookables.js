const namespaced = true;

const state = {
  form: {
    id: null,
    tenantId: "",
    parent: "",
    type: "",
    title: "",
    description: "",
    isPublic: false,
    imgUrl: "",
    flags: [],
    tags: [],
    location: "",

    isBookable: false,
    amount: 1,
    minBookingDuration: null,
    maxBookingDuration: null,
    autoCommitBooking: false,
    bookingNotes: "",
    groupBooking: {
      enabled: false,
      permittedRoles: [],
    },

    isScheduleRelated: false,
    isTimePeriodRelated: false,
    timePeriods: [],
    isOpeningHoursRelated: false,
    openingHours: [],
    isSpecialOpeningHoursRelated: false,
    specialOpeningHours: [],
    isLongRange: false,
    longRangeOptions: null,

    priceCategories: [
      {
        priceEur: 0,
        interval: { start: null, end: null },
        fixedPrice: false,
      },
    ],
    priceType: "per-item",
    priceValueAddedTax: 0,

    enableCoupons: true,

    permittedUsers: [],
    permittedRoles: [],
    freeBookingUsers: [],
    freeBookingRoles: [],
    relatedBookableIds: [],
    checkoutBookableIds: [],

    attachments: [],
    lockerDetails: { active: false, units: [] },
    requiredFields: [],
    eventId: null,
    ownerUserId: "",
  },
};

const mutations = {
  UPDATE(state, payload) {
    if (payload.field.includes(".")) {
      const fields = payload.field.split(".");
      let obj = state.form;
      for (let i = 0; i < fields.length - 1; i++) {
        if (!obj[fields[i]]) {
          obj[fields[i]] = {};
        }
        obj = obj[fields[i]];
      }
      obj[fields[fields.length - 1]] = payload.value;
    } else {
      state.form[payload.field] = payload.value;
    }
  },
  RESTORE(state, payload) {
    state.form = payload;
  },
  ADD_ATTACHMENT(state, payload) {
    state.form.attachments.push(payload);
  },
  REMOVE_ATTACHMENT(state, id) {
    state.form.attachments = state.form.attachments.filter(
      (attachment) => attachment.id !== id
    );
  },
  REMOVE_TIME_PERIOD(state, index) {
    state.form.timePeriods.splice(index, 1);
  },
  CLEAR(state) {
    state.form = {
      id: null,
      tenantId: "",
      parent: "",
      type: "",
      title: "",
      description: "",
      isPublic: false,
      imgUrl: "",
      flags: [],
      tags: [],
      location: "",

      isBookable: false,
      amount: 1,
      minBookingDuration: null,
      maxBookingDuration: null,
      autoCommitBooking: false,
      bookingNotes: "",
      groupBooking: {
        enabled: false,
        permittedRoles: [],
      },

      isScheduleRelated: false,
      isTimePeriodRelated: false,
      timePeriods: [],
      isOpeningHoursRelated: false,
      openingHours: [],
      isSpecialOpeningHoursRelated: false,
      specialOpeningHours: [],
      isLongRange: false,
      longRangeOptions: null,

      priceCategories: [
        {
          priceEur: 0,
          interval: { start: null, end: null },
          fixedPrice: false,
        },
      ],
      priceType: "per-item",
      priceValueAddedTax: 0,

      enableCoupons: true,

      permittedUsers: [],
      permittedRoles: [],
      freeBookingUsers: [],
      freeBookingRoles: [],
      relatedBookableIds: [],
      checkoutBookableIds: [],

      attachments: [],
      lockerDetails: { active: false, units: [] },
      requiredFields: [],
      eventId: null,
      ownerUserId: "",
    };
  },
};

const actions = {
  updateForm({ commit }, payload) {
    commit("UPDATE", payload);
  },
  restoreFromApi({ commit }, payload) {
    commit("RESTORE", payload);
  },
  addAttachment({ commit }, id) {
    commit("ADD_ATTACHMENT", id);
  },
  removeAttachment({ commit }, id) {
    commit("REMOVE_ATTACHMENT", id);
  },
  removeTimePeriod({ commit }, index) {
    commit("REMOVE_TIME_PERIOD", index);
  },
  clearForm({ commit }) {
    commit("CLEAR");
  },
  reset({ commit }) {
    commit("CLEAR");
  },
};

const getters = {
  form: (state) => state.form,
  attachments: (state) => state.form.attachments,
};

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};
