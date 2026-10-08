<!-- PROTOTYPE (ECCdigital/tickets#344), throwaway: never merge.
     Roles and people of the tenant as two pickers that show names, not ids
     (today the people picker shows the raw user id). -->
<template>
  <div>
    <v-autocomplete
      :value="roles"
      :items="roleItems"
      item-text="name"
      item-value="id"
      :label="naming.roles"
      multiple
      chips
      small-chips
      deletable-chips
      outlined
      dense
      hide-selected
      no-data-text="Keine Rollen verfügbar"
      prepend-inner-icon="mdi-account-group"
      @input="$emit('update:roles', $event)"
    />
    <v-autocomplete
      :value="users"
      :items="userItems"
      item-text="label"
      item-value="userId"
      :label="naming.users"
      multiple
      chips
      small-chips
      deletable-chips
      outlined
      dense
      hide-selected
      no-data-text="Keine Personen verfügbar"
      prepend-inner-icon="mdi-account"
      @input="$emit('update:users', $event)"
    >
      <template #item="{ item }">
        <v-list-item-content>
          <v-list-item-title>{{ item.label }}</v-list-item-title>
          <v-list-item-subtitle v-if="item.sub">{{ item.sub }}</v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </v-autocomplete>
  </div>
</template>

<script>
export default {
  name: "PeoplePicker",
  props: {
    users: { type: Array, default: () => [] },
    roles: { type: Array, default: () => [] },
    userItems: { type: Array, default: () => [] },
    roleItems: { type: Array, default: () => [] },
    naming: { type: Object, required: true },
  },
};
</script>
