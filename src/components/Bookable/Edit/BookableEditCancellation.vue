<script>
import bookableEditing from "@/mixins/bookableEditing";

/**
 * Stornierung: whether bookers may cancel their own bookings, or only the
 * administration. The area as the editing page frames it in a card and the
 * step „Weitere Einstellungen“ in a row.
 */
export default {
  name: "BookableEditCancellation",
  mixins: [bookableEditing],
  computed: {
    // A bookable without a policy lets bookers cancel (`normalizeBookable`).
    policy() {
      return this.bookable.cancellationPolicy || { userCancellable: true };
    },
  },
  methods: {
    setUserCancellable(userCancellable) {
      this.patch({
        cancellationPolicy: {
          ...this.policy,
          userCancellable: !!userCancellable,
        },
      });
    },
  },
};
</script>

<template>
  <div>
    <v-switch
      dense
      :label="$t('bookable.areas.cancellation.userCancellable')"
      hide-details
      :input-value="policy.userCancellable"
      @change="setUserCancellable"
    ></v-switch>
    <p class="mb-0 mt-3 text-caption" style="max-width: 700px">
      {{ $t("bookable.areas.cancellation.explanation") }}
    </p>
  </div>
</template>
