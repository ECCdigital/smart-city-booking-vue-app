<script>
import BookableTypeChip from "@/components/commons/BookableTypeChip.vue";
import SortableList from "@/components/SortableList.vue";
import bookableEditing from "@/mixins/bookableEditing";
import otherBookables from "@/mixins/otherBookables";

const HIERARCHY = "bookable.areas.hierarchy";

/**
 * Hierarchie: the child objects of this bookable, in order. Booking the
 * parent blocks its children and the other way round. The area as the
 * editing page frames it in a card and the step „Weitere Einstellungen“ in
 * a row.
 */
export default {
  name: "BookableEditHierarchy",
  components: { SortableList, BookableTypeChip },
  mixins: [bookableEditing, otherBookables],
  data() {
    return {
      rules: ["parentAvailable", "independent", "siblingsFree"].map(
        (key) => `${HIERARCHY}.rules.${key}`
      ),
      notes: [
        { key: "parentBooked", icon: "mdi-lock", color: "warning" },
        { key: "childBooked", icon: "mdi-lock-outline", color: "warning" },
        {
          key: "ticket",
          icon: "mdi-ticket-confirmation-outline",
          color: "orange",
        },
        { key: "api", icon: "mdi-api", color: "info" },
      ].map((note) => ({ ...note, text: `${HIERARCHY}.notes.${note.key}` })),
    };
  },
  computed: {
    relatedBookableIds() {
      return this.bookable.relatedBookableIds || [];
    },
  },
};
</script>

<template>
  <div>
    <v-alert
      color="info"
      text
      dense
      class="mb-4"
      icon="mdi-information-outline"
    >
      <div class="text-subtitle-1 font-weight-medium mb-2">
        {{ $t("bookable.areas.hierarchy.how.title") }}
      </div>
      <div
        class="text-body-2"
        v-html="$t('bookable.areas.hierarchy.how.text')"
      ></div>
    </v-alert>

    <v-row>
      <v-col cols="12" md="6">
        <v-card outlined class="h-100">
          <v-card-subtitle
            class="pb-2"
            style="background-color: var(--v-success-lighten4)"
          >
            <v-icon small color="success" class="mr-2">
              mdi-check-circle
            </v-icon>
            <span class="font-weight-medium">
              {{ $t("bookable.areas.hierarchy.rules.title") }}
            </span>
          </v-card-subtitle>
          <v-card-text>
            <v-list dense>
              <v-list-item v-for="rule in rules" :key="rule">
                <v-list-item-icon class="mr-3">
                  <v-icon small color="success">mdi-arrow-right</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-subtitle class="text-wrap">
                    {{ $t(rule) }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card outlined class="h-100">
          <v-card-subtitle
            class="pb-2"
            style="background-color: var(--v-warning-lighten4)"
          >
            <v-icon small color="warning" class="mr-2">
              mdi-alert-circle
            </v-icon>
            <span class="font-weight-medium">
              {{ $t("bookable.areas.hierarchy.notes.title") }}
            </span>
          </v-card-subtitle>
          <v-card-text>
            <v-list dense>
              <v-list-item v-for="note in notes" :key="note.key">
                <v-list-item-icon class="mr-3">
                  <v-icon small :color="note.color">{{ note.icon }}</v-icon>
                </v-list-item-icon>
                <v-list-item-content>
                  <v-list-item-subtitle class="text-wrap">
                    <span v-html="$t(note.text)"></span>
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-divider class="my-5"></v-divider>
    <p v-if="bookablesForbidden" class="mb-3 text-caption text--secondary">
      {{ $t("bookable.select.forbidden") }}
    </p>
    <SortableList
      :items="relatedBookableIds"
      :available-items="bookablesWithoutSelf"
      item-value="id"
      item-text="title"
      item-detail="type"
      @update:items="patch({ relatedBookableIds: $event })"
    >
      <template v-slot:detail="{ itemObject }">
        <BookableTypeChip :type="itemObject.type" />
      </template>
    </SortableList>
  </div>
</template>
