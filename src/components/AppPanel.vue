<template>
  <v-expansion-panels multiple>
    <v-expansion-panel>
      <v-expansion-panel-header color="accent" expand-icon="mdi-menu-down">
        <template v-slot:default="{ open }">
          <v-row no-gutters align="center" class="w-100">
            <v-col cols="6" class="d-flex align-center">
              <img
                v-if="logo"
                :src="logo"
                alt=""
                class="app-panel__logo mr-2"
              />
              <v-icon v-else color="primary" class="mr-2">{{ icon }}</v-icon>
              <span class="text-subtitle-1">{{ title }}</span>
            </v-col>
            <v-col class="col-auto">
              <v-fade-transition leave-absolute>
                <div v-if="!open" class="d-flex align-center">
                  <v-chip
                    v-if="active"
                    small
                    color="success"
                    text-color="white"
                    label
                  >
                    Aktiv
                  </v-chip>
                  <v-chip v-else small color="grey lighten-1" label>
                    Inaktiv
                  </v-chip>
                  <slot name="badges" />
                </div>
              </v-fade-transition>
            </v-col>
          </v-row>
        </template>
      </v-expansion-panel-header>
      <v-expansion-panel-content>
        <slot />
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
export default {
  name: "AppPanel",
  props: {
    title: String,
    logo: String,
    icon: { type: String, default: "mdi-puzzle" },
    active: Boolean,
  },
};
</script>

<style scoped>
/* A light plate under .theme--dark, so a dark provider logo does not vanish
   on the dark panel header (ECCdigital/tickets#307). */
.app-panel__logo {
  box-sizing: content-box;
  width: 45px;
  height: auto;
  padding: var(--scb-logo-plate-padding);
  border-radius: var(--scb-radius-control);
  background: var(--scb-logo-plate);
}
</style>
