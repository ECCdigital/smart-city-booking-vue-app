<script>
import BaseSection from "@/components/commons/BaseSection.vue";
import {
  INITIAL_SUPERVISION_LEVELS,
  SUPERVISION_LEVELS,
  levelLabelKey,
} from "@/utils/supervision";

const INITIAL_LEVEL_FIELD = "tenantInitialSupervisionLevel";

/**
 * An instance from before the field starts its tenants free. A stored level
 * this tab does not offer stays as it is: no choice shows, and a save lets
 * the backend refuse it at the field instead of silently writing free.
 */
function withInitialLevel(instance) {
  return {
    ...instance,
    [INITIAL_LEVEL_FIELD]:
      instance[INITIAL_LEVEL_FIELD] ?? SUPERVISION_LEVELS.FREE,
  };
}

export default {
  name: "InstanceEditTenants",
  components: { BaseSection },
  props: {
    instance: { type: Object, required: true },
    availableUsers: { type: Array, default: () => [] },
  },
  data() {
    return {
      local: withInitialLevel(this.instance),
      selectedUserToCreateTenant: null,
      supervisionLevels: INITIAL_SUPERVISION_LEVELS,
      initialLevelApiErrors: [],
    };
  },
  watch: {
    instance: {
      handler(n) {
        this.local = withInitialLevel(n);
      },
      deep: true,
    },
  },
  methods: {
    levelLabelKey,
    emitUpdate() {
      this.$emit("update:instance", { ...this.local });
    },
    onInitialLevelChange() {
      this.initialLevelApiErrors = [];
      this.emitUpdate();
    },
    /**
     * Called by the view with the fields a refused save names. Only the
     * Startstufe belongs to a field of this tab.
     */
    showApiErrors(details) {
      this.initialLevelApiErrors = (details || [])
        .filter((detail) => detail && detail.field === INITIAL_LEVEL_FIELD)
        .map(() => this.$t("instance.edit.tenants.initialLevel.invalid"));
    },
    validate() {
      this.initialLevelApiErrors = [];
      return true;
    },
    resetValidation() {
      this.initialLevelApiErrors = [];
    },
    addUser() {
      this.local.allowedUsersToCreateTenant.push(
        this.selectedUserToCreateTenant
      );
      this.selectedUserToCreateTenant = null;
    },
    removeUser(userId) {
      this.local.allowedUsersToCreateTenant.splice(
        this.local.allowedUsersToCreateTenant.indexOf(userId),
        1
      );
    },
    filtersUsers(usersToExclude) {
      return this.availableUsers?.filter(
        (user) => !usersToExclude.includes(user.id)
      );
    },
  },
};
</script>

<template>
  <BaseSection
    title="Mandanten"
    icon="mdi-domain"
    hint="Spezifizieren Sie hier wer Mandanten erstellen darf."
  >
    <v-switch
      v-model="local.allowAllUsersToCreateTenant"
      color="primary"
      hide-details
      label="Erlauben Sie allen Benutzern Mandanten zu erstellen"
      @change="emitUpdate"
    ></v-switch>

    <v-alert
      v-if="local.allowAllUsersToCreateTenant"
      type="warning"
      border="left"
      colored-border
      elevation="1"
      class="mt-3"
    >
      Jeder Benutzer der Plattform ist berechtigt, Mandanten zu erstellen.
    </v-alert>

    <div class="mt-6" data-test="initial-level">
      <h3 class="mb-1">
        {{ $t("instance.edit.tenants.initialLevel.title") }}
      </h3>
      <v-radio-group
        v-model="local.tenantInitialSupervisionLevel"
        :error-messages="initialLevelApiErrors"
        :hide-details="!initialLevelApiErrors.length"
        class="mt-0"
        @change="onInitialLevelChange"
      >
        <v-radio
          v-for="level in supervisionLevels"
          :key="level"
          :value="level"
          color="primary"
        >
          <template #label>
            <div>
              <div>{{ $t(levelLabelKey(level)) }}</div>
              <div class="text-caption">
                {{ $t(`instance.edit.tenants.initialLevel.levels.${level}`) }}
              </div>
            </div>
          </template>
        </v-radio>
      </v-radio-group>
      <div class="text-body-2 mt-2" data-test="initial-level-hint">
        {{ $t("instance.edit.tenants.initialLevel.hint") }}
      </div>
    </div>

    <v-divider class="my-6" />

    <h3 class="mb-2">Benutzer berechtigen</h3>

    <div class="text-body-2 mb-2">
      Berechtigen Sie hier spezifische Benutzer Mandanten zu erstellen, auch
      wenn die Option "Erlauben Sie allen Benutzern Mandanten zu erstellen"
      deaktiviert ist.
    </div>
    <v-row>
      <v-col class="col-12">
        <v-autocomplete
          hide-details
          placeholder="Benutzer Hinzufügen"
          clearable
          v-model="selectedUserToCreateTenant"
          :items="filtersUsers(local.allowedUsersToCreateTenant)"
          item-text="id"
          item-value="id"
          class="ma-5"
          @input="emitUpdate"
        >
          <template v-slot:append-outer>
            <v-btn small color="primary" @click="addUser">
              <v-icon left> mdi-plus</v-icon>
              Hinzufügen
            </v-btn>
          </template>
        </v-autocomplete>
        <v-list v-if="local.allowedUsersToCreateTenant?.length" dense>
          <v-list-item-group
            v-model="selectedUserToCreateTenant"
            color="primary"
          >
            <v-list-item
              v-for="(item, i) in local.allowedUsersToCreateTenant"
              :key="i"
            >
              <v-list-item-icon>
                <v-icon> mdi-account</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ item }}</v-list-item-title>
              </v-list-item-content>
              <v-list-item-icon>
                <v-icon @click="removeUser(item)"> mdi-delete</v-icon>
              </v-list-item-icon>
            </v-list-item>
          </v-list-item-group>
        </v-list>
        <div class="font-italic text-center grey--text pa-5" v-else>
          <v-icon color="grey">mdi-account-off-outline</v-icon> Es sind keine
          Benutzer berechtigt.
        </div>
      </v-col>
    </v-row>
  </BaseSection>
</template>

<style scoped></style>
