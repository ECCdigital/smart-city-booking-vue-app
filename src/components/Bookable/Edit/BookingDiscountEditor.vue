<script>
export default {
  name: "BookingDiscountEditor",
  props: {
    items: {
      type: Array,
      default: () => [],
    },
    type: {
      type: String,
      required: true,
      validator: (value) => ["user", "role"].includes(value),
    },
    availableRoles: {
      type: Array,
      default: () => [],
    },
    availableUsers: {
      type: Array,
      default: () => [],
    },
    label: {
      type: String,
      required: true,
    },
    hint: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      showAddDialog: false,
      newEntryId: null,
      newEntryPercent: 100,
      addFormValid: true,
    };
  },
  computed: {
    idKey() {
      return this.type === "user" ? "userId" : "roleId";
    },
    icon() {
      return this.type === "user"
        ? "mdi-account-multiple"
        : "mdi-account-group";
    },
    dialogTitle() {
      return this.type === "user"
        ? "Benutzer-Rabatt hinzufügen"
        : "Rollen-Rabatt hinzufügen";
    },
    emptyTitle() {
      return this.type === "user"
        ? "Noch keine Benutzer-Rabatte definiert"
        : "Noch keine Rollen-Rabatte definiert";
    },
    emptyDescription() {
      return this.type === "user"
        ? "Gewähren Sie bestimmten Benutzern einen Preisnachlass auf dieses Buchungsobjekt."
        : "Gewähren Sie allen Benutzern einer Rolle einen Preisnachlass auf dieses Buchungsobjekt.";
    },
    emptyCta() {
      return this.type === "user"
        ? "Ersten Benutzer-Rabatt hinzufügen"
        : "Ersten Rollen-Rabatt hinzufügen";
    },
    addSelectLabel() {
      return this.type === "user" ? "Benutzer" : "Rolle";
    },
    discountRules() {
      return [
        (value) =>
          (value !== "" && value !== null && value !== undefined) ||
          "Pflichtfeld",
        (value) => Number.isInteger(Number(value)) || "Ganzzahl erforderlich",
        (value) =>
          (value >= 0 && value <= 100) ||
          "Wert muss zwischen 0 und 100 liegen",
      ];
    },
    idRules() {
      return [(value) => !!value || "Pflichtfeld"];
    },
    safeItems() {
      return (this.items || []).filter(
        (entry) => entry && typeof entry === "object"
      );
    },
    assignedIds() {
      return this.safeItems
        .map((entry) => entry[this.idKey])
        .filter((id) => id !== null && id !== undefined && id !== "");
    },
    availableToAdd() {
      if (this.type === "user") {
        return this.availableUsers.filter(
          (user) => !this.assignedIds.includes(user.userId)
        );
      }

      return this.availableRoles.filter(
        (role) => !this.assignedIds.includes(role.id)
      );
    },
    canAddMore() {
      return this.availableToAdd.length > 0;
    },
    canConfirmAdd() {
      return (
        !!this.newEntryId &&
        Number.isInteger(Number(this.newEntryPercent)) &&
        this.newEntryPercent >= 0 &&
        this.newEntryPercent <= 100 &&
        !this.assignedIds.includes(this.newEntryId)
      );
    },
  },
  methods: {
    getUserById(userId) {
      return this.availableUsers.find((user) => user.userId === userId);
    },
    displayName(entry) {
      if (this.type === "user") {
        const user = this.getUserById(entry.userId);
        if (user?.hasName) {
          return user.fullName;
        }

        return entry.userId || "Benutzer";
      }

      return (
        this.availableRoles.find((role) => role.id === entry.roleId)?.name ||
        "Rolle"
      );
    },
    displayEmail(entry) {
      if (this.type !== "user") {
        return null;
      }

      const user = this.getUserById(entry.userId);
      if (user?.hasName) {
        return user.userId;
      }

      return null;
    },
    discountLabel(percent) {
      if (percent >= 100) {
        return "100 % (kostenfrei)";
      }

      return `${percent} %`;
    },
    openAddDialog() {
      if (!this.canAddMore) {
        return;
      }

      this.newEntryId = null;
      this.newEntryPercent = 100;
      this.showAddDialog = true;
      this.$nextTick(() => {
        this.$refs.addForm?.resetValidation();
      });
    },
    cancelAdd() {
      this.showAddDialog = false;
      this.newEntryId = null;
      this.newEntryPercent = 100;
      this.$refs.addForm?.resetValidation();
    },
    async confirmAdd() {
      if (!this.$refs.addForm?.validate() || !this.canConfirmAdd) {
        return;
      }

      if (!Array.isArray(this.items)) {
        return;
      }

      this.items.push({
        [this.idKey]: this.newEntryId,
        discountPercent: Number(this.newEntryPercent),
      });

      this.cancelAdd();
    },
    removeEntry(index) {
      const entry = this.safeItems[index];
      if (!entry || !Array.isArray(this.items)) {
        return;
      }

      const originalIndex = this.items.indexOf(entry);
      if (originalIndex !== -1) {
        this.items.splice(originalIndex, 1);
      }
    },
  },
};
</script>

