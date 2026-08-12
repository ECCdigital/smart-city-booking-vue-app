<script>
import { mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import { downloadQrCode } from "@/utilities/access-point-qr";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";

export default {
  name: "AccessPointRotateDialog",
  props: {
    open: { type: Boolean, default: false },
    accessPoint: { type: Object, default: null },
  },
  data() {
    return {
      rotating: false,
      rotated: false,
      downloading: "",
      error: "",
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    label() {
      return (
        this.accessPoint?.label ||
        this.accessPoint?.externalId ||
        this.accessPoint?.id ||
        ""
      );
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.rotating = false;
        this.rotated = false;
        this.downloading = "";
        this.error = "";
      }
    },
  },
  methods: {
    async rotate() {
      this.rotating = true;
      this.error = "";

      try {
        await ApiAccessPointService.rotateScanCode(
          this.accessPoint.id,
          this.tenantId
        );
        this.rotated = true;
        this.$emit("rotated", this.accessPoint);
      } catch (error) {
        this.error = formatAccessPointErrorMessage(error, this.$t.bind(this), {
          fallbackKey: "accessPoint.management.rotate.error",
        });
      } finally {
        this.rotating = false;
      }
    },
    async download(format) {
      this.downloading = format;
      this.error = "";

      try {
        await downloadQrCode(this.accessPoint, format, this.tenantId);
      } catch (error) {
        this.error = formatAccessPointErrorMessage(error, this.$t.bind(this), {
          fallbackKey: "accessPoint.management.qr.error",
        });
      } finally {
        this.downloading = "";
      }
    },
  },
};
</script>

<template>
  <v-dialog
    :value="open"
    max-width="560"
    persistent
    @input="!$event && $emit('close')"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left color="warning">mdi-autorenew</v-icon>
        {{ $t("accessPoint.management.rotate.title") }}
      </v-card-title>
      <v-divider />

      <v-card-text class="pt-4">
        <template v-if="!rotated">
          <p>{{ $t("accessPoint.management.rotate.question", { label }) }}</p>
          <v-alert color="warning" text dense class="mb-0">
            <v-icon left>mdi-alert</v-icon>
            {{ $t("accessPoint.management.rotate.warning") }}
          </v-alert>
        </template>

        <template v-else>
          <v-alert color="success" text dense>
            <v-icon left>mdi-check-circle</v-icon>
            {{ $t("accessPoint.management.rotate.done") }}
          </v-alert>
          <p class="mb-2">{{ $t("accessPoint.management.rotate.reprint") }}</p>
          <div class="d-flex align-center flex-wrap" style="gap: 8px">
            <v-btn
              color="primary"
              :loading="downloading === 'pdf'"
              :disabled="!!downloading"
              @click="download('pdf')"
            >
              <v-icon left>mdi-file-pdf-box</v-icon>
              {{ $t("accessPoint.management.qr.pdf") }}
            </v-btn>
            <v-btn
              text
              small
              :loading="downloading === 'svg'"
              :disabled="!!downloading"
              @click="download('svg')"
            >
              {{ $t("accessPoint.management.qr.svg") }}
            </v-btn>
            <v-btn
              text
              small
              :loading="downloading === 'png'"
              :disabled="!!downloading"
              @click="download('png')"
            >
              {{ $t("accessPoint.management.qr.png") }}
            </v-btn>
          </div>
        </template>

        <v-alert v-if="error" color="error" text dense class="mt-4 mb-0">
          <v-icon left>mdi-alert-circle</v-icon>
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn text :disabled="rotating" @click="$emit('close')">
          {{
            rotated
              ? $t("accessPoint.management.close")
              : $t("accessPoint.management.cancel")
          }}
        </v-btn>
        <v-btn
          v-if="!rotated"
          color="warning"
          :loading="rotating"
          @click="rotate"
        >
          {{ $t("accessPoint.management.rotate.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
