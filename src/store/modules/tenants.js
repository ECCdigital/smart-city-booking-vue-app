import PersistenceService from "@/services/PersistenceService";
import ApiTenantService from "@/services/api/ApiTenantService";
const namespaced = true;

const state = {
  data: PersistenceService.getFromLocalStorage("tenant") || null,
  tenants: PersistenceService.getFromLocalStorage("tenants") || null,
  currentTenantId:
    PersistenceService.getFromLocalStorage("currentTenantId") || null,
  // The supervision level (glossary "Aufsichtsstufe") of one tenant, with
  // the tenant it belongs to. Never persisted: the instance owner changes it.
  supervision: { tenantId: null, level: null },
};

/**
 * `GET /api/tenants/:tenant` is for the tenant's owner and the instance
 * owner. Read off the permissions payload here, because
 * `TenantPermissionService` imports the store.
 */
function mayReadTenant(rootState, tenantId) {
  const permissions = rootState.user?.data?.permissions;
  if (!permissions) return false;
  if (permissions.instanceOwner === true) return true;
  return (permissions.tenants || []).some(
    (p) => p.tenantId === tenantId && p.isOwner === true
  );
}

const mutations = {
  UPDATE(state, tenant) {
    state.data = tenant;
    PersistenceService.writeToLocalStorage("tenant", tenant);
  },
  DELETE(state) {
    state.data = null;
    state.tenants = null;
    state.currentTenantId = null;
    state.supervision = { tenantId: null, level: null };
    PersistenceService.removeFromLocalStorage("tenant");
    PersistenceService.removeFromLocalStorage("tenants");
    PersistenceService.removeFromLocalStorage("currentTenantId");
  },
  SET_TENANTS(state, tenants) {
    state.tenants = tenants;
    PersistenceService.writeToLocalStorage("tenants", tenants);
  },
  SELECT(state, tenant) {
    state.currentTenantId = tenant;
    if (tenant) {
      PersistenceService.writeToLocalStorage("currentTenantId", tenant);
    } else {
      PersistenceService.removeFromLocalStorage("currentTenantId");
    }
  },
  SET_SUPERVISION_LEVEL(state, { tenantId, level }) {
    state.supervision = { tenantId, level: level || null };
  },
  REPLACE(state, tenant) {
    const index = state.tenants.findIndex((t) => t.id === tenant.id);
    if (index !== -1) {
      state.tenants.splice(index, 1, tenant);
    }
  },
};

const actions = {
  update({ commit }, tenant) {
    commit("UPDATE", tenant);
  },
  delete({ commit }) {
    commit("DELETE");
  },
  setTenants({ commit }, tenants) {
    commit("SET_TENANTS", tenants);
  },
  select({ commit, dispatch }, tenant) {
    commit("SELECT", tenant);
    // Not awaited: the selection must not wait for the level.
    dispatch("loadSupervisionLevel");
  },
  /**
   * The store's tenant list is the public projection, which carries no
   * `supervisionLevel`; the level comes with the admin DTO of the one
   * tenant. It stays unknown for a viewer who may not read that.
   */
  async loadSupervisionLevel({ commit, state, rootState }) {
    const tenantId = state.currentTenantId;
    if (!tenantId || !mayReadTenant(rootState, tenantId)) return;
    let level = null;
    try {
      level = (await ApiTenantService.getTenant(tenantId)).data
        ?.supervisionLevel;
    } catch (error) {
      // Unknown stays unknown; the review then shows without its effect.
    }
    // An answer for a tenant that is no longer selected is dropped.
    if (state.currentTenantId === tenantId) {
      commit("SET_SUPERVISION_LEVEL", { tenantId, level });
    }
  },
  replace({ commit }, tenant) {
    commit("REPLACE", tenant);
  },
  reset({ commit }) {
    commit("DELETE");
  },
};

const getters = {
  tenants: (state) => state.tenants || [],
  currentTenantId: (state) => state.currentTenantId,
  currentSupervisionLevel: (state) =>
    state.supervision.tenantId === state.currentTenantId
      ? state.supervision.level
      : null,
  currentTenant: (state) => {
    return state.tenants?.find((t) => t.id === state.currentTenantId);
  },
};

export default {
  state,
  mutations,
  actions,
  getters,
  namespaced,
};