<template>
  <v-card class="mb-6 section-card" elevation="2" outlined>
    <v-card-title
      class="section-header pa-4 d-flex justify-space-between align-center"
    >
      <div>
        <v-icon class="mr-2">{{ icon }}</v-icon>
        <span class="text-h6 font-weight-bold">{{ label }}</span>
      </div>
      <v-btn
        small
        color="primary"
        :disabled="!canAddMore"
        @click="openAddDialog"
      >
        <v-icon left small>mdi-plus</v-icon>
        Hinzufügen
      </v-btn>
    </v-card-title>
    <v-divider />

    <v-card-text class="pa-4">
      <p
        v-if="hint"
        class="mb-4 text-caption"
        style="max-width: 700px"
        v-html="hint"
      />

      <div v-if="safeItems.length > 0">
        <v-list class="py-0">
          <template v-for="(entry, index) in safeItems">
            <v-list-item :key="`${type}-discount-${index}`" class="px-0">
              <v-list-item-avatar class="mr-3" color="accent" size="36">
                <v-icon small>{{ icon }}</v-icon>
              </v-list-item-avatar>

              <v-list-item-content>
                <v-list-item-title class="font-weight-medium">
                  {{ displayName(entry) }}
                </v-list-item-title>
                <v-list-item-subtitle
                  v-if="displayEmail(entry)"
                  class="text-caption grey--text text--darken-1"
                >
                  {{ displayEmail(entry) }}
                </v-list-item-subtitle>
                <v-list-item-subtitle>
                  <v-chip
                    x-small
                    :color="
                      entry.discountPercent >= 100 ? 'success' : 'primary'
                    "
                    text-color="white"
                    class="mt-1"
                  >
                    {{ discountLabel(entry.discountPercent) }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item-content>

              <v-list-item-content class="discount-field-col">
                <v-text-field
                  v-model.number="entry.discountPercent"
                  label="Rabatt"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  suffix="%"
                  hide-details="auto"
                  background-color="accent"
                  filled
                  dense
                  :rules="discountRules"
                />
              </v-list-item-content>

              <v-list-item-action title="Entfernen">
                <v-btn icon small @click="removeEntry(index)">
                  <v-icon color="grey lighten-1">mdi-close</v-icon>
                </v-btn>
              </v-list-item-action>
            </v-list-item>

            <v-divider
              v-if="index < safeItems.length - 1"
              :key="`${type}-divider-${index}`"
            />
          </template>
        </v-list>
      </div>

      <div v-else class="text-center py-8">
        <v-icon large color="grey lighten-1" class="mb-2">
          {{ icon }}
        </v-icon>
        <div class="text-h6 grey--text mb-2">
          {{ emptyTitle }}
        </div>
        <div class="text-body-2 grey--text text--darken-1 mb-4">
          {{ emptyDescription }}
        </div>
        <v-btn
          small
          text
          color="primary"
          :disabled="!canAddMore"
          @click="openAddDialog"
        >
          <v-icon left small>mdi-plus</v-icon>
          {{ emptyCta }}
        </v-btn>
      </div>
    </v-card-text>

    <v-dialog v-model="showAddDialog" max-width="520px" persistent>
      <v-form ref="addForm" v-model="addFormValid">
        <v-card>
          <div class="px-6 py-5 d-flex align-center">
            <v-icon large class="mr-3">mdi-plus-circle</v-icon>
            <span class="text-h5 font-weight-bold">{{ dialogTitle }}</span>
          </div>

          <v-divider />

          <v-card-text class="px-6 py-6">
            <v-autocomplete
              v-if="type === 'user'"
              v-model="newEntryId"
              :items="availableToAdd"
              :label="addSelectLabel"
              item-text="fullName"
              item-value="userId"
              hide-details="auto"
              background-color="accent"
              filled
              dense
              clearable
              no-data-text="Keine Benutzer verfügbar"
              :rules="idRules"
            >
              <template #item="{ item }">
                <v-list-item-content>
                  <v-list-item-title>{{ item.fullName }}</v-list-item-title>
                  <v-list-item-subtitle
                    v-if="item.hasName"
                    class="text-caption grey--text"
                  >
                    {{ item.userId }}
                  </v-list-item-subtitle>
                </v-list-item-content>
              </template>
              <template #selection="{ item }">
                <span>{{ item.fullName }}</span>
              </template>
            </v-autocomplete>
            <v-select
              v-else
              v-model="newEntryId"
              :items="availableToAdd"
              :label="addSelectLabel"
              item-text="name"
              item-value="id"
              hide-details="auto"
              background-color="accent"
              filled
              dense
              clearable
              no-data-text="Keine Rollen verfügbar"
              :rules="idRules"
            />

            <v-text-field
              v-model.number="newEntryPercent"
              class="mt-4"
              label="Rabatt"
              type="number"
              min="0"
              max="100"
              step="1"
              suffix="%"
              hide-details="auto"
              background-color="accent"
              filled
              dense
              :rules="discountRules"
            />

            <p class="mb-0 mt-4 text-caption text--secondary">
              100&nbsp;% entspricht einer kostenfreien Buchung für die
              ausgewählte {{ type === "user" ? "Person" : "Rolle" }}.
            </p>
          </v-card-text>

          <v-divider />

          <v-card-actions class="px-6 py-4">
            <v-spacer />
            <v-btn text @click="cancelAdd">Abbrechen</v-btn>
            <v-btn
              color="primary"
              :disabled="!canConfirmAdd"
              @click="confirmAdd"
            >
              Übernehmen
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.section-card {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}
.section-header {
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.02) 0%,
    rgba(0, 0, 0, 0.01) 100%
  );
}
.theme--dark .section-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
}
.discount-field-col {
  max-width: 140px;
  flex: 0 0 140px;
}
@media (max-width: 959px) {
  .discount-field-col {
    max-width: none;
    flex: 1 1 auto;
  }
}
</style>
