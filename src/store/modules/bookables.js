const namespaced = true;
import uniqueId from "lodash/uniqueId";

const state = {
  form: {
    id: null,
    tenantId: "",
    type: "",
    title: "",
    description: "",
    location: "",
    priceCategories: [
      {
        priceEur: 0,
        interval: { start: null, end: null },
        fixedPrice: false,
      },
    ],
    priceType: "",
    priceValueAddedTax: 0,
    amount: 1,
    isScheduleRelated: false,
    isTimePeriodRelated: false,
    isOpeningHoursRelated: false,
    isSpecialOpeningHoursRelated: false,
    specialOpeningHours: [],
    timePeriods: [],
    openingHours: [],
    minBookingDuration: null,
    maxBookingDuration: null,
    autoCommitBooking: false,
    attachments: [
      {
        id: uniqueId(),
        title: "",
        type: "",
        url: "",
      },
    ],
    tags: [],
    flags: [],
    relatedBookablesIds: [],
    checkoutBookableIds: [],
    isBookable: false,
    isPublic: false,
    isLongRange: false,
    longRangeOptions: null,
    lockerDetails: { active: false, units: [] },
    requiredFields: [],
    bookingNotes: "",
  },
};

const mutations = {
  UPDATE(state, payload) {
    state.form[payload.field] = payload.value;
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
      type: "",
      title: "",
      description: "",
      location: "",
      priceCategories: [
        {
          priceEur: 0,
          interval: { start: null, end: null },
          fixedPrice: false,
        },
      ],
      priceType: "",
      priceValueAddedTax: 0,
      amount: 0,
      isScheduleRelated: false,
      isTimePeriodRelated: false,
      isOpeningHoursRelated: false,
      isSpecialOpeningHoursRelated: false,
      specialOpeningHours: [],
      timePeriods: [],
      openingHours: [],
      minBookingDuration: null,
      maxBookingDuration: null,
      autoCommitBooking: false,
      attachments: [
        {
          id: uniqueId(),
          title: "",
          type: "",
          url: "",
        },
      ],
      tags: [],
      flags: [],
      relatedBookableIds: [],
      checkoutBookableIds: [],
      isBookable: false,
      isPublic: false,
      isLongRange: false,
      longRangeOptions: null,
      lockerDetails: { active: false, units: [] },
      requiredFields: [],
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
