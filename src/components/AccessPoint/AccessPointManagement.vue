<script>
import { mapActions, mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiBookingService from "@/services/api/ApiBookingService";
import { isForbiddenError } from "@/services/api/apiErrorMessage";
import ToastService from "@/services/ToastService";
import BaseSection from "@/components/commons/BaseSection.vue";
import AccessPointEditDialog from "@/components/AccessPoint/AccessPointEditDialog.vue";
import AccessPointDeleteDialog from "@/components/AccessPoint/AccessPointDeleteDialog.vue";
import AccessPointRotateDialog from "@/components/AccessPoint/AccessPointRotateDialog.vue";
import { downloadQrCode, QR_FORMATS } from "@/utilities/access-point-qr";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";
import {
  accessPointLabel,
  accessPointTypeLabel,
  isLockerAccessPoint,
  requiresQrScan,
} from "@/utilities/access-points";
import { bookingsWithLiveAccess } from "@/utilities/access-grants";

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
      // "all" | "door" | "locker" - the three buttons over the table
      typeFilter: "all",
      loading: false,
      loadError: "",
      accessPoints: [],
      bookables: [],
      bookablesForbidden: false,
      providers: [],
      editDialog: false,
      editSource: "provider",
      selectedAccessPoint: null,
      deleteDialog: false,
      deleting: false,
      deleteError: "",
      bookings: [],
      bookingsUnreadable: false,
      loadingBookings: false,
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
          text: this.$t("accessPoint.management.table.origin"),
          value: "originLabel",
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
        const isLocker = isLockerAccessPoint(accessPoint);
        return {
          ...accessPoint,
          displayLabel: accessPointLabel(accessPoint),
          typeLabel: accessPointTypeLabel(accessPoint),
          isLocker,
          // Where the row comes from: a door is entered by hand, a locker
          // system is taken over from what the provider lists.
          originLabel: isLocker
            ? this.$t("accessPoint.management.table.originProvider")
            : this.$t("accessPoint.management.table.originManual"),
          assignedBookables: assigned,
          assignmentLabel: assigned.length
            ? assigned.map((bookable) => bookable.title).join(", ")
            : this.assignmentUnknownLabel,
          qrScanRequired: requiresQrScan(accessPoint),
        };
      });
    },
    // One list for doors and locker systems, narrowed to one kind on demand.
    // Everything that is not a locker system counts as a door - that is the
    // schema's default for a row without a type.
    filteredItems() {
      if (this.typeFilter === "locker") {
        return this.items.filter((item) => item.isLocker);
      }
      if (this.typeFilter === "door") {
        return this.items.filter((item) => !item.isLocker);
      }
      return this.items;
    },
    // "Not assigned" is a statement about the bookables; it may only be made
    // when they were actually readable.
    assignmentUnknownLabel() {
      return this.bookablesForbidden
        ? this.$t("accessPoint.management.table.assignmentForbidden")
        : this.$t("accessPoint.management.table.unassigned");
    },
    // "Nothing created yet" would be wrong while the list is narrowed to one
    // kind - then it is this filter that finds nothing.
    emptyText() {
      return this.typeFilter === "all"
        ? this.$t("accessPoint.management.table.empty")
        : this.$t("accessPoint.management.table.emptyFiltered");
    },
    qrFormats() {
      return QR_FORMATS;
    },
    affectedBookables() {
      if (!this.selectedAccessPoint) return [];
      return this.bookablesByAccessPointId[this.selectedAccessPoint.id] || [];
    },
    // The bookings that hold a granted, unrevoked access at the access point
    // about to be deleted. There is no route that asks that question directly:
    // `GET /:tenant/access` answers per booking, and
    // `/access/access-points/:id/bookings` is the caller's own bookings only
    // (`accessBookings.read`: own signedIn, any instanceOwner). What a tenant
    // owner can read is the tenant's bookings, which carry it in `accessInfo`
    // - the one place this screen reads that field, because here it is the
    // only reachable source.
    runningBookings() {
      if (!this.selectedAccessPoint) return [];
      return bookingsWithLiveAccess(this.bookings, this.selectedAccessPoint.id);
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
        this.loadError = formatAccessPointErrorMessage(error, {
          fallbackKey: "accessPoint.management.errors.loadFailed",
        });
      } finally {
        this.loading = false;
      }

      await Promise.all([this.fetchBookables(), this.fetchProviders()]);
    },
    async fetchBookables() {
      this.bookablesForbidden = false;
      try {
        const response = await ApiBookablesService.getBookables(
          this.tenantId,
          false
        );
        this.bookables = response.data || [];
      } catch (error) {
        // The list stays usable without the assignment column - that decision
        // stands, so no error banner replaces the table. What does not stand is
        // the column then reading "Keinem Buchungsobjekt zugeordnet" for every
        // row: on a denial we cannot tell, and saying "not assigned" would be a
        // claim about data we were refused. The cells say "not readable" and
        // one hint above the table says why. Any other failure keeps the old
        // silence.
        this.bookables = [];
        this.bookablesForbidden = isForbiddenError(error);
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
    // Two buttons, one dialog: a door is entered by hand, a locker system -
    // and a door as well, if it is listed - is taken over from the provider.
    openCreate(source) {
      this.selectedAccessPoint = null;
      this.editSource = source;
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
    async openDelete(accessPoint) {
      this.selectedAccessPoint = accessPoint;
      this.deleteError = "";
      this.deleteDialog = true;
      await this.fetchBookings();
    },
    /**
     * The tenant's bookings, read when a deletion is about to be confirmed -
     * the list is only needed there, and it is the widest request this screen
     * makes.
     */
    async fetchBookings() {
      this.loadingBookings = true;
      this.bookingsUnreadable = false;
      this.bookings = [];
      try {
        const response = await ApiBookingService.getBookings(this.tenantId);
        this.bookings = response.data || [];
      } catch (error) {
        // Whatever went wrong - a denial or a failure - the dialog may then
        // not claim that no booking is affected. It says so instead.
        this.bookings = [];
        this.bookingsUnreadable = true;
      } finally {
        this.loadingBookings = false;
      }
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
        this.deleteError = formatAccessPointErrorMessage(error, {
          fallbackKey: "accessPoint.management.errors.deleteFailed",
        });
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
      <v-btn
        class="create-door ml-2"
        color="primary"
        outlined
        @click="openCreate('manual')"
      >
        <v-icon left>mdi-door-closed-lock</v-icon>
        {{ $t("accessPoint.management.createDoor") }}
      </v-btn>
      <v-btn
        class="create-from-provider ml-2"
        color="primary"
        @click="openCreate('provider')"
      >
        <v-icon left>mdi-cloud-download-outline</v-icon>
        {{ $t("accessPoint.management.createFromProvider") }}
      </v-btn>
    </template>

    <v-alert v-if="loadError" color="error" text dense class="mb-4">
      <v-icon left>mdi-alert-circle</v-icon>
      {{ loadError }}
    </v-alert>

    <v-alert v-if="bookablesForbidden" color="info" text dense class="mb-4">
      <v-icon left>mdi-information-outline</v-icon>
      {{ $t("accessPoint.management.hints.assignmentForbidden") }}
    </v-alert>

    <div class="d-flex flex-wrap align-center mb-4">
      <v-text-field
        v-model="search"
        :label="$t('accessPoint.management.search')"
        append-icon="mdi-magnify"
        background-color="accent"
        filled
        dense
        clearable
        hide-details
        class="flex-grow-1 mr-4"
      />
      <v-btn-toggle v-model="typeFilter" mandatory dense class="type-filter">
        <v-btn small value="all" class="type-filter-all">
          {{ $t("accessPoint.management.table.filterAll") }}
        </v-btn>
        <v-btn small value="door" class="type-filter-door">
          {{ $t("accessPoint.management.table.filterDoors") }}
        </v-btn>
        <v-btn small value="locker" class="type-filter-locker">
          {{ $t("accessPoint.management.table.filterLockers") }}
        </v-btn>
      </v-btn-toggle>
    </div>

    <v-data-table
      :headers="headers"
      :items="filteredItems"
      :search="search"
      :loading="loading"
      :loading-text="$t('accessPoint.management.table.loading')"
      :no-data-text="emptyText"
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

      <template v-slot:item.typeLabel="{ item }">
        <v-chip
          v-if="item.typeLabel"
          x-small
          label
          :color="item.isLocker ? 'indigo' : 'primary'"
          dark
        >
          {{ item.typeLabel }}
        </v-chip>
      </template>

      <template v-slot:item.assignmentLabel="{ item }">
        <span
          v-if="item.assignedBookables.length === 0"
          class="text--secondary"
        >
          {{ assignmentUnknownLabel }}
        </span>
        <span v-else>{{ item.assignmentLabel }}</span>
        <!-- How many compartments a locker system hands out is the bookable's
             capacity, not a property of the access point. -->
        <div v-if="item.isLocker" class="text-caption text--secondary">
          {{ $t("accessPoint.management.table.capacityHint") }}
        </div>
      </template>

      <template v-slot:item.qrScanRequired="{ item }">
        <!-- A locker system carries no validation rules, so the QR question
             does not arise for it. -->
        <span v-if="item.isLocker" class="text-caption text--secondary">
          {{ $t("accessPoint.management.rules.notApplicable") }}
        </span>
        <v-chip v-else-if="item.qrScanRequired" x-small label color="primary">
          {{ $t("accessPoint.management.rules.required") }}
        </v-chip>
        <v-chip v-else x-small label color="grey lighten-1">
          {{ $t("accessPoint.management.rules.notRequired") }}
        </v-chip>
      </template>

      <template v-slot:item.controls="{ item }">
        <v-menu offset-y>
          <template v-slot:activator="{ on, attrs }">
            <v-btn class="row-menu" icon small v-bind="attrs" v-on="on">
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
            <!-- The QR code and its scan code belong to a door: what they
                 unlock is a validation rule, and a locker system has none. -->
            <template v-if="!item.isLocker">
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
            </template>
            <v-divider />
            <v-list-item
              class="delete-access-point"
              link
              @click="openDelete(item)"
            >
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
      :source="editSource"
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
      :running-bookings="runningBookings"
      :bookings-unreadable="bookingsUnreadable"
      :loading-bookings="loadingBookings"
      :deleting="deleting"
      :error="deleteError"
      @close="deleteDialog = false"
      @confirm="confirmDelete"
    />
  </BaseSection>
</template>
