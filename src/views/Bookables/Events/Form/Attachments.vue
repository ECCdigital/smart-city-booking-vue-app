<template>
  <v-row>
    <v-col cols="12">
      <validation-observer ref="observer" v-slot="{ invalid }">
        <v-container>
          <div class="d-flex justify-end mb-2">
            <v-btn small color="primary" @click="$refs.list.add()">
              <v-icon left small>mdi-plus</v-icon>
              Hinzufügen
            </v-btn>
          </div>
          <MediaAttachmentList
            ref="list"
            v-model="attachments"
            :public-only="isPublic"
            public-only-reason="Diese Veranstaltung ist öffentlich sichtbar — interne Medien können hier nicht gespeichert werden."
          />
        </v-container>
        <Pager :invalid="invalid" />
      </validation-observer>
    </v-col>
  </v-row>
</template>

<script>
import { mapActions } from "vuex";
import { ValidationObserver } from "vee-validate";
import { v4 as uuidv4 } from "uuid";
import Pager from "@/components/Events/Form/Pager";
import MediaAttachmentList from "@/components/Media/MediaAttachmentList.vue";

/**
 * Lifts a legacy entry to the attachment shape of §4.8. Events used to store
 * bare addresses here; the fields around the file did not exist yet, so they
 * start empty and the address stays where the media import expects it.
 *
 * @param {Object|string} entry - The stored entry.
 * @returns {Object} An attachment.
 */
function toAttachment(entry) {
  if (typeof entry === "string") {
    return {
      id: uuidv4(),
      title: entry.split("/").pop() || "",
      caption: "",
      type: "",
      reference: null,
      url: entry,
      show: false,
      required: false,
      mailAttach: false,
    };
  }

  return {
    id: entry.id || uuidv4(),
    title: entry.title || "",
    caption: entry.caption || "",
    type: entry.type || "",
    reference: entry.reference || null,
    url: entry.url || "",
    show: Boolean(entry.show),
    required: Boolean(entry.required),
    mailAttach: Boolean(entry.mailAttach),
  };
}

export default {
  components: {
    MediaAttachmentList,
    Pager,
    ValidationObserver,
  },
  created() {
    // Editing needs the typed shape. Lifting happens once, on the way into the
    // form — not on every render, or the fields would lose focus mid-typing.
    const stored = this.$store.state.events.form.attachments || [];
    const lifted = stored.map(toAttachment);
    if (JSON.stringify(stored) !== JSON.stringify(lifted)) {
      this.attachments = lifted;
    }
  },
  methods: {
    ...mapActions({
      updateValue: "events/updateForm",
    }),
  },
  computed: {
    isPublic() {
      return Boolean(this.$store.state.events.form.isPublic);
    },
    attachments: {
      get() {
        return this.$store.state.events.form.attachments;
      },
      set(value) {
        this.updateValue({ parent: null, field: "attachments", value: value });
      },
    },
  },
};
</script>

<style scoped></style>
