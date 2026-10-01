<template>
  <v-menu offset-y left content-class="sso-text-menu">
    <template #activator="{ on, attrs }">
      <v-btn outlined v-bind="attrs" data-test="sso-text-menu" v-on="on">
        <v-icon left>mdi-content-copy</v-icon>
        {{ $t("instance.edit.sso.text.menu") }}
        <v-icon right>mdi-menu-down</v-icon>
      </v-btn>
    </template>
    <v-list dense>
      <v-list-item @click="copy()">
        <v-list-item-title>
          {{ $t("instance.edit.sso.text.copyGuide") }}
        </v-list-item-title>
      </v-list-item>
      <v-list-item :disabled="!result" @click="copy({ result })">
        <v-list-item-title>
          {{ $t("instance.edit.sso.text.copyGuideWithResult") }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
import { mapActions } from "vuex";
import ToastService from "@/services/ToastService";
import { guideAsText } from "@/services/keycloak/realmGuideText";

/**
 * The menu „Als Text“ of the status card: the Anleitung as plain text into
 * the clipboard, for the customer's IT, after „Realm prüfen“ also with its
 * result. Never with the Client Secret.
 */
export default {
  name: "RealmGuideTextMenu",
  props: {
    guide: { type: Object, required: true },
    /** The result of „Realm prüfen“, `{ checkedAt, rows }`, or `null`. */
    result: { type: Object, default: null },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    /** The clipboard may refuse (permission, insecure context); then it toasts. */
    async copy(options = {}) {
      const text = guideAsText(
        this.guide,
        (key, params) => this.$t(key, params),
        // The text names the instance by the Adresse it was copied from.
        { instance: window.location.origin, ...options }
      );
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        await this.addToast(
          ToastService.createToast("errors.something-wrong", "error")
        );
        return;
      }
      await this.addToast(
        ToastService.createToast(
          options.result
            ? "instance.edit.sso.text.copiedWithResult"
            : "instance.edit.sso.text.copied",
          "success"
        )
      );
    },
  },
};
</script>
