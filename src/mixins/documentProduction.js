import { mapActions } from "vuex";
import ToastService from "@/services/ToastService";
import {
  getApiErrorMessage,
  shouldRefetch,
} from "@/services/api/apiErrorMessage";

/**
 * The feedback pattern of a producing document action (spec "Dokumente
 * block"): the host keeps `busy[group]` and `errors[group]` for its own
 * groups; `produceDocument` runs one action end to end -
 * the call, the consistency check's 200 `{ success: false, errors }` (the
 * first error's code picks the message), the thrown error (read centrally,
 * `reload` emitted when the screen is stale), the toasts and the `reload`
 * on success. The group's error stays until a retry succeeds.
 */
export default {
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async produceDocument(group, { call, successKey, errorKey, errorMessage }) {
      this.busy[group] = true;
      try {
        const response = await call();
        if (response && response.success === false) {
          this.errors[group] = errorMessage(response.errors?.[0]?.code);
          await this.addToast(ToastService.createToast(errorKey, "error"));
          return;
        }
        this.errors[group] = null;
        await this.addToast(ToastService.createToast(successKey, "success"));
        this.$emit("reload");
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          this.$t(`${errorKey}.message`)
        );
        this.errors[group] = message;
        await this.addToast({
          title: this.$t(`${errorKey}.title`),
          message,
          type: "error",
        });
        if (shouldRefetch(error)) {
          this.$emit("reload");
        }
      } finally {
        this.busy[group] = false;
      }
    },
  },
};
