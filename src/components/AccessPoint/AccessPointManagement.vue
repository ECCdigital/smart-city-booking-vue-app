<script>
import { mapActions, mapGetters } from "vuex";
import ApiAccessPointService from "@/services/api/ApiAccessPointService";
import ApiAccessAppsService from "@/services/api/ApiAccessAppsService";
import ApiBookablesService from "@/services/api/ApiBookablesService";
import ApiBookingService from "@/services/api/ApiBookingService";
import { isForbiddenError } from "@/services/api/apiErrorMessage";
import ToastService from "@/services/ToastService";
import AccessPointProviderSection from "@/components/AccessPoint/AccessPointProviderSection.vue";
import AccessPointEditDialog from "@/components/AccessPoint/AccessPointEditDialog.vue";
import AccessPointDeleteDialog from "@/components/AccessPoint/AccessPointDeleteDialog.vue";
import AccessPointRotateDialog from "@/components/AccessPoint/AccessPointRotateDialog.vue";
import AccessPointCompartmentQrDialog from "@/components/AccessPoint/AccessPointCompartmentQrDialog.vue";
import { downloadQrCode, QR_FORMATS } from "@/utilities/access-point-qr";
import { formatAccessPointErrorMessage } from "@/utilities/access-point-errors";
import {
  accessPointLabel,
  isLockerAccessPoint,
} from "@/utilities/access-points";
import { createLockAndAccessAppDefaults } from "@/utilities/access-apps";
import { bookingsWithLiveAccess } from "@/utilities/access-grants";
import { carriesOwnCompartments } from "@/utilities/locker-system-compartments";

