/**
 * A tenant's name for a toast: from the loaded tenant list, else its id, so
 * the sentence never lacks one. Pure - it takes the list, not the store, so
 * the API client's fallback may use it without importing the store.
 */
export function tenantName(tenants, tenantId) {
  return (tenants || []).find((t) => t.id === tenantId)?.name || tenantId;
}
