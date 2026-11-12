import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";

/**
 * A request of a dialog of the QR codes of the Fächer (ECCdigital/tickets#1046)
 * - rotate, download - with a busy flag while it runs and its failure in the
 * dialog's inline alert (`error`), worded like every access point error.
 */
export default {
  data() {
    return { error: "" };
  },
  methods: {
    /**
     * Run `request` while the data field `flag` reads `busy`; afterwards it
     * reads idle again: `false` for a boolean flag, `""` for a string one.
     *
     * @param {string} flag The data field that tells what runs
     * @param {boolean|string} busy Its value while the request runs
     * @param {string} fallbackKey i18n key of the message for an error the
     *   API does not word
     * @param {() => Promise<void>} request The request, and what follows
     *   its success
     */
    async runRequest(flag, busy, fallbackKey, request) {
      this[flag] = busy;
      this.error = "";

      try {
        await request();
      } catch (error) {
        this.error = formatAccessPointErrorMessage(error, { fallbackKey });
      } finally {
        this[flag] = typeof busy === "string" ? "" : false;
      }
    },
  },
};
