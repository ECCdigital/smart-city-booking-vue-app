const namespaced = true;
const defaultState = {
  id: null,
  tenantId: "",
  information: {
    name: "",
    teaserText: "",
    description: "",
    teaserImage: null,
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
    tags: [],
    flags: [],
  },
  eventLocation: {
    name: "",
    phoneNumber: "",
    emailAddress: "",
    select: null,
    room: null,
    url: "",
  },
  location: {
    coordinates: {
      type: "Point",
      points: [null, null],
    },
    display_address: "",
    address: {
      street: null,
      house_number: null,
      post_code: null,
      city: null,
      suburb: null,
      state: null,
      country: null,
      country_code: null,
    },
    meta: {},
  },
  eventOrganizer: {
    name: "",
    addContactPerson: true,
    contactPersonName: "",
    contactPersonPhoneNumber: "",
    contactPersonEmailAddress: "",
    contactPersonImage: null,
    speakers: [],
  },
  attendees: {
    publicEvent: true,
    needsRegistration: false,
    free: false,
    maxAttendees: null,
    priceCategories: [],
  },
  externalBookingUrl: "",
  schedules: [],
  attachments: [],
  images: [],
  format: 0,
  isPublic: false,
}
const state = {
  form: JSON.parse(JSON.stringify(defaultState)),
  // The review (glossary "Prüfstatus") of the loaded event. It is the
  // backend's alone and changes through its own operations, so it lives next
  // to the form: never saved with it, never an unsaved change of it.
  review: null,
};

const mutations = {
  UPDATE(state, payload) {
    if (payload.parent) {
      state.form[payload.parent][payload.field] = payload.value;
    } else {
      state.form[payload.field] = payload.value;
    }
  },
  UPDATE_SPEAKER(state, payload) {
    state.form.eventOrganizer.speakers.push(payload);
  },
  UPDATE_SCHEDULES(state, payload) {
    state.form.schedules.push(payload);
  },
  UPDATE_EVENT_CATEGORY(state, payload) {
    state.form.attendees.priceCategories.push(payload);
  },
  REMOVE_EVENT_CATEGORY(state, id) {
    state.form.attendees.priceCategories = state.form.attendees.priceCategories.filter(category => category.id !== id);
  },
  REMOVE_SPEAKER(state, id) {
    state.form.eventOrganizer.speakers = state.form.eventOrganizer.speakers.filter(referent => referent.id !== id);
  },
  REMOVE_SCHEDULE(state, id) {
    state.form.schedules = state.form.schedules.filter(schedule => schedule.id !== id);
  },
  RESTORE(state, payload) {
    const { review = null, ...form } = payload;
    state.form = form;
    state.review = review;
  },
  SET_REVIEW(state, review) {
    state.review = review || null;
  },
  CLEAR(state) {
    state.form = JSON.parse(JSON.stringify(defaultState));
    state.review = null;
  },
  UPDATE_SCHEDULES_FOR_DAY(state, payload) {
    // add schedules to the day
    const day = state.form.schedules.find(day => day.id === payload.dayId);
    day.schedules.push(payload);
  },
  REMOVE_SCHEDULE_FROM_DAY(state, payload) {
    // remove schedule from the day
    const day = state.form.schedules.find(day => day.id === payload.dayId);
    day.schedules = day.schedules.filter(schedule => schedule.id !== payload.id);
  }
};

const actions = {
  updateForm({ commit }, payload) {
    commit("UPDATE", payload);
  },
  restoreFromApi({ commit }, payload) {
    commit("RESTORE", payload);
  },
  setReview({ commit }, review) {
    commit("SET_REVIEW", review);
  },
  addSpeaker({ commit }, payload) {
    commit("UPDATE_SPEAKER", payload);
  },
  addScheduleDay({ commit }, payload) {
    commit("UPDATE_SCHEDULES", payload);
  },
  addEventCategory({ commit }, payload) {
    commit("UPDATE_EVENT_CATEGORY", payload);
  },
  removeSpeaker({ commit }, id) {
    commit("REMOVE_SPEAKER", id);
  },
  removeScheduleDay({ commit }, id) {
    commit("REMOVE_SCHEDULE", id);
  },
  removeEventCategory({ commit }, id) {
    commit("REMOVE_EVENT_CATEGORY", id);
  },
  clearForm({ commit }) {
    commit("CLEAR");
  },
  addScheduleForDay({ commit }, payload) {
    commit("UPDATE_SCHEDULES_FOR_DAY", payload);
  },
  removeScheduleFromDay({ commit }, payload) {
    commit("REMOVE_SCHEDULE_FROM_DAY", payload);
  },
  reset({ commit }) {
    commit("CLEAR");
  }
};

const getters = {
  form: (state) => state.form,
  review: (state) => state.review,
  speakers: (state) => state.form.eventOrganizer.speakers,
  priceCategories: (state) => state.form.attendees.priceCategories,
  schedules: (state) => state.form.schedules,
};

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};
