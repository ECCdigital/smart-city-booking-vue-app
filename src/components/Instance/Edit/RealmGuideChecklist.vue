<template>
  <div class="realm-guide" data-test="guide">
    <div class="realm-guide__heading">
      {{ $t("instance.edit.sso.guide.title") }}
    </div>

    <v-alert
      v-for="hint in guide.hints"
      :key="hint.id"
      :type="hint.type"
      text
      dense
      data-test="guide-hint"
    >
      {{ $t(`instance.edit.sso.guide.hints.${hint.id}`, hint.params) }}
    </v-alert>

    <v-expansion-panels
      v-model="openIndices"
      multiple
      accordion
      flat
      class="realm-guide__steps"
    >
      <RealmGuideStep
        v-for="step in guide.steps"
        :key="step.key"
        :step="step"
      />
    </v-expansion-panels>
  </div>
</template>

<script>
import RealmGuideStep from "@/components/Instance/Edit/RealmGuideStep.vue";

/**
 * The Anleitung: the steps to set up the realm, in the order of the setup.
 * Open while values are missing, folded once SSO is set up.
 */
export default {
  name: "RealmGuideChecklist",
  components: { RealmGuideStep },
  props: {
    guide: { type: Object, required: true },
  },
  data() {
    return {
      /** Keys of the open steps; keys survive a step coming or going. */
      openKeys: [],
    };
  },
  computed: {
    openIndices: {
      get() {
        return this.guide.steps
          .map((step, index) => (this.openKeys.includes(step.key) ? index : -1))
          .filter((index) => index !== -1);
      },
      set(indices) {
        this.openKeys = indices.map((index) => this.guide.steps[index].key);
      },
    },
  },
  watch: {
    "guide.complete": {
      immediate: true,
      handler(complete) {
        if (!complete) this.openKeys = this.guide.steps.map((s) => s.key);
      },
    },
  },
};
</script>

<style scoped>
.realm-guide__heading {
  margin-bottom: var(--scb-space-2);
  font-size: var(--scb-font-size-header);
  font-weight: var(--scb-font-weight-semibold);
  color: var(--scb-text);
}

.realm-guide__steps {
  border: 1px solid var(--scb-surface-border);
  border-radius: var(--scb-radius-surface);
  overflow: hidden;
}
</style>
