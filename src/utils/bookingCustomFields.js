/**
 * Collects checkout-context custom field definitions from all bookable items.
 * Mirrors backend CustomFieldService.filterCheckoutDefinitions on merged bookable fields.
 */
export function resolveBookingCheckoutCustomFields(bookableItems = []) {
  const seen = new Set();
  const definitions = [];

  for (const item of bookableItems) {
    const bookable = item._bookableUsed || item.bookable;
    const fields =
      bookable?.customFields || bookable?.customFieldDefinitions || [];

    for (const field of fields) {
      if (field?.usageOptions?.context !== "checkout") continue;
      if (!field.id || seen.has(field.id)) continue;
      seen.add(field.id);
      definitions.push(field);
    }
  }

  return definitions;
}

/** @deprecated Use resolveBookingCheckoutCustomFields */
export function resolveBookingCustomFieldDefinitions(
  bookableItems = [],
  tenantFieldDefinitions = []
) {
  const fromItems = resolveBookingCheckoutCustomFields(bookableItems);
  const seen = new Set(fromItems.map((f) => f.id));
  const extra = (tenantFieldDefinitions || []).filter(
    (f) =>
      f?.id &&
      !seen.has(f.id) &&
      f?.usageOptions?.context === "checkout"
  );
  return [...fromItems, ...extra];
}

export function isCheckoutRequiredField(field) {
  return (
    field?.usageOptions?.context === "checkout" &&
    field.usageOptions?.requiredInCheckout === true
  );
}

export function groupCustomFieldsByOrigin(fields = []) {
  const order = ["instance", "tenant", "bookable"];
  const groups = {};

  for (const field of fields) {
    const origin = field._origin || "bookable";
    if (!groups[origin]) groups[origin] = [];
    groups[origin].push(field);
  }

  return order
    .filter((key) => groups[key]?.length)
    .map((origin) => ({ origin, fields: groups[origin] }));
}

export function getCustomFieldValue(customFieldValues = [], fieldId) {
  const entry = customFieldValues.find((v) => v.fieldId === fieldId);
  return entry?.value ?? null;
}

export function setCustomFieldValue(customFieldValues = [], fieldId, value) {
  const values = [...customFieldValues];
  const idx = values.findIndex((v) => v.fieldId === fieldId);

  if (idx !== -1) {
    values[idx] = { ...values[idx], value };
  } else {
    values.push({ fieldId, value });
  }

  return values;
}

export function validateRequiredCustomFields(definitions = [], values = []) {
  const missing = [];

  for (const field of definitions) {
    if (!isCheckoutRequiredField(field)) continue;
    const val = getCustomFieldValue(values, field.id);
    if (val === null || val === undefined || val === "") {
      missing.push(field);
    }
  }

  return missing;
}