export default {
  name: "AccessPointManagement",
  components: {
    AccessPointProviderSection,
    AccessPointEditDialog,
    AccessPointDeleteDialog,
    AccessPointRotateDialog,
    AccessPointCompartmentQrDialog,
  },
  data() {
    return {
      loading: false,
      loadError: "",
      accessPoints: [],
      bookables: [],
      bookablesForbidden: false,
      providers: [],
      editDialog: false,
      // The provider of the section whose creation opened the dialog; empty
      // while an access point is edited.
      createProvider: "",
      selectedAccessPoint: null,
      deleteDialog: false,
      deleting: false,
      deleteError: "",
      bookings: [],
      bookingsUnreadable: false,
      loadingBookings: false,
      rotateDialog: false,
      compartmentQrDialog: false,
      downloadingId: "",
    };
  },
  computed: {
    ...mapGetters({
      tenantId: "tenants/currentTenantId",
    }),
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
          displayLabel: accessPointLabel(accessPoint),
          isLocker: isLockerAccessPoint(accessPoint),
          assignmentLabel: assigned
            .map((bookable) => bookable.title)
            .join(", "),
          // An Anlage that carries its own Fächer prints a QR code per Fach
          // (ECCdigital/tickets#1056); iFBS and Pareva Anlagen carry none.
          hasCompartmentQr: carriesOwnCompartments(accessPoint),
        };
      });
    },
    // One section per connected provider, in the order the backend lists
    // them, each with its access points. An access point whose provider is
    // not among them - one switched off - keeps a section of its own, so
    // that it stays reachable.
    sections() {
      const byProvider = new Map(
        this.providers.map((provider) => [
          provider.id,
          { provider, accessPoints: [] },
        ])
      );
      this.items.forEach((item) => {
        if (!byProvider.has(item.provider)) {
          byProvider.set(item.provider, {
            provider: {
              id: item.provider,
              title: createLockAndAccessAppDefaults()[item.provider]?.title,
            },
            accessPoints: [],
          });
        }
        byProvider.get(item.provider).accessPoints.push(item);
      });
      return [...byProvider.values()];
    },
    // "Not assigned" is a statement about the bookables; it may only be made
    // when they were actually readable.
    assignmentUnknownLabel() {
      return this.bookablesForbidden
        ? this.$t("accessPoint.management.row.assignmentForbidden")
        : this.$t("accessPoint.management.row.unassigned");
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
    // The creation starts in the section of a provider, so the provider is
    // settled before the dialog opens.
    openCreate(provider) {
      this.createProvider = provider;
      this.selectedAccessPoint = null;
      this.editDialog = true;
    },
    openEdit(accessPoint) {
      this.createProvider = "";
      this.selectedAccessPoint = accessPoint;
      this.editDialog = true;
    },
    openRotate(accessPoint) {
      this.selectedAccessPoint = accessPoint;
      this.rotateDialog = true;
    },
    openCompartmentQr(accessPoint) {
      this.selectedAccessPoint = accessPoint;
      this.compartmentQrDialog = true;
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
        // The toast names a reason the backend gives - a missing store-front
        // address, say - and keeps the general sentence for everything else.
        await this.addToast({
          ...ToastService.createToast(
            "accessPoint.management.toasts.qrFailed",
            "error"
          ),
          message: formatAccessPointErrorMessage(error, {
            fallbackKey: "accessPoint.management.toasts.qrFailed.message",
          }),
        });
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
  <div>
    <v-progress-linear :active="loading" indeterminate color="primary" />

    <v-alert v-if="loadError" color="error" text dense class="mb-4">
      <v-icon left>mdi-alert-circle</v-icon>
      {{ loadError }}
    </v-alert>

    <v-alert v-if="bookablesForbidden" color="info" text dense class="mb-4">
      <v-icon left>mdi-information-outline</v-icon>
      {{ $t("accessPoint.management.hints.assignmentForbidden") }}
    </v-alert>

    <div
      v-if="!loading && !loadError && !sections.length"
      class="text--secondary"
    >
      {{ $t("accessPoint.management.empty") }}
    </div>

    <AccessPointProviderSection
      v-for="section in sections"
      :key="section.provider.id"
      :provider="section.provider"
      class="mb-5"
      @create="openCreate(section.provider.id)"
    >
      <!-- Provisional rows, until the row of an access point gets its own
           component (ECCdigital/tickets#1108). -->
      <div
        v-for="item in section.accessPoints"
        :key="item.id"
        class="access-point-row"
        data-test="access-point-row"
      >
        <div class="access-point-row__main">
          <div class="font-weight-medium">{{ item.displayLabel }}</div>
          <div class="text-caption text--secondary">{{ item.externalId }}</div>
        </div>
        <div class="access-point-row__assignment">
          <span v-if="item.assignmentLabel">{{ item.assignmentLabel }}</span>
          <span v-else class="text--secondary">
            {{ assignmentUnknownLabel }}
          </span>
        </div>
        <div class="access-point-row__actions">
          <v-btn
            v-if="item.hasCompartmentQr"
            class="compartment-qr mr-1"
            small
            text
            color="primary"
            @click="openCompartmentQr(item)"
          >
            <v-icon left small>mdi-qrcode</v-icon>
            {{ $t("accessPoint.management.compartmentQr.action") }}
          </v-btn>
          <v-menu offset-y>
            <template v-slot:activator="{ on, attrs }">
              <v-btn class="row-menu" icon small v-bind="attrs" v-on="on">
                <v-icon>mdi-dots-horizontal</v-icon>
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item
                class="edit-access-point"
                link
                @click="openEdit(item)"
              >
                <v-list-item-icon><v-icon>mdi-pencil</v-icon></v-list-item-icon>
                <v-list-item-title>
                  {{ $t("accessPoint.management.edit") }}
                </v-list-item-title>
              </v-list-item>
              <!-- The QR codes of the Fächer, the way the door's QR code sits
                   in this menu (ECCdigital/tickets#1056). -->
              <v-list-item
                v-if="item.hasCompartmentQr"
                class="open-compartment-qr"
                link
                @click="openCompartmentQr(item)"
              >
                <v-list-item-icon><v-icon>mdi-qrcode</v-icon></v-list-item-icon>
                <v-list-item-title>
                  {{ $t("accessPoint.management.compartmentQr.menu") }}
                </v-list-item-title>
              </v-list-item>
              <!-- The QR code and its scan code belong to a door: what they
                   unlock is a validation rule, and a locker system has none. -->
              <template v-if="!item.isLocker">
                <v-divider />
                <v-list-item
                  v-for="format in qrFormats"
                  :key="format"
                  :class="`download-qr-${format}`"
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
                <v-list-item
                  class="rotate-access-point"
                  link
                  @click="openRotate(item)"
                >
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
        </div>
      </div>
    </AccessPointProviderSection>

    <AccessPointEditDialog
      :open="editDialog"
      :access-point="selectedAccessPoint"
      :access-points="accessPoints"
      :providers="providers"
      :provider="createProvider"
      @close="editDialog = false"
      @saved="onSaved"
    />
    <AccessPointRotateDialog
      :open="rotateDialog"
      :access-point="selectedAccessPoint"
      @close="rotateDialog = false"
      @rotated="onRotated"
    />
    <AccessPointCompartmentQrDialog
      :open="compartmentQrDialog"
      :access-point="selectedAccessPoint"
      @rotated="onRotated"
      @close="compartmentQrDialog = false"
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
  </div>
</template>

<style scoped>
.access-point-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 12px 10px 16px;
}

.access-point-row + .access-point-row {
  border-top: 1px solid var(--scb-rule);
}

.access-point-row__main,
.access-point-row__assignment {
  flex: 1;
  min-width: 0;
}

.access-point-row__assignment {
  font-size: var(--scb-font-size-sm);
}

.access-point-row__actions {
  flex-shrink: 0;
}

@media (max-width: 760px) {
  .access-point-row {
    flex-wrap: wrap;
  }
}
</style>
