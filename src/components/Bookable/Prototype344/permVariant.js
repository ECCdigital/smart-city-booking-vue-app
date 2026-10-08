// PROTOTYPE (ECCdigital/tickets#344), throwaway: never merge.
// What every variant shares: the props, patch/apply after #340, one load of
// roles and people for the bookable's tenant, and the rules of permShared.js.

import _ from "lodash";
import bookableExpertMode from "@/mixins/bookableExpertMode";
import ApiRolesService from "@/services/api/ApiRolesService";
import ApiTenantService from "@/services/api/ApiTenantService";
import { tenantUserOptions } from "@/utils/tenantUsers";
import {
  ID_KEY,
  accessOf,
  applyAccess,
  discountsOf,
  discountsPatch,
  hasLists,
  lists,
  listsPatch,
  offersDiscounts,
  paid,
  percentError,
} from "./permShared";

export default {
  mixins: [bookableExpertMode],
  props: {
    bookable: { type: Object, required: true },
    naming: { type: Object, required: true },
    flow: { type: Boolean, default: false },
  },
  data() {
    // Transient: „selected“ while nobody is named yet (same data as signedIn).
    return { chosenAccess: null, availableUsers: [], availableRoles: [] };
  },
  computed: {
    access() {
      const derived = accessOf(this.bookable);
      if (this.chosenAccess === "selected" && derived === "signedIn")
        return "selected";
      return derived;
    },
    accessOptions() {
      return ["everyone", "signedIn", "selected"].map((value) => ({
        value,
        label: this.naming.access[value],
        description: this.naming.accessHint[value],
      }));
    },
    users() {
      return lists(this.bookable).users;
    },
    roles() {
      return lists(this.bookable).roles;
    },
    hasLists() {
      return hasLists(this.bookable);
    },
    discounts() {
      return discountsOf(this.bookable);
    },
    showsDiscounts() {
      return offersDiscounts(this.bookable, this.expertMode);
    },
    paid() {
      return paid(this.bookable);
    },
    tenantId() {
      return this.bookable.tenantId;
    },
    userItems() {
      // Saved ids the tenant no longer knows stay visible as they are.
      const known = this.availableUsers.map((u) => u.userId);
      const unknown = [
        ...this.users,
        ...this.discounts.users.map((d) => d.userId),
      ]
        .filter((id) => id && !known.includes(id))
        .map((id) => ({ userId: id, label: id, unknown: true }));
      return [...this.availableUsers, ..._.uniqBy(unknown, "userId")];
    },
    roleItems() {
      const known = this.availableRoles.map((r) => r.id);
      const unknown = [
        ...this.roles,
        ...this.discounts.roles.map((d) => d.roleId),
      ]
        .filter((id) => id && !known.includes(id))
        .map((id) => ({ id, name: `${id} (unbekannte Rolle)`, unknown: true }));
      return [...this.availableRoles, ..._.uniqBy(unknown, "id")];
    },
  },
  watch: {
    tenantId: { immediate: true, handler: "fetchUsers" },
  },
  mounted() {
    this.fetchRoles();
  },
  methods: {
    patch(changes) {
      this.$emit("update:bookable", { ...this.bookable, ...changes });
    },
    apply(change) {
      const next = _.cloneDeep(this.bookable);
      change(next);
      this.$emit("update:bookable", next);
    },
    setAccess(access) {
      this.chosenAccess = access;
      this.apply((next) => applyAccess(next, access));
    },
    setLogin(on) {
      this.setAccess(on ? "signedIn" : "everyone");
    },
    setUsers(users) {
      this.patch(listsPatch(this.bookable, { users }));
    },
    setRoles(roles) {
      this.patch(listsPatch(this.bookable, { roles }));
    },
    userLabel(id) {
      return this.userItems.find((u) => u.userId === id)?.label || id;
    },
    roleLabel(id) {
      return this.roleItems.find((r) => r.id === id)?.name || id;
    },
    labelOf(type, id) {
      return type === "user" ? this.userLabel(id) : this.roleLabel(id);
    },
    discountEntries(type) {
      return type === "user" ? this.discounts.users : this.discounts.roles;
    },
    addDiscount(type, id, percent = 100) {
      if (!id) return;
      this.patch(
        discountsPatch(this.bookable, type, (list) => {
          if (list.some((e) => e[ID_KEY[type]] === id)) return;
          list.push({ [ID_KEY[type]]: id, discountPercent: percent });
        })
      );
    },
    setDiscount(type, index, value) {
      this.patch(
        discountsPatch(this.bookable, type, (list) => {
          list[index].discountPercent =
            value === "" || value == null ? "" : Number(value);
        })
      );
    },
    removeDiscount(type, index) {
      this.patch(
        discountsPatch(this.bookable, type, (list) => list.splice(index, 1))
      );
    },
    percentError,
    async fetchRoles() {
      // Today both modes load the roles of the *selected* tenant, the people
      // of the bookable's tenant. The rule: both of the bookable's tenant.
      try {
        const response = await ApiRolesService.getTenantRoles(true);
        this.availableRoles = response?.data || [];
      } catch (error) {
        this.availableRoles = [];
      }
    },
    async fetchUsers() {
      if (!this.tenantId) {
        this.availableUsers = [];
        return;
      }
      try {
        const response = await ApiTenantService.getTenantUsers(this.tenantId);
        this.availableUsers = tenantUserOptions(response).map((user) => ({
          userId: user.userId,
          label: user.label,
          sub: user.name ? user.userId : "",
        }));
      } catch (error) {
        this.availableUsers = [];
      }
    },
  },
};
