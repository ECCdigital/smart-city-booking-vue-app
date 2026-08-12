<script>
import { mapActions, mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ToastService from "@/services/ToastService";
import BaseSection from "@/components/commons/BaseSection.vue";
import AccessPointEditDialog from "@/components/AccessPoint/AccessPointEditDialog.vue";
import AccessPointDeleteDialog from "@/components/AccessPoint/AccessPointDeleteDialog.vue";
import AccessPointRotateDialog from "@/components/AccessPoint/AccessPointRotateDialog.vue";
import { downloadQrCode, QR_FORMATS } from "@/utilities/access-point-qr";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";

const QR_SCAN_RULE = "qrScan";

export default {
  name: "AccessPointManagement",
  components: {
    BaseSection,
    AccessPointEditDialog,
    AccessPointDeleteDialog,
    AccessPointRotateDialog,
  },
  data() {
    return {
      search: "",
      loading: false,
      loadError: "",
      accessPoints: [],
      bookables: [],
      providers: [],
      editDialog: false,
      selectedAccessPoint: null,
      deleteDialog: false,
      deleting: false,
      deleteError: "",
      rotateDialog: false,
      downloadingId: "",
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
    headers() {
      return [
        {
          text: this.$t("accessPoint.management.fields.label"),
          value: "displayLabel",
        },
        {
          text: this.$t("accessPoint.management.fields.provider"),
          value: "provider",
        },
        {
          text: this.$t("accessPoint.management.fields.type"),
          value: "typeLabel",
        },
        {
          text: this.$t("accessPoint.management.table.assignment"),
          value: "assignmentLabel",
        },
        {
          text: this.$t("accessPoint.management.rules.qrScanShort"),
          value: "qrScanRequired",
        },
        { text: "", value: "controls", sortable: false, align: "end" },
      ];
    },
    // Which bookables point at which access point - the reference lives on
    // the bookable, so the assignment is resolved here rather than asked for.
    bookablesByAccessPointId() {
      const map = {};
      this.bookables.forEach((bookable) => {
        const ids = bookable.accessPointDetails?.accessPointIds || [];
        ids.forEach((id) => {
          if (!map[id]) map[id] = [];
          map[id].push(bookable);
        });
      });
      return map;
    },
    items() {
      return this.accessPoints.map((accessPoint) => {
        const assigned = this.bookablesByAccessPointId[accessPoint.id] || [];
        return {
          ...accessPoint,
          displayLabel:
            accessPoint.label || accessPoint.externalId || accessPoint.id,
          typeLabel: this.$t(
            `accessPoint.management.types.${accessPoint.type}`
          ),
          assignedBookables: assigned,
          assignmentLabel: assigned.length
            ? assigned.map((bookable) => bookable.title).join(", ")
            : this.$t("accessPoint.management.table.unassigned"),
          qrScanRequired: (accessPoint.validationRules || []).some(
            (rule) => rule.type === QR_SCAN_RULE
          ),
        };
      });
    },
    qrFormats() {
      return QR_FORMATS;
    },
    affectedBookables() {
      if (!this.selectedAccessPoint) return [];
      return this.bookablesByAccessPointId[this.selectedAccessPoint.id] || [];
    },
  },
  watch: {
    tenantId() {
      this.fetchAll();
    },
  },
  methods: {
    ...mapActions({ addToast: "toasts/add" }),
    async fetchAll() {
      if (!this.tenantId) return;

      this.loading = true;
      this.loadError = "";

      try {
        const response = await ApiAccessPointService.getAccessPoints(
          this.tenantId
        );
        this.accessPoints = response.data || [];
      } catch (error) {
        this.accessPoints = [];
        this.loadError = formatAccessPointErrorMessage(
          error,
          this.$t.bind(this),
          { fallbackKey: "accessPoint.management.errors.loadFailed" }
        );
      } finally {
        this.loading = false;
      }

      await Promise.all([this.fetchBookables(), this.fetchProviders()]);
    },
    async fetchBookables() {
      try {
        const response = await ApiBookablesService.getBookables(
          this.tenantId,
          false
        );
        this.bookables = response.data || [];
      } catch (error) {
        // The list stays usable without the assignment column.
        this.bookables = [];
      }
    },
    async fetchProviders() {
      try {
        const response = await ApiAccessAppsService.getProviders(this.tenantId);
        this.providers = response.data || [];
      } catch (error) {
        this.providers = [];
      }
    },
    openCreate() {
      this.selectedAccessPoint = null;
      this.editDialog = true;
    },
    openEdit(accessPoint) {
      this.selectedAccessPoint = accessPoint;
      this.editDialog = true;
    },
    openRotate(accessPoint) {
      this.selectedAccessPoint = accessPoint;
      this.rotateDialog = true;
    },
    openDelete(accessPoint) {
      this.selectedAccessPoint = accessPoint;
      this.deleteError = "";
      this.deleteDialog = true;
    },
    async onSaved() {
      this.editDialog = false;
      await this.addToast(
        ToastService.createToast(
          "accessPoint.management.toasts.saved",
          "success"
        )
      );
      await this.fetchAll();
    },
    async onRotated() {
      await this.fetchAll();
    },
    async confirmDelete() {
      this.deleting = true;
      this.deleteError = "";

      try {
        await ApiAccessPointService.deleteAccessPoint(
          this.selectedAccessPoint.id,
          this.tenantId
        );
        this.deleteDialog = false;
        await this.addToast(
          ToastService.createToast(
            "accessPoint.management.toasts.deleted",
            "success"
          )
        );
        await this.fetchAll();
      } catch (error) {
        this.deleteError = formatAccessPointErrorMessage(
          error,
          this.$t.bind(this),
          { fallbackKey: "accessPoint.management.errors.deleteFailed" }
        );
      } finally {
        this.deleting = false;
      }
    },
    async downloadQr(accessPoint, format) {
      this.downloadingId = `${accessPoint.id}-${format}`;

      try {
        await downloadQrCode(accessPoint, format, this.tenantId);
      } catch (error) {
        await this.addToast(
          ToastService.createToast(
            "accessPoint.management.toasts.qrFailed",
            "error"
          )
        );
      } finally {
        this.downloadingId = "";
      }
    },
  },
  mounted() {
    this.fetchAll();
  },
};
</script>

<template>
  <BaseSection
    :title="$t('accessPoint.management.title')"
    icon="mdi-door-closed-lock"
    :hint="$t('accessPoint.management.hint')"
  >
    <template v-slot:actions>
      <v-btn
        icon
        :loading="loading"
        :disabled="loading"
        :title="$t('accessPoint.management.reload')"
        @click="fetchAll"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
      <v-btn color="primary" class="ml-2" @click="openCreate">
        <v-icon left>mdi-plus</v-icon>
        {{ $t("accessPoint.management.create") }}
      </v-btn>
    </template>

    <v-alert v-if="loadError" color="error" text dense class="mb-4">
      <v-icon left>mdi-alert-circle</v-icon>
      {{ loadError }}
    </v-alert>

    <v-text-field
      v-model="search"
      :label="$t('accessPoint.management.search')"
      append-icon="mdi-magnify"
      background-color="accent"
      filled
      dense
      clearable
      hide-details
      class="mb-4"
    />

    <v-data-table
      :headers="headers"
      :items="items"
      :search="search"
      :loading="loading"
      :loading-text="$t('accessPoint.management.table.loading')"
      :no-data-text="$t('accessPoint.management.table.empty')"
      :footer-props="{
        'items-per-page-all-text': 'Alle',
        'items-per-page-text': $t('accessPoint.management.table.perPage'),
      }"
      class="accent elevation-1"
    >
      <template v-slot:item.displayLabel="{ item }">
        <div class="font-weight-medium">{{ item.displayLabel }}</div>
        <div class="text-caption text--secondary">{{ item.externalId }}</div>
      </template>

      <template v-slot:item.assignmentLabel="{ item }">
        <span
          v-if="item.assignedBookables.length === 0"
          class="text--secondary"
        >
          {{ $t("accessPoint.management.table.unassigned") }}
        </span>
        <span v-else>{{ item.assignmentLabel }}</span>
      </template>

      <template v-slot:item.qrScanRequired="{ item }">
        <v-chip v-if="item.qrScanRequired" x-small label color="primary">
          {{ $t("accessPoint.management.rules.required") }}
        </v-chip>
        <v-chip v-else x-small label color="grey lighten-1">
          {{ $t("accessPoint.management.rules.notRequired") }}
        </v-chip>
      </template>

      <template v-slot:item.controls="{ item }">
        <v-menu offset-y>
          <template v-slot:activator="{ on, attrs }">
            <v-btn icon small v-bind="attrs" v-on="on">
              <v-icon>mdi-dots-horizontal</v-icon>
            </v-btn>
          </template>
          <v-list dense>
            <v-list-item link @click="openEdit(item)">
              <v-list-item-icon><v-icon>mdi-pencil</v-icon></v-list-item-icon>
              <v-list-item-title>
                {{ $t("accessPoint.management.edit") }}
              </v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item
              v-for="format in qrFormats"
              :key="format"
              link
              :disabled="downloadingId === `${item.id}-${format}`"
              @click="downloadQr(item, format)"
            >
              <v-list-item-icon>
                <v-icon>
                  {{ format === "pdf" ? "mdi-file-pdf-box" : "mdi-qrcode" }}
                </v-icon>
              </v-list-item-icon>
              <v-list-item-title>
                {{ $t(`accessPoint.management.qr.${format}`) }}
              </v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item link @click="openRotate(item)">
              <v-list-item-icon>
                <v-icon>mdi-autorenew</v-icon>
              </v-list-item-icon>
              <v-list-item-title>
                {{ $t("accessPoint.management.rotate.action") }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item link @click="openDelete(item)">
              <v-list-item-icon>
                <v-icon color="error">mdi-delete</v-icon>
              </v-list-item-icon>
              <v-list-item-title>
                {{ $t("accessPoint.management.delete.action") }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
    </v-data-table>

    <AccessPointEditDialog
      :open="editDialog"
      :access-point="selectedAccessPoint"
      :access-points="accessPoints"
      :providers="providers"
      @close="editDialog = false"
      @saved="onSaved"
    />
    <AccessPointRotateDialog
      :open="rotateDialog"
      :access-point="selectedAccessPoint"
      @close="rotateDialog = false"
      @rotated="onRotated"
    />
    <AccessPointDeleteDialog
      :open="deleteDialog"
      :access-point="selectedAccessPoint"
      :affected-bookables="affectedBookables"
      :deleting="deleting"
      :error="deleteError"
      @close="deleteDialog = false"
      @confirm="confirmDelete"
    />
  </BaseSection>
</template>
