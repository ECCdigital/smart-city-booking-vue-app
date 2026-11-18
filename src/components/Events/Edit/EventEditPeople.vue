<script>
import uniqueId from "lodash/uniqueId";
import eventEditing from "@/mixins/eventEditing";
import SectionCard from "@/components/commons/SectionCard.vue";
import EventEditPerson from "./EventEditPerson.vue";

// Where the one contact person and each speaker keep their fields.
const CONTACT_FIELDS = Object.freeze({
  name: "contactPersonName",
  email: "contactPersonEmailAddress",
  phone: "contactPersonPhoneNumber",
  image: "contactPersonImage",
});
const SPEAKER_FIELDS = Object.freeze({
  name: "name",
  email: "emailAddress",
  phone: "phoneNumber",
  image: "image",
});

/**
 * The tab „Veranstalter & Kontakt“: who invites; „Kontakt für Rückfragen“,
 * the general address for questions (stored with the place,
 * `eventLocation`) and the one contact person; and the speakers. The
 * simple page leaves out contact person and speakers.
 */
export default {
  name: "EventEditPeople",
  components: { SectionCard, EventEditPerson },
  mixins: [eventEditing],
  data() {
    return { contactFields: CONTACT_FIELDS, speakerFields: SPEAKER_FIELDS };
  },
  computed: {
    organizer() {
      return this.form.eventOrganizer;
    },
    speakers() {
      return this.organizer.speakers || [];
    },
    contactErrors() {
      return Object.fromEntries(
        Object.values(CONTACT_FIELDS).map((f) => [f, this.errorsFor(f)])
      );
    },
  },
  methods: {
    changeContact({ field, value }) {
      this.update("eventOrganizer", field, value);
    },
    setContact(present) {
      this.update("eventOrganizer", "addContactPerson", present);
    },
    setSpeakers(speakers) {
      this.update("eventOrganizer", "speakers", speakers);
    },
    addSpeaker() {
      this.setSpeakers([
        ...this.speakers,
        { id: uniqueId(), name: "", emailAddress: "", phoneNumber: "" },
      ]);
    },
    changeSpeaker(index, { field, value }) {
      this.setSpeakers(
        this.speakers.map((speaker, i) =>
          i === index ? { ...speaker, [field]: value } : speaker
        )
      );
    },
    removeSpeaker(index) {
      this.setSpeakers(this.speakers.filter((_, i) => i !== index));
    },
  },
};
</script>

<template>
  <div>
    <SectionCard
      id="event-section-organizer"
      icon="mdi-domain"
      :title="$t('event.edit.cards.organizer')"
    >
      <div data-field="organizer">
        <v-text-field
          :value="organizer.name"
          :label="$t('event.edit.organizer.name') + ' *'"
          :hint="$t('event.edit.organizer.nameHint')"
          :error-messages="errorsFor('organizer')"
          persistent-hint
          outlined
          dense
          data-test="event-organizer"
          @input="update('eventOrganizer', 'name', $event)"
        />
      </div>
    </SectionCard>

    <SectionCard
      id="event-section-contact"
      icon="mdi-email-outline"
      :title="$t('event.edit.cards.contact')"
      :hint="$t('event.edit.contact.hint')"
    >
      <v-row dense>
        <v-col cols="12" sm="6" data-field="emailAddress">
          <v-text-field
            :value="form.eventLocation.emailAddress"
            :label="$t('event.edit.contact.email') + ' *'"
            :error-messages="errorsFor('emailAddress')"
            placeholder="info@example.org"
            type="email"
            outlined
            dense
            data-test="event-contact-email"
            @input="update('eventLocation', 'emailAddress', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            :value="form.eventLocation.phoneNumber"
            :label="$t('event.edit.contact.phone')"
            type="tel"
            outlined
            dense
            @input="update('eventLocation', 'phoneNumber', $event)"
          />
        </v-col>
      </v-row>

      <div v-if="!simple" class="event-edit__field mt-2">
        <div class="event-edit__label">
          {{ $t("event.edit.people.contact") }}
          <span class="event-edit__required">{{
            $t("event.edit.optional")
          }}</span>
        </div>
        <div class="event-edit__hint event-edit__hint--top">
          {{ $t("event.edit.people.contactHint") }}
        </div>
        <EventEditPerson
          v-if="organizer.addContactPerson"
          :person="organizer"
          :fields="contactFields"
          :errors="contactErrors"
          :remove-label="$t('event.edit.people.removeContact')"
          :public-only="isPublic"
          :public-only-reason="$t('event.edit.basics.publicOnly')"
          data-test="event-contact-person"
          @change="changeContact"
          @remove="setContact(false)"
        />
        <v-btn
          v-else
          small
          outlined
          color="primary"
          data-test="event-add-contact"
          @click="setContact(true)"
        >
          <v-icon small left>mdi-account-plus-outline</v-icon>
          {{ $t("event.edit.people.addContact") }}
        </v-btn>
      </div>
    </SectionCard>

    <SectionCard
      v-if="!simple"
      id="event-section-people"
      icon="mdi-account-voice"
      :title="$t('event.edit.cards.people')"
      :hint="$t('event.edit.people.hint')"
      :badge="$t('event.edit.optional')"
    >
      <div class="event-edit__field">
        <EventEditPerson
          v-for="(speaker, index) in speakers"
          :key="speaker.id || index"
          :person="speaker"
          :fields="speakerFields"
          :remove-label="$t('event.edit.people.removeSpeaker')"
          :public-only="isPublic"
          :public-only-reason="$t('event.edit.basics.publicOnly')"
          data-test="event-speaker"
          @change="changeSpeaker(index, $event)"
          @remove="removeSpeaker(index)"
        />
        <v-btn
          small
          outlined
          color="primary"
          class="mt-2"
          data-test="event-add-speaker"
          @click="addSpeaker"
        >
          <v-icon small left>mdi-account-plus-outline</v-icon>
          {{ $t("event.edit.people.addSpeaker") }}
        </v-btn>
      </div>
    </SectionCard>
  </div>
</template>
