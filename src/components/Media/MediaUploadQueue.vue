<template>
  <!-- The files of the media library on their way up, one row each: waiting,
       uploading with its progress, done, or refused with the reason and a
       cross to dismiss it. -->
  <v-card v-if="entries.length > 0" outlined>
    <v-list dense>
      <v-list-item v-for="(entry, index) in entries" :key="index">
        <v-list-item-icon class="mr-3">
          <v-icon v-if="entry.status === 'error'" color="error">
            mdi-alert-circle-outline
          </v-icon>
          <v-icon v-else-if="entry.status === 'done'" color="success">
            mdi-check-circle-outline
          </v-icon>
          <v-icon v-else>mdi-progress-upload</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>{{ entry.file.name }}</v-list-item-title>
          <v-list-item-subtitle
            :class="{ 'error--text': entry.status === 'error' }"
          >
            {{ entry.message }}
          </v-list-item-subtitle>
          <v-progress-linear
            v-if="entry.status === 'uploading'"
            :value="entry.progress"
            height="4"
            rounded
            class="mt-1"
          />
        </v-list-item-content>
        <v-list-item-action v-if="entry.status === 'error'">
          <v-btn icon small @click="$emit('dismiss', index)">
            <v-icon small>mdi-close</v-icon>
          </v-btn>
        </v-list-item-action>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
export default {
  name: "MediaUploadQueue",
  props: {
    // `{ file, status, progress, message }` as MediaLibrary queues them.
    entries: { type: Array, required: true },
  },
};
</script>
